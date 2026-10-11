import ChatBot from "@/components/chat-bot";
import { CaptureOnboarding } from "@/components/onboarding/capture-onboarding";
import { PendingSchoolNotice } from "@/components/onboarding/pending-school-notice";
import { getSession } from "@/lib/auth/server";
import { getCaptureOnboardingStatus } from "@/lib/onboarding/capture-status";
import { getPendingSchool } from "@/lib/schools/pending";
import { generateUUID } from "lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const id = generateUUID();
  const session = await getSession();
  // Students whose school isn't on Askly yet can't capture (no courses), so
  // they see where their school stands instead of the capture setup
  const pendingSchool =
    session?.user.role === "student"
      ? await getPendingSchool(session.user.id)
      : null;
  const onboarding =
    session?.user.role !== "student" ? undefined : pendingSchool ? (
      <PendingSchoolNotice schoolName={pendingSchool.schoolName} />
    ) : (
      <CaptureOnboarding
        status={await getCaptureOnboardingStatus(session.user.id)}
      />
    );
  return (
    <ChatBot
      initialMessages={[]}
      threadId={id}
      key={id}
      onboarding={onboarding}
    />
  );
}
