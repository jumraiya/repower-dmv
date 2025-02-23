export const STATES = ["DC", "MD", "VA"] as const;
export const SERVICES = [
  "Energy Audit",
  "Weatherization",
  "HVAC",
  "Electrical",
  "Water Heater",
  "Appliances",
];

export type State = (typeof STATES)[number];
export type Service = (typeof SERVICES)[number];

export interface Address {
  line1: string;
  line2: string;
  city: string;
  state: State;
  zipCode: string;
}

export interface Contractor {
  name: string;
  address: Address;
  phoneNumber: string;
  statesServed: string[];
  services: Service[];
}
