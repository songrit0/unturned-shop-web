// Thailand-time helpers. The game server is in Thailand, so Asia/Bangkok (UTC+7, no DST)
// is the canonical reference for every displayed/edited timestamp — independent of the
// viewer's device timezone.
//
// Display via the DatePipe is handled globally by DATE_PIPE_DEFAULT_OPTIONS ({ timezone: '+0700' })
// in AppModule. These helpers cover the cases the pipe can't: <input type="datetime-local">
// round-trips and any hand-built display string.

export const BANGKOK_TZ = 'Asia/Bangkok';
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000; // fixed UTC+7, Thailand has no DST

/**
 * Format a UNIX-seconds timestamp as a short "DD MMM HH:mm" label in Asia/Bangkok.
 * Used by the lightweight-charts time axis / crosshair so candle times read in Thai time
 * regardless of the viewer's device zone (the lib otherwise uses the browser's local zone).
 */
export function formatBangkokUnix(unixSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    timeZone: BANGKOK_TZ,
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(unixSeconds * 1000));
}

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * UTC ISO instant -> "YYYY-MM-DDTHH:mm" wall-clock string in Asia/Bangkok,
 * suitable for prefilling an <input type="datetime-local">.
 * Returns '' for null/empty/unparseable input.
 */
export function isoToBangkokInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  // Shift the instant by +7h, then read UTC fields — these are the Bangkok wall-clock fields.
  const d = new Date(t + BANGKOK_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/**
 * "YYYY-MM-DDTHH:mm[:ss]" interpreted as an Asia/Bangkok wall-clock time -> UTC ISO string.
 * Inverse of {@link isoToBangkokInput}; use for the value an admin types into a datetime-local
 * before sending it to the API. Returns null for empty/unparseable input.
 */
export function bangkokInputToIso(local: string | null | undefined): string | null {
  if (!local) return null;
  // Parse the wall-clock fields as if they were UTC, then subtract +7h to get the real instant.
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(local.trim());
  if (!m) {
    const fallback = Date.parse(local);
    return Number.isNaN(fallback) ? null : new Date(fallback).toISOString();
  }
  const [, y, mo, da, h, mi, s] = m;
  const asUtc = Date.UTC(+y, +mo - 1, +da, +h, +mi, s ? +s : 0);
  return new Date(asUtc - BANGKOK_OFFSET_MS).toISOString();
}

/**
 * Today's calendar date in Asia/Bangkok as "YYYY-MM-DD". Use instead of
 * `new Date().toISOString().slice(0,10)` (which yields the UTC date and can be off by a day
 * near midnight Thai time). Safe for both display and filenames.
 */
export function bangkokDateStamp(d: Date = new Date()): string {
  const b = new Date(d.getTime() + BANGKOK_OFFSET_MS);
  return `${b.getUTCFullYear()}-${pad(b.getUTCMonth() + 1)}-${pad(b.getUTCDate())}`;
}

/**
 * Hand-built display string for a date in Asia/Bangkok, for the rare spot that can't use the
 * DatePipe (e.g. building an i18n interpolation value). Mirrors toLocaleDateString defaults but
 * pins the zone. `kind` picks date-only / time-only / both.
 */
export function formatBangkok(
  iso: string | null | undefined,
  kind: 'date' | 'time' | 'datetime' = 'date',
): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const base: Intl.DateTimeFormatOptions = { timeZone: BANGKOK_TZ };
  const opts: Intl.DateTimeFormatOptions =
    kind === 'time'
      ? { ...base, hour: '2-digit', minute: '2-digit' }
      : kind === 'datetime'
      ? { ...base, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { ...base, year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Intl.DateTimeFormat(undefined, opts).format(new Date(t));
}
