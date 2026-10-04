import { requireSuperAdmin } from "lib/auth/admin";
import { McpServerSchema } from "lib/db/pg/schema.pg";
import { NextResponse } from "next/server";
import { saveMcpClientAction } from "./actions";

export async function POST(request: Request) {
  const access = await requireSuperAdmin();
  if (access instanceof NextResponse) return access;

  const json = (await request.json()) as typeof McpServerSchema.$inferInsert;

  try {
    await saveMcpClientAction(json);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || "Failed to save MCP client" },
      { status: 500 },
    );
  }
}
