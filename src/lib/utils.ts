import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function calculateGST(price: number, rate: number = 18): { base: number; gst: number; total: number } {
  const base = price;
  const gst = Math.round((price * rate) / 100);
  const total = base + gst;
  return { base, gst, total };
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, "")
    .replace(/ +/g, "-");
}

export const SERVICE_TYPES = [
  { value: "HOSTEL", label: "Hostel" },
  { value: "PG", label: "PG" },
  { value: "LIBRARY", label: "Library" },
  { value: "COACHING", label: "Coaching" },
  { value: "MESS", label: "Mess" },
  { value: "LAUNDRY", label: "Laundry" },
  { value: "GYM", label: "Gym" },
  { value: "COWORKING", label: "Co-working Space" },
] as const;

export type ServiceTypeValue = (typeof SERVICE_TYPES)[number]["value"];

// UI-level service categories with priority ordering
// Accommodation = HOSTEL + PG (merged). Coaching & Co-working removed.
export const SERVICE_CATEGORIES = [
  { value: "ACCOMMODATION", label: "Accommodation", dbTypes: ["HOSTEL", "PG"] as string[] },
  { value: "MESS", label: "Mess/Tiffin", dbTypes: ["MESS"] as string[] },
  { value: "LIBRARY", label: "Library", dbTypes: ["LIBRARY"] as string[] },
  { value: "LAUNDRY", label: "Laundry", dbTypes: ["LAUNDRY"] as string[] },
  { value: "GYM", label: "Gym", dbTypes: ["GYM"] as string[] },
] as const;

/** Map a UI category value to the DB service types it covers */
export function categoryToDbTypes(category: string): string[] {
  const cat = SERVICE_CATEGORIES.find((c) => c.value === category);
  return cat ? [...cat.dbTypes] : [category];
}

/** Resolve a display label for a DB serviceType (e.g. HOSTEL → Accommodation) */
export function serviceTypeLabel(dbType: string): string {
  // First check if it falls under a category
  const cat = SERVICE_CATEGORIES.find((c) => c.dbTypes.includes(dbType));
  if (cat) return cat.label;
  // Fallback to SERVICE_TYPES label
  const st = SERVICE_TYPES.find((s) => s.value === dbType);
  return st?.label || dbType;
}
