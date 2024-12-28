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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useSessionContext } from "@/context/SessionContext";
import { Calendar, LogOut, Download, Settings, Menu } from "lucide-react";
import { create } from "zustand";
import Image from "next/image";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { DialogTitle } from "@/components/ui/dialog";

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
  const [isOpen, setIsOpen] = React.useState(false);

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

  const MobileMenu = () => (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <VisuallyHidden>
          <DialogTitle>Mobile Menu</DialogTitle>
        </VisuallyHidden>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Menu</h2>
            
          </div>
          {user && (
            <div className="flex items-center space-x-4 mb-6">
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata.full_name}
                />
                <AvatarFallback>
                  {user.user_metadata.full_name?.charAt(0) ||
                    user.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {user.user_metadata.full_name}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
            </div>
          )}
          <nav className="flex flex-col space-y-4">
            {user && userRole === "admin" && (
              <Button
                onClick={() => {
                  router.push("/admin");
                  setIsOpen(false);
                }}
                variant="ghost"
                className="justify-start"
              >
                <Settings className="mr-2 h-5 w-5" />
                Admin Panel
              </Button>
            )}
            {user && (
              <Button
                onClick={() => {
                  handleExportCalendar();
                  setIsOpen(false);
                }}
                variant="ghost"
                className="justify-start"
              >
                <Download className="mr-2 h-5 w-5" />
                Export Calendar
              </Button>
            )}
            {user ? (
              <Button
                onClick={() => {
                  handleSignOut();
                  setIsOpen(false);
                }}
                variant="ghost"
                className="justify-start"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Log out
              </Button>
            ) : (
              <Button
                onClick={() => {
                  handleSignIn();
                  setIsOpen(false);
                }}
                variant="ghost"
                className="justify-start"
              >
                <Image
                  src="/google-logo.svg"
                  alt="Google Logo"
                  width={20}
                  height={20}
                  className="mr-2"
                />
                Sign In with Google
              </Button>
            )}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <header className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-2">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Calendar className="h-6 w-6" />
            <h1 className="text-xl md:text-2xl font-bold">
              PropTech Events Calendar
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <MobileMenu />
            <div className="hidden md:flex items-center space-x-2">
              {user && userRole === "admin" && (
                <Button
                  onClick={() => router.push("/admin")}
                  variant="secondary"
                  className="text-sm"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Admin
                </Button>
              )}
              {user && (
                <Button
                  onClick={handleExportCalendar}
                  variant="secondary"
                  className="text-sm"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              )}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-8 w-8 rounded-full"
                    >
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
                <Button
                  onClick={handleSignIn}
                  className="flex items-center justify-center text-sm"
                >
                  <Image
                    src="/google-logo.svg"
                    alt="Google Logo"
                    width={16}
                    height={16}
                    className="mr-2"
                  />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default CalendarHeader;
