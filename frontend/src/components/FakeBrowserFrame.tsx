import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nContext";

/** Имитация окна браузера: только UI, без реальной навигации и iframe. */
export function FakeBrowserFrame({
  url,
  tabLabel,
  children,
}: {
  url: string;
  tabLabel: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-300/90 bg-stone-100 shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-stone-200/90 bg-stone-200/80 px-2 py-2 dark:border-zinc-700 dark:bg-zinc-800/90">
        <div className="flex gap-1.5 pl-1">
          <span className="size-2.5 rounded-full bg-red-400/90" aria-hidden />
          <span className="size-2.5 rounded-full bg-amber-400/90" aria-hidden />
          <span className="size-2.5 rounded-full bg-emerald-500/80" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 rounded-lg border border-stone-300/80 bg-white px-3 py-1.5 font-mono text-[10px] text-stone-600 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-400">
          <span className="text-emerald-600 dark:text-emerald-500">https://</span>
          <span className="break-all">{url.replace(/^https?:\/\//, "")}</span>
        </div>
      </div>
      <div className="border-b border-stone-200/80 bg-white px-2 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
        <div className="inline-flex max-w-full items-center gap-2 rounded-t-lg bg-stone-100 px-3 py-1 font-mono text-[10px] text-stone-700 dark:bg-zinc-800 dark:text-zinc-300">
          <span className="truncate">{tabLabel}</span>
          <span className="text-stone-400 dark:text-zinc-500" aria-hidden>
            ×
          </span>
        </div>
      </div>
      <div className="relative bg-white dark:bg-zinc-950">
        <p className="absolute right-2 top-2 z-10 rounded bg-amber-100/95 px-2 py-0.5 font-mono text-[9px] font-medium text-amber-950 dark:bg-amber-900/40 dark:text-amber-100">
          {t("sim.fakeBrowser")}
        </p>
        {children}
      </div>
    </div>
  );
}
