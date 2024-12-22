import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Calendar from "@/components/Calendar";
import CalendarHeader from "@/components/CalendarHeader";
import { useUserStore } from "@/components/CalendarHeader";

export default async function Home() {
  const supabase = createServerComponentClient({ cookies });

  // Get the session object
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("Session:", session);

  if (session) {
    try {
      const { data: userData, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error.message);
      } else if (!userData) {
        console.warn("No user found with the given ID.");
      }
    } catch (err) {
      console.error("Unexpected error fetching user role:", err);
    }
  }

  // Update the Zustand store with the user's role
  if (typeof window !== "undefined") {
    const { setUserRole } = useUserStore.getState(); // Access `setUserRole` correctly
    setUserRole(session ? "user" : null);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CalendarHeader />
      <main className="container mx-auto p-4">
        <Calendar initialSession={session} />
      </main>
    </div>
  );
}
