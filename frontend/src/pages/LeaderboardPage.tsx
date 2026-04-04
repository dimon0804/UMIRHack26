import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { useI18n } from "@/i18n/I18nContext";
import { useRealApi } from "@/api/client";
import {
  fetchLeaderboard,
  fetchLeaderboardStats,
  fetchMyRank,
  leagueLabelForKey,
  type LeaderboardDto,
  type LeaderboardStatsDto,
  type MyRankDto,
  type SortKey,
} from "@/lib/leaderboardClient";

export function LeaderboardPage() {
  const { user, userState } = useApp();
  const { locale, t } = useI18n();
  const realApi = useRealApi();
  const [sort, setSort] = useState<SortKey>("xp");
  const [board, setBoard] = useState<LeaderboardDto | null>(null);
  const [stats, setStats] = useState<LeaderboardStatsDto | null>(null);
  const [mine, setMine] = useState<MyRankDto | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!realApi) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const [b, s] = await Promise.all([
          fetchLeaderboard(sort, 80),
          fetchLeaderboardStats(),
        ]);
        if (cancelled) return;
        setBoard(b);
        setStats(s);
        if (user?.token) {
          try {
            const m = await fetchMyRank(user.token);
            if (!cancelled) setMine(m);
          } catch {
            if (!cancelled) setMine(null);
          }
        } else {
          setMine(null);
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [realApi, sort, user?.token]);

  if (!userState) return null;

  if (!realApi) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 md:px-6">
        <p className="kicker">{t("leaderboard.kicker")}</p>
        <h1 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">
          {t("leaderboard.title")}
        </h1>
        <p className="mt-4 text-stone-600 dark:text-stone-400">{t("leaderboard.needGateway")}</p>
        <Link to="/dashboard" className="btn-primary mt-8 inline-block">
          {t("leaderboard.toDash")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 motion-safe:animate-fade-in-up md:px-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="kicker">{t("leaderboard.kicker")}</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl dark:text-stone-100">
            <span className="text-gradient-moss">{t("leaderboard.title")}</span>
          </h1>
          <p className="mt-2 max-w-xl text-sm text-stone-500 dark:text-stone-400">
            {t("leaderboard.sub")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["xp", "accuracy", "modules"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setSort(k)}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                sort === k
                  ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-glow-sm"
                  : "border border-stone-200 bg-white/80 text-stone-600 hover:border-emerald-300 dark:border-stone-700 dark:bg-stone-900/40 dark:text-stone-300"
              }`}
            >
              {t(`leaderboard.sort.${k}`)}
            </button>
          ))}
        </div>
      </div>

      {err ? (
        <p className="mt-6 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100">
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-10 text-sm text-stone-500">{t("common.loading")}</p>
      ) : (
        <>
          {stats && stats.total_players > 0 ? (
            <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label={t("leaderboard.stat.players")} value={String(stats.total_players)} accent />
              <StatCard label={t("leaderboard.stat.avgXp")} value={stats.avg_xp.toFixed(1)} />
              <StatCard label={t("leaderboard.stat.maxXp")} value={String(stats.max_xp)} />
              <StatCard
                label={t("leaderboard.stat.avgAcc")}
                value={
                  stats.avg_accuracy_percent != null ? `${stats.avg_accuracy_percent.toFixed(1)}%` : "—"
                }
              />
            </section>
          ) : null}

          {mine?.rank != null && mine.entry ? (
            <div className="mt-8 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-teal-50/50 p-5 dark:border-emerald-800/40 dark:from-emerald-950/35 dark:to-teal-950/20">
              <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-800/80 dark:text-emerald-300/90">
                {t("leaderboard.you")}
              </p>
              <p className="mt-1 font-display text-xl font-semibold text-emerald-950 dark:text-emerald-100">
                {t("leaderboard.yourRank", {
                  rank: String(mine.rank),
                  total: String(mine.total_players),
                })}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-emerald-900/90 dark:text-emerald-200/90">
                <span>XP {mine.entry.xp}</span>
                <span>HP {mine.entry.hp}</span>
                <span>
                  {t("leaderboard.col.modules")}: {mine.entry.modules_completed}
                </span>
                <span>
                  {t("leaderboard.col.acc")}: {mine.entry.accuracy_percent}%
                </span>
                <span>{leagueLabelForKey(mine.entry.league_key, locale)}</span>
              </div>
            </div>
          ) : mine && mine.rank == null && user?.token ? (
            <p className="mt-8 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              {t("leaderboard.noSaveYet")}
            </p>
          ) : null}

          {stats && stats.league_distribution.length > 0 ? (
            <section className="mt-10">
              <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                {t("leaderboard.leagueDist")}
              </h2>
              <ul className="mt-4 flex flex-wrap gap-3">
                {stats.league_distribution.map((d) => (
                  <li
                    key={d.league_key}
                    className="rounded-xl border border-stone-200/90 bg-white/80 px-4 py-2 text-sm dark:border-stone-700 dark:bg-stone-900/50"
                  >
                    <span className="font-medium text-stone-800 dark:text-stone-200">
                      {leagueLabelForKey(d.league_key, locale)}
                    </span>
                    <span className="ml-2 text-stone-500 dark:text-stone-400">{d.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {board && board.entries.length > 0 ? (
            <section className="mt-10 overflow-x-auto">
              <h2 className="font-display text-lg font-semibold text-stone-900 dark:text-stone-100">
                {t("leaderboard.tableTitle")}
              </h2>
              <table className="mt-4 w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-[10px] uppercase tracking-wider text-stone-500 dark:border-stone-700 dark:text-stone-400">
                    <th className="py-3 pr-2">#</th>
                    <th className="py-3 pr-2">{t("leaderboard.col.player")}</th>
                    <th className="py-3 pr-2">XP</th>
                    <th className="py-3 pr-2">HP</th>
                    <th className="py-3 pr-2">{t("leaderboard.col.modules")}</th>
                    <th className="py-3 pr-2">{t("leaderboard.col.acc")}</th>
                    <th className="py-3 pr-2">{t("leaderboard.col.league")}</th>
                  </tr>
                </thead>
                <tbody>
                  {board.entries.map((e) => {
                    const isYou = Boolean(mine?.entry?.user_id && e.user_id === mine.entry.user_id);
                    return (
                      <tr
                        key={e.user_id}
                        className={`border-b border-stone-100 dark:border-stone-800 ${
                          isYou ? "bg-emerald-50/50 dark:bg-emerald-950/25" : ""
                        }`}
                      >
                        <td className="py-3 pr-2 font-mono text-stone-600 dark:text-stone-400">{e.rank}</td>
                        <td className="py-3 pr-2 font-medium text-stone-900 dark:text-stone-100">
                          {e.display_name}
                          {isYou ? (
                            <span className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">
                              ({t("leaderboard.youBadge")})
                            </span>
                          ) : null}
                        </td>
                        <td className="py-3 pr-2">{e.xp}</td>
                        <td className="py-3 pr-2">{e.hp}</td>
                        <td className="py-3 pr-2">{e.modules_completed}</td>
                        <td className="py-3 pr-2">{e.accuracy_percent}%</td>
                        <td className="py-3 pr-2">{leagueLabelForKey(e.league_key, locale)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          ) : !loading && board?.total_players === 0 ? (
            <p className="mt-10 text-stone-500 dark:text-stone-400">{t("leaderboard.empty")}</p>
          ) : null}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`card-brutal p-5 ${
        accent
          ? "border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:border-emerald-800/50 dark:from-emerald-950/30 dark:to-teal-950/20"
          : ""
      }`}
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-stone-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-stone-900 dark:text-stone-100">{value}</p>
    </div>
  );
}
