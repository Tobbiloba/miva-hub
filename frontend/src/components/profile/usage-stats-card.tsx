"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Activity, TrendingUp } from "lucide-react";

interface UsageStat {
  label: string;
  type: string;
  period: string;
  current: number;
  limit: number;
  allowed: boolean;
}

export function UsageStatsCard() {
  const [usage, setUsage] = useState<UsageStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/subscription/usage")
      .then(res => res.json())
      .then(data => setUsage(data.usage || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card className="bg-card border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Current Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted/30 rounded w-1/3 mb-2"></div>
                <div className="h-2 bg-muted/30 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Current Usage
        </CardTitle>
        <CardDescription>Track your plan usage and limits</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {usage.map((stat) => {
            const percentage = stat.limit === -1 ? 0 : (stat.current / stat.limit) * 100;
            const isUnlimited = stat.limit === -1;
            const isNearLimit = percentage > 80 && !isUnlimited;
            
            return (
              <div key={stat.type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    {stat.label}
                  </label>
                  <span className="text-sm text-muted-foreground">
                    {isUnlimited ? (
                      <span className="text-green-600 font-medium">Unlimited</span>
                    ) : (
                      <>
                        {stat.current} / {stat.limit}
                      </>
                    )}
                  </span>
                </div>
                {!isUnlimited && (
                  <>
                    <Progress 
                      value={percentage} 
                      className={`h-2 ${isNearLimit ? '[&>div]:bg-orange-500' : ''}`}
                    />
                    {isNearLimit && (
                      <div className="flex items-center gap-1 text-xs text-orange-600">
                        <TrendingUp className="h-3 w-3" />
                        Consider upgrading for more usage
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
