/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute origin of the API server for split-origin prod (no trailing /api). Unset in
   * local dev, where the vite proxy forwards the relative /api path instead. */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
