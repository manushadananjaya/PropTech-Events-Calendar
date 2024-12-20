import { createEvents, EventAttributes } from "ics";
import { Event } from "@/types/event";
import { supabase } from "@/lib/supabase";
import { parseISO} from "date-fns";

export const exportToICS = async (events: Event[]): Promise<string> => {
  const icsEvents: EventAttributes[] = await Promise.all(
    events.map(async (event) => {
      let attachment;
      if (event.attachment) {
        const { data, error } = await supabase.storage
          .from("event-attachments")
          .createSignedUrl(event.attachment.path, 60 * 60); // URL valid for 1 hour

        if (!error && data) {
          attachment = {
            url: data.signedUrl,
            filename: event.attachment.filename,
          };
        }
      }

      const startDate = parseISO(event.startDate);
      const endDate = parseISO(event.endDate);

      // const durationHours = differenceInHours(endDate, startDate);
      // const durationMinutes = differenceInMinutes(endDate, startDate) % 60;

      return {
        start: startDate.toISOString().split("T")[0].split("-").map(Number) as [
          number,
          number,
          number
        ],
        startInputType: "utc",
        startOutputType: "utc",
        end: endDate.toISOString().split("T")[0].split("-").map(Number) as [
          number,
          number,
          number
        ],
        endInputType: "utc",
        endOutputType: "utc",
        title: event.name,
        description: `Cost: ${event.cost}\nLocation: ${event.location}`,
        location: event.location,
        attachments: attachment ? [attachment] : undefined,
      };
    })
  );

  const { error, value } = createEvents(icsEvents);

  if (error) {
    console.error("Error creating ICS file:", error);
    return "";
  }

  return value || "";
};
