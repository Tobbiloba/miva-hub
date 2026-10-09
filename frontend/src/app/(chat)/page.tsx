import ChatBot from "@/components/chat-bot";
import { CaptureOnboarding } from "@/components/onboarding/capture-onboarding";
import { getSession } from "@/lib/auth/server";
import { getCaptureOnboardingStatus } from "@/lib/onboarding/capture-status";
import { generateUUID } from "lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const id = generateUUID();
  const session = await getSession();
  const onboarding =
    session?.user.role === "student" ? (
      <CaptureOnboarding
        status={await getCaptureOnboardingStatus(session.user.id)}
      />
    ) : undefined;
  return (
    <ChatBot
      initialMessages={[]}
      threadId={id}
      key={id}
      onboarding={onboarding}
    />
  );
}
