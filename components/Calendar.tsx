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
  setMonth,
  setYear,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import EventModal from "./EventModal";
import EventsList from "./EventsList";
import { Event } from "@/types/event";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useSessionContext } from "@/context/SessionContext";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

const ACCESS_LEVELS = {
  EDIT: "edit",
  READONLY: "readonly",
} as const;

const Calendar: React.FC = () => {
  const { user, userRole } = useSessionContext();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClientComponentClient();

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: format(setMonth(new Date(), i), "MMMM"),
  }));

  const years = Array.from({ length: 10 }, (_, i) => ({
    value: (new Date().getFullYear() - 5 + i).toString(),
    label: (new Date().getFullYear() - 5 + i).toString(),
  }));

  const fetchEvents = useCallback(async () => {
    const startOfMonthDate = startOfMonth(currentDate).toISOString();
    const endOfMonthDate = endOfMonth(currentDate).toISOString();

    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .lte("startdate", endOfMonthDate)
        .gte("enddate", startOfMonthDate);

      if (error) throw error;
      setEvents(data as Event[]);
      
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to fetch events.");
    }
  }, [currentDate, supabase]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handlePrevMonth = () => setCurrentDate((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate((prev) => addMonths(prev, 1));

  const handleMonthChange = (value: string) => {
    setCurrentDate((prev) => setMonth(prev, parseInt(value)));
  };

  const handleYearChange = (value: string) => {
    setCurrentDate((prev) => setYear(prev, parseInt(value)));
  };

  const handleDateClick = (date: Date) => {
    if (!user) {
      toast.error("You must be logged in to add events.");
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
      accessLevel: ACCESS_LEVELS.EDIT,
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
        toast.success("Event updated successfully!");
      } else {
        const newEvent = {
          id: uuidv4(),
          ...eventData,
          createdBy: user?.id,
        };

        const { error } = await supabase.from("events").insert(newEvent);
        if (error) throw error;
        toast.success("Event added successfully!");
      }

      await fetchEvents();
      handleCloseModal();
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("Failed to save event.");
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

      toast.success("Event deleted successfully!");
      await fetchEvents();
      handleCloseModal();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Failed to delete event.");
    }
  };

  const canEditEvent = (event: Event) => {
    if (!user || !userRole) return false;
    if (userRole === "admin") return true;
    return (
      userRole === "user" &&
      event.createdBy === user.id &&
      event.accessLevel === ACCESS_LEVELS.EDIT
    );
  };

  const canViewEvent = (event: Event) =>
    !user || userRole
      ? event.accessLevel !== undefined
      : userRole === "admin" || event.createdBy === user.id;

  const canDeleteEvents = () => userRole === "admin";

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
        <CardHeader className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-4 py-4">
            <CardTitle className="text-3xl font-bold">
              {format(currentDate, "MMMM yyyy")}
            </CardTitle>
            <div className="flex gap-2">
              <Select
                value={currentDate.getMonth().toString()}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={currentDate.getFullYear().toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year.value} value={year.value}>
                      {year.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
                } ${isSameDay(day, new Date()) ? "ring-2 ring-blue-500" : ""}`}
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
                    .slice(0, 2)
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
