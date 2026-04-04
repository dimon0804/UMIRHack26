export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block size-5 animate-spin rounded-full border-2 border-stone-200/80 border-t-stone-700 dark:border-stone-600 dark:border-t-stone-200 ${className}`}
      role="status"
      aria-label="Загрузка"
    />
  );
}
