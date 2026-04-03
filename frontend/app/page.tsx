"use client";

import { useCallback, useEffect, useState } from "react";

import { HeaderBar } from "@/components/header-bar";
import { useLocale } from "@/components/providers";
import { apiUrl, getJson, postJson, type TokenPair } from "@/lib/api";

type MeResponse = {
  user: { id: string; email: string; locale: string };
};

const TOKEN_KEY = "cyber_sim_access";

export default function HomePage() {
  const { locale, t } = useLocale();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const existing = typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null;
    if (existing) setToken(existing);
  }, []);

  const loadMe = useCallback(
    async (access: string) => {
      const r = await getJson<MeResponse>("/api/v1/auth/me", access, locale);
      if (r.ok) setMe(r.data.user);
      else {
        setMe(null);
        setMessage(r.error);
      }
    },
    [locale],
  );

  useEffect(() => {
    if (token) void loadMe(token);
    else setMe(null);
  }, [token, loadMe]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/v1/health"));
      setHealth(await res.json());
    } catch {
      setHealth({ error: "unreachable" });
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const path = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
    const body =
      mode === "login"
        ? { email, password }
        : { email, password, locale: locale === "en" ? "en" : "ru" };
    const r = await postJson<TokenPair>(path, body, locale);
    setLoading(false);
    if (!r.ok) {
      setMessage(r.error || t("errorGeneric"));
      return;
    }
    sessionStorage.setItem(TOKEN_KEY, r.data.access_token);
    setToken(r.data.access_token);
    setMessage(null);
    await loadMe(r.data.access_token);
  }

  function logout() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setMe(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <HeaderBar />
      <main className="mx-auto flex max-w-lg flex-col gap-8 px-6 py-12">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{t("title")}</h1>
          <p className="mt-2 text-sm text-ink-muted">{t("subtitle")}</p>
        </div>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-panel dark:border-slate-800 dark:bg-slate-950 dark:shadow-panel-dark">
          {me ? (
            <div className="space-y-4">
              <p className="text-lg font-medium text-ink">{t("loggedIn")}</p>
              <p className="font-mono text-sm text-ink-muted">{me.email}</p>
              <p className="text-xs text-ink-muted">{t("tokenHint")}</p>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
              >
                {t("logout")}
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 flex rounded-xl bg-surface-muted p-1 dark:bg-slate-900">
                <button
                  type="button"
                  className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                    mode === "login"
                      ? "bg-white text-ink shadow-sm dark:bg-slate-800 dark:text-slate-100"
                      : "text-ink-muted"
                  }`}
                  onClick={() => setMode("login")}
                >
                  {t("login")}
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                    mode === "register"
                      ? "bg-white text-ink shadow-sm dark:bg-slate-800 dark:text-slate-100"
                      : "text-ink-muted"
                  }`}
                  onClick={() => setMode("register")}
                >
                  {t("register")}
                </button>
              </div>
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">{t("email")}</label>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-accent/0 transition focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-ink-muted">{t("password")}</label>
                  <input
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
                {message ? <p className="text-sm text-danger">{message}</p> : null}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover disabled:opacity-60"
                >
                  {loading ? "…" : mode === "login" ? t("submitLogin") : t("submitRegister")}
                </button>
              </form>
            </>
          )}
        </section>

        <section className="rounded-2xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium text-ink-muted">{t("health")}</h2>
            <button
              type="button"
              onClick={() => void fetchHealth()}
              className="text-xs text-accent hover:underline"
            >
              ↻
            </button>
          </div>
          <pre className="max-h-40 overflow-auto font-mono text-[11px] text-ink-muted">
            {health ? JSON.stringify(health, null, 2) : "…"}
          </pre>
        </section>
      </main>
    </div>
  );
}
