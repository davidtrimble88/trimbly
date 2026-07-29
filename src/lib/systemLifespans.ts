// Typical replacement-age ranges (years) for common home systems & appliances,
// matched against Home Binder item names by keyword. Deliberately conservative,
// general US averages — always a range, never a false-precision single number.
export interface LifespanEntry {
  keywords: string[];
  label: string;
  minYears: number;
  maxYears: number;
}

export const LIFESPAN_TABLE: LifespanEntry[] = [
  { keywords: ["water heater", "hot water tank"], label: "Water Heater", minYears: 8, maxYears: 12 },
  { keywords: ["boiler"], label: "Boiler", minYears: 15, maxYears: 20 },
  { keywords: ["hvac", "furnace", "air condition", "a/c", "heat pump", "mini split"], label: "HVAC System", minYears: 15, maxYears: 20 },
  { keywords: ["roof", "shingle"], label: "Roof", minYears: 20, maxYears: 25 },
  { keywords: ["dishwasher"], label: "Dishwasher", minYears: 9, maxYears: 12 },
  { keywords: ["washing machine", "washer"], label: "Washing Machine", minYears: 10, maxYears: 13 },
  { keywords: ["dryer"], label: "Dryer", minYears: 10, maxYears: 13 },
  { keywords: ["refrigerator", "fridge"], label: "Refrigerator", minYears: 10, maxYears: 15 },
  { keywords: ["garbage disposal", "disposal"], label: "Garbage Disposal", minYears: 8, maxYears: 12 },
  { keywords: ["water softener"], label: "Water Softener", minYears: 10, maxYears: 15 },
  { keywords: ["sump pump"], label: "Sump Pump", minYears: 7, maxYears: 10 },
  { keywords: ["garage door opener", "garage door"], label: "Garage Door Opener", minYears: 10, maxYears: 15 },
  { keywords: ["smoke detector", "carbon monoxide", "co detector"], label: "Smoke/CO Detector", minYears: 8, maxYears: 10 },
  { keywords: ["microwave"], label: "Microwave", minYears: 7, maxYears: 10 },
  { keywords: ["oven", "range", "stove", "cooktop"], label: "Oven / Range", minYears: 13, maxYears: 15 },
  { keywords: ["deck"], label: "Deck", minYears: 15, maxYears: 20 },
  { keywords: ["fence"], label: "Fence", minYears: 15, maxYears: 20 },
  { keywords: ["carpet"], label: "Carpet", minYears: 8, maxYears: 10 },
  { keywords: ["gutter"], label: "Gutters", minYears: 18, maxYears: 22 },
  { keywords: ["window"], label: "Windows", minYears: 20, maxYears: 25 },
  { keywords: ["exterior paint", "siding paint"], label: "Exterior Paint", minYears: 7, maxYears: 10 },
  { keywords: ["water filter", "reverse osmosis"], label: "Water Filtration System", minYears: 5, maxYears: 8 },
  { keywords: ["thermostat"], label: "Thermostat", minYears: 10, maxYears: 15 },
  { keywords: ["ceiling fan"], label: "Ceiling Fan", minYears: 10, maxYears: 15 },
  { keywords: ["driveway", "asphalt"], label: "Driveway", minYears: 15, maxYears: 20 },
  { keywords: ["fire extinguisher"], label: "Fire Extinguisher", minYears: 10, maxYears: 12 },
];

export function matchLifespan(itemName: string): LifespanEntry | null {
  const n = itemName.toLowerCase();
  for (const entry of LIFESPAN_TABLE) {
    if (entry.keywords.some((kw) => n.includes(kw))) return entry;
  }
  return null;
}

export type LifespanStatus = "overdue" | "due_soon" | "good";

export function lifespanStatus(ageYears: number, entry: LifespanEntry): LifespanStatus {
  if (ageYears >= entry.maxYears) return "overdue";
  if (ageYears >= entry.minYears) return "due_soon";
  return "good";
}
