import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, HistoryEntry, UserProgress, UserState } from "@/types";
import { useRealApi } from "@/api/client";
import { umirLogin, umirRegister } from "@/api/umirGateway";
import { leagueByXp } from "@/lib/leagues";
import { certificateEligible, certificateReconcilePatch } from "@/lib/certificate";
import {
  SIMULATION_SCENARIO_ORDER as SCENARIO_ORDER,
  isCustomSimulationId,
  isSimulationScenarioId,
} from "@/lib/courseScenarios";
import {
  loadCipherlineGameState,
  saveCipherlineGameState,
} from "@/lib/cipherlineGameStorage";
import {
  fetchCipherlineState,
  putCipherlineState,
} from "@/lib/cipherlineRemote";
import {
  clearGatewaySession,
  GATEWAY_SESSION_KEY,
  parseStoredSession,
  setGatewayAccessTokenListener,
  writeGatewaySession,
} from "@/lib/gatewaySession";

const STORAGE_USERS = "cg_users_v1";

const defaultUserState = (login: string): UserState => ({
  login,
  hp: 78,
  xp: 0,
  league: leagueByXp(0, "ru").label,
  totalCorrect: 0,
  totalAnswers: 0,
  totalMistakes: 0,
  scenariosCompleted: [],
  progress: {},
  history: [],
  mistakeByType: {},
  certificateUnlocked: false,
});

function loadUsers(): Record<string, { password: string; state: UserState }> {
  try {
    const raw = localStorage.getItem(STORAGE_USERS);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, { password: string; state: UserState }>;
  } catch {
    return {};
  }
}

function saveUsers(u: Record<string, { password: string; state: UserState }>) {
  localStorage.setItem(STORAGE_USERS, JSON.stringify(u));
}

export interface ScenarioMistake {
  attackType: string;
  explanation: string;
  recommended: string;
}

export interface ScenarioRunSummary {
  scenarioId: string;
  scenarioTitle: string;
  correct: number;
  wrong: number;
  hpDelta: number;
  xpGained: number;
  mistakes: ScenarioMistake[];
  /** Текущий завершённый уровень модуля (1..totalSimulationSteps). */
  simulationStep?: number;
  totalSimulationSteps?: number;
  /** true только после последнего уровня модуля. */
  moduleComplete?: boolean;
  historyStepLabel?: string;
  primaryAttackType?: string;
}

interface AppContextValue {
  user: AuthUser | null;
  userState: UserState | null;
  /** Становится true после первой попытки прочитать сессию из sessionStorage (до этого не редиректить на /login). */
  authHydrated: boolean;
  theme: "dark" | "light";
  toggleTheme: () => void;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  login: (login: string, password: string) => Promise<void>;
  register: (login: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserState: (patch: Partial<UserState>) => void;
  applyScenarioResult: (summary: ScenarioRunSummary) => void;
  setProgress: (scenarioId: string, p: Partial<UserProgress>) => void;
  scenarioStatus: (scenarioId: string) => "locked" | "available" | "completed";
  refreshLeagueLabel: () => void;
  restartScenario: (scenarioId: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const realApi = useRealApi();
  const accessTokenRef = useRef<string | null>(null);

  useEffect(() => {
    accessTokenRef.current = user?.token ?? null;
  }, [user?.token]);

  useEffect(() => {
    setGatewayAccessTokenListener((access) => {
      accessTokenRef.current = access;
      setUser((u) => (u ? { ...u, token: access } : u));
    });
    return () => setGatewayAccessTokenListener(null);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const persistGatewayGameState = useCallback((state: UserState) => {
    saveCipherlineGameState(state.login, state);
    const token = accessTokenRef.current;
    if (!token) return;
    void (async () => {
      let ok = await putCipherlineState(token, state);
      if (!ok) {
        await new Promise((r) => setTimeout(r, 1200));
        ok = await putCipherlineState(accessTokenRef.current ?? token, state);
      }
      if (!ok) {
        console.error(
          "[Cipherline] Прогресс не сохранился на сервере (см. Network → PUT …/cipherline/state). Рейтинг и таблица лидеров читают только БД.",
        );
      }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const parsed = parseStoredSession();
        if (parsed) {
          if (realApi) {
            const { login, accessToken } = parsed;
            if (accessToken) {
              setUser({ login, token: accessToken });
              const remote = await fetchCipherlineState(accessToken);
              if (cancelled) return;
              let state =
                remote ?? loadCipherlineGameState(login) ?? defaultUserState(login);
              const patch = certificateReconcilePatch(state);
              if (patch) state = { ...state, ...patch };
              saveCipherlineGameState(login, state);
              if (!remote || patch) await putCipherlineState(accessToken, state);
              if (cancelled) return;
              setUserState(state);
            }
          } else {
            const { login } = parsed;
            const users = loadUsers();
            const row = users[login];
            if (row) {
              const patch = certificateReconcilePatch(row.state);
              const state = patch ? { ...row.state, ...patch } : row.state;
              if (patch) {
                users[login] = { ...row, state };
                saveUsers(users);
              }
              setUser({ login });
              setUserState(state);
            }
          }
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setAuthHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [realApi]);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  const persistDemoSession = (login: string) => {
    sessionStorage.setItem(GATEWAY_SESSION_KEY, JSON.stringify({ login }));
  };

  const persistGatewaySession = (login: string, accessToken: string, refreshToken: string) => {
    writeGatewaySession({ login, accessToken, refreshToken });
  };

  const loginFn = useCallback(
    async (loginVal: string, password: string) => {
      setAuthError(null);
      setLoading(true);
      try {
        if (realApi) {
          const email = loginVal.trim();
          const tokens = await umirLogin(email, password);
          setUser({ login: email, token: tokens.access_token });
          accessTokenRef.current = tokens.access_token;
          const remote = await fetchCipherlineState(tokens.access_token);
          let state =
            remote ?? loadCipherlineGameState(email) ?? defaultUserState(email);
          const patch = certificateReconcilePatch(state);
          if (patch) state = { ...state, ...patch };
          saveCipherlineGameState(email, state);
          if (!remote || patch) await putCipherlineState(tokens.access_token, state);
          setUserState(state);
          persistGatewaySession(email, tokens.access_token, tokens.refresh_token);
        } else {
          await new Promise((r) => setTimeout(r, 400));
          const users = loadUsers();
          const row = users[loginVal];
          if (!row || row.password !== password) {
            throw new Error("Неверный логин или пароль.");
          }
          const patch = certificateReconcilePatch(row.state);
          const nextState = patch ? { ...row.state, ...patch } : row.state;
          if (patch) {
            users[loginVal] = { ...row, state: nextState };
            saveUsers(users);
          }
          setUser({ login: loginVal });
          setUserState(nextState);
          persistDemoSession(loginVal);
        }
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "Не удалось войти. Проверьте соединение и попробуйте снова.";
        setAuthError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [realApi],
  );

  const registerFn = useCallback(
    async (loginVal: string, password: string) => {
      setAuthError(null);
      setLoading(true);
      try {
        if (realApi) {
          const email = loginVal.trim();
          const loc =
            typeof window !== "undefined" && localStorage.getItem("cipherline_locale_v1") === "en"
              ? "en"
              : "ru";
          const tokens = await umirRegister(email, password, loc);
          setUser({ login: email, token: tokens.access_token });
          accessTokenRef.current = tokens.access_token;
          const state = defaultUserState(email);
          saveCipherlineGameState(email, state);
          await putCipherlineState(tokens.access_token, state);
          setUserState(state);
          persistGatewaySession(email, tokens.access_token, tokens.refresh_token);
        } else {
          await new Promise((r) => setTimeout(r, 450));
          const users = loadUsers();
          if (users[loginVal]) throw new Error("Такой логин уже занят.");
          const state = defaultUserState(loginVal);
          users[loginVal] = { password, state };
          saveUsers(users);
          setUser({ login: loginVal });
          setUserState(state);
          persistDemoSession(loginVal);
        }
      } catch (e) {
        const msg =
          e instanceof Error
            ? e.message
            : "Регистрация не удалась. Проверьте сеть или данные.";
        setAuthError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [realApi],
  );

  const logout = useCallback(() => {
    setUser(null);
    setUserState(null);
    clearGatewaySession();
  }, []);

  const updateUserState = useCallback(
    (patch: Partial<UserState>) => {
      setUserState((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        next.league = leagueByXp(next.xp, "ru").label;
        if (!realApi) {
          const users = loadUsers();
          if (users[next.login]) {
            users[next.login] = { ...users[next.login], state: next };
            saveUsers(users);
          }
        } else {
          queueMicrotask(() => persistGatewayGameState(next));
        }
        return next;
      });
    },
    [realApi, persistGatewayGameState],
  );

  const refreshLeagueLabel = useCallback(() => {
    setUserState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, league: leagueByXp(prev.xp, "ru").label };
      if (realApi) {
        queueMicrotask(() => persistGatewayGameState(next));
      }
      return next;
    });
  }, [realApi, persistGatewayGameState]);

  const scenarioStatus = useCallback(
    (scenarioId: string): "locked" | "available" | "completed" => {
      if (!userState) return "locked";
      if (isCustomSimulationId(scenarioId)) {
        if (userState.scenariosCompleted.includes(scenarioId)) return "completed";
        return "available";
      }
      if (!isSimulationScenarioId(scenarioId)) return "locked";
      if (userState.scenariosCompleted.includes(scenarioId)) return "completed";
      const idx = SCENARIO_ORDER.indexOf(scenarioId);
      if (idx <= 0) return "available";
      const prevId = SCENARIO_ORDER[idx - 1];
      if (userState.scenariosCompleted.includes(prevId)) return "available";
      return "locked";
    },
    [userState],
  );

  const setProgress = useCallback(
    (scenarioId: string, p: Partial<UserProgress>) => {
      setUserState((prev) => {
        if (!prev) return prev;
        const cur = prev.progress[scenarioId] || {
          scenarioId,
          currentStep: 0,
          completed: false,
        };
        const nextProgress = { ...cur, ...p, scenarioId };
        const next = {
          ...prev,
          progress: { ...prev.progress, [scenarioId]: nextProgress },
        };
        if (!realApi) {
          const users = loadUsers();
          if (users[next.login]) {
            users[next.login] = { ...users[next.login], state: next };
            saveUsers(users);
          }
        } else {
          queueMicrotask(() => persistGatewayGameState(next));
        }
        return next;
      });
    },
    [realApi, persistGatewayGameState],
  );

  const applyScenarioResult = useCallback(
    (summary: ScenarioRunSummary) => {
      setUserState((prev) => {
        if (!prev) return prev;
        const total = summary.totalSimulationSteps ?? 1;
        const step = summary.simulationStep ?? 1;
        const moduleComplete = summary.moduleComplete ?? true;

        const mistakeByType = { ...prev.mistakeByType };
        for (const m of summary.mistakes) {
          mistakeByType[m.attackType] = (mistakeByType[m.attackType] || 0) + 1;
        }

        let scenariosCompleted = prev.scenariosCompleted;
        if (moduleComplete) {
          scenariosCompleted = [...new Set([...prev.scenariosCompleted, summary.scenarioId])];
        }

        const nextStep = moduleComplete ? total + 1 : step + 1; // completed: currentStep > total помечает «модуль закрыт»
        const progressEntry: UserProgress = {
          scenarioId: summary.scenarioId,
          currentStep: nextStep,
          completed: moduleComplete,
          lastPlayedAt: new Date().toISOString(),
        };

        let certId = prev.certificateId;
        let unlocked = prev.certificateUnlocked;
        const next: UserState = {
          ...prev,
          hp: Math.max(0, Math.min(100, prev.hp + summary.hpDelta)),
          xp: prev.xp + summary.xpGained,
          totalCorrect: prev.totalCorrect + summary.correct,
          totalAnswers: prev.totalAnswers + summary.correct + summary.wrong,
          totalMistakes: prev.totalMistakes + summary.wrong,
          scenariosCompleted,
          mistakeByType,
          league: leagueByXp(prev.xp + summary.xpGained, "ru").label,
          progress: {
            ...prev.progress,
            [summary.scenarioId]: progressEntry,
          },
          history: [
            ...prev.history,
            {
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              scenarioId: summary.scenarioId,
              scenarioTitle: summary.scenarioTitle,
              stepLabel: summary.historyStepLabel ?? (moduleComplete ? "Итог модуля" : `Уровень ${step}`),
              correct: summary.wrong === 0,
              attackType: summary.primaryAttackType,
            } satisfies HistoryEntry,
          ],
        };
        if (certificateEligible(next)) {
          unlocked = true;
          certId = certId || crypto.randomUUID().replace(/-/g, "").slice(0, 16);
        }
        next.certificateUnlocked = unlocked;
        next.certificateId = certId;
        if (!realApi) {
          const users = loadUsers();
          if (users[next.login]) {
            users[next.login] = { ...users[next.login], state: next };
            saveUsers(users);
          }
        } else {
          queueMicrotask(() => persistGatewayGameState(next));
        }
        return next;
      });
    },
    [realApi, persistGatewayGameState],
  );

  const restartScenario = useCallback(
    (scenarioId: string) => {
      setUserState((prev) => {
        if (!prev) return prev;
        const scenariosCompleted = prev.scenariosCompleted.filter((x) => x !== scenarioId);
        const next: UserState = {
          ...prev,
          scenariosCompleted,
          progress: {
            ...prev.progress,
            [scenarioId]: {
              scenarioId,
              currentStep: 1,
              completed: false,
            },
          },
        };
        if (!realApi) {
          const users = loadUsers();
          if (users[next.login]) {
            users[next.login] = { ...users[next.login], state: next };
            saveUsers(users);
          }
        } else {
          queueMicrotask(() => persistGatewayGameState(next));
        }
        return next;
      });
    },
    [realApi, persistGatewayGameState],
  );

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      userState,
      authHydrated,
      theme,
      toggleTheme,
      loading,
      authError,
      clearAuthError,
      login: loginFn,
      register: registerFn,
      logout,
      updateUserState,
      applyScenarioResult,
      setProgress,
      scenarioStatus,
      refreshLeagueLabel,
      restartScenario,
    }),
    [
      user,
      userState,
      authHydrated,
      theme,
      toggleTheme,
      loading,
      authError,
      clearAuthError,
      loginFn,
      registerFn,
      logout,
      updateUserState,
      applyScenarioResult,
      setProgress,
      scenarioStatus,
      refreshLeagueLabel,
      restartScenario,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}
