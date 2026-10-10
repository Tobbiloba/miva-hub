import { NextResponse } from "next/server";

import { checkPaidAccess, paymentRequiredResponse } from "@/lib/billing/access";
import { getApiSession } from "auth/server";
import { getVoiceAllowance } from "lib/voice/allowance";
import globalLogger from "logger";

const logger = globalLogger.withDefaults({ message: "Voice Usage API: " });

/** GET /api/student/viva/usage — the student's voice minutes this period. */
export async function GET() {
  try {
    const session = await getApiSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const access = await checkPaidAccess(session.user.id);
    if (!access.allowed) return paymentRequiredResponse(access.reason);

    const allowance = await getVoiceAllowance(session.user.id, access.via);
    return NextResponse.json({ allowance });
  } catch (error) {
    logger.error("failed to read voice usage", error);
    return NextResponse.json(
      { error: "Failed to load your voice minutes" },
      { status: 500 },
    );
  }
}
