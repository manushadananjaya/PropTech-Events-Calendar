"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const CalendarHeader: React.FC = () => {
  const router = useRouter();
  const supabase = createClientComponentClient();

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

  return (
    <header className="flex justify-between items-center p-4 bg-primary text-primary-foreground">
      <h1 className="text-2xl font-bold">PropTech Events Calendar</h1>
      <div>
        <Button onClick={handleSignIn}>Sign In</Button>
        <Button onClick={handleSignOut} className="ml-2">
          Sign Out
        </Button>
      </div>
    </header>
  );
};

export default CalendarHeader;
