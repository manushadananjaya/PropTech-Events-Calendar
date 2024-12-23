// pages/index.tsx


import Calendar from "@/components/Calendar";
import CalendarHeader from "@/components/CalendarHeader";

const Home = () => {
  return (
 
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <CalendarHeader />
        <main className="flex-grow container mx-auto p-4">
          <Calendar />
        </main>
      </div>
   
  );
};

export default Home;
