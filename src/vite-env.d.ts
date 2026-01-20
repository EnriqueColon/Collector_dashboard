/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_SERVICE_ACCOUNT_KEY?: string;
  readonly VITE_API_URL?: string;
  readonly DEV?: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
