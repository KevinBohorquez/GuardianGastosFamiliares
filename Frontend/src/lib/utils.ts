import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parseISO, format, isValid } from "date-fns";
import { es } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeParseDate(dateStr: any): Date {
  if (!dateStr) return new Date();
  try {
    // If it's already a Date object
    if (dateStr instanceof Date) return isValid(dateStr) ? dateStr : new Date();
    
    // Try parseISO first
    let parsed = parseISO(String(dateStr));
    if (isValid(parsed)) return parsed;

    // Try standard JS Date constructor
    parsed = new Date(String(dateStr));
    if (isValid(parsed)) return parsed;

    // Try parsing DD/MM/YYYY format
    const parts = String(dateStr).split("/");
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      parsed = new Date(year, month, day);
      if (isValid(parsed)) return parsed;
    }

    return new Date();
  } catch {
    return new Date();
  }
}

export function safeFormatDate(dateStr: any, formatStr: string): string {
  const date = safeParseDate(dateStr);
  try {
    return format(date, formatStr, { locale: es });
  } catch {
    return "";
  }
}

