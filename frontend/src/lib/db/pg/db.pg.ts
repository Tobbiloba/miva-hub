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

// Our timestamp columns have no time zone, and drizzle reads and writes them
// as UTC. Column defaults (CURRENT_TIMESTAMP) are cast in the session's zone,
// so a server set to anything else (a local Postgres on US/Pacific) stores
// defaults hours apart from values the app writes. Pin sessions to UTC.
pool.on("connect", (client) => {
  client.query("SET TIME ZONE 'UTC'").catch((error: Error) => {
    console.error("[db] couldn't set the session time zone:", error.message);
  });
});

export const pgDb = drizzlePg(pool);
