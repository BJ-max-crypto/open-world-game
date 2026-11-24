export interface VehicleSpec {
  id: string;
  x: number;
  z: number;
  heading: number;
  driveable: boolean;
  color: string;
  name: string;
}

export const VEHICLE_SPECS: VehicleSpec[] = [
  { id: "cab", x: 48, z: -22, heading: 0.35, driveable: true, color: "#f0c14a", name: "Harbor cab" },
  { id: "sedan", x: 24, z: 5.4, heading: Math.PI / 2, driveable: false, color: "#8aa0b5", name: "Parked sedan" },
  { id: "van", x: -5.4, z: -42, heading: 0, driveable: false, color: "#c46a55", name: "Delivery van" },
];

export const VEHICLE_IDS = new Set(VEHICLE_SPECS.map((vehicle) => vehicle.id));
