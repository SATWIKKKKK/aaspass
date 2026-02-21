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
