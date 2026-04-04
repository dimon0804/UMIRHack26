import type { ReactNode } from "react";
import { useI18n } from "@/i18n/I18nContext";

/** Имитация мессенджера — только оформление. */
export function FakeMessengerFrame({
  peerName,
  peerHandle,
  children,
}: {
  peerName: string;
  peerHandle: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-300/90 bg-stone-100 shadow-lg dark:border-zinc-600 dark:bg-zinc-900">
      <div className="flex items-center gap-3 border-b border-stone-200/90 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-900">
        <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 font-display text-sm font-bold text-white">
          {peerName.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-stone-900 dark:text-stone-100">{peerName}</p>
          <p className="font-mono text-xs text-stone-500 dark:text-zinc-400">@{peerHandle}</p>
        </div>
        <span className="hidden rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[9px] text-emerald-800 dark:text-emerald-300 sm:inline">
          {t("sim.fakeMessenger")}
        </span>
      </div>
      <div className="relative bg-stone-50/80 p-4 dark:bg-zinc-950/80">{children}</div>
    </div>
  );
}
