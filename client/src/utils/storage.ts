// ─── Storage Helpers (plain .ts to avoid TSX generic-as-JSX issues) ──────────

export const storage = {
  get(key: string) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
  },
  clear(...keys: string[]) {
    keys.forEach((k) => localStorage.removeItem(k));
  },
};
