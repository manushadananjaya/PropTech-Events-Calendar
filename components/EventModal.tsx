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
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  useEffect(() => {
    if (event) {
      setEditedEvent(event);

      let parsedAttachment;
      try {
        parsedAttachment =
          typeof event.attachment === "string"
            ? JSON.parse(event.attachment)
            : event.attachment;
      } catch (parseError) {
        console.error("Error parsing attachment JSON:", parseError);
        parsedAttachment = null;
      }

      if (parsedAttachment?.path) {
        const { data } = supabase.storage
          .from("event-attachments")
          .getPublicUrl(parsedAttachment.path);

        setAttachmentUrl(data?.publicUrl || null);
      } else {
        console.log("No valid attachment path found");
        setAttachmentUrl(null);
      }

      setEditedEvent((prev) => ({ ...prev, attachment: parsedAttachment }));
    }
  }, [event, supabase]);

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

        const { data: publicUrlData } = supabase.storage
          .from("event-attachments")
          .getPublicUrl(data.path);

        updatedEvent.attachment = {
          path: data.path,
          filename: file.name,
          publicUrl: publicUrlData.publicUrl,
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
      <DialogContent className="w-full sm:max-w-[425px]">
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

        <form onSubmit={handleSubmit} className="space-y-4 px-2 sm:px-0">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm sm:text-base">
              Name
            </Label>
            <Input
              id="name"
              name="name"
              value={editedEvent.name}
              onChange={handleChange}
              required
              disabled={!canEdit || isLoading}
              className="text-sm sm:text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate" className="text-sm sm:text-base">
              Start
            </Label>
            <Input
              id="startDate"
              name="startdate"
              type="datetime-local"
              value={new Date(editedEvent.startdate).toISOString().slice(0, 16)}
              onChange={handleChange}
              required
              disabled={!canEdit || isLoading}
              className="text-sm sm:text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate" className="text-sm sm:text-base">
              End
            </Label>
            <Input
              id="endDate"
              name="enddate"
              type="datetime-local"
              value={new Date(editedEvent.enddate).toISOString().slice(0, 16)}
              onChange={handleChange}
              required
              disabled={!canEdit || isLoading}
              className="text-sm sm:text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost" className="text-sm sm:text-base">
              Cost
            </Label>
            <Input
              id="cost"
              name="cost"
              value={editedEvent.cost}
              onChange={handleChange}
              disabled={!canEdit || isLoading}
              className="text-sm sm:text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm sm:text-base">
              Location
            </Label>
            <Input
              id="location"
              name="location"
              value={editedEvent.location}
              onChange={handleChange}
              disabled={!canEdit || isLoading}
              className="text-sm sm:text-base"
            />
          </div>

          {isAdmin && (
            <div className="space-y-2">
              <Label htmlFor="accessLevel" className="text-sm sm:text-base">
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
                <SelectTrigger>
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ACCESS_LEVELS.EDIT}>Edit</SelectItem>
                  <SelectItem value={ACCESS_LEVELS.READONLY}>
                    Read Only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {editedEvent.attachment && (
            <div className="space-y-2">
              <Label className="text-sm sm:text-base">Attachment</Label>
              <div className="flex items-center gap-2 bg-muted p-2 rounded-md flex-wrap">
                <File size={16} />
                <a
                  href={attachmentUrl || undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-500 hover:underline truncate"
                >
                  {editedEvent.attachment?.filename || "View Attachment"}
                </a>
              </div>
            </div>
          )}

          {canEdit && (
            <div className="space-y-2">
              <Label htmlFor="file" className="text-sm sm:text-base">
                New Attachment
              </Label>
              <Input
                id="file"
                name="file"
                type="file"
                onChange={handleFileChange}
                disabled={isLoading}
                className="text-sm sm:text-base"
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-1">
                  New file: {file.name}
                </p>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {canEdit && (
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {event.id ? "Update Event" : "Create Event"}
              </Button>
            )}
            {canEdit && event.id && onDelete && (
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
        <div className="mt-4 text-sm px-2 sm:px-0">
          <h4 className="font-semibold mb-2">Access Level Colors:</h4>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span>Edit</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              <span>Read Only</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventModal;
