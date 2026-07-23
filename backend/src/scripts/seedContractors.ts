import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Contractor } from '../modules/contractors/contractor.schema';

dotenv.config();

const mockContractors = [
  {
    dynamicData: {
      displayName: "Acme Civil Works",
      emailAddress: "contact@acmecivil.com",
      phone: { workPhone: "+91 9876543210" },
      contractorAddress: {
        billing: {
          attention: "John Doe",
          country: "India",
          street1: "123 Industrial Area",
          city: "Shimla",
          state: "Himachal Pradesh",
          zip: "171001"
        }
      },
      paymentTerms: [
        { stage: "1st stage", type: "Advance", value: "30", unit: "%" },
        { stage: "2nd stage", type: "Before JMC", value: "70", unit: "%" }
      ]
    },
    assignedLocations: ["Solan", "Rampur"],
    isActive: true
  },
  {
    dynamicData: {
      displayName: "Himalayan Builders Pvt Ltd",
      emailAddress: "info@himalayanbuilders.in",
      phone: { workPhone: "+91 9988776655" },
      contractorAddress: {
        billing: {
          attention: "Sanjay Kumar",
          country: "India",
          street1: "Phase 1, Sector 4",
          city: "Solan",
          state: "Himachal Pradesh",
          zip: "173212"
        }
      },
      paymentTerms: [
        { stage: "1st stage", type: "Advance", value: "50", unit: "%" },
        { stage: "2nd stage", type: "After JMC", value: "50", unit: "%" }
      ]
    },
    assignedLocations: ["Nahan"],
    isActive: true
  },
  {
    dynamicData: {
      displayName: "Pioneer Infra",
      emailAddress: "projects@pioneerinfra.com",
      phone: { workPhone: "+91 8877665544" },
      contractorAddress: {
        billing: {
          attention: "Amit Sharma",
          country: "India",
          street1: "Main Market Road",
          city: "Rampur",
          state: "Himachal Pradesh",
          zip: "172001"
        }
      },
      paymentTerms: [
        { stage: "1st stage", type: "Adhoc", value: "100000", unit: "Amount" }
      ]
    },
    assignedLocations: ["Rampur", "Rohru"],
    isActive: true
  }
];

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');
    
    // Clear existing contractors (optional)
    await Contractor.deleteMany({});
    console.log('Cleared existing contractors.');

    // Insert mock contractors
    await Contractor.insertMany(mockContractors);
    console.log('Successfully seeded mock contractors!');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding contractors:', error);
    process.exit(1);
  }
};

run();
