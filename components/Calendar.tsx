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
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import EventModal from "./EventModal";
import EventsList from "./EventsList";
import { Event } from "@/types/event";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Session, User } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import { useUserStore } from "./CalendarHeader";

const ACCESS_LEVELS = {
  EDIT: "edit",
  READONLY: "readonly",
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
      accessLevel: ACCESS_LEVELS.EDIT as "edit" | "readonly",
      attachment: undefined,
    });
    setIsModalOpen(true);
  };

  const handleEventClick = (event: Event) => {
    if (canViewEvent(event)) {
      setSelectedEvent(event);
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
    if (userRole === "admin") return true;
    if (
      userRole === "user" &&
      event.createdBy === user.id &&
      event.accessLevel === ACCESS_LEVELS.EDIT
    )
      return true;
    return false;
  };

  const canViewEvent = (event: Event) => {
    if (!user || !userRole)
      return (
        event.accessLevel === ACCESS_LEVELS.READONLY ||
        event.accessLevel === ACCESS_LEVELS.EDIT
      );
    return true;
  };

  const canDeleteEvents = () => {
    return userRole === "admin";
  };

  const getEventColor = (event: Event) => {
    switch (event.accessLevel) {
      case ACCESS_LEVELS.EDIT:
        return "bg-green-500";
      case ACCESS_LEVELS.READONLY:
      default:
        return "bg-blue-500";
    }
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate)),
  });

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <Card className="bg-white/50 backdrop-blur-sm shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-3xl font-bold text-gray-800">
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
              <div
                key={day}
                className="text-center font-semibold text-sm py-2 text-gray-600"
              >
                {day}
              </div>
            ))}
            {days.map((day) => (
              <div
                key={day.toString()}
                className={`p-2 border rounded-md ${
                  isSameMonth(day, currentDate)
                    ? "bg-white"
                    : "bg-gray-100 text-gray-400"
                } ${
                  isSameDay(day, new Date()) ? "ring-2 ring-blue-500" : ""
                } hover:bg-gray-50 transition-colors duration-200`}
                onClick={() => handleDateClick(day)}
              >
                <div className="text-right text-sm font-medium">
                  {format(day, "d")}
                </div>
                <div className="mt-1 space-y-1">
                  {events
                    .filter((event) =>
                      isWithinInterval(day, {
                        start: parseISO(event.startdate),
                        end: parseISO(event.enddate),
                      })
                    )
                    .slice(0, 2) // Show only first 2 events
                    .map((event) => (
                      <div
                        key={event.id}
                        className={`text-xs p-1 rounded-sm cursor-pointer ${getEventColor(
                          event
                        )} text-white truncate`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                      >
                        {event.name}
                      </div>
                    ))}
                  {events.filter((event) =>
                    isWithinInterval(day, {
                      start: parseISO(event.startdate),
                      end: parseISO(event.enddate),
                    })
                  ).length > 2 && (
                    <div className="text-xs text-gray-500">
                      {events.filter((event) =>
                        isWithinInterval(day, {
                          start: parseISO(event.startdate),
                          end: parseISO(event.enddate),
                        })
                      ).length - 2}{" "}
                      more
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {user && (
            <Button
              className="mt-4"
              onClick={() => handleDateClick(new Date())}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Event
            </Button>
          )}
        </CardContent>
      </Card>

      <EventsList
        events={events}
        onEventClick={handleEventClick}
        getEventColor={getEventColor}
      />

      {isModalOpen && selectedEvent && (
        <EventModal
          event={selectedEvent}
          onClose={handleCloseModal}
          onSave={
            canEditEvent(selectedEvent) ? handleSaveEvent : async () => {}
          }
          onDelete={canDeleteEvents() ? handleDeleteEvent : undefined}
          canEdit={canEditEvent(selectedEvent)}
          isAdmin={userRole === "admin"}
        />
      )}
    </div>
  );
};

export default Calendar;
