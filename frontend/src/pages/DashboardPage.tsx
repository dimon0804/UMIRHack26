import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n/I18nContext";
import { useRealApi } from "@/api/client";
import { progressToNextLeague, leagueByXp } from "@/lib/leagues";
import { certificateEligible } from "@/lib/certificate";
import { isCustomSimulationId, MODULE_TOTAL_STEPS } from "@/lib/courseScenarios";
import {
  deleteCustomScenario,
  generateAiScenario,
  listCustomScenarios,
  saveCustomScenario,
  type CustomScenarioListItem,
} from "@/lib/customScenarioClient";
import { fetchSimulationScenarioList, type ApiScenarioListItem } from "@/lib/simulationClient";

function ScenarioIcon({ type }: { type: ApiScenarioListItem["type"] }) {
  const cls = "size-10 text-emerald-700 dark:text-emerald-400/90";
  if (type === "email")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M4 6h16v12H4z" />
        <path d="M4 8l8 5 8-5" />
      </svg>
    );
  if (type === "wifi")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path d="M5 12.55a11 11 0 0114.08 0" />
        <path d="M8.53 16.11a6 6 0 016.95 0" />
        <path d="M12 20h.01" />
      </svg>
    );
  if (type === "terminal")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="5" y="7" width="14" height="10" rx="2" />
        <path d="M8 14h8M9 11h6" />
      </svg>
    );
  if (type === "action_cards")
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </svg>
    );
  return (
    <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

export function DashboardPage() {
  const { userState, user, scenarioStatus, restartScenario } = useApp();
  const nav = useNavigate();
  const { locale, t } = useI18n();
  const realApi = useRealApi();
  const [items, setItems] = useState<ApiScenarioListItem[]>([]);
  const [customItems, setCustomItems] = useState<CustomScenarioListItem[]>([]);
  const [listErr, setListErr] = useState<string | null>(null);
  const [customErr, setCustomErr] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState<"email" | "chat" | null>(null);

  const displayItems = useMemo((): ApiScenarioListItem[] => {
    const tail: ApiScenarioListItem[] = customItems.map((c) => ({
      id: c.id,
      type: c.type,
      title: c.title,
    }));
    return [...items, ...tail];
  }, [items, customItems]);

  useEffect(() => {
    void fetchSimulationScenarioList(locale)
      .then((r) => {
        setItems(r.scenarios);
        setListErr(null);
      })
      .catch((e) => setListErr(e instanceof Error ? e.message : "list error"));
  }, [locale]);

  useEffect(() => {
    if (!realApi || !user?.token) {
      setCustomItems([]);
      return;
    }
    void listCustomScenarios(user.token)
      .then((list) => {
        setCustomItems(list);
        setCustomErr(null);
      })
      .catch(() => setCustomItems([]));
  }, [realApi, user?.token]);

  async function generateAndSave(kind: "email" | "chat") {
    if (!user?.token) return;
    setCustomErr(null);
    setGenLoading(kind);
    try {
      const scenario = await generateAiScenario(kind, locale);
      await saveCustomScenario(user.token, scenario);
      setCustomItems(await listCustomScenarios(user.token));
    } catch (e) {
      setCustomErr(e instanceof Error ? e.message : "error");
    } finally {
      setGenLoading(null);
    }
  }

  async function removeCustom(id: string) {
    if (!user?.token) return;
    setCustomErr(null);
    try {
      await deleteCustomScenario(user.token, id);
      restartScenario(id);
      setCustomItems(await listCustomScenarios(user.token));
    } catch (e) {
      setCustomErr(e instanceof Error ? e.message : "error");
    }
  }

  if (!userState) return null;

  const successPct =
    userState.totalAnswers > 0
      ? Math.round((userState.totalCorrect / userState.totalAnswers) * 100)
      : 0;
  const leagueProg = progressToNextLeague(userState.xp, locale);
  const currentLeague = leagueByXp(userState.xp, locale);
  const certOk = certificateEligible(userState);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 motion-safe:animate-fade-in-up md:px-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="kicker">{t("dashboard.kicker")}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            <span className="text-gradient-moss">{t("dashboard.title")}</span>
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-stone-500 dark:text-zinc-400">
            {t("dashboard.sub")}
          </p>
        </div>
        <div className="card-brutal motion-safe:animate-pop-in px-6 py-5 shadow-glow-sm transition-transform duration-300 [animation-delay:120ms] hover:-translate-y-1 hover:shadow-glow-emerald">
          <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{t("dashboard.rep")}</p>
          <p className="mt-1 bg-gradient-to-br from-emerald-700 via-teal-600 to-emerald-800 bg-clip-text font-display text-3xl font-semibold text-transparent dark:from-emerald-300 dark:via-teal-300 dark:to-emerald-400">
            {userState.hp}
          </p>
        </div>
      </div>

      {listErr ? (
        <p className="mt-6 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
          {listErr}
        </p>
      ) : null}

      <div className="mt-12 grid gap-8 motion-safe:animate-fade-in-up lg:grid-cols-3 [animation-delay:90ms]">
        <section className="card-brutal p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-ink dark:text-stone-100">
            {t("dashboard.scenariosTitle")}
          </h2>
          {realApi && user?.token ? (
            <div className="mt-6 rounded-2xl border border-violet-200/80 bg-violet-50/50 p-4 dark:border-violet-900/40 dark:bg-violet-950/20">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-800 dark:text-violet-200">
                {t("dashboard.customKicker")}
              </p>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{t("dashboard.customSub")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={genLoading !== null}
                  onClick={() => void generateAndSave("email")}
                  className="btn-primary !text-xs disabled:opacity-50"
                >
                  {genLoading === "email" ? t("dashboard.customGenerating") : t("dashboard.customGenEmail")}
                </button>
                <button
                  type="button"
                  disabled={genLoading !== null}
                  onClick={() => void generateAndSave("chat")}
                  className="btn-ghost !text-xs disabled:opacity-50"
                >
                  {genLoading === "chat" ? t("dashboard.customGenerating") : t("dashboard.customGenChat")}
                </button>
              </div>
              {customErr ? (
                <p className="mt-2 text-xs text-red-700 dark:text-red-400">{customErr}</p>
              ) : null}
            </div>
          ) : null}
          <ul className="mt-8 space-y-4">
            {displayItems.map((s, i) => {
              const st = scenarioStatus(s.id);
              const prog = userState.progress[s.id];
              const stepsTotal = isCustomSimulationId(s.id) ? 1 : MODULE_TOTAL_STEPS;
              const doneLevels =
                st === "completed"
                  ? stepsTotal
                  : Math.max(0, Math.min((prog?.currentStep ?? 1) - 1, stepsTotal));
              const label =
                st === "locked"
                  ? t("dashboard.locked")
                  : st === "completed"
                    ? t("dashboard.completed")
                    : t("dashboard.available");
              return (
                <li
                  key={s.id}
                  className="card-brutal motion-safe:animate-fade-in-up flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between"
                  style={{ animationDelay: `${i * 90}ms` }}
                >
                  <div className="flex gap-4">
                    <div
                      className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/80 ring-1 ring-emerald-100/90 dark:from-emerald-950/60 dark:to-teal-950/30 dark:ring-emerald-900/50"
                    >
                      <ScenarioIcon type={s.type} />
                    </div>
                    <div>
                      <h3 className="flex flex-wrap items-center gap-2 font-display text-base font-medium text-ink dark:text-stone-100">
                        <span>{s.title}</span>
                        {isCustomSimulationId(s.id) ? (
                          <span className="rounded-full bg-violet-500/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-violet-800 dark:text-violet-200">
                            {t("dashboard.customBadge")}
                          </span>
                        ) : null}
                      </h3>
                      <p className="mt-2 font-mono text-xs text-stone-500 dark:text-zinc-400">
                        {st === "completed" ? (
                          t("dashboard.moduleCompletedLine", { n: String(stepsTotal) })
                        ) : (
                          <>
                            {t("dashboard.levelsProgress", {
                              total: String(stepsTotal),
                              done: String(doneLevels),
                            })}{" "}
                            · <span className="font-medium">{label}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 md:items-end">
                    {isCustomSimulationId(s.id) && user?.token ? (
                      <button
                        type="button"
                        onClick={() => void removeCustom(s.id)}
                        className="text-xs text-stone-500 underline decoration-stone-300 underline-offset-2 hover:text-red-700 dark:text-stone-400 dark:hover:text-red-400"
                      >
                        {t("dashboard.customDelete")}
                      </button>
                    ) : null}
                    {st !== "locked" ? (
                      st === "completed" ? (
                        <button
                          type="button"
                          className="btn-primary text-center"
                          onClick={() => {
                            restartScenario(s.id);
                            nav(`/sim/run/${s.id}`);
                          }}
                        >
                          {t("dashboard.again")}
                        </button>
                      ) : (
                        <Link to={`/sim/run/${s.id}`} className="btn-primary text-center !no-underline">
                          {t("dashboard.start")}
                        </Link>
                      )
                    ) : (
                      <span className="rounded-full border border-dashed border-stone-300 bg-stone-50/40 px-4 py-2 text-sm text-stone-500 dark:border-stone-600 dark:bg-zinc-900/40 dark:text-zinc-400">
                        {t("dashboard.prevFirst")}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="space-y-6">
          <section className="card-brutal motion-safe:animate-fade-in-up p-6 [animation-delay:200ms]">
            <h2 className="kicker-block">{t("dashboard.stats")}</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <div className="flex justify-between border-b border-stone-200/80 pb-3 dark:border-stone-700/60">
                <dt className="text-stone-500">{t("dashboard.statsModules")}</dt>
                <dd className="font-mono font-medium text-ink dark:text-stone-100">
                  {userState.scenariosCompleted.length}
                </dd>
              </div>
              <div className="flex justify-between border-b border-stone-200/80 pb-3 dark:border-stone-700/60">
                <dt className="text-stone-500">{t("dashboard.statsCorrect")}</dt>
                <dd className="font-mono font-medium text-stone-700 dark:text-stone-300">{successPct}%</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-stone-500">{t("dashboard.statsMistakes")}</dt>
                <dd className="font-mono font-medium text-red-700 dark:text-red-400">{userState.totalMistakes}</dd>
              </div>
            </dl>
          </section>

          <section className="motion-safe:animate-fade-in-up rounded-3xl border border-emerald-100/80 bg-gradient-to-br from-stone-50/90 to-emerald-50/30 p-6 shadow-soft ring-1 ring-emerald-200/20 dark:border-emerald-900/30 dark:from-stone-900/40 dark:to-emerald-950/20 [animation-delay:280ms]">
            <h2 className="font-display text-base font-semibold text-ink dark:text-stone-100">{currentLeague.label}</h2>
            {leagueProg ? (
              <>
                <p className="mt-2 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
                  {t("dashboard.leagueTo", { label: leagueProg.next.label })}
                </p>
                <div className="progress-track-emerald mt-4 h-2.5">
                  <div className="progress-fill" style={{ width: `${leagueProg.percent}%` }} />
                </div>
                <p className="mt-3 text-xs text-stone-500">{currentLeague.description}</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-stone-500">{t("dashboard.leagueMax")}</p>
            )}
          </section>

          <Link
            to="/certificate"
            className={`motion-safe:animate-fade-in-up block rounded-3xl px-6 py-4 text-center text-sm font-medium shadow-soft [animation-delay:360ms] ${
              certOk
                ? "border border-emerald-600/30 bg-gradient-to-r from-emerald-700 to-teal-700 text-white shadow-glow-emerald hover:scale-[1.02]"
                : "border border-dashed border-stone-300 bg-stone-50/50 text-stone-600 dark:border-stone-600 dark:bg-stone-900/25 dark:text-stone-300"
            }`}
          >
            {certOk ? t("dashboard.certOpen") : t("dashboard.certLocked")}
          </Link>
        </aside>
      </div>
    </div>
  );
}
