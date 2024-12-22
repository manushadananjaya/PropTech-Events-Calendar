import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Calendar from "@/components/Calendar";
import CalendarHeader from "@/components/CalendarHeader";
import AdminPanel from "@/components/AdminPanel";

export default async function Home() {
  const supabase = createServerComponentClient({ cookies });

  // Get the session object
  const {
    data: { session },
  } = await supabase.auth.getSession();

  let isAdmin = false;

  console.log("Session:", session);

  if (session) {
    try {
      const { data: userData, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle(); // Use maybeSingle to avoid the error

      if (error) {
        console.error("Error fetching user role:", error.message);
      } else if (!userData) {
        console.warn("No user found with the given ID.");
      } else {
        isAdmin = userData.role === "admin";
      }
    } catch (err) {
      console.error("Unexpected error fetching user role:", err);
    }
  }


  return (
    <div className="min-h-screen bg-background text-foreground">
      <CalendarHeader />
      <main className="container mx-auto p-4">
        <Calendar initialSession={session} />
        {isAdmin && <AdminPanel />}
      </main>
    </div>
  );
}
