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

import { Event } from "@/types/event";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import {  File } from "lucide-react";

interface EventModalProps {
  event: Event | null;
  onClose: () => void;
  onSave: (event: Event) => Promise<void>;
  canEdit: boolean;
}

const EventModal: React.FC<EventModalProps> = ({
  event,
  onClose,
  onSave,
  canEdit,
}) => {
  const [editedEvent, setEditedEvent] = useState<Event>(
    event || {
      id: "",
      name: "",
      startdate: new Date().toISOString(),
      enddate: new Date().toISOString(),
      cost: "",
      location: "",
    }
  );
  const [file, setFile] = useState<File | null>(null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (event) {
      setEditedEvent(event);
      console.log("Event:", event);

      if (event.attachment?.path) {
        const { data } = supabase.storage
          .from("event-attachments")
          .getPublicUrl(event.attachment.path);

        setAttachmentUrl(data?.publicUrl || null);
        console.log("Attachment URL:", data?.publicUrl);
      } else {
        setAttachmentUrl(null);
      }
    }
  }, [event]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setEditedEvent((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedEvent = { ...editedEvent };

    try {
      if (file) {
        const { data, error } = await supabase.storage
          .from("event-attachments")
          .upload(`${crypto.randomUUID()}/${file.name}`, file);

        if (error) {
          throw new Error(`File upload failed: ${error.message}`);
        }

        updatedEvent.attachment = {
          path: data?.path || "",
          filename: file.name,
        };
      }

      updatedEvent.id = updatedEvent.id || null;

      await onSave(updatedEvent);
    } catch (saveError) {
      console.error("Error saving event:", saveError);
      alert(`Error saving event: ${saveError}`);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{event?.id ? "Edit Event" : "Add Event"}</DialogTitle>
        </DialogHeader>
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
                disabled={!canEdit}
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
                disabled={!canEdit}
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
                disabled={!canEdit}
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
                disabled={!canEdit}
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
                disabled={!canEdit}
              />
            </div>
            {editedEvent.attachment && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Attachment</Label>
                <div className="col-span-3 flex items-center gap-2 bg-muted p-2 rounded-md">
                  <File size={16} />
                  <a
                    href={attachmentUrl || undefined}
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
          <DialogFooter>
            {canEdit && (
              <Button type="submit">
                {event?.id ? "Update Event" : "Create Event"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventModal;
