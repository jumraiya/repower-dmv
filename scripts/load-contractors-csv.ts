import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface CSVRow {
  Status: string;
  Source: string;
  SN: string;
  "Company Name": string;
  Address: string;
  "Phone Number": string;
  Website: string;
  Email: string;
  "Energy Audit": string;
  "Weatherization": string;
  "HVAC/Heat Pump": string;
  "Electrical": string;
  "Water Heater": string;
  "Appliances": string;
  "Certifications": string;
}

// Helper function to parse address into components
function parseAddress(address: string) {
  if (!address || address.trim() === "") {
    return {
      addressLine1: "",
      city: "",
      state: "",
      zip: "",
    };
  }

  const parts = address.split(",").map(part => part.trim());
  
  if (parts.length >= 3) {
    // Try to extract state and zip from last part
    const lastPart = parts[parts.length - 1];
    const stateZipMatch = lastPart.match(/([A-Z]{2})\s+(\d{5}(?:-\d{4})?)/);
    
    if (stateZipMatch) {
      return {
        addressLine1: parts.slice(0, -2).join(", "),
        city: parts[parts.length - 2],
        state: stateZipMatch[1],
        zip: stateZipMatch[2].split("-")[0], // Remove extended zip
      };
    }
  }
  
  // Fallback parsing
  return {
    addressLine1: parts[0] || "",
    city: parts[1] || "",
    state: parts[2] || "",
    zip: "",
  };
}

// Helper function to determine services from Yes/No columns
function getServices(row: CSVRow): string[] {
  const services: string[] = [];
  
  if (row["Energy Audit"]?.toLowerCase() === "yes") {
    services.push("Energy Audit");
  }
  if (row["Weatherization"]?.toLowerCase() === "yes") {
    services.push("Weatherization");
  }
  if (row["HVAC/Heat Pump"]?.toLowerCase() === "yes") {
    services.push("HVAC / Heat Pump");
  }
  if (row["Electrical"]?.toLowerCase() === "yes") {
    services.push("Electrical");
  }
  if (row["Water Heater"]?.toLowerCase() === "yes") {
    services.push("Water Heater");
  }
  if (row["Appliances"]?.toLowerCase() === "yes") {
    services.push("Appliances");
  }
  
  return services;
}

// Helper function to extract and parse certifications from free text
function parseCertifications(certString: string): Array<{name: string, shortName: string, description: string}> {
  if (!certString || certString.trim() === "") return [];
  
  const certifications: Array<{name: string, shortName: string, description: string}> = [];
  const certItems = certString.split(',').map(c => c.trim()).filter(c => c.length > 0);
  
  for (const cert of certItems) {
    const lowerCert = cert.toLowerCase();
    
    // Map known patterns
    if (lowerCert.includes("mitsubishi") && lowerCert.includes("diamond")) {
      certifications.push({
        name: "Mitsubishi Electric Diamond Contractor",
        shortName: "MEDC",
        description: "Mitsubishi Electric Diamond Contractor certification"
      });
    } else if (lowerCert.includes("daikin") && lowerCert.includes("comfort")) {
      certifications.push({
        name: "Daikin Comfort Pro",
        shortName: "DCP",
        description: "Daikin Comfort Pro certification"
      });
    } else if (lowerCert.includes("bpi") && lowerCert.includes("air conditioning")) {
      certifications.push({
        name: "BPI Air Conditioning & Heat Pump Professional",
        shortName: "BPI-ACHPP",
        description: "Install and repair refrigerant-based heating and cooling equipment"
      });
    } else if (lowerCert.includes("certified energy auditor") || lowerCert.includes("cea")) {
      certifications.push({
        name: "Certified Energy Auditor",
        shortName: "CEA",
        description: "Evaluate how well your home holds heat or cold"
      });
    } else if (lowerCert.includes("home energy professional") || lowerCert.includes("hep")) {
      certifications.push({
        name: "Home Energy Professional",
        shortName: "HEP",
        description: "Evaluate how well your home holds heat or cold"
      });
    } else if (lowerCert.includes("air leakage control") || lowerCert.includes("bpi-alci")) {
      certifications.push({
        name: "Air Leakage Control Installer",
        shortName: "BPI-ALCI",
        description: "Fix or repair issues that prevent your house from holding heat or cold"
      });
    } else if (lowerCert.includes("bbb") || lowerCert.includes("better business bureau")) {
      certifications.push({
        name: "Better Business Bureau Accredited",
        shortName: "BBB",
        description: "Better Business Bureau accredited business"
      });
    } else if (lowerCert.includes("energy star")) {
      certifications.push({
        name: "Energy Star Partner",
        shortName: "ESTAR",
        description: "Energy Star certified partner"
      });
    } else if (cert.length > 0) {
      // Create generic certification for unrecognized ones
      const shortName = cert.replace(/[^A-Za-z0-9]/g, '').substring(0, 10).toUpperCase();
      certifications.push({
        name: cert,
        shortName: shortName || "CERT",
        description: cert
      });
    }
  }
  
  return certifications;
}

// Helper function to get service descriptions
function getServiceDescription(serviceName: string): string {
  const descriptions: Record<string, string> = {
    "Energy Audit": "Evaluate your house to determine its efficiency at holding heat or cold",
    "Weatherization": "Fix or repair issues that prevent your house from holding heat or cold", 
    "HVAC / Heat Pump": "Install and maintain efficiency central air systems that will cool and heat your home",
    "Electrical": "Electrical tasks and upgrades",
    "Water Heater": "Install and maintain water heating systems",
    "Appliances": "Install and maintain home appliances"
  };
  
  return descriptions[serviceName] || `${serviceName} services`;
}

// Helper function to determine states served (default to DC, MD, VA)
function getStatesServed(address: string): string[] {
  const addressLower = address.toLowerCase();
  
  if (addressLower.includes(" md ") || addressLower.includes("maryland")) {
    return ["MD"];
  } else if (addressLower.includes(" va ") || addressLower.includes("virginia")) {
    return ["VA"];
  } else if (addressLower.includes(" dc ") || addressLower.includes("washington")) {
    return ["DC"];
  }
  
  // Default to all three states if unclear
  return ["DC", "MD", "VA"];
}

async function loadContractorsFromCSV() {
  try {
    console.log("Loading contractors from CSV...");
    
    // Read and parse CSV file
    const csvPath = path.join(process.cwd(), "Contractor List - Sheet1.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    
    // Parse CSV manually since csv-parse might not be available
    const lines = csvContent.split('\n');
    const headerLine = lines[2]; // Line 3 (0-indexed) contains the headers
    const headers = headerLine.split(',').map(h => h.trim().replace(/"/g, ''));
    
    const records: CSVRow[] = [];
    for (let i = 3; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Simple CSV parsing (handles basic cases)
      const values = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim()); // Add the last value
      
      // Create record object
      const record: any = {};
      headers.forEach((header, index) => {
        record[header] = values[index] || '';
      });
      
      records.push(record as CSVRow);
    }

    console.log(`Found ${records.length} records in CSV`);

    // Collect all unique services and certifications from CSV first
    const allServices = new Set<string>();
    const allCertifications = new Map<string, {name: string, shortName: string, description: string}>();
    
    for (const row of records) {
      if (!row["Company Name"] || row["Company Name"].trim() === "") continue;
      
      // Collect services
      const services = getServices(row);
      services.forEach(service => allServices.add(service));
      
      // Collect certifications
      const certifications = parseCertifications(row["Certifications"] || "");
      certifications.forEach(cert => {
        allCertifications.set(cert.shortName, cert);
      });
    }

    console.log(`Found ${allServices.size} unique services and ${allCertifications.size} unique certifications`);

    // Get existing records from database
    const [existingServices, existingCertifications, existingStates] = await Promise.all([
      prisma.service.findMany(),
      prisma.certification.findMany(),
      prisma.state.findMany(),
    ]);

    // Create maps and ensure all services exist
    const serviceMap = new Map(existingServices.map(s => [s.name, s]));
    const certMap = new Map(existingCertifications.map(c => [c.shortName, c]));
    const stateMap = new Map(existingStates.map(s => [s.name, s]));

    // Create missing services
    for (const serviceName of allServices) {
      if (!serviceMap.has(serviceName)) {
        console.log(`Creating service: ${serviceName}`);
        const service = await prisma.service.create({
          data: {
            name: serviceName,
            description: getServiceDescription(serviceName)
          }
        });
        serviceMap.set(serviceName, service);
      }
    }

    // Create missing certifications
    for (const [shortName, certData] of allCertifications) {
      if (!certMap.has(shortName)) {
        console.log(`Creating certification: ${certData.name} (${shortName})`);
        try {
          const certification = await prisma.certification.create({
            data: {
              name: certData.name,
              shortName: certData.shortName,
              description: certData.description
            }
          });
          certMap.set(shortName, certification);
        } catch (error) {
          console.warn(`Failed to create certification ${shortName}:`, error);
        }
      }
    }

    let processed = 0;
    let skipped = 0;

    for (const row of records) {
      // Skip rows without company name
      if (!row["Company Name"] || row["Company Name"].trim() === "") {
        skipped++;
        continue;
      }

      try {
        const companyName = row["Company Name"].trim();
        const addressInfo = parseAddress(row.Address);
        const services = getServices(row);
        const certifications = parseCertifications(row["Certifications"] || "");
        const statesServed = getStatesServed(row.Address);

        // Clean phone number
        const phoneNumber = row["Phone Number"]?.replace(/[^\d]/g, "") || null;
        const cleanPhone = phoneNumber && phoneNumber.length >= 10 ? phoneNumber.slice(-10) : null;

        // Clean website URL
        let website = row.Website?.trim() || null;
        if (website && !website.startsWith("http")) {
          website = `https://${website}`;
        }

        // Create contractor record
        const contractorData = {
          name: companyName,
          email: row.Email?.trim() || null,
          phone: cleanPhone,
          website: website,
          addressLine1: addressInfo.addressLine1,
          city: addressInfo.city,
          state: addressInfo.state,
          zip: addressInfo.zip,
          isDraft: 0, // Mark as published
          services: {
            connect: services
              .filter(serviceName => serviceMap.has(serviceName))
              .map(serviceName => ({ id: serviceMap.get(serviceName)!.id }))
          },
          certifications: {
            connect: certifications
              .filter(cert => certMap.has(cert.shortName))
              .map(cert => ({ id: certMap.get(cert.shortName)!.id }))
          },
          statesServed: {
            connect: statesServed
              .filter(stateName => stateMap.has(stateName))
              .map(stateName => ({ id: stateMap.get(stateName)!.id }))
          }
        };

        await prisma.contractor.create({
          data: contractorData
        });

        processed++;
        
        if (processed % 10 === 0) {
          console.log(`Processed ${processed} contractors...`);
        }

      } catch (error) {
        console.error(`Error processing contractor "${row["Company Name"]}":`, error);
        skipped++;
      }
    }

    console.log(`\nLoad complete!`);
    console.log(`Processed: ${processed} contractors`);
    console.log(`Skipped: ${skipped} records`);

  } catch (error) {
    console.error("Error loading contractors from CSV:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
loadContractorsFromCSV().catch((error) => {
  console.error("Script failed:", error);
  process.exit(1);
});

export { loadContractorsFromCSV };