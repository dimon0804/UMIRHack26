import { useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useApp } from "@/context/AppContext";
import { certificateEligible, certificateVerifyUrl, requiredModulesCount } from "@/lib/certificate";
import { SIMULATION_SCENARIO_ORDER } from "@/lib/courseScenarios";
import { loadUsers, saveUsers } from "@/lib/storage";
import { useRealApi } from "@/api/client";
import { useI18n } from "@/i18n/I18nContext";
import { leagueByXp } from "@/lib/leagues";

const COLORS = ["#059669", "#14b8a6", "#10b981", "#0d9488", "#34d399", "#047857"];

const tooltipStyle = {
  background: "#fafaf9",
  border: "1px solid #e7e5e4",
  borderRadius: "12px",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)",
};

export function ProfilePage() {
  const { userState } = useApp();
  const { locale, t } = useI18n();
  const realApi = useRealApi();
  const certRef = useRef<HTMLDivElement>(null);
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [dlLoading, setDlLoading] = useState(false);

  const mistakeData = useMemo(
    () =>
      Object.entries(userState?.mistakeByType || {}).map(([name, value]) => ({
        name,
        value,
      })),
    [userState?.mistakeByType]
  );

  const modTotal = requiredModulesCount();

  const scenarioBars = useMemo(() => {
    if (!userState) return [];
    return SIMULATION_SCENARIO_ORDER.map((id) => {
      const done = userState.scenariosCompleted.includes(id);
      const prog = userState.progress[id];
      let pct = 0;
      if (done) pct = 100;
      else if (prog?.currentStep != null) pct = Math.round(Math.min(100, prog.currentStep * 100));
      return {
        id,
        label: id,
        pct,
      };
    });
  }, [userState]);

  const scenarioBarsLabeled = useMemo(() => {
    return scenarioBars.map((row) => ({
      ...row,
      label: t(`scenario.module.${row.id}`).slice(0, 22),
    }));
  }, [scenarioBars, t]);

  const completedSimCount = userState
    ? SIMULATION_SCENARIO_ORDER.filter((id) => userState.scenariosCompleted.includes(id)).length
    : 0;

  const pieData = useMemo(
    () => [
      { name: t("profile.pieDone"), value: completedSimCount },
      {
        name: t("profile.pieLeft"),
        value: Math.max(0, modTotal - completedSimCount),
      },
    ],
    [completedSimCount, modTotal, t]
  );

  if (!userState) return null;

  const session = userState;
  const successPct =
    session.totalAnswers > 0
      ? Math.round((session.totalCorrect / session.totalAnswers) * 100)
      : 0;
  const certOk = certificateEligible(session) && session.certificateUnlocked;
  const verifyUrl = session.certificateId
    ? certificateVerifyUrl(session.certificateId)
    : "";

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pwNew.length < 8) {
      setPwMsg("Новый пароль не короче 8 символов.");
      return;
    }
    if (realApi) {
      setPwMsg(
        "Смена пароля через API в стеке UMIR пока не подключена — используйте локальный режим (запуск Vite без VITE_USE_GATEWAY / без прокси на gateway).",
      );
      return;
    }
    const users = loadUsers();
    const row = users[session.login];
    if (!row || row.password !== pwCurrent) {
      setPwMsg("Текущий пароль неверен.");
      return;
    }
    users[session.login] = { ...row, password: pwNew };
    saveUsers(users);
    setPwMsg("Пароль обновлён.");
    setPwCurrent("");
    setPwNew("");
  }

  async function downloadCertImage() {
    if (!certRef.current || !certOk) return;
    setDlLoading(true);
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2, backgroundColor: "#fafaf9" });
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `cipherline-cert-${session.login}.png`;
      a.click();
    } finally {
      setDlLoading(false);
    }
  }

  async function downloadCertPdf() {
    if (!certRef.current || !certOk) return;
    setDlLoading(true);
    try {
      const canvas = await html2canvas(certRef.current, { scale: 2, backgroundColor: "#fafaf9" });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`cipherline-cert-${session.login}.pdf`);
    } finally {
      setDlLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 motion-safe:animate-fade-in-up md:px-6">
      <h1 className="font-display text-3xl font-semibold text-ink dark:text-stone-100">Личный кабинет</h1>
      <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
        Сводка и демо-хранилище в браузере.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="card-brutal motion-safe:animate-pop-in-fast p-6 [animation-delay:0ms]">
          <h2 className="kicker-block">Сценарии</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scenarioBarsLabeled}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#78716c" }} stroke="#d6d3d1" />
                <YAxis tick={{ fontSize: 10, fill: "#78716c" }} stroke="#d6d3d1" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="pct" name="%" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card-brutal motion-safe:animate-pop-in-fast p-6 [animation-delay:90ms]">
          <h2 className="kicker-block">Прогресс</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  cornerRadius={4}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-sm text-stone-500">
            Верных ответов: <span className="font-mono font-medium text-stone-700 dark:text-stone-300">{successPct}%</span>
          </p>
        </section>

        <section className="card-brutal motion-safe:animate-pop-in-fast p-6 lg:col-span-2 [animation-delay:180ms]">
          <h2 className="kicker-block">Ошибки по типам</h2>
          <div className="mt-4 h-72">
            {mistakeData.length === 0 ? (
              <p className="text-sm text-stone-500">Пока пусто.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={mistakeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
                  <XAxis type="number" stroke="#d6d3d1" tick={{ fill: "#78716c" }} />
                  <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10, fill: "#78716c" }} stroke="#d6d3d1" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" name="Кол-во" fill="#b91c1c" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      <section className="card-brutal mt-10 p-6 motion-safe:animate-fade-in-up [animation-delay:240ms]">
        <h2 className="kicker-block">История</h2>
        <div className="mt-4 overflow-x-auto scrollbar-subtle">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-xs font-medium uppercase tracking-wider text-stone-400 dark:border-stone-700">
                <th className="pb-3 pr-4">Дата</th>
                <th className="pb-3 pr-4">Сценарий</th>
                <th className="pb-3 pr-4">Событие</th>
                <th className="pb-3">Результат</th>
              </tr>
            </thead>
            <tbody>
              {session.history.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-6 text-stone-500">
                    История пуста.
                  </td>
                </tr>
              ) : (
                [...session.history]
                  .reverse()
                  .slice(0, 40)
                  .map((h) => (
                    <tr key={h.id} className="border-b border-stone-100 dark:border-stone-800/80">
                      <td className="py-3 pr-4 font-mono text-xs text-stone-500">
                        {new Date(h.date).toLocaleString("ru-RU")}
                      </td>
                      <td className="py-3 pr-4 font-medium text-ink dark:text-stone-100">{h.scenarioTitle}</td>
                      <td className="py-3 pr-4 text-stone-500">{h.stepLabel}</td>
                      <td className="py-3">
                        <span
                          className={
                            h.correct
                              ? "font-medium text-emerald-700 dark:text-emerald-400"
                              : "font-medium text-red-700 dark:text-red-400"
                          }
                        >
                          {h.correct ? "успех" : "ошибки"}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section className="card-brutal motion-safe:animate-pop-in-fast p-6 [animation-delay:300ms]">
          <h2 className="kicker-block">Пароль</h2>
          <form onSubmit={changePassword} className="mt-4 space-y-3">
            <input
              type="password"
              placeholder="Текущий пароль"
              className="input-brutal"
              value={pwCurrent}
              onChange={(e) => setPwCurrent(e.target.value)}
            />
            <input
              type="password"
              placeholder="Новый пароль"
              className="input-brutal"
              value={pwNew}
              onChange={(e) => setPwNew(e.target.value)}
            />
            {pwMsg && <p className="text-sm font-medium text-stone-700 dark:text-stone-300">{pwMsg}</p>}
            <button type="submit" className="btn-primary flex items-center gap-2">
              Сохранить
            </button>
          </form>
        </section>

        <section className="card-brutal motion-safe:animate-pop-in-fast p-6 [animation-delay:380ms]">
          <h2 className="kicker-block">Сертификат</h2>
          {!certOk ? (
            <p className="mt-4 text-sm text-stone-500">
              {t("profile.certHint", { n: String(modTotal) })}
            </p>
          ) : (
            <>
              <div
                ref={certRef}
                className="mt-4 rounded-3xl border border-emerald-100/80 bg-paper p-8 text-center shadow-soft ring-1 ring-emerald-100/40 dark:border-emerald-900/40 dark:bg-stone-900/40 dark:ring-emerald-900/25"
              >
                <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-stone-400">Cipherline</p>
                <h3 className="mt-3 font-display text-lg font-semibold text-ink dark:text-stone-100">Цифровая гигиена</h3>
                <p className="mt-4 text-sm text-stone-500">Выдан</p>
                <p className="font-mono text-base font-medium text-stone-800">{session.login}</p>
                <p className="mt-2 text-xs text-stone-500">
                  {new Date().toLocaleDateString(locale === "en" ? "en-US" : "ru-RU")} ·{" "}
                  {leagueByXp(session.xp, locale).label}
                </p>
                <div className="mt-4 flex justify-center">
                  <QRCodeSVG value={verifyUrl} size={96} fgColor="#292524" bgColor="#fafaf9" />
                </div>
                <p className="mt-2 break-all font-mono text-[10px] text-stone-400">{verifyUrl}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" disabled={dlLoading} onClick={downloadCertPdf} className="btn-primary !py-2 !text-xs">
                  PDF
                </button>
                <button type="button" disabled={dlLoading} onClick={downloadCertImage} className="btn-ghost !py-2 !text-xs">
                  PNG
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigator.share?.({
                      title: "Сертификат Cipherline",
                      text: verifyUrl,
                    })
                  }
                  className="btn-ghost !py-2 !text-xs"
                >
                  Поделиться
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
