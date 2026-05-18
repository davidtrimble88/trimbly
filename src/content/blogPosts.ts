// Evergreen, real content — no placeholders. Edit freely.
export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingMinutes: number;
  publishedAt: string; // ISO date
  body: string; // markdown-ish; rendered as paragraphs/headings
};

export const blogPosts: BlogPost[] = [
  {
    slug: "homeowner-maintenance-checklist-by-season",
    title: "The Homeowner Maintenance Checklist by Season",
    description:
      "A practical, season-by-season home maintenance checklist that catches small problems before they become expensive repairs.",
    category: "Maintenance",
    readingMinutes: 6,
    publishedAt: "2025-09-01",
    body: `
## Why seasonal maintenance matters

Most home repairs that cost five figures started as ten-dollar problems. A clogged gutter becomes water in a basement. A skipped HVAC tune-up becomes a compressor replacement. The fix is rarely complicated — what gets people is forgetting in the first place.

## Spring

- Clear gutters and check downspouts route water at least 4 feet from the foundation.
- Inspect the roof from the ground for missing shingles, loose flashing, and lifted edges after winter winds.
- Service the air conditioning before the first hot week — filters, coils, refrigerant pressure.
- Test the sump pump by pouring a bucket of water into the pit.
- Reseal exterior wood (decks, fences, window trim) if water no longer beads on the surface.

## Summer

- Drain a few gallons from the water heater to flush sediment.
- Check exterior caulking around windows, doors, and siding penetrations.
- Trim trees and shrubs at least 3 feet away from the house.
- Inspect the dryer vent termination — lint buildup is a leading cause of house fires.

## Fall

- Service the furnace or heat pump before the first cold snap.
- Reverse ceiling fans to clockwise to push warm air down.
- Disconnect hoses and shut off exterior spigots if you're in a freeze zone.
- Clean gutters again after leaves drop.
- Test every smoke and CO detector — replace batteries on a known schedule.

## Winter

- Keep cabinet doors open under sinks on the coldest nights to let warm air reach pipes on exterior walls.
- Watch for ice dams along eaves — a sign of attic insulation or ventilation issues.
- Check attic for any moisture, frost, or rodent activity.
- Inspect window and door weather stripping; replace anything that has compressed flat.

## When to call a pro

Anything involving structural work, electrical inside walls, gas lines, or roof penetrations is worth a licensed pro. Most other items on this list are 20-minute homeowner tasks once you have the routine.

> Tip: Trimbly's Maintenance Autopilot turns this checklist into reminders tied to your home's specific systems and climate.
`,
  },
  {
    slug: "how-much-does-it-cost-to-hire-a-handyman",
    title: "How Much Does It Cost to Hire a Handyman?",
    description:
      "Realistic 2025 handyman pricing by region, by job type, and by how the job is billed — plus what affects the final number.",
    category: "Pricing",
    readingMinutes: 5,
    publishedAt: "2025-10-12",
    body: `
## The short answer

In most U.S. metros in 2025, a general handyman charges between **$60 and $125 per hour** with a 1- or 2-hour minimum. Specialists (electricians, plumbers, HVAC) trend higher. Rural areas trend lower; coastal metros trend higher.

## How handymen actually bill

There are three common pricing structures:

1. **Hourly with a minimum.** Most common for small fix-it jobs. A $90/hr pro with a 1-hour minimum will charge you at least $90 even for a 20-minute task.
2. **Flat-rate per task.** Common for predictable jobs like installing a ceiling fan or mounting a TV. The number is the number.
3. **Project quote.** For multi-day jobs (deck refinishing, bathroom paint, baseboard install) you should get a written quote covering labor and materials separately.

## What affects the price

- **Materials.** Lumber, fixtures, hardware are almost always billed separately.
- **Trip charge.** Some pros add a flat $30–$75 just for showing up.
- **Permitting.** If the work requires a permit, expect a $100–$400 admin line item.
- **Emergency / after-hours.** Typically 1.5x to 2x the daytime rate.
- **License level.** A licensed electrician fixing a problem a handyman caused is almost always more expensive than just hiring the licensed pro first.

## Typical jobs and ballpark cost

| Job | Time | Typical total |
| --- | --- | --- |
| Mount a TV | 30–60 min | $90–$175 |
| Install a ceiling fan (existing wiring) | 1–2 hrs | $120–$280 |
| Replace a kitchen faucet | 1–1.5 hrs | $130–$260 |
| Patch and paint a small drywall hole | 1 hr | $90–$160 |
| Replace 2 exterior door locks | 1 hr | $120–$220 + hardware |
| Install a smart thermostat | 30–60 min | $90–$180 |

## How to keep the bill predictable

- Get a quote in writing before work starts.
- Group small jobs into a single visit to avoid multiple trip charges.
- Buy the materials yourself if you're picky about brands.
- Send photos when you request a quote — pros estimate faster and more accurately with context.

Trimbly's AI Job Estimator uses real labor and material costs to give you a ballpark before you even message a pro — so you can sanity-check the bids you get.
`,
  },
  {
    slug: "diy-vs-hire-a-pro-when-to-pick-which",
    title: "DIY vs. Hire a Pro: When to Pick Which",
    description:
      "A practical framework for deciding which home repairs are worth doing yourself and which deserve a licensed professional.",
    category: "Guides",
    readingMinutes: 4,
    publishedAt: "2025-11-04",
    body: `
## The four questions

Before you pick up a wrench, run the job through these four:

1. **What does failure cost?** A wobbly shelf falling is annoying. A misinstalled water shutoff flooding a basement is $20,000. Cost-of-failure is the single biggest signal.
2. **Does it touch gas, water inside walls, or electrical inside walls?** If yes, default to a licensed pro. Code, permits, and insurance all care about this.
3. **Do you own the right tools?** If the tool costs more than 60% of a pro's quote, just hire it out.
4. **How long would it take you the first time?** Multiply your estimate by 3. If you're still under a pro's quote and the failure cost is low, DIY is fine.

## Green-light DIY

- Patching nail holes, repainting a wall, recaulking a tub.
- Replacing a toilet seat, showerhead, or faucet aerator.
- Tightening cabinet hinges, replacing knobs and pulls.
- Swapping a smart thermostat (low-voltage only).
- Replacing exterior light bulbs and motion sensor heads.
- Cleaning HVAC vents, washing window screens, swapping filters.

## Yellow-light — DIY if you've done it before

- Installing a ceiling fan in an existing box.
- Replacing a kitchen faucet (under-sink space is the variable).
- Hanging a heavy TV mount into studs.
- Replacing a doorknob and strike plate.
- Installing a new toilet (the wax ring is unforgiving).

## Red-light — hire a pro

- Anything inside an electrical panel.
- Gas line work of any kind.
- Roofing repairs that involve walking on the roof.
- Plumbing inside walls.
- Tree work near power lines.
- Anything that requires a permit in your jurisdiction.

## The honest middle ground

The biggest mistake we see is homeowners getting 80% through a project, realizing they're stuck, and then calling a pro to finish what's now a more expensive job. If you're not sure, run the job through Trimbly's AI Symptom Triage first — it tells you which bucket the job belongs in before you commit.
`,
  },
];

export const getBlogPost = (slug: string) => blogPosts.find((p) => p.slug === slug);
