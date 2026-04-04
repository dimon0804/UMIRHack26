import { useEffect, useState } from "react";

export function HackOverlay({ active, onDone }: { active: boolean; onDone: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!active) {
      setPhase(0);
      return;
    }
    const t1 = window.setTimeout(() => setPhase(1), 120);
    const t2 = window.setTimeout(() => setPhase(2), 900);
    const t3 = window.setTimeout(() => {
      onDone();
      setPhase(0);
    }, 2400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [active, onDone]);

  if (!active && phase === 0) return null;

  const backdropClass =
    phase >= 1
      ? "bg-red-500/[0.12] dark:bg-black/80 dark:backdrop-blur-md"
      : "bg-stone-900/[0.22] dark:bg-black/55";

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-[3px] transition-[background-color] duration-500 ease-soft ${backdropClass}`}
      aria-hidden
    >
      {phase >= 1 && (
        <div className="pointer-events-auto relative mx-4 max-w-md overflow-hidden rounded-2xl border border-emerald-200/90 border-l-[3px] border-l-red-500/90 bg-emerald-50/95 shadow-[0_0_0_1px_rgb(16_185_129_/_0.12),0_24px_48px_-12px_rgb(5_150_105_/_0.25)] backdrop-blur-md dark:border-zinc-600/90 dark:border-l-red-500 dark:bg-zinc-950 dark:shadow-[0_0_0_1px_rgb(63_63_70_/_0.5),0_24px_56px_-12px_rgb(0_0_0_/_0.75)]">
          <div className="absolute -right-12 -top-12 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl dark:bg-red-500/15" />
          <div className="relative border-b border-emerald-200/80 bg-gradient-to-r from-emerald-100/90 to-teal-50/80 px-4 py-2.5 dark:border-zinc-700 dark:bg-zinc-900 dark:from-zinc-900 dark:to-zinc-900">
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-emerald-900/90 dark:text-zinc-300">
              Симуляция · инцидент
            </p>
          </div>
          <div className="relative bg-emerald-50/30 p-6 dark:bg-zinc-950">
            <h2 className="font-display text-lg font-semibold text-emerald-950 dark:text-zinc-50">
              Сессия под угрозой
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-emerald-900/90 dark:text-zinc-200">
              Учётные данные могли бы утечь. В бою — смена пароля и тикет в SOC.
            </p>
            <div className="mt-4 space-y-1.5 rounded-xl border border-emerald-200/60 bg-white/60 px-3 py-2.5 font-mono text-xs text-emerald-900/90 dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200">
              <p>
                <span className="text-red-600 dark:text-red-400">▍</span> exfil: session.toml [имитация]
              </p>
              <p>
                <span className="text-emerald-700 dark:text-emerald-400">▍</span> persistence: blocked
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
