"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import toast from "react-hot-toast";
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
import { useSessionContext } from "@/context/SessionContext";
import { Calendar, LogOut, Download, Settings } from "lucide-react";
import { create } from "zustand";

interface UserStore {
  userRole: string | null;
  setUserRole: (role: string | null) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  userRole: null,
  setUserRole: (role) => set({ userRole: role }),
}));

const CalendarHeader: React.FC = () => {
  const { user, userRole } = useSessionContext();
  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({ provider: "google" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to sign in. Please try again.");
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.refresh();
      toast.success("Signed out successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to sign out. Please try again.");
    }
  };

  const handleExportCalendar = async () => {
    const { data: events, error } = await supabase.from("events").select("*");
    if (error) {
      toast.error("Failed to fetch events. Please try again.");
      return;
    }

    try {
      const icalEvents = events
        .map((event) => {
          const startDate = event.startdate
            ? new Date(event.startdate)
                .toISOString()
                .replace(/[-:]/g, "")
                .split(".")[0] + "Z"
            : null;
          const endDate = event.enddate
            ? new Date(event.enddate)
                .toISOString()
                .replace(/[-:]/g, "")
                .split(".")[0] + "Z"
            : null;

          if (!startDate || !endDate) {
            return null; // Skip events without valid dates
          }

          return `BEGIN:VEVENT
SUMMARY:${event.name || "Untitled Event"}
DTSTART:${startDate}
DTEND:${endDate}
DESCRIPTION:${event.cost ? `Cost: ${event.cost}\n` : ""}${
            event.location ? `Location: ${event.location}` : ""
          }
UID:${event.id}
LOCATION:${event.location || ""}
END:VEVENT`;
        })
        .filter(Boolean) // Remove null entries
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

      toast.success("Calendar exported successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export calendar. Please try again.");
    }
  };


  return (
    <header className="flex justify-between items-center p-4 bg-primary text-primary-foreground">
      <div className="flex items-center space-x-2">
        <Calendar className="h-6 w-6" />
        <h1 className="text-2xl font-bold">PropTech Events Calendar</h1>
      </div>
      <div className="flex items-center space-x-2">
        {user && userRole === "admin" && (
          <Button onClick={() => router.push("/admin")} variant="secondary">
            <Settings className="mr-2 h-4 w-4" />
            Admin Panel
          </Button>
        )}
        {user && (
          <Button onClick={handleExportCalendar} variant="secondary">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
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
