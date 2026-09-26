export const APP_HOME = "/app";

/** After login/signup, never send people back to marketing `/` or the auth screens. */
export function safePostAuthPath(next: string | null | undefined) {
  const raw = (next ?? "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return APP_HOME;
  if (raw === "/" || raw.startsWith("/login") || raw.startsWith("/signup")) return APP_HOME;
  return raw;
}
