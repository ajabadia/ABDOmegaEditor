/**
 * @purpose Utilidad de fusión de clases CSS que combina clsx con tailwind-merge para resolver conflictos de Tailwind
 * @lastUpdated 2026-06-14T17:30:00.000Z
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
