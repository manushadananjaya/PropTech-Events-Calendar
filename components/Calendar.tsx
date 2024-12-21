"use client";

import React, { useState, useEffect } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventModal from "./EventModal";
import { Event } from "@/types/event";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Session } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

interface CalendarProps {
  initialSession: Session | null;
}

const Calendar: React.FC<CalendarProps> = ({ initialSession }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(initialSession);
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchEvents();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, [currentDate]);

  const fetchEvents = async () => {
    const startOfMonthDate = startOfMonth(currentDate).toISOString();
    const endOfMonthDate = endOfMonth(currentDate).toISOString();

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .lte("startdate", endOfMonthDate)
      .gte("enddate", startOfMonthDate);

    if (error) {
      console.error("Error fetching events:", error);
      return;
    }

    // Explicitly cast data as Event[] or set to an empty array if null
    setEvents((data as Event[]) || []);
  };

  const handlePrevMonth = () => {
    setCurrentDate(
      (prevDate) => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      (prevDate) => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1)
    );
  };

  const handleDateClick = (date: Date) => {
    if (session) {
      setSelectedEvent({
        id: null,
        name: "",
        startdate: date.toISOString(),
        enddate: date.toISOString(),
        cost: "",
        location: "",
        attachment: undefined,
      });
      setIsModalOpen(true);
    }
  };

  const handleEventClick = async (event: Event) => {
    let updatedEvent = { ...event };
    if (event.attachment?.path) {
      const { data } = supabase.storage
        .from("event-attachments")
        .getPublicUrl(event.attachment.path);

      if (data) {
        updatedEvent = {
          ...updatedEvent,
          attachment: {
            path: event.attachment.path,
            filename: event.attachment.filename,
            publicUrl: data.publicUrl,
          },
        };
      }
    }
    setSelectedEvent(updatedEvent);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleSaveEvent = async (event: Event) => {
    try {
      const { id, ...eventData } = event;

      if (id) {
        console.log("Updating event with ID:", id);
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", id);

        if (error) throw error;
      } else {
        // Generate a UUID for the new event
        const newEvent = {
          id: uuidv4(), // Add a client-generated UUID
          ...eventData,
        };

        console.log("Creating a new event:", newEvent);

        const { error } = await supabase.from("events").insert(newEvent);

        if (error) throw error;
      }

      await fetchEvents();
      handleCloseModal();
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error("Error saving event:", {
          message: error.message,
          stack: error.stack,
        });
      } else {
        console.error("Unknown error occurred:", error);
      }
    }
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate)),
  });

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">
          {format(currentDate, "MMMM yyyy")}
        </h2>
        <div>
          <Button onClick={handlePrevMonth}>
            <ChevronLeft />
          </Button>
          <Button onClick={handleNextMonth}>
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day} className="text-center font-bold">
            {day}
          </div>
        ))}
        {days.map((day) => (
          <div
            key={day.toString()}
            className={`p-2 border ${
              isSameMonth(day, currentDate) ? "bg-white" : "bg-gray-100"
            } ${isSameDay(day, new Date()) ? "border-blue-500" : ""}`}
            onClick={() => handleDateClick(day)}
          >
            <div className="text-right">{format(day, "d")}</div>
            {events
              .filter((event) =>
                isWithinInterval(day, {
                  start: parseISO(event.startdate),
                  end: parseISO(event.enddate),
                })
              )
              .map((event) => (
                <div
                  key={event.id}
                  className="text-sm p-1 mt-1 cursor-pointer bg-blue-200 flex items-center gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEventClick(event);
                  }}
                >
                  <span>{event.name}</span>
                  {event.attachment && <Paperclip size={12} />}
                </div>
              ))}
          </div>
        ))}
      </div>
      {isModalOpen && selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={handleCloseModal}
          onSave={handleSaveEvent}
          canEdit={!!session}
        />
      )}
    </div>
  );
};

export default Calendar;
