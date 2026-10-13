import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Joins class names, letting later Tailwind classes win. Its own module so browser
 * code (React islands) can use it without pulling in `utils`, which imports
 * server-only packages such as `reading-time`.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
