"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { User } from "@supabase/supabase-js";
import { Calendar, LogOut, Download, Upload } from "lucide-react";
import { Event } from "@/types/event";

const CalendarHeader: React.FC = () => {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        console.log("User from header:", user);
        await createAdminUserIfNotExists(user);
      }
    };

    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          await createAdminUserIfNotExists(session.user);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase.auth]);

  const createAdminUserIfNotExists = async (user: User) => {
    try {
      // Check if the user already exists in the `users` table
      const { data: existingUser, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching user:", fetchError);
        return;
      }

      // If the user does not exist, insert them into the `users` table
      if (!existingUser) {
        // Check if this is the first user (make them admin)
        const { count: usersCount } = await supabase
          .from("users")
          .select("id", { count: "exact" });

        const isFirstUser = usersCount === 0;

        const { error: insertError } = await supabase.from("users").insert({
          id: user.id, // Supabase Auth user ID
          email: user.email, // Supabase Auth user email
          role: isFirstUser ? "admin" : "user", // Assign "admin" to the first user
        });

        if (insertError) {
          console.error("Error creating user:", insertError);
        }
      }
    } catch (error) {
      console.error("Unexpected error:", error);
    }
  };


  const handleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  const handleExportCalendar = async () => {
    const { data: events, error } = await supabase.from("events").select("*");
    if (error) {
      console.error("Error fetching events:", error);
      return;
    }

    // Convert events to iCal format
    const icalEvents = events
      .map((event) => {
        return `BEGIN:VEVENT
SUMMARY:${event.name}
DTSTART:${new Date(event.startdate).toISOString()}
DTEND:${new Date(event.enddate).toISOString()}
DESCRIPTION:${event.cost ? `Cost: ${event.cost}\n` : ""}${
          event.location ? `Location: ${event.location}` : ""
        }
UID:${event.id}
END:VEVENT`;
      })
      .join("\n");

    const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PropTech Events Calendar//EN
${icalEvents}
END:VCALENDAR`;

    const blob = new Blob([icalContent], {
      type: "text/calendar;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "proptech_events.ics");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCalendar = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".ics,.csv";
    input.onchange = async (e: globalThis.Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        let events: Partial<Event>[] = [];

        if (file.name.endsWith(".ics")) {
          const icalEvents = content.split("BEGIN:VEVENT").slice(1);
          events = icalEvents.map((eventStr) => {
            const lines = eventStr.split("\n");
            const event: Partial<Event> = {};
            lines.forEach((line) => {
              if (line.startsWith("SUMMARY:")) event.name = line.slice(8);
              if (line.startsWith("DTSTART:"))
                event.startdate = new Date(line.slice(8)).toISOString();
              if (line.startsWith("DTEND:"))
                event.enddate = new Date(line.slice(6)).toISOString();
              if (line.startsWith("DESCRIPTION:")) {
                const desc = line.slice(12);
                const costMatch = desc.match(/Cost: (.*)/);
                if (costMatch) event.cost = costMatch[1];
                const locationMatch = desc.match(/Location: (.*)/);
                if (locationMatch) event.location = locationMatch[1];
              }
            });
            return event;
          });
        } else if (file.name.endsWith(".csv")) {
          const rows = content.split("\n").map((row) => row.split(","));
          const headers = rows[0];
          events = rows.slice(1).map((row) => {
            const event: Partial<Event> = {};
            headers.forEach((header, index) => {
              if (header === "name") event.name = row[index];
              if (header === "startdate")
                event.startdate = new Date(row[index]).toISOString();
              if (header === "enddate")
                event.enddate = new Date(row[index]).toISOString();
              if (header === "cost") event.cost = row[index];
              if (header === "location") event.location = row[index];
            });
            return event;
          });
        }

        const { error } = await supabase.from("events").insert(events);
        if (error) {
          console.error("Error importing events:", error);
        } else {
          console.log("Events imported successfully");
          router.refresh();
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <header className="flex justify-between items-center p-4 bg-primary text-primary-foreground">
      <div className="flex items-center space-x-2">
        <Calendar className="h-6 w-6" />
        <h1 className="text-2xl font-bold">PropTech Events Calendar</h1>
      </div>
      <div className="flex items-center space-x-2">
        {user && (
          <>
            <Button onClick={handleExportCalendar} variant="secondary">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button onClick={handleImportCalendar} variant="secondary">
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
          </>
        )}
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.user_metadata.avatar_url}
                    alt={user.user_metadata.full_name}
                  />
                  <AvatarFallback>
                    {user.user_metadata.full_name?.charAt(0) ||
                      user.email?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user.user_metadata.full_name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button onClick={handleSignIn}>Sign In</Button>
        )}
      </div>
    </header>
  );
};

export default CalendarHeader;
