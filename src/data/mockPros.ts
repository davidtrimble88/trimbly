export interface ServiceProvider {
  id: number;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  hourlyRate: string;
  licensed: boolean;
  available: boolean;
  city: string;
  state: string;
  country: "US" | "CA";
}

export const mockPros: ServiceProvider[] = [
  // --- UNITED STATES ---
  // Texas
  { id: 1, name: "Mike's Plumbing Co.", category: "Plumbing", rating: 4.9, reviews: 127, hourlyRate: "$85–120", licensed: true, available: true, city: "Austin", state: "TX", country: "US" },
  { id: 2, name: "Spark Electric Services", category: "Electrical", rating: 4.8, reviews: 89, hourlyRate: "$90–140", licensed: true, available: true, city: "Austin", state: "TX", country: "US" },
  { id: 3, name: "HandyDan Repairs", category: "Handyman", rating: 4.7, reviews: 203, hourlyRate: "$60–95", licensed: true, available: false, city: "Round Rock", state: "TX", country: "US" },
  { id: 4, name: "CoolBreeze HVAC", category: "HVAC", rating: 4.9, reviews: 156, hourlyRate: "$100–160", licensed: true, available: true, city: "Dallas", state: "TX", country: "US" },
  { id: 5, name: "GreenThumb Landscaping", category: "Landscaping", rating: 4.6, reviews: 74, hourlyRate: "$55–80", licensed: false, available: true, city: "Houston", state: "TX", country: "US" },
  { id: 6, name: "Perfect Coat Painters", category: "Painting", rating: 4.8, reviews: 112, hourlyRate: "$70–110", licensed: true, available: true, city: "San Antonio", state: "TX", country: "US" },
  { id: 7, name: "Lone Star Roofing", category: "Roofing", rating: 4.5, reviews: 67, hourlyRate: "$95–150", licensed: true, available: true, city: "Fort Worth", state: "TX", country: "US" },
  { id: 8, name: "Tex Clean Pro", category: "Cleaning", rating: 4.7, reviews: 198, hourlyRate: "$40–65", licensed: true, available: true, city: "El Paso", state: "TX", country: "US" },

  // California
  { id: 9, name: "Bay Area Plumbers", category: "Plumbing", rating: 4.8, reviews: 245, hourlyRate: "$110–165", licensed: true, available: true, city: "San Francisco", state: "CA", country: "US" },
  { id: 10, name: "SoCal Electric", category: "Electrical", rating: 4.9, reviews: 310, hourlyRate: "$105–155", licensed: true, available: true, city: "Los Angeles", state: "CA", country: "US" },
  { id: 11, name: "Golden State Handyman", category: "Handyman", rating: 4.6, reviews: 178, hourlyRate: "$75–110", licensed: true, available: true, city: "San Diego", state: "CA", country: "US" },
  { id: 12, name: "Pacific HVAC Solutions", category: "HVAC", rating: 4.7, reviews: 134, hourlyRate: "$115–175", licensed: true, available: false, city: "Sacramento", state: "CA", country: "US" },
  { id: 13, name: "Sunset Landscaping", category: "Landscaping", rating: 4.8, reviews: 92, hourlyRate: "$65–100", licensed: true, available: true, city: "San Jose", state: "CA", country: "US" },
  { id: 14, name: "Fresno Pro Painters", category: "Painting", rating: 4.5, reviews: 56, hourlyRate: "$65–95", licensed: true, available: true, city: "Fresno", state: "CA", country: "US" },

  // New York
  { id: 15, name: "NYC Master Plumbing", category: "Plumbing", rating: 4.9, reviews: 412, hourlyRate: "$120–180", licensed: true, available: true, city: "New York", state: "NY", country: "US" },
  { id: 16, name: "Empire Electric Co.", category: "Electrical", rating: 4.7, reviews: 287, hourlyRate: "$115–170", licensed: true, available: true, city: "New York", state: "NY", country: "US" },
  { id: 17, name: "Brooklyn Handyman Hub", category: "Handyman", rating: 4.6, reviews: 165, hourlyRate: "$80–120", licensed: true, available: true, city: "Brooklyn", state: "NY", country: "US" },
  { id: 18, name: "Hudson Valley HVAC", category: "HVAC", rating: 4.8, reviews: 98, hourlyRate: "$110–160", licensed: true, available: false, city: "Albany", state: "NY", country: "US" },
  { id: 19, name: "Upstate Roofing Pros", category: "Roofing", rating: 4.7, reviews: 143, hourlyRate: "$90–140", licensed: true, available: true, city: "Buffalo", state: "NY", country: "US" },

  // Florida
  { id: 20, name: "Sunshine Plumbing", category: "Plumbing", rating: 4.8, reviews: 198, hourlyRate: "$80–115", licensed: true, available: true, city: "Miami", state: "FL", country: "US" },
  { id: 21, name: "Tampa Bay Electric", category: "Electrical", rating: 4.7, reviews: 145, hourlyRate: "$85–130", licensed: true, available: true, city: "Tampa", state: "FL", country: "US" },
  { id: 22, name: "Orlando Handyman Services", category: "Handyman", rating: 4.6, reviews: 112, hourlyRate: "$55–85", licensed: true, available: true, city: "Orlando", state: "FL", country: "US" },
  { id: 23, name: "Coastal HVAC", category: "HVAC", rating: 4.9, reviews: 234, hourlyRate: "$95–145", licensed: true, available: true, city: "Jacksonville", state: "FL", country: "US" },
  { id: 24, name: "Palm Beach Landscaping", category: "Landscaping", rating: 4.5, reviews: 87, hourlyRate: "$50–75", licensed: false, available: true, city: "West Palm Beach", state: "FL", country: "US" },

  // Illinois
  { id: 25, name: "Windy City Plumbing", category: "Plumbing", rating: 4.8, reviews: 256, hourlyRate: "$95–140", licensed: true, available: true, city: "Chicago", state: "IL", country: "US" },
  { id: 26, name: "Chi-Town Electric", category: "Electrical", rating: 4.7, reviews: 189, hourlyRate: "$90–135", licensed: true, available: true, city: "Chicago", state: "IL", country: "US" },
  { id: 27, name: "Prairie Handyman", category: "Handyman", rating: 4.5, reviews: 78, hourlyRate: "$55–85", licensed: true, available: false, city: "Naperville", state: "IL", country: "US" },

  // Washington
  { id: 28, name: "Seattle Pipe Works", category: "Plumbing", rating: 4.9, reviews: 178, hourlyRate: "$100–150", licensed: true, available: true, city: "Seattle", state: "WA", country: "US" },
  { id: 29, name: "Puget Sound Electric", category: "Electrical", rating: 4.8, reviews: 134, hourlyRate: "$95–145", licensed: true, available: true, city: "Seattle", state: "WA", country: "US" },
  { id: 30, name: "Evergreen Landscaping", category: "Landscaping", rating: 4.7, reviews: 92, hourlyRate: "$60–90", licensed: true, available: true, city: "Tacoma", state: "WA", country: "US" },

  // Colorado
  { id: 31, name: "Mile High Plumbing", category: "Plumbing", rating: 4.8, reviews: 167, hourlyRate: "$90–135", licensed: true, available: true, city: "Denver", state: "CO", country: "US" },
  { id: 32, name: "Rocky Mountain HVAC", category: "HVAC", rating: 4.9, reviews: 201, hourlyRate: "$100–155", licensed: true, available: true, city: "Denver", state: "CO", country: "US" },
  { id: 33, name: "Boulder Handyman Co.", category: "Handyman", rating: 4.6, reviews: 89, hourlyRate: "$65–100", licensed: true, available: true, city: "Boulder", state: "CO", country: "US" },

  // Georgia
  { id: 34, name: "Peachtree Plumbing", category: "Plumbing", rating: 4.7, reviews: 145, hourlyRate: "$80–120", licensed: true, available: true, city: "Atlanta", state: "GA", country: "US" },
  { id: 35, name: "ATL Electric Pro", category: "Electrical", rating: 4.8, reviews: 167, hourlyRate: "$85–130", licensed: true, available: true, city: "Atlanta", state: "GA", country: "US" },
  { id: 36, name: "Southern Comfort HVAC", category: "HVAC", rating: 4.6, reviews: 112, hourlyRate: "$90–140", licensed: true, available: false, city: "Savannah", state: "GA", country: "US" },

  // Massachusetts
  { id: 37, name: "Boston Pipe & Drain", category: "Plumbing", rating: 4.9, reviews: 234, hourlyRate: "$105–155", licensed: true, available: true, city: "Boston", state: "MA", country: "US" },
  { id: 38, name: "New England Electric", category: "Electrical", rating: 4.7, reviews: 156, hourlyRate: "$100–150", licensed: true, available: true, city: "Cambridge", state: "MA", country: "US" },

  // Arizona
  { id: 39, name: "Desert Cool HVAC", category: "HVAC", rating: 4.9, reviews: 298, hourlyRate: "$95–150", licensed: true, available: true, city: "Phoenix", state: "AZ", country: "US" },
  { id: 40, name: "Cactus Landscaping", category: "Landscaping", rating: 4.7, reviews: 123, hourlyRate: "$50–80", licensed: true, available: true, city: "Scottsdale", state: "AZ", country: "US" },
  { id: 41, name: "Sonoran Painters", category: "Painting", rating: 4.6, reviews: 87, hourlyRate: "$60–95", licensed: true, available: true, city: "Tucson", state: "AZ", country: "US" },

  // Oregon
  { id: 42, name: "Portland Plumbing Pros", category: "Plumbing", rating: 4.8, reviews: 145, hourlyRate: "$90–135", licensed: true, available: true, city: "Portland", state: "OR", country: "US" },
  { id: 43, name: "Rose City Electric", category: "Electrical", rating: 4.7, reviews: 98, hourlyRate: "$85–130", licensed: true, available: true, city: "Portland", state: "OR", country: "US" },

  // Michigan
  { id: 44, name: "Motor City Plumbing", category: "Plumbing", rating: 4.6, reviews: 112, hourlyRate: "$75–110", licensed: true, available: true, city: "Detroit", state: "MI", country: "US" },
  { id: 45, name: "Great Lakes HVAC", category: "HVAC", rating: 4.8, reviews: 167, hourlyRate: "$85–135", licensed: true, available: true, city: "Grand Rapids", state: "MI", country: "US" },

  // Ohio
  { id: 46, name: "Buckeye Handyman", category: "Handyman", rating: 4.7, reviews: 134, hourlyRate: "$55–85", licensed: true, available: true, city: "Columbus", state: "OH", country: "US" },
  { id: 47, name: "Cleveland Roofing Co.", category: "Roofing", rating: 4.6, reviews: 89, hourlyRate: "$80–125", licensed: true, available: true, city: "Cleveland", state: "OH", country: "US" },

  // North Carolina
  { id: 48, name: "Carolina Plumbing Experts", category: "Plumbing", rating: 4.8, reviews: 178, hourlyRate: "$80–115", licensed: true, available: true, city: "Charlotte", state: "NC", country: "US" },
  { id: 49, name: "Triangle Electric", category: "Electrical", rating: 4.7, reviews: 123, hourlyRate: "$80–125", licensed: true, available: true, city: "Raleigh", state: "NC", country: "US" },

  // Tennessee
  { id: 50, name: "Music City Handyman", category: "Handyman", rating: 4.6, reviews: 98, hourlyRate: "$55–85", licensed: true, available: true, city: "Nashville", state: "TN", country: "US" },
  { id: 51, name: "Memphis Clean Team", category: "Cleaning", rating: 4.8, reviews: 156, hourlyRate: "$35–60", licensed: true, available: true, city: "Memphis", state: "TN", country: "US" },

  // Pennsylvania
  { id: 52, name: "Philly Plumbing & Heating", category: "Plumbing", rating: 4.7, reviews: 198, hourlyRate: "$90–135", licensed: true, available: true, city: "Philadelphia", state: "PA", country: "US" },
  { id: 53, name: "Steel City Electric", category: "Electrical", rating: 4.6, reviews: 87, hourlyRate: "$80–125", licensed: true, available: true, city: "Pittsburgh", state: "PA", country: "US" },

  // Minnesota
  { id: 54, name: "Twin Cities HVAC", category: "HVAC", rating: 4.8, reviews: 145, hourlyRate: "$90–140", licensed: true, available: true, city: "Minneapolis", state: "MN", country: "US" },
  { id: 55, name: "North Star Landscaping", category: "Landscaping", rating: 4.5, reviews: 67, hourlyRate: "$55–85", licensed: true, available: true, city: "St. Paul", state: "MN", country: "US" },

  // Nevada
  { id: 56, name: "Vegas Plumbing 24/7", category: "Plumbing", rating: 4.7, reviews: 234, hourlyRate: "$85–130", licensed: true, available: true, city: "Las Vegas", state: "NV", country: "US" },
  { id: 57, name: "Desert Electric Co.", category: "Electrical", rating: 4.6, reviews: 112, hourlyRate: "$80–120", licensed: true, available: true, city: "Henderson", state: "NV", country: "US" },

  // Maryland
  { id: 58, name: "Chesapeake Handyman", category: "Handyman", rating: 4.7, reviews: 145, hourlyRate: "$65–100", licensed: true, available: true, city: "Baltimore", state: "MD", country: "US" },

  // Virginia
  { id: 59, name: "Old Dominion Roofing", category: "Roofing", rating: 4.8, reviews: 98, hourlyRate: "$85–135", licensed: true, available: true, city: "Richmond", state: "VA", country: "US" },
  { id: 60, name: "NoVa Cleaning Services", category: "Cleaning", rating: 4.9, reviews: 267, hourlyRate: "$45–70", licensed: true, available: true, city: "Arlington", state: "VA", country: "US" },

  // Hawaii
  { id: 61, name: "Aloha Plumbing", category: "Plumbing", rating: 4.8, reviews: 87, hourlyRate: "$110–165", licensed: true, available: true, city: "Honolulu", state: "HI", country: "US" },

  // Alaska
  { id: 62, name: "Frontier HVAC", category: "HVAC", rating: 4.7, reviews: 56, hourlyRate: "$120–180", licensed: true, available: true, city: "Anchorage", state: "AK", country: "US" },

  // --- CANADA ---
  // Ontario
  { id: 63, name: "Toronto Plumbing Masters", category: "Plumbing", rating: 4.9, reviews: 312, hourlyRate: "C$100–150", licensed: true, available: true, city: "Toronto", state: "ON", country: "CA" },
  { id: 64, name: "GTA Electric", category: "Electrical", rating: 4.8, reviews: 198, hourlyRate: "C$95–140", licensed: true, available: true, city: "Toronto", state: "ON", country: "CA" },
  { id: 65, name: "Ottawa Handyman Hub", category: "Handyman", rating: 4.7, reviews: 145, hourlyRate: "C$65–95", licensed: true, available: true, city: "Ottawa", state: "ON", country: "CA" },
  { id: 66, name: "Niagara HVAC Solutions", category: "HVAC", rating: 4.6, reviews: 89, hourlyRate: "C$90–140", licensed: true, available: false, city: "Hamilton", state: "ON", country: "CA" },
  { id: 67, name: "Mississauga Clean Pro", category: "Cleaning", rating: 4.8, reviews: 167, hourlyRate: "C$40–65", licensed: true, available: true, city: "Mississauga", state: "ON", country: "CA" },

  // British Columbia
  { id: 68, name: "Vancouver Plumbing Co.", category: "Plumbing", rating: 4.8, reviews: 234, hourlyRate: "C$105–155", licensed: true, available: true, city: "Vancouver", state: "BC", country: "CA" },
  { id: 69, name: "Pacific Coast Electric", category: "Electrical", rating: 4.9, reviews: 178, hourlyRate: "C$100–150", licensed: true, available: true, city: "Vancouver", state: "BC", country: "CA" },
  { id: 70, name: "Island Handyman", category: "Handyman", rating: 4.7, reviews: 98, hourlyRate: "C$70–100", licensed: true, available: true, city: "Victoria", state: "BC", country: "CA" },
  { id: 71, name: "Mountain View Landscaping", category: "Landscaping", rating: 4.6, reviews: 67, hourlyRate: "C$55–85", licensed: true, available: true, city: "Kelowna", state: "BC", country: "CA" },

  // Quebec
  { id: 72, name: "Montréal Plomberie Pro", category: "Plumbing", rating: 4.7, reviews: 198, hourlyRate: "C$90–135", licensed: true, available: true, city: "Montreal", state: "QC", country: "CA" },
  { id: 73, name: "Québec Électrique", category: "Electrical", rating: 4.8, reviews: 145, hourlyRate: "C$85–130", licensed: true, available: true, city: "Quebec City", state: "QC", country: "CA" },
  { id: 74, name: "Laval Painting Experts", category: "Painting", rating: 4.6, reviews: 78, hourlyRate: "C$60–90", licensed: true, available: true, city: "Laval", state: "QC", country: "CA" },

  // Alberta
  { id: 75, name: "Calgary Plumbing & Gas", category: "Plumbing", rating: 4.8, reviews: 167, hourlyRate: "C$95–145", licensed: true, available: true, city: "Calgary", state: "AB", country: "CA" },
  { id: 76, name: "Edmonton HVAC Pros", category: "HVAC", rating: 4.9, reviews: 201, hourlyRate: "C$100–155", licensed: true, available: true, city: "Edmonton", state: "AB", country: "CA" },
  { id: 77, name: "Alberta Roofing Co.", category: "Roofing", rating: 4.7, reviews: 112, hourlyRate: "C$85–130", licensed: true, available: true, city: "Red Deer", state: "AB", country: "CA" },

  // Manitoba
  { id: 78, name: "Winnipeg Electric Services", category: "Electrical", rating: 4.6, reviews: 89, hourlyRate: "C$80–120", licensed: true, available: true, city: "Winnipeg", state: "MB", country: "CA" },
  { id: 79, name: "Prairie Handyman Pro", category: "Handyman", rating: 4.7, reviews: 67, hourlyRate: "C$55–85", licensed: true, available: true, city: "Winnipeg", state: "MB", country: "CA" },

  // Saskatchewan
  { id: 80, name: "Regina Plumbing Experts", category: "Plumbing", rating: 4.5, reviews: 56, hourlyRate: "C$80–115", licensed: true, available: true, city: "Regina", state: "SK", country: "CA" },

  // Nova Scotia
  { id: 81, name: "Halifax Home Services", category: "Handyman", rating: 4.8, reviews: 134, hourlyRate: "C$60–90", licensed: true, available: true, city: "Halifax", state: "NS", country: "CA" },
  { id: 82, name: "Maritime Roofing", category: "Roofing", rating: 4.6, reviews: 78, hourlyRate: "C$80–120", licensed: true, available: true, city: "Halifax", state: "NS", country: "CA" },

  // New Brunswick
  { id: 83, name: "Fundy Plumbing", category: "Plumbing", rating: 4.7, reviews: 45, hourlyRate: "C$75–110", licensed: true, available: true, city: "Saint John", state: "NB", country: "CA" },

  // Newfoundland
  { id: 84, name: "St. John's Electric", category: "Electrical", rating: 4.6, reviews: 56, hourlyRate: "C$80–120", licensed: true, available: true, city: "St. John's", state: "NL", country: "CA" },
];
