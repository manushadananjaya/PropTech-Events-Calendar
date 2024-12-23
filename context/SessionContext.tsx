"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { User, Session } from "@supabase/supabase-js";

interface SessionContextValue {
  user: User | null;
  userRole: string | null;
  setUserRole: (role: string | null) => void;
  session: Session | null;
}

const SessionContext = createContext<SessionContextValue | undefined>(
  undefined
);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const fetchSessionAndRole = async () => {
      try {
        // Get the current session
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const userId = session.user.id;

          // Check if the user already exists in the database
          const { data: existingUser, error: fetchError } = await supabase
            .from("users")
            .select("role")
            .eq("id", userId)
            .maybeSingle();

          if (fetchError) {
            console.error("Error fetching user data:", fetchError.message);
            return;
          }

          if (existingUser) {
            // If the user exists, set their role
            setUserRole(existingUser.role);
          } else {
            // Check if this is the first user
            const { count: userCount, error: countError } = await supabase
              .from("users")
              .select("id", { count: "exact" });

            if (countError) {
              console.error("Error checking user count:", countError.message);
              return;
            }

            // Use upsert to insert the first user as admin or others as user
            const role = userCount === 0 ? "admin" : "user";
            const { error: upsertError } = await supabase.from("users").upsert(
              {
                id: userId,
                email: session.user.email,
                role,
              },
              { onConflict: "id" } // Prevent duplicate inserts
            );

            if (upsertError) {
              console.error(
                "Error upserting user into database:",
                upsertError.message
              );
            } else {
              setUserRole(role);
            }
          }
        }
      } catch (err) {
        console.error("Unexpected error in session logic:", err);
      }
    };

    fetchSessionAndRole();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) fetchSessionAndRole();
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <SessionContext.Provider value={{ user, userRole, setUserRole, session }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSessionContext = (): SessionContextValue => {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSessionContext must be used within a SessionProvider");
  }
  return context;
};
