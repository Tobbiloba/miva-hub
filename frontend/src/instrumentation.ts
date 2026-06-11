import { IS_VERCEL_ENV } from "lib/const";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { checkEnv } = await import("./lib/env-check");
    checkEnv();

    if (!IS_VERCEL_ENV) {
      // Migrations disabled - using db:push for schema synchronization
      console.log("🔧 Migrations disabled - using db:push for schema sync");

      // Initialize MCP Manager only
      const initMCPManager = await import("./lib/ai/mcp/mcp-manager").then(
        (m) => m.initMCPManager,
      );
      await initMCPManager().catch((e) => {
        console.warn("⚠️ MCP Manager initialization failed:", e.message);
        // Don't exit on MCP failure - continue with app startup
      });
    }
  }
}
