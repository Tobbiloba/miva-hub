import { AIOperationsDashboard } from "@/components/admin/ai-operations/ai-operations-dashboard";
import { requireAdmin } from "@/lib/auth/admin";
import { Bot } from "lucide-react";

export default async function AIOperationsPage() {
  const adminAccess = await requireAdmin();

  if (adminAccess instanceof Response) {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            AI Operations
          </h1>
          <p className="text-muted-foreground mt-1">
            Every decision the platform&apos;s AI agents made — with human
            oversight and override tracking
          </p>
        </div>
      </div>

      <AIOperationsDashboard />
    </div>
  );
}
