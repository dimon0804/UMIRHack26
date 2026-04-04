import { apiBaseUrl } from "@/api/client";
import { leagueByXp } from "@/lib/leagues";
import type { AppLocale } from "@/i18n/I18nContext";

const base = () => `${apiBaseUrl()}/api/v1/progress/leaderboard`;

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
  const u = new URL(base());
  u.searchParams.set("sort", sort);
  u.searchParams.set("limit", String(limit));
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as LeaderboardDto;
}

export async function fetchLeaderboardStats(): Promise<LeaderboardStatsDto> {
  const res = await fetch(`${base()}/stats`);
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as LeaderboardStatsDto;
}

export async function fetchMyRank(accessToken: string): Promise<MyRankDto> {
  const res = await fetch(`${base()}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (res.status === 401) throw new Error("unauthorized");
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as MyRankDto;
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
