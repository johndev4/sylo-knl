export function getURL(): string {
  // Use explicitly set site URL, fallback to localhost
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // Ensure trailing slash is removed, then return
  return base.replace(/\/$/, '');
}
