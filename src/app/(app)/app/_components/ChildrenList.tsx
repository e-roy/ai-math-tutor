"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChildCard } from "@/app/(app)/app/_components/ChildCard";
import { TutorPersonaForm } from "@/app/(app)/app/_components/TutorPersonaForm";
import { AddChildWizard } from "@/app/(app)/app/_components/AddChildWizard";

type Child = {
  id: string;
  preferredName: string;
  grade?: string;
  persona?: {
    displayName: string;
    avatarUrl?: string;
  };
};

interface ChildrenListProps {
  students: Child[];
}

export function ChildrenList({ students }: ChildrenListProps) {
  const [customizingChildId, setCustomizingChildId] = useState<string | null>(
    null,
  );
  const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);

  const customizingChild = students.find(
    (child) => child.id === customizingChildId,
  );

  return (
    <>
      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        {students.map((child) => (
          <ChildCard
            key={child.id}
            child={child}
            onCustomize={(childId) => setCustomizingChildId(childId)}
          />
        ))}
        <Card className="hover:border-primary/50 cursor-pointer border-dashed transition-all hover:shadow-md">
          <CardHeader>
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-full">
                <UserPlus className="text-muted-foreground h-8 w-8" />
              </div>
              <div className="text-center">
                <CardTitle>Add Child</CardTitle>
                <CardDescription>
                  Create a new child profile and tutor
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setIsAddWizardOpen(true)}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Child
            </Button>
          </CardContent>
        </Card>
      </div>
      {customizingChild && (
        <TutorPersonaForm
          open={!!customizingChildId}
          onOpenChange={(open) => {
            if (!open) {
              setCustomizingChildId(null);
            }
          }}
          childId={customizingChild.id}
          initialName={customizingChild.persona?.displayName ?? ""}
          initialAvatarUrl={customizingChild.persona?.avatarUrl}
          childPreferredName={customizingChild.preferredName}
        />
      )}
      <AddChildWizard
        open={isAddWizardOpen}
        onOpenChange={setIsAddWizardOpen}
      />
    </>
  );
}
