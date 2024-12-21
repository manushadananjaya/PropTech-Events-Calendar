export interface Event {
  id: string | null;
  name: string;
  startdate: string;
  enddate: string;
  cost: string;
  location: string;
  attachment?: {
    path: string | null;
    filename: string | null;
    publicUrl?: string;
  };
}
