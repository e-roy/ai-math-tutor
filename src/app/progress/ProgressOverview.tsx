"use client";

import { useState, useMemo } from "react";
import { api } from "@/trpc/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { SkillDetail } from "./SkillDetail";
import type { SkillWithMastery } from "@/types/progress";

const GRADE_BANDS = ["All", "K–2", "3–5", "6–8", "9–12"] as const;

export function ProgressOverview() {
  const [selectedGradeBand, setSelectedGradeBand] = useState<string>("All");

  const { data: overview, isLoading } = api.progress.getOverview.useQuery();

  // Filter domains by selected grade band
  const filteredDomains = useMemo(() => {
    if (!overview?.domains) return [];
    if (selectedGradeBand === "All") return overview.domains;

    return overview.domains.filter(
      (domain) => domain.gradeBand === selectedGradeBand,
    );
  }, [overview, selectedGradeBand]);

  // Calculate summary statistics
  const summary = useMemo(() => {
    if (!overview?.domains) {
      return {
        totalSkills: 0,
        masteredSkills: 0,
        averageMastery: 0,
      };
    }

    let totalSkills = 0;
    let masteredSkills = 0;
    let totalMastery = 0;

    for (const domain of filteredDomains) {
      for (const skill of domain.skills) {
        totalSkills++;
        if (skill.mastery) {
          totalMastery += skill.mastery.level;
          if (skill.mastery.level >= 4) {
            masteredSkills++;
          }
        }
      }
    }

    const averageMastery = totalSkills > 0 ? totalMastery / totalSkills : 0;

    return {
      totalSkills,
      masteredSkills,
      averageMastery: averageMastery / 4, // Normalize to 0-1
    };
  }, [filteredDomains, overview]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Loading progress...</p>
      </div>
    );
  }

  if (!overview || overview.domains.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Skills Found</CardTitle>
          <CardDescription>
            Skills will appear here once they are added to the system.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalSkills}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Mastered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.masteredSkills}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalSkills > 0
                ? `${Math.round((summary.masteredSkills / summary.totalSkills) * 100)}%`
                : "0%"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Mastery</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.averageMastery > 0
                ? `${Math.round(summary.averageMastery * 100)}%`
                : "0%"}
            </div>
            <Progress value={summary.averageMastery * 100} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <label htmlFor="grade-band" className="text-sm font-medium">
          Grade Band:
        </label>
        <Select value={selectedGradeBand} onValueChange={setSelectedGradeBand}>
          <SelectTrigger id="grade-band" className="w-[180px]">
            <SelectValue placeholder="Select grade band" />
          </SelectTrigger>
          <SelectContent>
            {GRADE_BANDS.map((band) => (
              <SelectItem key={band} value={band}>
                {band}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Domains */}
      {filteredDomains.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No Domains Found</CardTitle>
            <CardDescription>
              No domains match the selected grade band filter.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredDomains.map((domain) => {
            const domainSkillsWithMastery = domain.skills.filter(
              (skill) => skill.mastery !== null,
            );
            const domainAverageMastery =
              domainSkillsWithMastery.length > 0
                ? domainSkillsWithMastery.reduce(
                    (sum, skill) => sum + (skill.mastery?.level ?? 0),
                    0,
                  ) / domainSkillsWithMastery.length / 4
                : 0;

            return (
              <Card key={`${domain.domain}-${domain.gradeBand}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{domain.domain}</CardTitle>
                      <CardDescription className="mt-1">
                        Grade Band: {domain.gradeBand}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {domain.skills.length} skill{domain.skills.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  {domainSkillsWithMastery.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          Domain Average Mastery
                        </span>
                        <span className="text-sm font-semibold">
                          {Math.round(domainAverageMastery * 100)}%
                        </span>
                      </div>
                      <Progress value={domainAverageMastery * 100} className="h-2" />
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {domain.skills.map((skill) => (
                      <AccordionItem key={skill.id} value={skill.id}>
                        <AccordionTrigger>
                          <div className="flex items-center gap-2 flex-1">
                            <span className="font-medium">{skill.topic}</span>
                            {skill.mastery && (
                              <Badge variant="outline">
                                Level {skill.mastery.level}/4
                              </Badge>
                            )}
                            {!skill.mastery && (
                              <Badge variant="outline" className="text-muted-foreground">
                                Not started
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <SkillDetail skill={skill as SkillWithMastery} />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

