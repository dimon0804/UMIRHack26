/** Фон: чёрный базис, mesh-cyber, зерно, зелёные орбы. */
export function AmbientBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-paper dark:bg-[#030303]" />
      <div className="absolute inset-0 bg-mesh-light dark:bg-mesh-cyber" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_100%_55%_at_50%_-12%,rgb(16_185_129_/_0.12),transparent_58%)] dark:bg-[radial-gradient(ellipse_85%_45%_at_50%_-5%,rgb(52_211_153_/_0.22),transparent_52%)]" />
      <div
        className="absolute inset-0 bg-noise opacity-[0.32] mix-blend-overlay dark:opacity-[0.22]"
        style={{ backgroundSize: "160px 160px" }}
      />
      <div className="absolute -left-32 top-[-10%] h-[480px] w-[480px] animate-orb-drift rounded-full bg-emerald-200/35 blur-[120px] will-change-transform dark:bg-emerald-500/20" />
      <div className="absolute bottom-[-15%] right-[-10%] h-[440px] w-[440px] animate-orb-drift-slow rounded-full bg-teal-200/28 blur-[110px] will-change-transform dark:bg-emerald-600/12" />
      <div className="absolute left-1/2 top-[12%] h-[340px] w-[340px] -translate-x-1/2 animate-orb-drift-reverse rounded-full bg-emerald-100/38 blur-[95px] will-change-transform dark:bg-lime-400/10" />
      <div className="absolute bottom-1/4 left-[8%] h-56 w-56 animate-pulse-soft rounded-full bg-cyan-200/18 blur-[72px] dark:bg-emerald-400/08" />
    </div>
  );
}
