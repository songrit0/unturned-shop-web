// Viewer-local time helpers. Every displayed/edited timestamp follows the USER'S device
// timezone. The DatePipe already renders local by default; these helpers cover the cases
// the pipe can't: <input type="datetime-local"> round-trips and hand-built display strings.
//
// (Formerly Thailand-pinned helpers — the app switched to viewer-local time 2026-07-04.)

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Format a UNIX-seconds timestamp as a short "DD MMM HH:mm" label in the viewer's zone.
 * Used by the lightweight-charts time axis / crosshair (the lib's own labels are UTC-based).
 */
export function formatLocalUnix(unixSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(unixSeconds * 1000));
}

/**
 * UTC ISO instant -> "YYYY-MM-DDTHH:mm" wall-clock string in the viewer's zone,
 * suitable for prefilling an <input type="datetime-local">.
 * Returns '' for null/empty/unparseable input.
 */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * "YYYY-MM-DDTHH:mm[:ss]" from a datetime-local input (viewer's wall clock) -> UTC ISO string.
 * Inverse of {@link isoToLocalInput}. Returns null for empty/unparseable input.
 */
export function localInputToIso(local: string | null | undefined): string | null {
  if (!local) return null;
  const t = Date.parse(local); // no-offset strings parse as viewer-local per ES spec
  return Number.isNaN(t) ? null : new Date(t).toISOString();
}

/**
 * Today's calendar date in the viewer's zone as "YYYY-MM-DD". Use instead of
 * `new Date().toISOString().slice(0,10)` (UTC date — off by a day near local midnight).
 */
export function localDateStamp(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Hand-built display string in the viewer's zone, for the rare spot that can't use the
 * DatePipe (e.g. building an i18n interpolation value). `kind` picks date / time / both.
 */
export function formatLocal(
  iso: string | null | undefined,
  kind: 'date' | 'time' | 'datetime' = 'date',
): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const opts: Intl.DateTimeFormatOptions =
    kind === 'time'
      ? { hour: '2-digit', minute: '2-digit' }
      : kind === 'datetime'
      ? { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Intl.DateTimeFormat(undefined, opts).format(new Date(t));
}
