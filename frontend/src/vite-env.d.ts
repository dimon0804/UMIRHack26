/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string | undefined;
  /** Пустой VITE_API_URL + true: запросы на /api/... (прокси nginx → UMIR gateway). */
  readonly VITE_USE_GATEWAY: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
