// Small shared helpers for rendering a code/listing expiry ("expires in N days").
// Used by the codes page, my-listings, and the notifications inbox so the day-math
// and the i18n key selection stay consistent in one place.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Whole days from now until `iso` (an ISO timestamp). Rounded UP so "23h left" reads as 1 day.
 * Returns null when `iso` is null/empty/unparseable, and a negative number when already past.
 */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / MS_PER_DAY);
}
