import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { SignupAssignment } from "./signup-policy";

/**
 * Carries a server-side provisioning decision (tenant/role) into better-auth's
 * user-create hook. Only server code can enter this scope — HTTP requests to
 * /api/auth/* never run inside it — so the hook can trust what it finds here.
 */
const signupAssignmentStorage = new AsyncLocalStorage<SignupAssignment>();

/** Run `fn` (which creates a user through better-auth) with an explicit assignment. */
export function withSignupAssignment<T>(
  assignment: SignupAssignment,
  fn: () => Promise<T>,
): Promise<T> {
  return signupAssignmentStorage.run(assignment, fn);
}

export function getSignupAssignment(): SignupAssignment | undefined {
  return signupAssignmentStorage.getStore();
}
