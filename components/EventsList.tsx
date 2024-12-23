import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Event } from "@/types/event";
import { format, parseISO } from "date-fns";

interface EventsListProps {
  events: Event[];
  onEventClick: (event: Event) => void;
  getEventColor: (event: Event) => string;
}

const EventsList: React.FC<EventsListProps> = ({
  events,
  onEventClick,
  getEventColor,
}) => {
  return (
    <Card className="bg-white/50 backdrop-blur-sm shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-800">
          Events This Month
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {events.map((event) => (
            <Card
              key={event.id}
              className={`cursor-pointer hover:shadow-md transition-shadow duration-200`}
              onClick={() => onEventClick(event)}
            >
              <CardContent className="flex items-center p-4">
                <div
                  className={`w-2 h-12 ${getEventColor(
                    event
                  )} rounded-full mr-4`}
                ></div>
                <div className="flex-grow">
                  <h3 className="font-semibold text-lg">{event.name}</h3>
                  <p className="text-sm text-gray-600">
                    {format(parseISO(event.startdate), "MMM d, yyyy h:mm a")}
                  </p>
                  {event.location && (
                    <p className="text-sm text-gray-500">{event.location}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventsList;
