import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n/I18nContext";

type SocEvent = {
  id?: string;
  ts?: string;
  kind?: string;
  [k: string]: unknown;
};

type MapBlip = { id: string; region: string; severity: string; ts: number };

const REGION_POS: Record<string, { x: number; y: number }> = {
  NA: { x: 20, y: 36 },
  EU: { x: 49, y: 28 },
  APAC: { x: 80, y: 44 },
  MEA: { x: 56, y: 50 },
};

function buildWsUrl(team: string): string {
  const api = import.meta.env.VITE_API_URL?.replace(/\/$/, "") ?? "";
  let host: string;
  if (api) {
    host = new URL(api).host;
  } else {
    host = window.location.host;
  }
  const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
  const q = team.trim() ? `?team=${encodeURIComponent(team.trim().slice(0, 24))}` : "";
  return `${wsScheme}://${host}/api/v1/soc/ws${q}`;
}

function eventSeverity(ev: SocEvent): string {
  if (ev.kind === "sim_submit" && ev.is_safe === false) {
    const s = String(ev.severity || "medium");
    return s === "critical" ? "critical" : "warn";
  }
  if (ev.kind === "sim_submit" && (ev.tags as string[] | undefined)?.includes("user_report")) {
    return "info";
  }
  return "info";
}

export function LiveSocPage() {
  const { user } = useApp();
  const { t } = useI18n();
  const [team, setTeam] = useState("");
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<SocEvent[]>([]);
  const [stats, setStats] = useState<Record<string, string>>({});
  const [viewers, setViewers] = useState(0);
  const [teams, setTeams] = useState<Record<string, number>>({});
  const [blips, setBlips] = useState<MapBlip[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const pushEvent = useCallback((ev: SocEvent) => {
    setEvents((prev) => {
      const next = [ev, ...prev].slice(0, 250);
      return next;
    });
    const reg = typeof ev.region === "string" ? ev.region : "EU";
    const sev = eventSeverity(ev);
    if (ev.kind === "sim_submit" || ev.kind === "auth_login" || ev.kind === "auth_register") {
      setBlips((prev) => {
        const id = String(ev.id || `${Date.now()}-${Math.random()}`);
        const row: MapBlip = { id, region: reg in REGION_POS ? reg : "EU", severity: sev, ts: Date.now() };
        return [row, ...prev].slice(0, 40);
      });
    }
  }, []);

  const connect = useCallback(() => {
    wsRef.current?.close();
    const url = buildWsUrl(team);
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (m) => {
      try {
        const data = JSON.parse(m.data as string) as SocEvent & { kind?: string; recent?: SocEvent[]; stats?: Record<string, string> };
        if (data.kind === "_snapshot") {
          if (data.recent?.length) {
            const rev = [...data.recent].reverse();
            setEvents(rev);
            const b: MapBlip[] = [];
            for (const ev of data.recent.slice(-25)) {
              if (ev && (ev.kind === "sim_submit" || ev.kind === "auth_login" || ev.kind === "auth_register")) {
                const reg = typeof ev.region === "string" ? ev.region : "EU";
                b.push({
                  id: String(ev.id || Math.random()),
                  region: reg in REGION_POS ? reg : "EU",
                  severity: eventSeverity(ev as SocEvent),
                  ts: Date.now(),
                });
              }
            }
            setBlips(b.slice(-40));
          }
          if (data.stats) setStats(data.stats);
          if (typeof data.viewers === "number") setViewers(data.viewers);
          if (data.teams && typeof data.teams === "object") setTeams(data.teams as Record<string, number>);
          return;
        }
        if (data.kind === "_meta") {
          if (typeof data.viewers === "number") setViewers(data.viewers);
          if (data.teams && typeof data.teams === "object") setTeams(data.teams as Record<string, number>);
          return;
        }
        pushEvent(data);
      } catch {
        /* ignore */
      }
    };
  }, [team, pushEvent]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [connect]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = 0;
  }, [events.length]);

  const statRows = useMemo(() => {
    const keys = Object.keys(stats).filter((k) => k !== "total");
    keys.sort((a, b) => Number(stats[b] || 0) - Number(stats[a] || 0));
    return keys;
  }, [stats]);

  function formatLine(ev: SocEvent): string {
    const k = String(ev.kind || "?");
    if (k === "auth_login") return `${t("soc.ev.login")} · ${String(ev.email_domain || "?")}`;
    if (k === "auth_register") return `${t("soc.ev.register")} · ${String(ev.email_domain || "?")}`;
    if (k === "sim_submit")
      return `${t("soc.ev.sim")} · ${String(ev.scenario_id || "?")} · ${String(ev.choice_id || "?")} · ${ev.is_safe ? t("soc.safe") : t("soc.unsafe")}`;
    if (k === "progress_sync")
      return `${t("soc.ev.progress")} · XP ${String(ev.xp ?? "?")} · ${t("soc.modules")}: ${String(ev.modules_done ?? "?")}`;
    if (k === "custom_case") return `${t("soc.ev.custom")} · ${String(ev.scenario_id || "?")}`;
    return k;
  }

  return (
    <div className="min-h-screen bg-[#070b10] text-emerald-100/95">
      <header className="sticky top-0 z-20 border-b border-emerald-900/50 bg-[#070b10]/95 px-4 py-3 backdrop-blur-md md:px-6">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-500/90">{t("soc.kicker")}</p>
            <h1 className="font-display text-lg font-semibold tracking-tight text-white md:text-xl">{t("soc.title")}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              placeholder={t("soc.teamPh")}
              className="w-36 rounded-lg border border-emerald-800/60 bg-black/40 px-3 py-1.5 font-mono text-xs text-emerald-100 placeholder:text-emerald-700 focus:border-emerald-500 focus:outline-none md:w-44"
            />
            <button
              type="button"
              onClick={() => connect()}
              className="rounded-lg border border-emerald-600/50 bg-emerald-950/50 px-3 py-1.5 font-mono text-xs text-emerald-200 hover:bg-emerald-900/40"
            >
              {t("soc.reconnect")}
            </button>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase ${connected ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300"}`}
            >
              {connected ? t("soc.wsOn") : t("soc.wsOff")}
            </span>
            {user ? (
              <Link to="/dashboard" className="rounded-lg border border-stone-600 px-3 py-1.5 font-mono text-xs text-stone-300 hover:border-emerald-600 hover:text-white">
                {t("soc.toDash")}
              </Link>
            ) : (
              <Link to="/login" className="rounded-lg border border-stone-600 px-3 py-1.5 font-mono text-xs text-stone-300 hover:border-emerald-600 hover:text-white">
                {t("soc.login")}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-4 px-4 py-4 md:grid-cols-12 md:gap-5 md:px-6 md:py-6">
        <section className="md:col-span-5">
          <div className="rounded-2xl border border-emerald-900/60 bg-[#0c1219] p-4 shadow-[0_0_40px_-12px_rgb(16_185_129_/_0.25)]">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-emerald-500/80">{t("soc.feed")}</h2>
            <div
              ref={listRef}
              className="mt-3 h-[min(52vh,520px)] space-y-2 overflow-y-auto overscroll-contain pr-1 font-mono text-[11px] leading-relaxed md:text-xs"
            >
              {events.length === 0 ? (
                <p className="text-emerald-700">{t("soc.empty")}</p>
              ) : (
                events.map((ev, i) => {
                  const sev = eventSeverity(ev);
                  const border =
                    sev === "critical"
                      ? "border-red-500/40 bg-red-950/20"
                      : sev === "warn"
                        ? "border-amber-500/35 bg-amber-950/15"
                        : "border-emerald-900/50 bg-black/20";
                  return (
                    <div key={`${ev.id || i}-${ev.ts || i}`} className={`rounded-lg border px-2.5 py-2 ${border}`}>
                      <p className="text-[10px] text-emerald-600">{ev.ts}</p>
                      <p className="mt-0.5 text-emerald-100/95">{formatLine(ev)}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </section>

        <section className="md:col-span-4">
          <div className="rounded-2xl border border-cyan-900/50 bg-[#0c1219] p-4">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-cyan-500/85">{t("soc.map")}</h2>
            <p className="mt-1 text-[10px] text-cyan-800/90">{t("soc.mapHint")}</p>
            <div className="relative mt-4 aspect-[16/10] w-full overflow-hidden rounded-xl border border-cyan-900/40 bg-gradient-to-b from-[#0a1628] to-[#050810]">
              <svg viewBox="0 0 100 60" className="h-full w-full opacity-40" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <pattern id="socgrid" width="4" height="4" patternUnits="userSpaceOnUse">
                    <path d="M 4 0 L 0 0 0 4" fill="none" stroke="rgb(6 78 59 / 0.35)" strokeWidth="0.15" />
                  </pattern>
                </defs>
                <rect width="100" height="60" fill="url(#socgrid)" />
                <ellipse cx="50" cy="32" rx="38" ry="22" fill="none" stroke="rgb(34 197 94 / 0.12)" strokeWidth="0.4" />
              </svg>
              {blips.map((b) => {
                const pos = REGION_POS[b.region] || REGION_POS.EU;
                const pulse =
                  b.severity === "critical"
                    ? "bg-red-400 shadow-[0_0_14px_rgb(248_113_113_/_0.55)]"
                    : b.severity === "warn"
                      ? "bg-amber-400 shadow-[0_0_12px_rgb(251_191_36_/_0.45)]"
                      : "bg-cyan-400 shadow-[0_0_10px_rgb(34_211_238_/_0.4)]";
                return (
                  <span
                    key={b.id}
                    className={`absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ${pulse} motion-safe:animate-pulse`}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                  />
                );
              })}
              <p className="absolute bottom-2 left-2 max-w-[90%] font-mono text-[9px] leading-snug text-cyan-700/90">{t("soc.mapLegend")}</p>
            </div>
          </div>
        </section>

        <section className="md:col-span-3">
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-900/60 bg-[#0c1219] p-4">
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-emerald-500/80">{t("soc.ops")}</h2>
              <dl className="mt-3 space-y-2 font-mono text-xs">
                <div className="flex justify-between border-b border-emerald-950/80 pb-2">
                  <dt className="text-emerald-600">{t("soc.viewers")}</dt>
                  <dd className="text-white">{viewers}</dd>
                </div>
                <div className="flex justify-between border-b border-emerald-950/80 pb-2">
                  <dt className="text-emerald-600">{t("soc.totalEv")}</dt>
                  <dd className="text-white">{stats.total ?? "0"}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-2xl border border-violet-900/50 bg-[#0c1219] p-4">
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-violet-400/90">{t("soc.teams")}</h2>
              <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto font-mono text-[11px]">
                {Object.keys(teams).length === 0 ? <li className="text-violet-700">{t("soc.noTeams")}</li> : null}
                {Object.entries(teams).map(([name, n]) => (
                  <li key={name} className="flex justify-between text-violet-100/90">
                    <span className="truncate pr-2">{name}</span>
                    <span className="text-violet-400">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-stone-800 bg-[#0c1219] p-4">
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-stone-500">{t("soc.counts")}</h2>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto font-mono text-[10px] text-stone-400">
                {statRows.map((k) => (
                  <li key={k} className="flex justify-between gap-2">
                    <span className="truncate">{k}</span>
                    <span>{stats[k]}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
      <p className="mx-auto max-w-[1600px] px-6 pb-8 font-mono text-[10px] text-emerald-800">{t("soc.footer")}</p>
    </div>
  );
}
