/** A guard refused: the deploy stops before anything changes. `guard` names the rule (context, team, indexing, secrets, …). */
export class GuardError extends Error {
  constructor(guard, message) {
    super(`[${guard}] ${message}`);
    this.name = "GuardError";
    this.guard = guard;
  }
}
