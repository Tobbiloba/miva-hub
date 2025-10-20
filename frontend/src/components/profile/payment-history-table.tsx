"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, Receipt } from "lucide-react";
import { format } from "date-fns";

interface PaymentHistoryTableProps {
  transactions: any[];
}

export function PaymentHistoryTable({ transactions }: PaymentHistoryTableProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <Card className="bg-card border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>Your recent billing transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No payment history yet</p>
            <p className="text-sm mt-1">Transactions will appear here once you make a payment</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Payment History
        </CardTitle>
        <CardDescription>Your recent billing transactions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">Description</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">Amount</th>
                <th className="text-center py-3 px-4 text-sm font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="py-3 px-4 text-sm">
                    {format(new Date(tx.createdAt), "MMM d, yyyy")}
                  </td>
                  <td className="py-3 px-4 text-sm">
                    {tx.description || "Monthly subscription"}
                  </td>
                  <td className="py-3 px-4 text-sm text-right font-medium">
                    ₦{(tx.amountNgn / 100).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <PaymentStatusBadge status={tx.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="p-4 border border-border/40 rounded-lg bg-muted/20">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium">{tx.description || "Monthly subscription"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(tx.createdAt), "MMMM d, yyyy")}
                  </p>
                </div>
                <PaymentStatusBadge status={tx.status} />
              </div>
              <p className="text-lg font-bold">₦{(tx.amountNgn / 100).toLocaleString()}</p>
            </div>
          ))}
        </div>

        {transactions.length >= 20 && (
          <div className="text-center mt-4 text-sm text-muted-foreground">
            Showing last 20 transactions
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <Badge variant="secondary" className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Success
      </Badge>
    );
  }
  
  if (status === "failed") {
    return (
      <Badge variant="secondary" className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">
        <XCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  }
  
  return (
    <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 text-xs">
      <Clock className="h-3 w-3 mr-1" />
      Pending
    </Badge>
  );
}
