"use client";

import Link from "next/link";
import { TrendingUp, Award, ChevronRight } from "lucide-react";
import { api } from "@/trpc/react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ProgressSummary() {
  const { data: summary, isLoading } = api.progress.getMiniSummary.useQuery();

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="text-muted-foreground text-sm">Loading progress...</div>
        </CardContent>
      </Card>
    );
  }

  if (!summary || summary.totalSkillsPracticed === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm">
            <Award className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground">
              Start solving problems to track your progress!
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getMasteryColor = (level: number) => {
    if (level >= 3) return "bg-green-500";
    if (level >= 2) return "bg-yellow-500";
    if (level >= 1) return "bg-orange-500";
    return "bg-gray-300";
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-sm">Your Progress</span>
            </div>
            <Link href="/progress">
              <Button variant="ghost" size="sm" className="h-7 px-2">
                View All
                <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>

          {/* Overall Progress Bar */}
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-muted-foreground text-xs">
                Overall Mastery
              </span>
              <span className="text-xs font-semibold">
                {summary.overallProgress}%
              </span>
            </div>
            <Progress value={summary.overallProgress} className="h-2" />
          </div>

          {/* Recent Skills */}
          {summary.recentSkills.length > 0 && (
            <div>
              <p className="text-muted-foreground mb-2 text-xs">
                Recent Skills ({summary.totalSkillsPracticed} total)
              </p>
              <div className="space-y-1.5">
                {summary.recentSkills.map((skill) => (
                  <TooltipProvider key={skill.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${getMasteryColor(skill.masteryLevel)}`}
                          />
                          <span className="flex-1 truncate text-xs">
                            {skill.topic}
                            {skill.subtopic && ` - ${skill.subtopic}`}
                          </span>
                          <Badge
                            variant="secondary"
                            className="h-5 px-1.5 text-xs"
                          >
                            {skill.masteryLevel}/4
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">{skill.topic}</p>
                        {skill.subtopic && (
                          <p className="text-xs">{skill.subtopic}</p>
                        )}
                        <p className="text-muted-foreground text-xs">
                          Level {skill.masteryLevel} / 4
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

