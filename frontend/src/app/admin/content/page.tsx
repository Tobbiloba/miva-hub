"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// /admin/content has no index view of its own — the real pages live at
// /admin/content/manage, /upload and /moderation. Redirect instead of 404.
export default function AdminContentIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/content/manage");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
