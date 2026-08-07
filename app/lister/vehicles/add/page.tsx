import type { Metadata } from "next";
import { AddVehicleWizard } from "@/components/lister/add-vehicle/add-vehicle-wizard";

export const metadata: Metadata = { title: "Add Vehicle — Kerala Lease Hub" };

export default function ListerAddVehiclePage() {
  return <AddVehicleWizard />;
}
