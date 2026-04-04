import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useI18n } from "@/i18n/I18nContext";
import { useApp } from "@/context/AppContext";
import {
  breachContextFromTrainingLink,
  getTrainingLinksFromScenario,
  shuffleTrainingLinks,
  truncateUi,
} from "@/lib/breachFromEmail";
import {
  asScenarioForBreach,
  clearLinkLabSession,
  initLinkLabSession,
  linkLabAfterSafeModal,
  markLinkLabOpened,
  readLinkLabSession,
  snapshotScenarioForLinkLab,
} from "@/lib/linkLabSession";
import { fetchSimulationScenario, type ApiScenarioUnion, type ApiTrainingLink } from "@/lib/simulationClient";
import { isPlayableSimulationId } from "@/lib/courseScenarios";

type LinkLabLocationState = { step?: number };

function linkHost(url: string): string {
  try {
    const u = url.startsWith("http") ? url : `https://${url}`;
    return new URL(u).host;
  } catch {
    return truncateUi(url.replace(/^https?:\/\//i, ""), 48);
  }
}

/**
 * Тренажёр ссылок: `/link-lab` (отдельно от модулей) или `/sim/run/:id/link-lab` из сценария.
 */
export function SimulationLinkLabPage() {
  const { id: routeScenarioId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();
  const location = useLocation();
  const { locale, t } = useI18n();
  const { user } = useApp();

  const isStandalone = routeScenarioId === undefined;
  const defaultAggregateId = searchParams.get("mode") === "chat" ? "se-chat" : "phishing-mail";
  const scenarioId = useMemo(() => {
    if (routeScenarioId !== undefined) {
      return isPlayableSimulationId(routeScenarioId) ? routeScenarioId : "";
    }
    return defaultAggregateId;
  }, [routeScenarioId, defaultAggregateId]);

  const st = (location.state as LinkLabLocationState | null) ?? null;
  const step =
    !isStandalone && typeof st?.step === "number" && st.step >= 1 ? st.step : 1;

  const [data, setData] = useState<ApiScenarioUnion | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [safeModal, setSafeModal] = useState<ApiTrainingLink | null>(null);

  const load = useCallback(async () => {
    if (!scenarioId || !isPlayableSimulationId(scenarioId)) return;
    setLoading(true);
    setErr(null);
    try {
      const r = await fetchSimulationScenario(scenarioId, locale, step, user?.token);
      setData(r.scenario);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [scenarioId, locale, step, user?.token]);

  useEffect(() => {
    void load();
  }, [load]);

  const links = useMemo(() => {
    if (!data) return [];
    const raw = getTrainingLinksFromScenario(data);
    if (!raw?.length) return [];
    return shuffleTrainingLinks(raw, `${scenarioId}-${step}-${data.title ?? ""}`);
  }, [data, scenarioId, step]);

  const linkLabInitKeyRef = useRef("");
  useEffect(() => {
    if (!scenarioId || !data) return;
    if (data.type !== "email" && data.type !== "chat") return;
    if (links.length === 0) return;
    const key = `${scenarioId}|${step}|${links.map((l) => l.id).join(",")}`;
    if (key === linkLabInitKeyRef.current) return;
    linkLabInitKeyRef.current = key;
    initLinkLabSession(scenarioId, step, links, snapshotScenarioForLinkLab(data));
  }, [scenarioId, step, data, links]);

  const handleSafeModalClose = useCallback(() => {
    if (!scenarioId) return;
    const next = linkLabAfterSafeModal(scenarioId);
    if (!next) {
      setSafeModal(null);
      return;
    }
    if (next.kind === "next_breach") {
      setSafeModal(null);
      const snap = readLinkLabSession();
      if (!snap) return;
      const breachContext = breachContextFromTrainingLink(asScenarioForBreach(snap.scenario), next.link);
      nav(`/sim/run/${scenarioId}/breach`, {
        state: {
          targetUrl: next.link.href,
          scenarioTitle: next.scenarioTitle,
          breachContext,
        },
      });
      return;
    }
    if (next.kind === "next_safe_modal") {
      setSafeModal(next.link);
      return;
    }
    setSafeModal(null);
  }, [scenarioId, nav]);

  const backTo = isStandalone ? "/dashboard" : `/sim/run/${scenarioId}`;

  if (routeScenarioId !== undefined && !isPlayableSimulationId(routeScenarioId)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#070a0c] text-stone-500">{t("common.loading")}</div>
    );
  }

  if (err || !data || links.length === 0) {
    return <Navigate to={backTo} replace />;
  }

  const scenarioData = data;

  function openLink(link: ApiTrainingLink, queueIndex: number) {
    if (scenarioData.type !== "email" && scenarioData.type !== "chat") return;
    markLinkLabOpened(scenarioId, step, links, snapshotScenarioForLinkLab(scenarioData), queueIndex);
    if (link.is_phishing) {
      const breachContext = breachContextFromTrainingLink(scenarioData, link);
      nav(`/sim/run/${scenarioId}/breach`, {
        state: {
          targetUrl: link.href,
          scenarioTitle: scenarioData.title,
          breachContext,
        },
      });
    } else {
      setSafeModal(link);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#0b1016] to-[#050608] px-4 py-8 text-stone-100 motion-safe:animate-fade-in">
      <div className="mx-auto max-w-lg">
        <Link
          to={backTo}
          onClick={() => clearLinkLabSession()}
          className="inline-flex items-center gap-1 font-mono text-[11px] text-sky-400/90 hover:text-sky-300"
        >
          ← {t(isStandalone ? "linkLab.backDashboard" : "linkLab.back")}
        </Link>

        <h1 className="mt-6 font-display text-xl font-semibold text-white md:text-2xl">{t("linkLab.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-400">{t("linkLab.subtitle")}</p>
        <p className="mt-3 rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2 font-mono text-[10px] leading-snug text-stone-500">
          {t("linkLab.disclaimer")}
        </p>

        <ul className="mt-8 space-y-3" role="list">
          {links.map((link, queueIndex) => (
            <li key={link.id}>
              <button
                type="button"
                onClick={() => openLink(link, queueIndex)}
                className="w-full rounded-2xl border border-white/[0.1] bg-zinc-900/80 px-4 py-3.5 text-left shadow-sm transition hover:border-sky-500/35 hover:bg-zinc-900 active:scale-[0.99]"
              >
                <p className="text-sm font-medium text-stone-100">{link.label?.trim() || linkHost(link.href)}</p>
                <p className="mt-1 font-mono text-[11px] text-cyan-600/90 dark:text-cyan-400/85">{linkHost(link.href)}</p>
                <p className="mt-2 font-mono text-[10px] text-stone-500">{t("linkLab.openTraining")}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {safeModal ? (
        <div
          className="fixed inset-0 z-[150] flex items-end justify-center bg-black/70 p-4 sm:items-center motion-safe:animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="linklab-safe-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-emerald-900/50 bg-[#0c1410] p-5 shadow-2xl sm:p-6">
            <p id="linklab-safe-title" className="font-display text-lg font-semibold text-emerald-100">
              {t("linkLab.safeModalTitle")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-emerald-200/85">{t("linkLab.safeModalBody")}</p>
            <p className="mt-3 break-all rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-[11px] text-stone-400">
              {safeModal.href}
            </p>
            <button
              type="button"
              onClick={handleSafeModalClose}
              className="btn-primary mt-5 w-full !text-xs"
            >
              {t("linkLab.safeModalClose")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
