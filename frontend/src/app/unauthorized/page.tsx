import { Card, CardContent, CardHeader, CardTitle } from "ui/card";
import { Button } from "ui/button";
import { ShieldX } from "lucide-react";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldX className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            You don&apos;t have permission to access this area. Only authorized MIVA University administrators can access the admin panel.
          </p>
          <div className="flex flex-col gap-2">
            <Button asChild>
              <Link href="/">
                Return to Dashboard
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/sign-in">
                Sign In with Different Account
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}