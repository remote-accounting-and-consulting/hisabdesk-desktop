import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "Rs. 0";
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}
export function daysBetween(from: string, to: string = new Date().toISOString()): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}
export function daysOutstanding(invoiceDate: string): number {
  return Math.max(0, daysBetween(invoiceDate));
}
