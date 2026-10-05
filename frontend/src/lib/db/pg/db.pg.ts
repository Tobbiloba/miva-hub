import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL!,
  // Keep long-lived sockets alive through NATs/proxies that drop idle TCP.
  keepAlive: true,
});

// An idle client can lose its connection (network blip, Neon scale-to-zero).
// pg emits that on the pool; with no listener Node treats it as an unhandled
// 'error' event and kills the process. The pool already discards the broken
// client and the next query opens a fresh one, so logging is all that's needed.
pool.on("error", (error) => {
  console.error("[db] idle Postgres client error:", error.message);
});

export const pgDb = drizzlePg(pool);
