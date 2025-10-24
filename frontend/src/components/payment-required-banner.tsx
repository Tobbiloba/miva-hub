"use client";

import { AlertCircle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface PaymentRequiredBannerProps {
  showError?: boolean;
}

export function PaymentRequiredBanner({
  showError = false,
}: PaymentRequiredBannerProps) {
  return (
    <Alert className="mb-6 border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        {showError ? "Payment Check Error" : "Subscription Required"}
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        {showError ? (
          <>
            We encountered an error checking your subscription status. Please
            refresh the page or contact support.
          </>
        ) : (
          <>
            You need an active subscription to access the full features of Miva
            Hub. Choose a plan below to get started!
          </>
        )}
      </AlertDescription>
      {!showError && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Ready to get started?
          </span>
          <Button asChild size="sm" variant="default">
            <Link href="#pricing-section" className="flex items-center gap-2">
              View Plans
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}
    </Alert>
  );
}
