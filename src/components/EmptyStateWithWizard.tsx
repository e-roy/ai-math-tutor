"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { AddChildWizard } from "./AddChildWizard";

export function EmptyStateWithWizard() {
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center gap-8 text-center">
        <Card className="w-full max-w-2xl">
          <CardHeader className="flex flex-col items-center gap-4">
            <UserPlus className="text-primary h-12 w-12" />
            <CardTitle className="text-4xl font-extrabold tracking-tight">
              Let&apos;s set up your family
            </CardTitle>
            <CardDescription className="text-lg">
              Add your first child to create their personal tutor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button size="lg" onClick={() => setIsWizardOpen(true)}>
              <UserPlus className="mr-2 h-5 w-5" />
              Add first child
            </Button>
          </CardContent>
        </Card>
      </div>
      <AddChildWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={() => {
          // Wizard will close automatically after success
          // The page will refresh children list via query invalidation
        }}
      />
    </>
  );
}
