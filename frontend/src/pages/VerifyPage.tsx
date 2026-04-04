import { useParams, Link } from "react-router-dom";

export function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const valid = Boolean(id && id.length >= 8);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-16">
      <div className="card-brutal w-full max-w-md motion-safe:animate-pop-in p-10 text-center">
        <div className="mb-5 flex flex-col items-center gap-3">
          <div className="h-px w-12 bg-gradient-to-r from-transparent via-emerald-500/75 to-transparent dark:via-emerald-400/55" />
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-stone-400">Верификация</p>
        </div>
        <h1 className="font-display text-xl font-semibold text-ink dark:text-stone-100">
          {valid ? "Запись найдена" : "Не найдено"}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-stone-500 dark:text-stone-400">
          {valid
            ? `Идентификатор «${id}» совпадает с форматом выданного в Cipherline сертификата. В демо-режиме имя владельца и детали курса не подтягиваются с сервера — в продакшене проверка будет через API.`
            : "Проверьте ссылку или отсканируйте QR с бланка сертификата."}
        </p>
        <Link to="/" className="btn-primary mt-8 inline-block !no-underline">
          На сайт
        </Link>
      </div>
    </div>
  );
}
