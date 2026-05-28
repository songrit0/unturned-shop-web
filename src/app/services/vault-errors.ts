// Maps a NestJS error response (`{ statusCode, message, error }`) onto an i18n key
// under the `errors.*` namespace. Pages render with `{{ key | translate }}` so the
// raw domain message never reaches the user verbatim. Unknown messages fall back to
// `errors.unknown` so callers always get a key — never `null`.
export function mapVaultP2pErrorKey(e: unknown): string {
  const err = e as { status?: number; error?: { message?: string; statusCode?: number } } | null;
  const msg = err?.error?.message;
  switch (msg) {
    case 'vault_locked_in_game':
    case 'listing_no_longer_active':
    case 'cannot_buy_own_listing':
    case 'insufficient_funds':
    case 'not_listing_owner':
    case 'vault_full':
    case 'already_submitted':
    case 'submission_not_pending':
    case 'nothing_to_submit':
    case 'invalid_item_id':
    case 'already_claimed':
    case 'not_buyer':
    case 'code_collision_retry_exhausted':
      return `errors.${msg}`;
  }
  if (msg === 'Discord account not linked to Steam') return 'errors.steam_not_linked';
  if (msg === 'Vault not found') return 'errors.vault_not_found';
  if (msg === 'Listing not found') return 'errors.listing_not_found';
  if (msg === 'Submission not found') return 'errors.submission_not_found';
  if (msg === 'Purchase not found') return 'errors.purchase_not_found';

  const status = err?.status ?? err?.error?.statusCode;
  if (status === 401) return 'errors.unauthorized';
  if (status === 403) return 'errors.forbidden';
  if (status === 404) return 'errors.not_found';
  return 'errors.unknown';
}
