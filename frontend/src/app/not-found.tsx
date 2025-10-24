/* eslint-disable react/no-unescaped-entities */
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-primary/50 mb-4">404</h1>
        <h2 className="text-4xl font-bold mb-4">Page Not Found</h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-md">
          Sorry, the page you're looking for doesn't exist. It might have been moved or deleted.
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/">
            <Button size="lg">Go to Home</Button>
          </Link>
          <Link href="/pricing">
            <Button size="lg" variant="outline">
              View Pricing
            </Button>
          </Link>
        </div>

        <p className="text-muted-foreground mt-12">
          Need help? <a href="mailto:support@miva-hub.com" className="text-primary hover:underline">Contact support</a>
        </p>
      </div>
    </div>
  );
}
