import type { MetaFunction } from "@remix-run/node";
import { useState, useEffect } from "react";
import Select from "react-select";

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
  selectedState: State | undefined,
  selectedServices: Service[],
) => {
  const filtered = contractors.filter((contractor) => {
    const matchesSelectedState =
      selectedState === undefined ||
      contractor.statesServed.includes(selectedState);

    const matchesSelectedServices =
      selectedServices.length === 0 ||
      contractor.services.some((service) => selectedServices.includes(service));

    return matchesSelectedState && matchesSelectedServices;
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
  const [selectedState, setSelectedState] = useState<State | undefined>();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [filteredContractors, setFilteredContractors] = useState(contractors);

  useEffect(() => {
    const newFilteredContractors = filterContractors(
      contractors,
      selectedState,
      selectedServices,
    );
    setFilteredContractors(newFilteredContractors);
  }, [selectedState, selectedServices]);

  interface Option<Type> {
    value: Type;
    label: Type;
  }
  const onSelectedStateChanged = (option: Option<State> | null) => {
    setSelectedState(option?.value);
  };

  const onSelectedServicesChanged = (options: readonly Option<Service>[]) => {
    setSelectedServices(options.map((option) => option.value));
  };

  return (
    <main className="relative min-h-screen bg-white p-8">
      <h1 className="text-center text-4xl font-extrabold tracking-tight text-gray-900">
        Contractor List
      </h1>
      <div className="mt-6 flex items-center justify-center space-x-4">
        <h3 className="font-bold">Filter by:</h3>
        <Select<Option<State>>
          isClearable
          placeholder="Anywhere"
          options={STATES.map((state) => ({
            value: state,
            label: state,
          }))}
          onChange={onSelectedStateChanged}
        />
        <Select<Option<Service>, true>
          isMulti
          placeholder="Any service"
          options={SERVICES.map((service) => ({
            value: service,
            label: service,
          }))}
          onChange={onSelectedServicesChanged}
        />
      </div>
      <ul className="mt-6 space-y-4">
        {filteredContractors.map((contractor) => (
          <ContractorBlock contractor={contractor} key={contractor.name} />
        ))}
      </ul>
    </main>
  );
}
