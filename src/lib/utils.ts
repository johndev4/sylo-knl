import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Utility that returns 2-letter initials from a name or email.
 */
export const makeInitials = (
  displayName: string | null,
  email: string
): string => {
  const source = displayName || email.split('@')[0];
  return source
    .split(/[\s._-]+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
