export interface Event {
  id: string | null;
  name: string;
  startdate: string;
  enddate: string;
  cost: string;
  location: string;
  createdBy: string;
  accessLevel: "admin" | "edit" | "readonly";
  attachment?: {
    path: string | null;
    filename: string | null;
    publicUrl?: string;
  };
}


export type AccessLevel = "admin" | "edit" | "readonly" | "user";