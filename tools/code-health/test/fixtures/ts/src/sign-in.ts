export type Provider = "google" | "github";

interface Session { user?: { name?: string; roles: string[] } }

export function label(session: Session, provider: Provider): string {
  if (session.user && session.user.name) {
    return session.user.name || "member";
  }
  if (provider !== undefined) {
    return provider;
  }
  return "nobody";
}
export const display = (name?: string): string => name || "member";
