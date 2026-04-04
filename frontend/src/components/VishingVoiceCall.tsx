import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/i18n/I18nContext";
import type { ApiVoiceCall } from "@/lib/simulationClient";

type Msg = { from: string; text: string };

function playRingPattern(ctx: AudioContext, shouldAbort: () => boolean): Promise<void> {
  const rings = 3;
  const toneMs = 320;
  const gapMs = 220;
  const f1 = 440;
  const f2 = 480;

  return new Promise((resolve) => {
    let n = 0;
    const schedule = () => {
      if (shouldAbort()) {
        resolve();
        return;
      }
      if (n >= rings) {
        resolve();
        return;
      }
      n += 1;
      const t0 = ctx.currentTime;
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const g = ctx.createGain();
      o1.frequency.value = f1;
      o2.frequency.value = f2;
      o1.type = "sine";
      o2.type = "sine";
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.08, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + toneMs / 1000);
      o1.connect(g);
      o2.connect(g);
      g.connect(ctx.destination);
      o1.start(t0);
      o2.start(t0);
      o1.stop(t0 + toneMs / 1000 + 0.05);
      o2.stop(t0 + toneMs / 1000 + 0.05);
      window.setTimeout(schedule, toneMs + gapMs);
    };
    schedule();
  });
}

export function VishingVoiceCall({
  voiceCall,
  messages,
  disabled,
  onHighlightIndex,
}: {
  voiceCall: ApiVoiceCall;
  messages: Msg[];
  disabled?: boolean;
  onHighlightIndex: (index: number | null) => void;
}) {
  const { locale, t } = useI18n();
  const [phase, setPhase] = useState<"idle" | "ringing" | "playing" | "paused" | "ended">("idle");
  const [driver, setDriver] = useState<"none" | "audio" | "tts">("none");
  const [ttsFallback, setTtsFallback] = useState(false);
  const [audioProgress, setAudioProgress] = useState<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ttsCancelRef = useRef(false);
  const ringGenRef = useRef(0);

  const peerIndices = useMemo(
    () => messages.map((m, i) => (m.from === "peer" ? i : -1)).filter((i) => i >= 0),
    [messages],
  );

  const ttsLang = locale === "en" ? "en-US" : "ru-RU";
  const pauseBetweenMs = voiceCall.pause_between_ms ?? 550;

  const hasAudioSrc = Boolean(voiceCall.audio_src?.trim());
  const wantsRecorded =
    hasAudioSrc && (voiceCall.mode === "audio" || voiceCall.mode === "hybrid");

  const stopAll = useCallback(() => {
    ringGenRef.current += 1;
    ttsCancelRef.current = true;
    setDriver("none");
    setTtsFallback(false);
    setAudioProgress(null);
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* ignore */
    }
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.removeAttribute("src");
      a.load();
    }
    onHighlightIndex(null);
    setPhase("idle");
  }, [onHighlightIndex]);

  useEffect(() => {
    return () => {
      ringGenRef.current += 1;
      ttsCancelRef.current = true;
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* ignore */
      }
      const a = audioRef.current;
      if (a) {
        a.pause();
      }
      void audioCtxRef.current?.close();
    };
  }, []);

  const runTts = useCallback(async () => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setPhase("ended");
      setDriver("none");
      return;
    }
    ttsCancelRef.current = false;
    const synth = window.speechSynthesis;
    synth.cancel();
    setDriver("tts");

    for (let p = 0; p < peerIndices.length; p++) {
      if (ttsCancelRef.current) break;
      const mi = peerIndices[p]!;
      onHighlightIndex(mi);
      const text = messages[mi]?.text ?? "";
      await new Promise<void>((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = ttsLang;
        u.rate = 0.92;
        u.onend = () => resolve();
        u.onerror = () => resolve();
        synth.speak(u);
      });
      if (ttsCancelRef.current) break;
      if (p < peerIndices.length - 1) {
        await new Promise<void>((r) => window.setTimeout(r, pauseBetweenMs));
      }
    }
    if (!ttsCancelRef.current) {
      onHighlightIndex(null);
      setPhase("ended");
      setDriver("none");
    }
  }, [messages, onHighlightIndex, pauseBetweenMs, peerIndices, ttsLang]);

  const startPlayback = useCallback(async () => {
    if (disabled) return;
    stopAll();
    ttsCancelRef.current = false;
    setTtsFallback(false);
    const sessionGen = ringGenRef.current;

    const afterRing = async () => {
      if (sessionGen !== ringGenRef.current || ttsCancelRef.current) return;

      if (wantsRecorded) {
        const a = audioRef.current;
        const url = voiceCall.audio_src!.trim();
        if (a) {
          a.src = url;
          a.load();
          const loaded = await new Promise<boolean>((resolve) => {
            let settled = false;
            const to = window.setTimeout(() => {
              if (!settled) {
                settled = true;
                resolve(false);
              }
            }, 12000);
            const finish = (v: boolean) => {
              if (settled) return;
              settled = true;
              window.clearTimeout(to);
              resolve(v);
            };
            a.onloadeddata = () => finish(true);
            a.oncanplaythrough = () => finish(true);
            a.onerror = () => finish(false);
          });
          a.onloadeddata = null;
          a.oncanplaythrough = null;
          a.onerror = null;

          if (sessionGen !== ringGenRef.current || ttsCancelRef.current) return;

          if (loaded) {
            try {
              setDriver("audio");
              setPhase("playing");
              setAudioProgress(0);
              await a.play();
              return;
            } catch {
              /* fall through */
            }
          }

          if (voiceCall.mode === "hybrid") {
            setTtsFallback(true);
            setPhase("playing");
            await runTts();
            return;
          }
          setPhase("idle");
          return;
        }
      }

      setPhase("playing");
      await runTts();
    };

    setPhase("ringing");
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
          audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") await ctx.resume();
        await playRingPattern(ctx, () => sessionGen !== ringGenRef.current || ttsCancelRef.current);
      }
    } catch {
      /* ring optional */
    }

    await afterRing();
  }, [disabled, runTts, stopAll, voiceCall.audio_src, voiceCall.mode, wantsRecorded]);

  const togglePause = useCallback(() => {
    if (driver === "audio") {
      const a = audioRef.current;
      if (!a?.src) return;
      if (a.paused) {
        void a.play();
        setPhase("playing");
      } else {
        a.pause();
        setPhase("paused");
      }
      return;
    }
    if (driver === "tts") {
      if (phase === "playing") {
        try {
          window.speechSynthesis.pause();
        } catch {
          /* ignore */
        }
        setPhase("paused");
      } else if (phase === "paused") {
        try {
          window.speechSynthesis.resume();
        } catch {
          /* ignore */
        }
        setPhase("playing");
      }
    }
  }, [driver, phase]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !hasAudioSrc) return;

    const cues = voiceCall.cues_sec ?? [];
    const onTime = () => {
      if (driver !== "audio") return;
      const dur = a.duration;
      if (dur && Number.isFinite(dur) && dur > 0) {
        setAudioProgress(a.currentTime / dur);
      }
      const t = a.currentTime;
      let active: number | null = null;
      for (let i = cues.length - 1; i >= 0; i--) {
        if (t + 0.04 >= cues[i]!) {
          const pi = peerIndices[i];
          if (pi !== undefined) active = pi;
          break;
        }
      }
      onHighlightIndex(active);
    };

    const onEnded = () => {
      onHighlightIndex(null);
      setAudioProgress(null);
      setDriver("none");
      setPhase("ended");
    };

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnded);
    };
  }, [driver, hasAudioSrc, onHighlightIndex, peerIndices, voiceCall.cues_sec]);

  const hintText = useMemo(() => {
    if (voiceCall.mode === "hybrid") {
      return ttsFallback ? t("sim.vishingTtsHint") : t("sim.vishingHybridHint");
    }
    if (voiceCall.mode === "audio") {
      return t("sim.vishingAudioHint");
    }
    return t("sim.vishingTtsHint");
  }, [voiceCall.mode, ttsFallback, t]);

  const showProgress =
    driver === "audio" && audioProgress !== null && (phase === "playing" || phase === "paused");
  const showAudioChrome = hasAudioSrc && (voiceCall.mode === "audio" || (voiceCall.mode === "hybrid" && !ttsFallback));

  return (
    <div className="mb-4 rounded-2xl border border-violet-200/80 bg-violet-50/90 px-4 py-3 dark:border-violet-900/50 dark:bg-violet-950/35">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-violet-600/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900 dark:text-violet-200">
          {voiceCall.label?.trim() || t("sim.vishingBadge")}
        </span>
        {phase === "ringing" ? (
          <span className="text-xs font-medium text-violet-800 dark:text-violet-200/90">{t("sim.vishingRinging")}</span>
        ) : null}
        {phase === "playing" ? (
          <span className="text-xs font-medium text-violet-800 dark:text-violet-200/90">
            {driver === "audio" ? t("sim.vishingPlayingTrack") : t("sim.vishingPlaying")}
          </span>
        ) : null}
        {phase === "ended" ? (
          <span className="text-xs text-violet-700/80 dark:text-violet-300/75">{t("sim.vishingEnded")}</span>
        ) : null}
        {ttsFallback ? (
          <span className="text-[10px] font-medium text-amber-800 dark:text-amber-200/90">{t("sim.vishingFallbackBadge")}</span>
        ) : null}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-violet-900/75 dark:text-violet-200/70">{hintText}</p>
      {showProgress ? (
        <div className="mt-2 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-violet-200/80 dark:bg-violet-900/50">
          <div
            className="h-full rounded-full bg-violet-600 transition-[width] duration-150 dark:bg-violet-400"
            style={{ width: `${Math.min(100, Math.max(0, audioProgress! * 100))}%` }}
          />
        </div>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || phase === "ringing"}
          onClick={() => void startPlayback()}
          className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-40"
        >
          {phase === "idle" || phase === "ended" ? t("sim.vishingPlay") : t("sim.vishingReplay")}
        </button>
        {(driver === "audio" || driver === "tts") && (phase === "playing" || phase === "paused") ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => togglePause()}
            className="rounded-xl border border-violet-400/60 bg-white/80 px-4 py-2 text-xs font-semibold text-violet-900 dark:border-violet-700 dark:bg-zinc-900/60 dark:text-violet-100"
          >
            {phase === "paused" ? t("sim.vishingResume") : t("sim.vishingPause")}
          </button>
        ) : null}
        <button
          type="button"
          disabled={disabled || phase === "idle" || phase === "ended"}
          onClick={stopAll}
          className="rounded-xl border border-stone-300/80 px-4 py-2 text-xs font-medium text-stone-700 dark:border-zinc-600 dark:text-stone-200"
        >
          {t("sim.vishingStop")}
        </button>
      </div>
      {hasAudioSrc ? (
        <audio
          ref={audioRef}
          className={showAudioChrome ? "mt-2 h-8 w-full max-w-md" : "sr-only"}
          controls={showAudioChrome}
          preload="none"
          aria-hidden={!showAudioChrome}
        />
      ) : null}
    </div>
  );
}
