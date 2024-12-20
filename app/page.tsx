import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Calendar from "@/components/Calendar";
import CalendarHeader from "@/components/CalendarHeader";

export default async function Home() {
  // Initialize Supabase client with cookies
  const supabase = createServerComponentClient({ cookies });

  // Fetch the authenticated user session
  const {
    data: { session },
  } = await supabase.auth.getSession();


  // Securely fetch user information from Supabase Auth server
  const { error } = await supabase.auth.getUser();
  if (error) {
    console.error("Error fetching authenticated user:", error);
  }

  // Pass the authenticated session to the Calendar component
  return (
    <div className="min-h-screen bg-background text-foreground">
      <CalendarHeader />
      <main className="container mx-auto p-4">
        <Calendar initialSession={session} />
      </main>
    </div>
  );
}
