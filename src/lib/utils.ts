import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Assemble des classes Tailwind en résolvant les conflits (utilisé par les composants Cult UI)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
