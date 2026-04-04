import type { ScenarioStep, ScenarioUiType } from "@/types";

const shell =
  "overflow-hidden rounded-3xl border border-stone-200/80 bg-white/95 shadow-soft ring-1 ring-white/60 transition-all duration-500 ease-soft hover:shadow-soft-md dark:border-stone-700/70 dark:bg-stone-900/50 dark:ring-white/5 dark:hover:border-emerald-900/40 dark:hover:shadow-[0_12px_40px_-16px_rgb(16_185_129_/_0.12)]";

function MessengerChrome({ meta }: { meta?: Record<string, string> }) {
  return (
    <div className={shell}>
      <div className="flex items-center gap-3 border-b border-stone-200/80 bg-stone-50/80 px-4 py-3 dark:border-stone-700/60 dark:bg-stone-800/40">
        <div className="size-10 rounded-full bg-stone-200/90 dark:bg-stone-700"></div>
        <div>
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{meta?.from || "Неизвестный"}</p>
          <p className="font-mono text-xs text-stone-500">{meta?.channel || "DM"}</p>
        </div>
      </div>
      <div className="space-y-3 p-4">
        <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-stone-100 bg-stone-50 px-4 py-3 text-sm text-stone-800 dark:border-stone-700 dark:bg-stone-800/50 dark:text-stone-200">
          {meta?.preview || "…"}
        </div>
      </div>
    </div>
  );
}

function EmailChrome({ meta }: { meta?: Record<string, string> }) {
  return (
    <div className={shell}>
      <div className="border-b border-stone-200/80 bg-stone-50/80 px-4 py-3 dark:border-stone-700/60 dark:bg-stone-800/40">
        <p className="font-mono text-xs text-stone-500">Кому: вам</p>
        <p className="text-sm font-medium text-stone-900 dark:text-stone-100">{meta?.subject || "(без темы)"}</p>
        <p className="mt-1 font-mono text-xs text-stone-500">От: {meta?.from || "???"}</p>
      </div>
      <div className="p-4 text-sm text-stone-800 dark:text-stone-200">
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-stone-300/80 p-3 text-xs dark:border-stone-600">
          <span className="rounded-lg border border-red-200/80 bg-red-50 px-2 py-0.5 font-medium text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            Вложение
          </span>
          <span className="font-mono text-[13px] font-medium text-stone-900 dark:text-stone-100">
            {meta?.attachment || "счёт_срочно.xlsm"}
          </span>
        </div>
      </div>
    </div>
  );
}

function PhoneChrome({ meta }: { meta?: Record<string, string> }) {
  return (
    <div className="relative mx-auto max-w-[280px] rounded-[2rem] border border-stone-300/90 bg-stone-900 p-2 shadow-soft-lg dark:border-stone-600">
      <div className="absolute left-1/2 top-3 h-1 w-12 -translate-x-1/2 rounded-full bg-stone-600"></div>
      <div className="mt-10 space-y-4 rounded-[1.35rem] bg-stone-950 px-3 pb-8 pt-4">
        <div className="rounded-xl border border-stone-700/50 bg-stone-900/80 p-3 text-center">
          <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-stone-500">уведомление</p>
          <p className="mt-1 text-sm font-medium text-stone-100">{meta?.title || "Система"}</p>
          <p className="mt-2 text-xs text-stone-400">{meta?.body || ""}</p>
        </div>
      </div>
    </div>
  );
}

function WifiChrome({ meta }: { meta?: Record<string, string> }) {
  return (
    <div className="rounded-2xl border border-stone-700/50 bg-stone-900 p-6 text-stone-100 shadow-soft-md dark:border-stone-600">
      <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-stone-400">wi-fi</p>
      <p className="mt-3 text-sm leading-relaxed text-stone-200">
        {meta?.networks || meta?.url || meta?.popup || "Сеть в зоне видимости."}
      </p>
    </div>
  );
}

function UiChrome({
  type,
  meta,
}: {
  type: ScenarioUiType;
  meta?: Record<string, string>;
}) {
  switch (type) {
    case "messenger":
      return <MessengerChrome meta={meta} />;
    case "email":
      return <EmailChrome meta={meta} />;
    case "phone":
      return <PhoneChrome meta={meta} />;
    case "wifi":
      return <WifiChrome meta={meta} />;
  }
}

export function ScenarioStage({ step }: { step: ScenarioStep }) {
  return (
    <div className="relative motion-safe:animate-blur-in">
      <div className="absolute -left-2 top-0 hidden h-full w-px rounded-full bg-gradient-to-b from-emerald-400/50 via-stone-300/60 to-transparent md:block dark:from-emerald-500/30 dark:via-stone-600"></div>
      <UiChrome type={step.uiType} meta={step.uiMeta} />
    </div>
  );
}
