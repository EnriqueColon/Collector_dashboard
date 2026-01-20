/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_SERVICE_ACCOUNT_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
