"use client";

import { EvidenceView } from "./EvidenceView";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { SkillWithMastery } from "@/types/progress";

interface SkillDetailProps {
  skill: SkillWithMastery;
  conversationId?: string;
}

export function SkillDetail({ skill, conversationId }: SkillDetailProps) {
  const masteryLevel = skill.mastery?.level ?? 0;
  const masteryPercent = (masteryLevel / 4) * 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{skill.topic}</CardTitle>
            {skill.subtopic && (
              <p className="text-sm text-muted-foreground mt-1">
                {skill.subtopic}
              </p>
            )}
          </div>
          <Badge variant="secondary">{skill.standard.code}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {skill.description && (
          <p className="text-sm text-muted-foreground">{skill.description}</p>
        )}

        {/* Mastery Level */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Mastery Level</span>
            <span className="text-sm font-semibold">
              {masteryLevel} / 4
            </span>
          </div>
          <Progress value={masteryPercent} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {masteryLevel === 0 && "Not started"}
            {masteryLevel === 1 && "Beginning"}
            {masteryLevel === 2 && "Developing"}
            {masteryLevel === 3 && "Proficient"}
            {masteryLevel === 4 && "Advanced"}
          </p>
        </div>

        {/* Evidence */}
        {skill.mastery &&
          skill.mastery.evidence &&
          typeof skill.mastery.evidence === "object" &&
          "turnIds" in skill.mastery.evidence &&
          "snapshotIds" in skill.mastery.evidence &&
          "rubric" in skill.mastery.evidence && (
            <EvidenceView
              evidence={skill.mastery.evidence as {
                turnIds: string[];
                snapshotIds: string[];
                rubric: {
                  accuracy: number;
                  method: string;
                  explanation: string;
                };
              }}
              conversationId={conversationId}
            />
          )}

        {skill.mastery && (
          <p className="text-xs text-muted-foreground">
            Last updated: {new Date(skill.mastery.updatedAt).toLocaleDateString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

