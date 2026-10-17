import type { DemoOrganization } from "../types/app";

export const demoOrganizations: readonly DemoOrganization[] = [
  {
    id: "network",
    name: "Hyderabad Health Network",
    description: "All locations",
    locations: null,
  },
  {
    id: "central",
    name: "Hyderabad Central Clinic",
    description: "Hyderabad Central",
    locations: ["Hyderabad Central"],
  },
  {
    id: "secunderabad",
    name: "Secunderabad Clinic",
    description: "Secunderabad Clinic",
    locations: ["Secunderabad Clinic"],
  },
  {
    id: "warangal",
    name: "Warangal Outreach Hub",
    description: "Warangal Hub",
    locations: ["Warangal Hub"],
  },
];
