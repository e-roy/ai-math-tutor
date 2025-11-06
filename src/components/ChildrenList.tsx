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
import { ChildCard } from "@/components/ChildCard";
import { TutorPersonaForm } from "@/components/TutorPersonaForm";
import { AddChildWizard } from "@/components/AddChildWizard";

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
  children: Child[];
}

export function ChildrenList({ children }: ChildrenListProps) {
  const [customizingChildId, setCustomizingChildId] = useState<string | null>(
    null,
  );
  const [isAddWizardOpen, setIsAddWizardOpen] = useState(false);

  const customizingChild = children.find(
    (child) => child.id === customizingChildId,
  );

  return (
    <>
      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => (
          <ChildCard
            key={child.id}
            child={child}
            onCustomize={(childId) => setCustomizingChildId(childId)}
          />
        ))}
        <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 border-dashed">
          <CardHeader>
            <div className="flex flex-col items-center justify-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <UserPlus className="h-8 w-8 text-muted-foreground" />
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

