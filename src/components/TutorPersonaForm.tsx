"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { put } from "@vercel/blob";
import { z } from "zod";
import { Upload, Trash2 } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";
import { useChildStore } from "@/store/useChildStore";

// Client-side validation schema matching server constraints
const formSchema = z.object({
  tutorName: z.string().min(1, "Tutor name is required").max(30).trim(),
});

interface TutorPersonaFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childId: string;
  initialName: string;
  initialAvatarUrl?: string;
  childPreferredName: string;
}

export function TutorPersonaForm({
  open,
  onOpenChange,
  childId,
  initialName,
  initialAvatarUrl,
  childPreferredName,
}: TutorPersonaFormProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentChildId = useChildStore((state) => state.currentChildId);
  const setChildId = useChildStore((state) => state.setChildId);

  const [tutorName, setTutorName] = useState(initialName);
  const [avatarBlobUrl, setAvatarBlobUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(
    null,
  );
  const [errors, setErrors] = useState<Partial<Record<"tutorName", string>>>(
    {},
  );
  const [touched, setTouched] = useState<Partial<Record<"tutorName", boolean>>>(
    {},
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Reset form when dialog opens/closes or initial values change
  useEffect(() => {
    if (open) {
      setTutorName(initialName);
      setAvatarBlobUrl(null);
      setAvatarUploadError(null);
      setErrors({});
      setTouched({});
      setIsDeleteDialogOpen(false);
      setDeleteConfirmationText("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [open, initialName]);

  const getUploadUrl = api.files.getUploadUrl.useMutation();
  const updateTutorName = api.children.updateTutorName.useMutation();
  const setAvatar = api.children.setTutorAvatarFromBlob.useMutation();
  const deleteChild = api.children.deleteChild.useMutation({
    onSuccess: () => {
      // Clear selection if deleted child was selected
      if (currentChildId === childId) {
        setChildId(null);
      }
      // Invalidate cache and refresh
      void utils.children.list.invalidate();
      router.refresh();
      setIsDeleteDialogOpen(false);
      setDeleteConfirmationText("");
      onOpenChange(false);
    },
  });

  const handleTutorNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTutorName(value);
    if (touched.tutorName) {
      const result = formSchema.shape.tutorName.safeParse(value);
      if (!result.success) {
        setErrors((prev) => ({
          ...prev,
          tutorName: result.error.errors[0]?.message,
        }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.tutorName;
          return next;
        });
      }
    }
  };

  const handleTutorNameBlur = () => {
    setTouched((prev) => ({ ...prev, tutorName: true }));
    const result = formSchema.shape.tutorName.safeParse(tutorName);
    if (!result.success) {
      setErrors((prev) => ({
        ...prev,
        tutorName: result.error.errors[0]?.message,
      }));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const imageTypeRegex = /^image\/(png|jpeg)$/;
    if (!imageTypeRegex.exec(file.type)) {
      setAvatarUploadError("Please select a PNG or JPEG image");
      return;
    }

    // Validate file size (3MB max)
    if (file.size > 3 * 1024 * 1024) {
      setAvatarUploadError("Image must be smaller than 3MB");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    const result = formSchema.safeParse({ tutorName });
    if (!result.success) {
      const zodError = result.error;
      const fieldErrors: Partial<Record<"tutorName", string>> = {};
      zodError.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as "tutorName"] = err.message;
        }
      });
      setErrors(fieldErrors);
      setTouched({ tutorName: true });
      return;
    }

    try {
      // Update tutor name if changed
      if (tutorName.trim() !== initialName.trim()) {
        await updateTutorName.mutateAsync({
          childId,
          displayName: tutorName.trim(),
        });
      }

      // Update avatar if uploaded
      if (avatarBlobUrl) {
        await setAvatar.mutateAsync({
          childId,
          blobUrl: avatarBlobUrl,
        });
      }

      // Invalidate cache and refresh
      void utils.children.list.invalidate();
      router.refresh();

      // Close dialog
      onOpenChange(false);
    } catch (error) {
      const err = error instanceof Error ? error : new Error("Failed to save");
      setAvatarUploadError(err.message);
    }
  };

  const handleClose = () => {
    setTutorName(initialName);
    setAvatarBlobUrl(null);
    setAvatarUploadError(null);
    setErrors({});
    setTouched({});
    setIsDeleteDialogOpen(false);
    setDeleteConfirmationText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteDialogClose = (open: boolean) => {
    if (!open) {
      setIsDeleteDialogOpen(false);
      setDeleteConfirmationText("");
    }
  };

  const handleDeleteDialogCancel = () => {
    setIsDeleteDialogOpen(false);
    setDeleteConfirmationText("");
  };

  const handleDeleteConfirm = async () => {
    if (!isDeleteConfirmationValid) return;

    try {
      await deleteChild.mutateAsync({ childId });
      // onSuccess callback handles cleanup and navigation
    } catch (error) {
      // Error is handled by deleteChild.error in the UI
    }
  };

  // Check if delete confirmation text matches child's preferred name
  const isDeleteConfirmationValid =
    deleteConfirmationText.trim() === childPreferredName.trim();

  // Determine which avatar to show (uploaded preview or initial)
  const displayAvatarUrl = avatarBlobUrl ?? initialAvatarUrl;
  const displayName = tutorName || initialName;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Customize Tutor</DialogTitle>
            <DialogDescription>
              Update the tutor&apos;s display name and avatar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {/* Avatar Preview */}
              <div className="flex justify-center">
                <Avatar className="h-24 w-24">
                  {displayAvatarUrl ? (
                    <AvatarImage src={displayAvatarUrl} alt="Tutor avatar" />
                  ) : (
                    <AvatarFallback className="text-2xl">
                      {displayName.charAt(0).toUpperCase() || "T"}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>

              {/* Tutor Name Input */}
              <div className="space-y-2">
                <Label htmlFor="tutorName">Tutor Name</Label>
                <Input
                  id="tutorName"
                  type="text"
                  value={tutorName}
                  onChange={handleTutorNameChange}
                  onBlur={handleTutorNameBlur}
                  placeholder="Enter tutor name"
                  maxLength={30}
                  aria-invalid={errors.tutorName ? "true" : "false"}
                  aria-describedby={
                    errors.tutorName ? "tutorName-error" : undefined
                  }
                />
                {errors.tutorName && (
                  <p id="tutorName-error" className="text-destructive text-sm">
                    {errors.tutorName}
                  </p>
                )}
                <p className="text-muted-foreground text-xs">1-30 characters</p>
              </div>

              {/* Avatar Upload */}
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
                      : displayAvatarUrl
                        ? "Replace Avatar"
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
            </div>

            <DialogFooter className="mt-6 flex-col gap-2 sm:flex-row">
              <div className="flex flex-1 justify-start">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDeleteClick}
                  disabled={
                    updateTutorName.isPending ||
                    setAvatar.isPending ||
                    isUploadingAvatar
                  }
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Child
                </Button>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    updateTutorName.isPending ||
                    setAvatar.isPending ||
                    isUploadingAvatar
                  }
                >
                  {updateTutorName.isPending || setAvatar.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Child</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete{" "}
              {childPreferredName}&apos;s profile and all associated data,
              including their tutor persona.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-confirmation">
                Type <strong>{childPreferredName}</strong> to confirm
              </Label>
              <Input
                id="delete-confirmation"
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder={childPreferredName}
                disabled={deleteChild.isPending}
                autoFocus
              />
            </div>
            {deleteChild.error && (
              <p className="text-destructive text-sm">
                {deleteChild.error.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteDialogCancel}
              disabled={deleteChild.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={!isDeleteConfirmationValid || deleteChild.isPending}
            >
              {deleteChild.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
