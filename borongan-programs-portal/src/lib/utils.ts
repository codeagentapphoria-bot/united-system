import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatIdType(idType: string | null | undefined): string {
  if (!idType) return 'N/A';
  return idType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Formats a date string without timezone conversion issues
 * Parses the date string and extracts year, month, day directly
 * @param dateString - Date string in format "YYYY-MM-DD", "YYYY-MM-DD HH:mm:ss", or ISO string, or Date object
 * @param options - Intl.DateTimeFormatOptions for formatting
 * @returns Formatted date string
 */
export function formatDateWithoutTimezone(
  dateString: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }
): string {
  if (!dateString) {
    return 'Not provided';
  }

  let year: number;
  let month: number;
  let day: number;
  
  try {
    if (dateString instanceof Date) {
      // If it's already a Date object, extract the date parts to avoid timezone issues
      // Use getFullYear, getMonth, getDate to get local date parts
      year = dateString.getFullYear();
      month = dateString.getMonth(); // getMonth returns 0-11
      day = dateString.getDate();
    } else if (typeof dateString === 'string') {
      // Handle ISO strings (e.g., "2003-08-02T00:00:00.000Z" or "2003-08-02T00:00:00")
      if (dateString.includes('T')) {
        const datePart = dateString.split('T')[0]; // Get "YYYY-MM-DD" part
        const parts = datePart.split('-');
        
        if (parts.length !== 3) {
          return 'Invalid Date';
        }
        
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1; // Convert to 0-indexed month
        day = parseInt(parts[2], 10);
      } else {
        // Handle "YYYY-MM-DD" or "YYYY-MM-DD HH:mm:ss" format
        const datePart = dateString.split(' ')[0].trim(); // Get "YYYY-MM-DD" part
        const parts = datePart.split('-');
        
        if (parts.length !== 3) {
          return 'Invalid Date';
        }
        
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1; // Convert to 0-indexed month
        day = parseInt(parts[2], 10);
      }
      
      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        return 'Invalid Date';
      }
      
      // Validate date range
      if (month < 0 || month > 11 || day < 1 || day > 31) {
        return 'Invalid Date';
      }
    } else {
      return 'Invalid Date';
    }
    
    // Create date in local timezone (not UTC)
    const date = new Date(year, month, day);
    
    // Validate the date
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', options);
  } catch (error) {
    return 'Invalid Date';
  }
}

/**
 * Calculates age from birth date
 * @param birthDate - Birth date string (ISO format, YYYY-MM-DD, or Date object)
 * @returns The calculated age in years, or null if birth date is invalid
 */
export function calculateAge(birthDate: string | Date | null | undefined): number | null {
  if (!birthDate) {
    return null;
  }

  try {
    let birth: Date;
    
    if (birthDate instanceof Date) {
      birth = birthDate;
    } else if (typeof birthDate === 'string') {
      // Handle ISO strings (e.g., "2003-08-02T00:00:00.000Z" or "2003-08-02T00:00:00")
      if (birthDate.includes('T')) {
        const datePart = birthDate.split('T')[0]; // Get "YYYY-MM-DD" part
        const parts = datePart.split('-');
        
        if (parts.length !== 3) {
          return null;
        }
        
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Convert to 0-indexed month
        const day = parseInt(parts[2], 10);
        
        birth = new Date(year, month, day);
      } else {
        // Handle "YYYY-MM-DD" or "YYYY-MM-DD HH:mm:ss" format
        const datePart = birthDate.split(' ')[0].trim(); // Get "YYYY-MM-DD" part
        const parts = datePart.split('-');
        
        if (parts.length !== 3) {
          return null;
        }
        
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Convert to 0-indexed month
        const day = parseInt(parts[2], 10);
        
        birth = new Date(year, month, day);
      }
    } else {
      return null;
    }

    // Validate the date
    if (isNaN(birth.getTime())) {
      return null;
    }

    // Calculate age
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // Adjust age if birthday hasn't occurred this year yet
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age >= 0 ? age : null;
  } catch (error) {
    return null;
  }
}

/**
 * Gets the age classification for older persons based on age
 * @param age - The age of the person (number)
 * @returns The classification string or null if age is below 80
 */
export function getAgeClassification(age: number | null | undefined): string | null {
  if (!age || typeof age !== 'number' || age < 80) {
    return null;
  }

  if (age >= 110) {
    return 'Supercentenarian';
  } else if (age >= 100) {
    return 'Centenarian';
  } else if (age >= 90) {
    return 'Nonagenarian';
  } else if (age >= 80) {
    return 'Octogenarian';
  }

  return null;
}

/**
 * Gets the badge variant color for age classification
 * @param classification - The age classification string
 * @returns Tailwind CSS classes for the badge
 */
export function getAgeClassificationBadgeVariant(classification: string | null): string {
  if (!classification) return 'bg-gray-100 text-gray-700';

  const variants: Record<string, string> = {
    'Octogenarian': 'bg-blue-100 text-blue-700',
    'Nonagenarian': 'bg-purple-100 text-purple-700',
    'Centenarian': 'bg-amber-100 text-amber-700',
    'Supercentenarian': 'bg-red-100 text-red-700',
  };

  return variants[classification] || 'bg-gray-100 text-gray-700';
}
