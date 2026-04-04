import { useCallback } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { BreachLeadInFlow } from "@/components/BreachLeadInFlow";
import { BreachChatMessengerFlow } from "@/components/BreachChatMessengerFlow";
import { breachContextFromTrainingLink, type BreachDrillOutcome, type BreachScenarioContext } from "@/lib/breachFromEmail";
import { asScenarioForBreach, linkLabAfterBreachExit, readLinkLabSession } from "@/lib/linkLabSession";
import { isPlayableSimulationId } from "@/lib/courseScenarios";

type BreachLocationState = {
  targetUrl?: string;
  scenarioTitle?: string;
  breachContext?: BreachScenarioContext;
  /** @deprecated используйте breachContext */
  emailSubject?: string;
  emailPreview?: string;
  emailCtaLabel?: string;
};

function resolveScenarioContext(st: BreachLocationState | null): BreachScenarioContext | null {
  if (!st) return null;
  if (st.breachContext && typeof st.breachContext.subject === "string") {
    const bc = st.breachContext;
    return {
      source: bc.source === "chat" ? "chat" : "email",
      subject: bc.subject,
      preview: bc.preview ?? "",
      ctaLabel: bc.ctaLabel ?? "",
      chatMessages: bc.chatMessages,
      chatPeerName: bc.chatPeerName,
      chatPeerHandle: bc.chatPeerHandle,
    };
  }
  if (typeof st.emailSubject === "string") {
    return {
      source: "email",
      subject: st.emailSubject,
      preview: typeof st.emailPreview === "string" ? st.emailPreview : "",
      ctaLabel: typeof st.emailCtaLabel === "string" ? st.emailCtaLabel : "",
    };
  }
  return null;
}

/**
 * Учебная цепочка по ссылке из письма или чата: подводка → выбор → театр или безопасный исход.
 */
export function SimulationBreachPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const loc = useLocation();
  const st = (loc.state as BreachLocationState | null) ?? null;

  const scenarioContext = resolveScenarioContext(st);

  const onExit = useCallback(
    (outcome: BreachDrillOutcome) => {
      if (!id) return;
      const cont = linkLabAfterBreachExit(id, outcome);
      if (cont?.kind === "next_breach") {
        const snap = readLinkLabSession();
        if (!snap?.scenario) {
          nav(`/sim/run/${id}`, { replace: true, state: { breachDrillOutcome: outcome } });
          return;
        }
        const breachContext = breachContextFromTrainingLink(asScenarioForBreach(snap.scenario), cont.link);
        nav(`/sim/run/${id}/breach`, {
          replace: true,
          state: {
            targetUrl: cont.link.href,
            scenarioTitle: cont.scenarioTitle,
            breachContext,
          },
        });
        return;
      }
      if (cont?.kind === "done") {
        nav(`/sim/run/${id}`, { replace: true, state: { breachDrillOutcome: cont.breachDrillOutcome } });
        return;
      }
      nav(`/sim/run/${id}`, { replace: true, state: { breachDrillOutcome: outcome } });
    },
    [id, nav],
  );

  if (!id || !isPlayableSimulationId(id)) {
    return <Navigate to="/dashboard" replace />;
  }

  const scenarioLabel = st?.scenarioTitle?.trim() || id;
  const targetUrl = st?.targetUrl?.trim() || "https://training.cipherline.local/verify";

  const fromChat = scenarioContext?.source === "chat";

  /** Сброс внутренних шагов при смене ссылки (цепочка link-lab: тот же путь /breach, новый state). */
  const breachFlowKey = `${targetUrl}|${scenarioContext?.subject ?? ""}|${scenarioContext?.ctaLabel ?? ""}|${loc.key}`;

  return (
    <div className="min-h-[100dvh] bg-paper bg-mesh-light dark:bg-black dark:bg-none">
      {fromChat ? (
        <BreachChatMessengerFlow
          key={breachFlowKey}
          scenarioLabel={scenarioLabel}
          targetUrl={targetUrl}
          scenarioContext={scenarioContext}
          onExit={onExit}
        />
      ) : (
        <BreachLeadInFlow
          key={breachFlowKey}
          scenarioLabel={scenarioLabel}
          targetUrl={targetUrl}
          scenarioContext={scenarioContext}
          onExit={onExit}
        />
      )}
    </div>
  );
}
