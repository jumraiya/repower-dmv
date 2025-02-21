import type { MetaFunction } from "@remix-run/node";
import { useState, useEffect } from "react";

export const meta: MetaFunction = () => [
  { title: "Contractor List | re:Power DMV" },
];

const STATES = ["DC", "MD", "VA"] as const;
type State = (typeof STATES)[number];
const SERVICES = [
  "Energy Audit",
  "Weatherization",
  "HVAC",
  "Electrical",
  "Water Heater",
  "Appliances",
];
type Service = (typeof SERVICES)[number];
interface Address {
  line1: string;
  line2: string;
  state: State;
  zipCode: string;
}

interface Contractor {
  name: string;
  address: Address;
  phoneNumber: string;
  statesServed: string[];
  // todo: define service types
  services: Service[];
}

const contractors: Contractor[] = [
  {
    name: "Eco Home Solutions",
    address: {
      line1: "123 Green St",
      line2: "Suite 100",
      state: "MD",
      zipCode: "12345",
    },
    phoneNumber: "1234567890",
    statesServed: ["MD"],
    services: ["Energy Audit", "HVAC"],
  },
  {
    name: "Green Energy Pros",
    address: {
      line1: "456 Eco Ave",
      line2: "",
      state: "VA",
      zipCode: "23456",
    },
    phoneNumber: "2345678901",
    statesServed: ["VA"],
    services: ["Weatherization", "Electrical"],
  },
  {
    name: "Sustainable Living Co.",
    address: {
      line1: "789 Renewable Rd",
      line2: "Floor 2",
      state: "DC",
      zipCode: "34567",
    },
    phoneNumber: "3456789012",
    statesServed: ["DC"],
    services: ["Water Heater", "Appliances"],
  },
  // Add more contractors as needed
];

const filterContractors = (
  contractors: Contractor[],
  selectedStates: string[],
  selectedServices: string[],
) => {
  const filtered = contractors.filter((contractor) => {
    const matchesSelectedStates =
      selectedStates.length === 0 ||
      contractor.statesServed.some((state) => selectedStates.includes(state));

    const matchesSelectedServices =
      selectedServices.length === 0 ||
      contractor.services.some((service) => selectedServices.includes(service));

    return matchesSelectedStates && matchesSelectedServices;
  });
  return filtered;
};

interface ContractorBlockProps {
  contractor: Contractor;
}

const ContractorBlock = (props: ContractorBlockProps) => {
  const { contractor } = props;
  return (
    <li key={contractor.name}>
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-bold">{contractor.name}</h2>
        <p>States Served: {contractor.statesServed.join(", ")}</p>
        <p>Services Offered: {contractor.services.join(", ")}</p>
      </div>
    </li>
  );
};

export default function ContractorList() {
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [filteredContractors, setFilteredContractors] = useState(contractors);

  useEffect(() => {
    const newFilteredContractors = filterContractors(
      contractors,
      selectedStates,
      selectedServices,
    );
    setFilteredContractors(newFilteredContractors);
  }, [selectedStates, selectedServices]);

  return (
    <main className="relative min-h-screen bg-white p-8">
      <h1 className="text-center text-4xl font-extrabold tracking-tight text-gray-900">
        Contractor List
      </h1>
      <div className="mt-6 flex flex-wrap justify-center space-x-4">
        <div>
          <h3 className="font-bold">Filter by State:</h3>
          {STATES.map((state) => (
            <label key={state} className="block">
              <input
                type="checkbox"
                checked={selectedStates.includes(state)}
                onChange={() => {
                  setSelectedStates((prev) =>
                    prev.includes(state)
                      ? prev.filter((s) => s !== state)
                      : [...prev, state],
                  );
                }}
              />
              {state}
            </label>
          ))}
        </div>
        <div>
          <h3 className="font-bold">Filter by Service:</h3>
          {SERVICES.map((service) => (
            <label key={service} className="block">
              <input
                type="checkbox"
                checked={selectedServices.includes(service)}
                onChange={() => {
                  setSelectedServices((prev) =>
                    prev.includes(service)
                      ? prev.filter((p) => p !== service)
                      : [...prev, service],
                  );
                }}
              />
              {service}
            </label>
          ))}
        </div>
      </div>
      <ul className="mt-6 space-y-4">
        {filteredContractors.map((contractor) => (
          <ContractorBlock contractor={contractor} key={contractor.name} />
        ))}
      </ul>
    </main>
  );
}
