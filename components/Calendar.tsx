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
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Paperclip, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

    setEvents((data as Event[]) || []);
  };

  const handlePrevMonth = () => {
    setCurrentDate((prevDate) => subMonths(prevDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prevDate) => addMonths(prevDate, 1));
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
        const newEvent = {
          id: uuidv4(),
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
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">
          {format(currentDate, "MMMM yyyy")}
        </CardTitle>
        <div className="space-x-2">
          <Button variant="outline" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center font-semibold text-sm py-2">
              {day}
            </div>
          ))}
          {days.map((day) => (
            <div
              key={day.toString()}
              className={`p-2 border rounded-md transition-colors ${
                isSameMonth(day, currentDate)
                  ? "bg-background hover:bg-accent"
                  : "bg-muted text-muted-foreground"
              } ${
                isSameDay(day, new Date()) ? "border-primary" : "border-border"
              }`}
              onClick={() => handleDateClick(day)}
            >
              <div className="text-right text-sm">{format(day, "d")}</div>
              <div className="mt-1 space-y-1">
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
                      className="text-xs p-1 rounded-sm cursor-pointer bg-primary/70 text-primary-foreground flex items-center gap-1 truncate"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                    >
                      <span className="truncate">{event.name}</span>
                      {event.attachment && <Paperclip size={10} />}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
        {session && (
          <Button className="mt-4" onClick={() => handleDateClick(new Date())}>
            <Plus className="mr-2 h-4 w-4" /> Add Event
          </Button>
        )}
      </CardContent>
      {isModalOpen && selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={handleCloseModal}
          onSave={handleSaveEvent}
          canEdit={!!session}
        />
      )}
    </Card>
  );
};

export default Calendar;
