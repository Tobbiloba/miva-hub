// Shared Sentry privacy settings (SDK v11 replaced `sendDefaultPii` with
// `dataCollection`, whose defaults collect user info, cookies, headers,
// bodies and AI prompts). Students' data must never leave via error reports.
import type * as Sentry from "@sentry/nextjs";

type InitOptions = NonNullable<Parameters<typeof Sentry.init>[0]>;

export const SENTRY_DATA_COLLECTION: InitOptions["dataCollection"] = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
};
