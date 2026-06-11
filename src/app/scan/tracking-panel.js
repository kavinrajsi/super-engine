"use client";

// Tracking: Microsoft Clarity (heatmap) status + all detected analytics/tag/
// heatmap tools.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function TrackingPanel({ analytics }) {
  if (!analytics) return null;
  const { tools = [], hasClarity, clarityId } = analytics;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Microsoft Clarity (heatmap)</CardTitle>
        </CardHeader>
        <CardContent>
          {hasClarity ? (
            <div className="flex items-center gap-3">
              <Badge>✓ detected</Badge>
              {clarityId && (
                <span className="font-mono text-sm text-muted-foreground">ID: {clarityId}</span>
              )}
            </div>
          ) : (
            <Badge variant="outline">✗ not detected</Badge>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analytics &amp; tracking detected</CardTitle>
        </CardHeader>
        <CardContent>
          {tools.length === 0 ? (
            <p className="text-sm text-muted-foreground">No analytics or tracking tools detected.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tools.map((t) => (
                <Badge key={t.key} variant={t.heatmap ? "secondary" : "outline"}>
                  {t.heatmap ? "🔥 " : ""}
                  {t.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
