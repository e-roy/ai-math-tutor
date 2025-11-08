"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Evidence } from "@/types/progress";

interface EvidenceViewProps {
  evidence: Evidence;
  conversationId?: string;
}

export function EvidenceView({ evidence, conversationId }: EvidenceViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Evidence</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rubric */}
        <div>
          <h4 className="font-semibold mb-2">Rubric</h4>
          <div className="space-y-1 text-sm">
            <div>
              <span className="font-medium">Accuracy: </span>
              <span>{(evidence.rubric.accuracy * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span className="font-medium">Method: </span>
              <span>{evidence.rubric.method}</span>
            </div>
            <div>
              <span className="font-medium">Explanation: </span>
              <span>{evidence.rubric.explanation}</span>
            </div>
          </div>
        </div>

        {/* Turn IDs */}
        {evidence.turnIds.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Related Turns</h4>
            <div className="flex flex-wrap gap-2">
              {evidence.turnIds.map((turnId) => (
                <Link
                  key={turnId}
                  href={
                    conversationId
                      ? `/app/conversation?id=${conversationId}`
                      : "/app/conversation"
                  }
                  className="text-sm"
                >
                  <Badge variant="outline" className="hover:bg-accent">
                    Turn {turnId.slice(0, 8)}...
                  </Badge>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Snapshot IDs */}
        {evidence.snapshotIds.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Related Snapshots</h4>
            <div className="flex flex-wrap gap-2">
              {evidence.snapshotIds.map((snapshotId) => (
                <Link
                  key={snapshotId}
                  href={
                    conversationId
                      ? `/app/conversation?id=${conversationId}`
                      : "/app/conversation"
                  }
                  className="text-sm"
                >
                  <Badge variant="outline" className="hover:bg-accent">
                    Snapshot {snapshotId.slice(0, 8)}...
                  </Badge>
                </Link>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              TODO: Snapshot restore functionality coming soon
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

