import type { Metadata } from "next";
import { AddVehiclePage } from "@/components/lister/add-vehicle/add-vehicle-page";

export const metadata: Metadata = { title: "Add Vehicle — Kerala Lease Hub" };

export default function ListerAddVehiclePage() {
  return <AddVehiclePage />;
}
