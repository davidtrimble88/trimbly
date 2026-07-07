// Default maintenance schedules seeded when a user adds a vehicle.
// Mileage in miles; months in calendar months. User can edit afterwards.

export type MaintenancePreset = {
  task_name: string;
  category: string;
  interval_miles?: number;
  interval_months?: number;
};

export const CAR_PRESETS: MaintenancePreset[] = [
  { task_name: "Oil & filter change", category: "engine", interval_miles: 5000, interval_months: 6 },
  { task_name: "Tire rotation", category: "tires", interval_miles: 6000, interval_months: 6 },
  { task_name: "Air filter", category: "engine", interval_miles: 20000, interval_months: 24 },
  { task_name: "Cabin filter", category: "interior", interval_miles: 20000, interval_months: 24 },
  { task_name: "Brake inspection", category: "brakes", interval_miles: 12000, interval_months: 12 },
  { task_name: "Brake fluid flush", category: "brakes", interval_miles: 30000, interval_months: 24 },
  { task_name: "Battery check", category: "electrical", interval_months: 12 },
  { task_name: "Coolant flush", category: "cooling", interval_miles: 60000, interval_months: 60 },
  { task_name: "Transmission service", category: "drivetrain", interval_miles: 60000 },
  { task_name: "Spark plugs", category: "engine", interval_miles: 60000, interval_months: 60 },
  { task_name: "Wiper blades", category: "exterior", interval_months: 12 },
  { task_name: "Registration renewal", category: "documents", interval_months: 12 },
  { task_name: "Insurance renewal", category: "documents", interval_months: 12 },
];

export const MOTORCYCLE_PRESETS: MaintenancePreset[] = [
  { task_name: "Engine oil & filter", category: "engine", interval_miles: 3000, interval_months: 6 },
  { task_name: "Chain clean & lube", category: "drivetrain", interval_miles: 500 },
  { task_name: "Chain tension check", category: "drivetrain", interval_miles: 1000 },
  { task_name: "Chain & sprockets replacement", category: "drivetrain", interval_miles: 15000 },
  { task_name: "Tire pressure check", category: "tires", interval_months: 1 },
  { task_name: "Brake pad inspection", category: "brakes", interval_miles: 5000, interval_months: 6 },
  { task_name: "Brake fluid flush", category: "brakes", interval_months: 24 },
  { task_name: "Fork oil change", category: "suspension", interval_miles: 15000, interval_months: 24 },
  { task_name: "Air filter", category: "engine", interval_miles: 12000, interval_months: 24 },
  { task_name: "Valve clearance check", category: "engine", interval_miles: 16000 },
  { task_name: "Coolant level", category: "cooling", interval_months: 12 },
  { task_name: "Battery check", category: "electrical", interval_months: 6 },
  { task_name: "Helmet replacement", category: "gear", interval_months: 60 },
  { task_name: "Riding gear inspection (jacket, gloves, boots)", category: "gear", interval_months: 12 },
  { task_name: "Storage prep (winterize)", category: "seasonal", interval_months: 12 },
  { task_name: "Spring de-winterize check", category: "seasonal", interval_months: 12 },
  { task_name: "Registration renewal", category: "documents", interval_months: 12 },
];

export const TRUCK_PRESETS: MaintenancePreset[] = [
  ...CAR_PRESETS,
  { task_name: "Differential fluid", category: "drivetrain", interval_miles: 50000 },
];

export function getPresetsFor(type: string): MaintenancePreset[] {
  switch (type) {
    case "motorcycle": return MOTORCYCLE_PRESETS;
    case "truck":
    case "suv": return TRUCK_PRESETS;
    default: return CAR_PRESETS;
  }
}

export function computeNextDueDate(intervalMonths?: number, fromDate = new Date()): string | null {
  if (!intervalMonths) return null;
  const d = new Date(fromDate);
  d.setMonth(d.getMonth() + intervalMonths);
  return d.toISOString().slice(0, 10);
}

export function computeNextDueMileage(intervalMiles?: number, currentMileage = 0): number | null {
  if (!intervalMiles) return null;
  return currentMileage + intervalMiles;
}
