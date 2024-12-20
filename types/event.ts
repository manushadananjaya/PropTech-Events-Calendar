export interface Event {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  cost: string;
  location: string;
  attachment?: {
    path: string;
    filename: string;
  };
}
