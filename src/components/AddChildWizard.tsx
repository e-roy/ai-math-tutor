"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { put } from "@vercel/blob";
import { z } from "zod";
import { Upload, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/trpc/react";
import { useChildStore } from "@/store/useChildStore";

// Client-side validation schema matching server constraints
const formSchema = z.object({
  preferredName: z.string().min(1, "Preferred name is required").max(40).trim(),
  lastName: z.string().max(40).trim().optional().or(z.literal("")),
  grade: z.string().max(10).trim().optional().or(z.literal("")),
  timezone: z.string().max(50).trim().optional().or(z.literal("")),
  tutorName: z.string().min(1, "Tutor name is required").max(30).trim(),
});

type FormData = z.infer<typeof formSchema>;

interface AddChildWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (childId: string) => void;
}

export function AddChildWizard({
  open,
  onOpenChange,
  onSuccess,
}: AddChildWizardProps) {
  const [formData, setFormData] = useState<FormData>({
    preferredName: "",
    lastName: "",
    grade: "",
    timezone: "",
    tutorName: "",
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof FormData, string>> & { _form?: string }
  >({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof FormData, boolean>>
  >({});
  const [step, setStep] = useState<1 | 2>(1);
  const [childId, setChildId] = useState<string | null>(null);
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(
    null,
  );
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const utils = api.useUtils();
  const getUploadUrl = api.files.getUploadUrl.useMutation();
  const setAvatar = api.children.setTutorAvatarFromBlob.useMutation();
  const setSelectedChildId = useChildStore((state) => state.setChildId);

  const createChild = api.children.createWithPersona.useMutation({
    onSuccess: (data) => {
      // Auto-select the newly created child
      setSelectedChildId(data.childId);
      // Move to Step 2 instead of showing success screen
      setChildId(data.childId);
      setStep(2);
      onSuccess?.(data.childId);
    },
    onError: (error) => {
      setErrors({ _form: error.message });
    },
  });

  const validateField = (field: keyof FormData, value: string) => {
    const fieldSchema = formSchema.shape[field];
    if (!fieldSchema) return;

    try {
      // For optional fields, allow empty strings
      if (
        (field === "lastName" || field === "grade" || field === "timezone") &&
        value.trim() === ""
      ) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
        return;
      }

      fieldSchema.parse(value);
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        const zodError = err;
        setErrors((prev) => ({
          ...prev,
          [field]: zodError.errors[0]?.message ?? "Invalid value",
        }));
      }
    }
  };

  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const value = formData[field] ?? "";
    validateField(field, value);
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    // Validate if field has been touched
    if (touched[field]) {
      validateField(field, value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      preferredName: true,
      lastName: true,
      grade: true,
      timezone: true,
      tutorName: true,
    });

    // Validate entire form
    try {
      const validated = formSchema.parse({
        preferredName: formData.preferredName.trim(),
        lastName: formData.lastName?.trim() ?? undefined,
        grade: formData.grade?.trim() ?? undefined,
        timezone: formData.timezone?.trim() ?? undefined,
        tutorName: formData.tutorName.trim(),
      });

      setErrors({});
      createChild.mutate(validated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Partial<Record<keyof FormData, string>> & {
          _form?: string;
        } = {};
        err.errors.forEach((error) => {
          const field = error.path[0] as keyof FormData;
          if (field) {
            fieldErrors[field] = error.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (PNG/JPEG only - files router doesn't support webp)
    const imageTypeRegex = /^image\/(png|jpeg)$/;
    if (!imageTypeRegex.exec(file.type)) {
      setAvatarUploadError("Please select a PNG or JPEG image");
      return;
    }

    // Validate file size (max 3MB)
    const maxSize = 3 * 1024 * 1024; // 3MB
    if (file.size > maxSize) {
      setAvatarUploadError("File size must be less than 3MB");
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarUploadError(null);

    try {
      // Get upload URL from server
      const uploadInfo = await getUploadUrl.mutateAsync({
        filename: file.name,
        contentType: file.type as "image/png" | "image/jpeg",
      });

      // Upload file to Vercel Blob
      const blob = await put(uploadInfo.pathname, file, {
        access: "public",
        token: uploadInfo.token,
        contentType: uploadInfo.contentType,
      });

      // Store blob URL for preview
      setAvatarBlobUrl(blob.url);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Upload failed");
      setAvatarUploadError(err.message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!childId) return;

    // If avatar was uploaded, save it
    if (avatarBlobUrl) {
      try {
        await setAvatar.mutateAsync({
          childId,
          blobUrl: avatarBlobUrl,
        });
      } catch (error) {
        const err =
          error instanceof Error ? error : new Error("Failed to save avatar");
        setAvatarUploadError(err.message);
        return;
      }
    }

    // Close wizard and refresh
    void utils.children.list.invalidate();
    router.refresh();
    handleClose();
  };

  const handleClose = () => {
    // Reset all state on close
    setFormData({
      preferredName: "",
      lastName: "",
      grade: "",
      timezone: "",
      tutorName: "",
    });
    setErrors({});
    setTouched({});
    setStep(1);
    setChildId(null);
    setAvatarBlobUrl(null);
    setAvatarUploadError(null);
    setIsUploadingAvatar(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const handleBackToStep1 = () => {
    setStep(1);
    setAvatarBlobUrl(null);
    setAvatarUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 2 ? (
          <>
            <DialogHeader>
              <DialogTitle>Tutor Look & Feel</DialogTitle>
              <DialogDescription>
                Add an avatar for your child&apos;s tutor (optional).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Avatar Preview */}
              <div className="flex justify-center">
                <Avatar className="h-24 w-24">
                  {avatarBlobUrl ? (
                    <AvatarImage src={avatarBlobUrl} alt="Tutor avatar" />
                  ) : (
                    <AvatarFallback className="text-2xl">
                      {formData.tutorName.charAt(0).toUpperCase() || "T"}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>

              {/* Upload Area */}
              <div className="space-y-2">
                <Label>Avatar Image</Label>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleFileSelect}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                    aria-label="Upload avatar image"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isUploadingAvatar}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploadingAvatar
                      ? "Uploading..."
                      : avatarBlobUrl
                        ? "Change Avatar"
                        : "Upload Avatar"}
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  PNG or JPEG (max 3MB)
                </p>
                {avatarUploadError && (
                  <p className="text-destructive text-sm">
                    {avatarUploadError}
                  </p>
                )}
              </div>

              <DialogFooter className="flex-col-reverse gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToStep1}
                  disabled={isUploadingAvatar || setAvatar.isPending}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSaveAvatar}
                    disabled={isUploadingAvatar || setAvatar.isPending}
                  >
                    Skip
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSaveAvatar}
                    disabled={isUploadingAvatar || setAvatar.isPending}
                  >
                    {setAvatar.isPending ? "Saving..." : "Save & Continue"}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add a Child</DialogTitle>
              <DialogDescription>
                Create a profile for your child and set up their personal tutor.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="preferredName">
                  Preferred Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="preferredName"
                  value={formData.preferredName}
                  onChange={(e) =>
                    handleChange("preferredName", e.target.value)
                  }
                  onBlur={() => handleBlur("preferredName")}
                  placeholder="e.g., Alex"
                  aria-invalid={touched.preferredName && !!errors.preferredName}
                />
                {touched.preferredName && errors.preferredName && (
                  <p className="text-destructive text-sm">
                    {errors.preferredName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  onBlur={() => handleBlur("lastName")}
                  placeholder="e.g., Smith"
                  aria-invalid={touched.lastName && !!errors.lastName}
                />
                {touched.lastName && errors.lastName && (
                  <p className="text-destructive text-sm">{errors.lastName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => handleChange("grade", e.target.value)}
                  onBlur={() => handleBlur("grade")}
                  placeholder="e.g., K, 1, 2, 3..."
                  aria-invalid={touched.grade && !!errors.grade}
                />
                {touched.grade && errors.grade && (
                  <p className="text-destructive text-sm">{errors.grade}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Input
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => handleChange("timezone", e.target.value)}
                  onBlur={() => handleBlur("timezone")}
                  placeholder="e.g., America/New_York"
                  aria-invalid={touched.timezone && !!errors.timezone}
                />
                {touched.timezone && errors.timezone && (
                  <p className="text-destructive text-sm">{errors.timezone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tutorName">
                  Tutor Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tutorName"
                  value={formData.tutorName}
                  onChange={(e) => handleChange("tutorName", e.target.value)}
                  onBlur={() => handleBlur("tutorName")}
                  placeholder="e.g., Math Mentor"
                  aria-invalid={touched.tutorName && !!errors.tutorName}
                />
                {touched.tutorName && errors.tutorName && (
                  <p className="text-destructive text-sm">{errors.tutorName}</p>
                )}
              </div>

              {errors._form && (
                <div className="bg-destructive/10 rounded-md p-3">
                  <p className="text-destructive text-sm">{errors._form}</p>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={createChild.isPending}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createChild.isPending}>
                  {createChild.isPending ? "Creating..." : "Create Child"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
