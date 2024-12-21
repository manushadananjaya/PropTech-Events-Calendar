"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Event } from "@/types/event";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { File } from "lucide-react";

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
  const [attachmentInfo, setAttachmentInfo] = useState<{
    path: string;
    filename: string;
  } | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (event) {
      setEditedEvent(event);
      console.log("Event:", event);

      // Parse attachment JSON if it exists
      if (typeof event.attachment === "string") {
        try {
          const parsedAttachment = JSON.parse(event.attachment);
          if (parsedAttachment.path && parsedAttachment.filename) {
            setAttachmentInfo({
              path: parsedAttachment.path,
              filename: parsedAttachment.filename,
            });

            // Generate public URL for attachment
            const { data } = supabase.storage
              .from("event-attachments")
              .getPublicUrl(parsedAttachment.path);

            setAttachmentUrl(data?.publicUrl || null);
            console.log("Attachment URL:", data?.publicUrl);
          }
        } catch (error) {
          console.error("Error parsing attachment JSON:", error);
        }
      } else if (
        event.attachment &&
        event.attachment.path &&
        event.attachment.filename
      ) {
        setAttachmentInfo({
          path: event.attachment.path,
          filename: event.attachment.filename,
        });

        // Generate public URL for attachment
        const { data } = supabase.storage
          .from("event-attachments")
          .getPublicUrl(event.attachment.path);

        setAttachmentUrl(data?.publicUrl || null);
        console.log("Attachment URL:", data?.publicUrl);
      }
    }
  }, [event]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        if (data?.path) {
          updatedEvent.attachment = {
            path: data.path,
            filename: file.name,
          };
        }
      }

      // Ensure the ID is null for new events to let Supabase generate one
      updatedEvent.id = updatedEvent.id || null;

      await onSave(updatedEvent);
    } catch (saveError) {
      console.error("Error saving event:", saveError);
      alert(`Error saving event || "Unknown error"}`);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event?.id ? "Edit Event" : "Add Event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Event Name</Label>
              <Input
                id="name"
                name="name"
                value={editedEvent.name}
                onChange={handleChange}
                required
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                name="startdate"
                type="datetime-local"
                value={new Date(editedEvent.startdate)
                  .toISOString()
                  .slice(0, 16)}
                onChange={handleChange}
                required
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                name="enddate"
                type="datetime-local"
                value={new Date(editedEvent.enddate).toISOString().slice(0, 16)}
                onChange={handleChange}
                required
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="cost">Cost</Label>
              <Input
                id="cost"
                name="cost"
                value={editedEvent.cost}
                onChange={handleChange}
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={editedEvent.location}
                onChange={handleChange}
                disabled={!canEdit}
              />
            </div>
            {attachmentInfo && (
              <div className="mt-4 p-4 bg-gray-100 rounded-md">
                <h3 className="text-lg font-semibold mb-2">Attachment</h3>
                <div className="flex items-center gap-2">
                  <File size={24} />
                  <div>
                    <p className="font-medium">{attachmentInfo.filename}</p>
                    <a
                      href={attachmentUrl || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline text-sm"
                    >
                      View File
                    </a>
                  </div>
                </div>
              </div>
            )}
            {canEdit && (
              <div>
                <Label htmlFor="file">Upload New Attachment</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  onChange={handleFileChange}
                />
                {file && (
                  <p className="text-sm text-gray-600 mt-1">
                    New file: {file.name}
                  </p>
                )}
              </div>
            )}
          </div>
          {canEdit && (
            <Button type="submit" className="mt-4">
              Save Event
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EventModal;
