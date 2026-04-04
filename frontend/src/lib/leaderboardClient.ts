import { apiBaseUrl } from "@/api/client";
import { refreshGatewayAccessToken } from "@/lib/gatewaySession";
import { leagueByXp } from "@/lib/leagues";
import type { AppLocale } from "@/i18n/I18nContext";

/** Без ведущего слэша у apiBase; относительный путь к /api/... если база пустая (nginx → gateway). */
function leaderboardBasePath(): string {
  const root = apiBaseUrl().replace(/\/$/, "");
  return root ? `${root}/api/v1/progress/leaderboard` : "/api/v1/progress/leaderboard";
}

export type SortKey = "xp" | "accuracy" | "modules";

export interface LeaderboardEntryDto {
  rank: number;
  user_id: string;
  display_name: string;
  xp: number;
  hp: number;
  modules_completed: number;
  total_correct: number;
  total_answers: number;
  accuracy_percent: number;
  league_key: string;
}

export interface LeaderboardDto {
  sort: SortKey;
  limit: number;
  total_players: number;
  entries: LeaderboardEntryDto[];
}

export interface LeagueDistributionDto {
  league_key: string;
  count: number;
}

export interface LeaderboardStatsDto {
  total_players: number;
  avg_xp: number;
  max_xp: number;
  avg_modules_completed: number;
  avg_accuracy_percent: number | null;
  league_distribution: LeagueDistributionDto[];
}

export interface MyRankDto {
  rank: number | null;
  total_players: number;
  entry: LeaderboardEntryDto | null;
}

export async function fetchLeaderboard(
  sort: SortKey = "xp",
  limit = 50,
): Promise<LeaderboardDto> {
  const q = new URLSearchParams({ sort, limit: String(limit) });
  const res = await fetch(`${leaderboardBasePath()}?${q.toString()}`);
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as LeaderboardDto;
}

export async function fetchLeaderboardStats(): Promise<LeaderboardStatsDto> {
  const res = await fetch(`${leaderboardBasePath()}/stats`);
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as LeaderboardStatsDto;
}

export type FetchMyRankResult =
  | { ok: true; data: MyRankDto }
  | { ok: false; reason: "unauthorized" };

export async function fetchMyRank(accessToken: string): Promise<FetchMyRankResult> {
  const once = async (token: string): Promise<FetchMyRankResult> => {
    const res = await fetch(`${leaderboardBasePath()}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) return { ok: false, reason: "unauthorized" };
    if (!res.ok) throw new Error(await res.text());
    return { ok: true, data: (await res.json()) as MyRankDto };
  };
  const first = await once(accessToken);
  if (first.ok) return first;
  if (first.reason !== "unauthorized") return first;
  const next = await refreshGatewayAccessToken();
  if (!next) return first;
  return once(next);
}

export function leagueLabelForKey(key: string, locale: AppLocale): string {
  const xpMap: Record<string, number> = {
    novice: 0,
    trainee: 40,
    analyst: 120,
    expert: 220,
  };
  const xp = xpMap[key] ?? 0;
  return leagueByXp(xp, locale).label;
}
