export interface LeagueInfo {
  key: string;
  label: string;
  minXp: number;
  description: string;
}

export const LEAGUES_RU: LeagueInfo[] = [
  {
    key: "novice",
    label: "Новичок",
    minXp: 0,
    description: "Пройдите первый модуль и наберите 40 XP, чтобы выйти в Стажёра.",
  },
  {
    key: "trainee",
    label: "Стажёр",
    minXp: 40,
    description: "Завершите модули с долей верных ≥55% и 120 XP для уровня Аналитик.",
  },
  {
    key: "analyst",
    label: "Аналитик",
    minXp: 120,
    description: "Все модули пройдены и ≥70% верных ответов — лига Эксперт.",
  },
  {
    key: "expert",
    label: "Эксперт",
    minXp: 220,
    description: "Максимальная лига: поддерживайте HP и точность.",
  },
];

export const LEAGUES_EN: LeagueInfo[] = [
  {
    key: "novice",
    label: "Novice",
    minXp: 0,
    description: "Complete your first module and reach 40 XP to become a Trainee.",
  },
  {
    key: "trainee",
    label: "Trainee",
    minXp: 40,
    description: "Finish modules with ≥55% correct answers and 120 XP for Analyst.",
  },
  {
    key: "analyst",
    label: "Analyst",
    minXp: 120,
    description: "All modules done and ≥70% correct — Expert league.",
  },
  {
    key: "expert",
    label: "Expert",
    minXp: 220,
    description: "Top league: keep HP and accuracy high.",
  },
];

const table = (loc: "ru" | "en") => (loc === "en" ? LEAGUES_EN : LEAGUES_RU);

export function leagueByXp(xp: number, loc: "ru" | "en" = "ru"): LeagueInfo {
  let current = table(loc)[0];
  for (const L of table(loc)) {
    if (xp >= L.minXp) current = L;
  }
  return current;
}

export function nextLeague(xp: number, loc: "ru" | "en" = "ru"): LeagueInfo | null {
  const arr = table(loc);
  const idx = arr.findIndex((L) => xp < L.minXp);
  if (idx === -1) return null;
  return arr[idx];
}

export function progressToNextLeague(
  xp: number,
  loc: "ru" | "en" = "ru",
): { next: LeagueInfo; percent: number } | null {
  const arr = table(loc);
  const current = leagueByXp(xp, loc);
  const curIdx = arr.findIndex((l) => l.key === current.key);
  const next = arr[curIdx + 1];
  if (!next) return null;
  const span = next.minXp - current.minXp;
  const gained = xp - current.minXp;
  const percent = Math.min(100, Math.round((gained / span) * 100));
  return { next, percent };
}
