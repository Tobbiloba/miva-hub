import { PageHeader } from "@/components/layouts/page-header";
import { PremiumUpgradeCard } from "@/components/premium/premium-upgrade-card";
import { SiwesBoard } from "@/components/siwes/siwes-board";
import { getSession } from "@/lib/auth/server";
import { checkPremiumAccess } from "@/lib/billing/access";
import { listPlacements, studentToday } from "lib/siwes";
import { redirect } from "next/navigation";

export default async function SiwesPage() {
  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const access = await checkPremiumAccess(session.user.id);
  if (!access.allowed) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          title="SIWES Log Book"
          description="Jot down what you did each day; Askly turns it into your log book's weekly pages, ready to print and sign."
        />
        <PremiumUpgradeCard description="The SIWES log book comes with Askly Premium." />
      </div>
    );
  }

  const placements = await listPlacements(session.user.id);
  return (
    <SiwesBoard
      initialPlacements={placements.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }))}
      today={studentToday()}
    />
  );
}
