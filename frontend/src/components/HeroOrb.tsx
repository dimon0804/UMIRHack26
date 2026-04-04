/** Органическая «медуза» / биолюминесценция — неоново-зелёная, для hero auth. */
export function HeroOrb() {
  return (
    <div
      className="pointer-events-none relative mx-auto flex h-64 w-64 items-center justify-center md:h-80 md:w-80"
      aria-hidden
    >
      <div className="absolute inset-0 rounded-full bg-emerald-500/15 blur-[100px] motion-safe:animate-organic" />
      <div className="absolute left-1/4 top-1/4 h-32 w-32 rounded-[40%_60%_55%_45%] bg-emerald-400/35 blur-[48px] motion-safe:animate-organic [animation-delay:-2s]" />
      <div className="absolute bottom-1/4 right-1/4 h-40 w-40 rounded-[55%_45%_50%_50%] bg-teal-400/25 blur-[56px] motion-safe:animate-organic [animation-delay:-5s]" />
      <svg
        className="relative z-[1] h-full w-full max-w-[min(100%,280px)] text-emerald-400/90 drop-shadow-[0_0_40px_rgb(34_197_94_/_0.45)]"
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="heroOrbCore" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="rgb(134 239 172)" stopOpacity="0.95" />
            <stop offset="45%" stopColor="rgb(52 211 153)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="rgb(6 95 70)" stopOpacity="0.15" />
          </radialGradient>
          <linearGradient id="heroOrbVeil" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgb(74 222 128)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="rgb(20 184 166)" stopOpacity="0.08" />
          </linearGradient>
          <filter id="heroOrbGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <ellipse cx="100" cy="108" rx="72" ry="64" fill="url(#heroOrbCore)" opacity="0.85" filter="url(#heroOrbGlow)" />
        <path
          d="M100 44c-28 0-50 22-50 50 0 18 9 34 23 43-8 22-12 46-12 63h10c0-14 3-34 9-52 6 4 13 6 20 6s14-2 20-6c6 18 9 38 9 52h10c0-17-4-41-12-63 14-9 23-25 23-43 0-28-22-50-50-50z"
          fill="url(#heroOrbVeil)"
          className="motion-safe:animate-organic"
        />
        <path
          d="M58 150c12-8 24-6 36 2s28 8 40-2M52 162c10-6 22-4 32 4s26 6 38-4"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.45"
        />
        <circle cx="88" cy="92" r="5" fill="rgb(220 252 231)" opacity="0.9" />
        <circle cx="112" cy="88" r="3.5" fill="rgb(167 243 208)" opacity="0.75" />
      </svg>
    </div>
  );
}
