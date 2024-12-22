"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isWithinInterval,
  parseISO,
  addMonths,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import EventModal from "./EventModal";
import { Event } from "@/types/event";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Session, User } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { useUserStore } from "./CalendarHeader";

const ACCESS_LEVELS = {
  ADMIN: "admin",
  EDIT: "edit",
  READONLY: "readonly",
  USER: "user",
};

interface CalendarProps {
  initialSession: Session | null;
}

const Calendar: React.FC<CalendarProps> = ({ initialSession }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const userRole = useUserStore((state) => state.userRole);
  const supabase = createClientComponentClient();

  // Memoized fetchEvents function
  const fetchEvents = useCallback(async () => {
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
  }, [currentDate, supabase]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handlePrevMonth = () => {
    setCurrentDate((prevDate) => subMonths(prevDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate((prevDate) => addMonths(prevDate, 1));
  };

  const handleDateClick = (date: Date) => {
    if (!user) {
      alert("You must be logged in to add events.");
      return;
    }

    setSelectedEvent({
      id: null,
      name: "",
      startdate: date.toISOString(),
      enddate: date.toISOString(),
      cost: "",
      location: "",
      createdBy: user.id,
      accessLevel: ACCESS_LEVELS.EDIT as "admin" | "edit" | "readonly",
      attachment: undefined,
    });
    setIsModalOpen(true);
  };

  const handleEventClick = async (event: Event) => {
    if (canViewEvent(event)) {
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
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleSaveEvent = async (event: Event) => {
    try {
      const { id, ...eventData } = event;

      if (id) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", id);

        if (error) throw error;
      } else {
        const newEvent = {
          id: uuidv4(),
          ...eventData,
          createdBy: user?.id,
        };

        const { error } = await supabase.from("events").insert(newEvent);

        if (error) throw error;
      }

      await fetchEvents();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving event:", error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!canDeleteEvents()) return;

    try {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);

      if (error) throw error;

      await fetchEvents();
      handleCloseModal();
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const canEditEvent = (event: Event) => {
    if (!user || !userRole) return false;

    // Allow editing admin-level events only for admin users
    if (event.accessLevel === ACCESS_LEVELS.ADMIN) {
      return userRole === ACCESS_LEVELS.ADMIN;
    }

    return (
      userRole === ACCESS_LEVELS.ADMIN ||
      (event.createdBy === user.id && userRole === ACCESS_LEVELS.EDIT) ||
      userRole === ACCESS_LEVELS.USER
    );
  };


  const canViewEvent = (event: Event) => {
    if (!user || !userRole)
      return (
        event.accessLevel === ACCESS_LEVELS.READONLY ||
        event.accessLevel === ACCESS_LEVELS.EDIT ||
        event.accessLevel === ACCESS_LEVELS.ADMIN
      );
    return (
      userRole === ACCESS_LEVELS.ADMIN ||
      userRole === ACCESS_LEVELS.EDIT ||
      userRole === ACCESS_LEVELS.READONLY ||
      event.accessLevel === ACCESS_LEVELS.READONLY ||
      event.accessLevel === ACCESS_LEVELS.EDIT ||
      event.accessLevel === ACCESS_LEVELS.ADMIN
    );
  };

  const canDeleteEvents = () => {
    return userRole === ACCESS_LEVELS.ADMIN;
  };

  const getEventColor = (event: Event) => {
    switch (event.accessLevel) {
      case ACCESS_LEVELS.ADMIN:
        return "bg-red-500";
      case ACCESS_LEVELS.EDIT:
        return "bg-green-500";
      case ACCESS_LEVELS.READONLY:
        return "bg-blue-500";
      default:
        return "bg-gray-500";
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
              className={`p-2 border rounded-md ${
                isSameMonth(day, currentDate) ? "bg-background" : "bg-muted"
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
                      className={`text-xs p-1 rounded-sm cursor-pointer ${getEventColor(
                        event
                      )} text-white flex items-center gap-1 truncate`}
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
        {user && (
          <Button className="mt-4" onClick={() => handleDateClick(new Date())}>
            <Plus className="mr-2 h-4 w-4" /> Add Event
          </Button>
        )}
      </CardContent>
      {isModalOpen && selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={handleCloseModal}
          onSave={
            canEditEvent(selectedEvent) ? handleSaveEvent : async () => {}
          } // Use a no-op function
          onDelete={canDeleteEvents() ? handleDeleteEvent : undefined}
          canEdit={canEditEvent(selectedEvent)}
          isAdmin={userRole === ACCESS_LEVELS.ADMIN}
        />
      )}
    </Card>
  );
};

export default Calendar;
