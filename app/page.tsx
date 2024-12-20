import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Calendar from "@/components/Calendar";
import CalendarHeader from "@/components/CalendarHeader";

export default async function Home() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <CalendarHeader />
      <main className="container mx-auto p-4">
        <Calendar initialSession={session} />
      </main>
    </div>
  );
}
