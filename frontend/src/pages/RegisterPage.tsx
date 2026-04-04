import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n/I18nContext";
import { Spinner } from "@/components/Spinner";
import { HeroOrb } from "@/components/HeroOrb";

const MIN_LEN = 8;

export function RegisterPage() {
  const { t } = useI18n();
  const { register, loading, authError, clearAuthError, user, authHydrated } = useApp();
  const nav = useNavigate();
  const [loginVal, setLoginVal] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [localErr, setLocalErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalErr(null);
    clearAuthError();
    if (!loginVal.trim()) {
      setLocalErr(t("register.errLogin"));
      return;
    }
    if (password.length < MIN_LEN) {
      setLocalErr(t("register.errPwLen", { n: String(MIN_LEN) }));
      return;
    }
    if (password !== password2) {
      setLocalErr(t("register.errPwMatch"));
      return;
    }
    try {
      await register(loginVal.trim(), password);
      nav("/dashboard", { replace: true });
    } catch {
      /* context */
    }
  }

  if (!authHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-emerald-600 dark:text-emerald-400">
        <Spinner />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const err = localErr || authError;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_minmax(0,28rem)]">
      <div className="relative hidden flex-col justify-center overflow-hidden px-10 py-16 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_40%,rgb(34_197_94_/_0.12),transparent_65%)]" aria-hidden />
        <div className="relative motion-safe:animate-fade-in">
          <HeroOrb />
          <h2 className="mt-6 text-center font-display text-2xl font-semibold tracking-tight text-stone-900 dark:text-zinc-100 md:text-3xl">
            <span className="text-gradient-moss">Cipherline</span>
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-center text-sm leading-relaxed text-stone-600 dark:text-zinc-500">
            {t("register.heroLine2")}
          </p>
        </div>
      </div>
      <div className="flex flex-col justify-center px-4 py-16 lg:px-10">
      <div className="mx-auto w-full max-w-md motion-safe:animate-fade-in-up">
        <p className="kicker">{t("register.kicker")}</p>
        <h1 className="motion-safe:animate-blur-in font-display text-3xl font-semibold leading-tight tracking-tight md:text-4xl [animation-delay:40ms]">
          <span className="text-gradient-moss">{t("register.title")}</span>
        </h1>
        <p className="mt-4 text-base leading-relaxed text-stone-500 motion-safe:animate-fade-in-up dark:text-zinc-400 [animation-delay:90ms]">
          {t("register.sub")}
        </p>
        <form
          onSubmit={onSubmit}
          className="card-brutal mt-10 space-y-5 p-8 motion-safe:animate-pop-in [animation-delay:140ms]"
        >
          {err && (
            <div
              className="rounded-xl border border-red-200/80 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100"
              role="alert"
            >
              {err}
            </div>
          )}
          <label className="block text-sm font-medium text-ink dark:text-stone-100">
            {t("login.user")}
            <input
              className="input-brutal mt-2"
              value={loginVal}
              onChange={(e) => setLoginVal(e.target.value)}
              autoComplete="username"
            />
          </label>
          <label className="block text-sm font-medium text-ink dark:text-stone-100">
            {t("register.passwordMin", { n: String(MIN_LEN) })}
            <input
              type="password"
              className="input-brutal mt-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="block text-sm font-medium text-ink dark:text-stone-100">
            {t("register.confirm")}
            <input
              type="password"
              className="input-brutal mt-2"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
            />
          </label>
          <button type="submit" disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2">
            {loading && <Spinner className="size-4 border-white/30 border-t-white dark:border-stone-900/30 dark:border-t-stone-900" />}
            {t("register.submit")}
          </button>
        </form>
        <p className="mt-8 text-center text-sm text-stone-500 dark:text-zinc-500">
          {t("register.hasAccount")}{" "}
          <Link
            className="font-medium text-stone-800 underline decoration-stone-300 underline-offset-4 transition-colors hover:text-emerald-700 dark:text-emerald-300 dark:decoration-emerald-700/50 dark:hover:text-emerald-200"
            to="/login"
          >
            {t("login.submit")}
          </Link>
        </p>
        <p className="mt-10 text-center text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400 dark:text-zinc-600">
          Cipherline · sim-2026
        </p>
      </div>
      </div>
    </div>
  );
}
