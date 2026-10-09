import { getDb } from "./db";
export type Theme = "light" | "dark";
const DEFAULT_THEME: Theme = "dark";
export async function getSavedTheme(): Promise<Theme> {
  try {
    const db = await getDb();
    const [row] = await db.select<{ value: string }[]>(
      "SELECT value FROM settings WHERE key = 'theme'"
    );
    if (row?.value === "light" || row?.value === "dark") return row.value;
    return DEFAULT_THEME;
  } catch { return DEFAULT_THEME; }
}
export async function saveTheme(theme: Theme): Promise<void> {
  const db = await getDb();
  await db.execute(
    `INSERT INTO settings (key, value, updated_at) VALUES ('theme', ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [theme]
  );
}
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}
