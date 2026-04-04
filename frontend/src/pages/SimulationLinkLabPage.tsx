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
      <div className="flex min-h-[100dvh] items-center justify-center bg-paper text-stone-500 dark:bg-night dark:text-stone-400">
        {t("common.loading")}
      </div>
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
    <div className="min-h-[100dvh] bg-paper bg-mesh-light px-4 py-8 text-stone-900 motion-safe:animate-fade-in dark:bg-[#050608] dark:bg-gradient-to-b dark:from-[#0b1016] dark:to-[#050608] dark:text-stone-100">
      <div className="mx-auto max-w-lg">
        <Link
          to={backTo}
          onClick={() => clearLinkLabSession()}
          className="inline-flex items-center gap-1 font-mono text-[11px] text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300"
        >
          ← {t(isStandalone ? "linkLab.backDashboard" : "linkLab.back")}
        </Link>

        <h1 className="mt-6 font-display text-xl font-semibold text-stone-900 md:text-2xl dark:text-white">{t("linkLab.title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-600 dark:text-stone-300">{t("linkLab.subtitle")}</p>
        <p className="mt-3 rounded-lg border border-stone-200/90 bg-white/90 px-3 py-2 font-mono text-[10px] leading-snug text-stone-600 shadow-soft dark:border-emerald-900/40 dark:bg-zinc-900/60 dark:text-stone-300 dark:shadow-[inset_0_1px_0_rgb(255_255_255_/_0.04)]">
          {t("linkLab.disclaimer")}
        </p>

        <ul className="mt-8 space-y-3" role="list">
          {links.map((link, queueIndex) => (
            <li key={link.id}>
              <button
                type="button"
                onClick={() => openLink(link, queueIndex)}
                className="w-full rounded-2xl border border-stone-200/90 bg-white px-4 py-3.5 text-left shadow-soft transition hover:border-emerald-300/70 hover:bg-emerald-50/40 hover:shadow-soft-md active:scale-[0.99] dark:border-emerald-900/45 dark:bg-zinc-900/90 dark:shadow-[0_0_0_1px_rgb(16_185_129_/_0.08)] dark:hover:border-emerald-600/40 dark:hover:bg-zinc-900"
              >
                <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
                  {link.label?.trim() || linkHost(link.href)}
                </p>
                <p className="mt-1 font-mono text-[11px] text-teal-700 dark:text-cyan-300">{linkHost(link.href)}</p>
                <p className="mt-2 font-mono text-[10px] text-stone-500 dark:text-stone-400">{t("linkLab.openTraining")}</p>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {safeModal ? (
        <div
          className="fixed inset-0 z-[150] flex items-end justify-center bg-stone-900/40 p-4 backdrop-blur-[2px] sm:items-center motion-safe:animate-fade-in dark:bg-black/70 dark:backdrop-blur-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="linklab-safe-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-emerald-200/80 bg-white p-5 shadow-soft-lg sm:p-6 dark:border-emerald-900/50 dark:bg-[#0c1410] dark:shadow-2xl">
            <p
              id="linklab-safe-title"
              className="font-display text-lg font-semibold text-emerald-900 dark:text-emerald-100"
            >
              {t("linkLab.safeModalTitle")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-stone-700 dark:text-emerald-200/85">{t("linkLab.safeModalBody")}</p>
            <p className="mt-3 break-all rounded-lg border border-stone-200/90 bg-stone-50 px-3 py-2 font-mono text-[11px] text-stone-600 dark:border-white/10 dark:bg-black/40 dark:text-stone-400">
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
