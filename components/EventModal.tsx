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

interface EventModalProps {
  event: Event | null;
  onClose: () => void;
  onSave: (event: Event) => void;
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
      startDate: "",
      endDate: "",
      cost: "",
      location: "",
    }
  );
  const [file, setFile] = useState<File | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (event) {
      setEditedEvent(event);
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

    if (file) {
      const { data, error } = await supabase.storage
        .from("event-attachments")
        .upload(`${editedEvent.id}/${file.name}`, file);

      if (error) {
        console.error("Error uploading file:", error);
      } else if (data) {
        updatedEvent.attachment = {
          path: data.path,
          filename: file.name,
        };
      }
    }

    onSave(updatedEvent);
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
                name="startDate"
                type="datetime-local"
                value={editedEvent.startDate.split(".")[0]}
                onChange={handleChange}
                required
                disabled={!canEdit}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                name="endDate"
                type="datetime-local"
                value={editedEvent.endDate.split(".")[0]}
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
            {canEdit && (
              <div>
                <Label htmlFor="file">Attachment</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  onChange={handleFileChange}
                />
              </div>
            )}
            {editedEvent.attachment && (
              <div>
                <Label>Current Attachment</Label>
                <p>{editedEvent.attachment.filename}</p>
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
