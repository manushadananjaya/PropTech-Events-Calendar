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
    const startOfMonthDate = format(startOfMonth(currentDate), "yyyy-MM-dd");
    const endOfMonthDate = format(endOfMonth(currentDate), "yyyy-MM-dd");

    console.log("Fetching events for", startOfMonthDate, endOfMonthDate);

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .gte("startDate", startOfMonthDate)
      .lte("endDate", endOfMonthDate);

    if (error) {
      console.error("Error fetching events:", error);
    } else {
      setEvents(data || []);
      console.log("Fetched events:", data);
    }
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
        id: "",
        name: "",
        startDate: date.toISOString(),
        endDate: date.toISOString(),
        cost: "",
        location: "",
      });
      setIsModalOpen(true);
    }
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleSaveEvent = async (event: Event) => {
    if (event.id) {
      const { error } = await supabase
        .from("events")
        .update(event)
        .eq("id", event.id);

      if (error) console.error("Error updating event:", error);
    } else {
      const { data, error } = await supabase
        .from("events")
        .insert(event)
        .select();

      if (error) console.error("Error creating event:", error);
      if (data) event.id = data[0].id;
    }

    fetchEvents();
    handleCloseModal();
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate)),
  });

  const getEventStyle = (event: Event, day: Date) => {
    const start = parseISO(event.startDate);
    const end = parseISO(event.endDate);
    const isStart = isSameDay(day, start);
    const isEnd = isSameDay(day, end);
    const isMiddle =
      isWithinInterval(day, { start, end }) && !isStart && !isEnd;

    let style =
      "text-sm p-1 mt-1 cursor-pointer flex items-center justify-between ";
    if (isStart) style += "rounded-l-md ";
    if (isEnd) style += "rounded-r-md ";
    if (isMiddle) style += "rounded-none ";
    if (isStart || isEnd) style += "bg-blue-200 ";
    if (isMiddle) style += "bg-blue-100 ";

    return style;
  };

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
                  start: parseISO(event.startDate),
                  end: parseISO(event.endDate),
                })
              )
              .map((event) => (
                <div
                  key={event.id}
                  className={getEventStyle(event, day)}
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
      {isModalOpen && (
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
