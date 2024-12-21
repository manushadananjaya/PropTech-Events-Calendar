"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Event } from "@/types/event";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { File, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ACCESS_LEVELS = {
  ADMIN: "admin",
  EDIT: "edit",
  READONLY: "readonly",
} as const;

interface EventModalProps {
  event: Event;
  onClose: () => void;
  onSave: (event: Event) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
  canEdit: boolean;
  isAdmin: boolean;
}

const EventModal: React.FC<EventModalProps> = ({
  event,
  onClose,
  onSave,
  onDelete,
  canEdit,
  isAdmin,
}) => {
  const [editedEvent, setEditedEvent] = useState<Event>(event);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    setEditedEvent(event);
  }, [event]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setEditedEvent((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      // Check file size (5MB limit)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const updatedEvent = { ...editedEvent };

      if (file) {
        const { data, error: uploadError } = await supabase.storage
          .from("event-attachments")
          .upload(`${crypto.randomUUID()}/${file.name}`, file);

        if (uploadError) {
          throw new Error(`File upload failed: ${uploadError.message}`);
        }

        updatedEvent.attachment = {
          path: data?.path || "",
          filename: file.name,
        };
      }

      await onSave(updatedEvent);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error saving event");
      console.error("Error saving event:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!event.id || !onDelete) return;

    try {
      setIsDeleting(true);
      setError(null);
      await onDelete(event.id);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Error deleting event");
      console.error("Error deleting event:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {event.id ? "Edit Event" : "Add Event"}
            {!canEdit && " (Read Only)"}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                name="name"
                value={editedEvent.name}
                onChange={handleChange}
                className="col-span-3"
                required
                disabled={!canEdit || isLoading}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Start
              </Label>
              <Input
                id="startDate"
                name="startdate"
                type="datetime-local"
                value={new Date(editedEvent.startdate)
                  .toISOString()
                  .slice(0, 16)}
                onChange={handleChange}
                className="col-span-3"
                required
                disabled={!canEdit || isLoading}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="endDate" className="text-right">
                End
              </Label>
              <Input
                id="endDate"
                name="enddate"
                type="datetime-local"
                value={new Date(editedEvent.enddate).toISOString().slice(0, 16)}
                onChange={handleChange}
                className="col-span-3"
                required
                disabled={!canEdit || isLoading}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cost" className="text-right">
                Cost
              </Label>
              <Input
                id="cost"
                name="cost"
                value={editedEvent.cost}
                onChange={handleChange}
                className="col-span-3"
                disabled={!canEdit || isLoading}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="location" className="text-right">
                Location
              </Label>
              <Input
                id="location"
                name="location"
                value={editedEvent.location}
                onChange={handleChange}
                className="col-span-3"
                disabled={!canEdit || isLoading}
              />
            </div>

            {isAdmin && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="accessLevel" className="text-right">
                  Access Level
                </Label>
                <Select
                  name="accessLevel"
                  value={editedEvent.accessLevel}
                  onValueChange={(value) =>
                    handleChange({
                      target: { name: "accessLevel", value },
                    } as React.ChangeEvent<HTMLSelectElement>)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select access level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ACCESS_LEVELS.ADMIN}>Admin</SelectItem>
                    <SelectItem value={ACCESS_LEVELS.EDIT}>Edit</SelectItem>
                    <SelectItem value={ACCESS_LEVELS.READONLY}>
                      Read Only
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {editedEvent.attachment && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Attachment</Label>
                <div className="col-span-3 flex items-center gap-2 bg-muted p-2 rounded-md">
                  <File size={16} />
                  <a
                    href={editedEvent.attachment.publicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline truncate"
                  >
                    {editedEvent.attachment.filename || "View Attachment"}
                  </a>
                </div>
              </div>
            )}

            {canEdit && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="file" className="text-right">
                  New Attachment
                </Label>
                <div className="col-span-3">
                  <Input
                    id="file"
                    name="file"
                    type="file"
                    onChange={handleFileChange}
                    disabled={isLoading}
                  />
                  {file && (
                    <p className="text-sm text-muted-foreground mt-1">
                      New file: {file.name}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {canEdit && (
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {event.id ? "Update Event" : "Create Event"}
              </Button>
            )}
            {isAdmin && event.id && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteClick}
                disabled={isDeleting}
              >
                {isDeleting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Delete Event
              </Button>
            )}
          </DialogFooter>
        </form>

        <div className="mt-4 text-sm">
          <h4 className="font-semibold mb-2">Access Level Colors:</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 bg-red-500 rounded-full"></span>
              <span>Admin - Only admins can edit</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 bg-green-500 rounded-full"></span>
              <span>Edit - Creator and admins can edit</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-4 h-4 bg-blue-500 rounded-full"></span>
              <span>Read Only - Anyone can view</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventModal;
