// Vault item shape mirrors the MySQLVault plugin's `Vaults.Data` JSON entries verbatim.
// Field casing (uppercase) MUST be preserved on round-trip — the plugin reads these keys directly.
// `State` is an opaque base64 string (magazine / attachments / ammo); never decode, mutate, or expose in UI.
export interface VaultItem {
  Id: number;
  X: number;
  Y: number;
  Rot: number;
  Amount: number;
  Quality: number;
  State: string;
}

// One attachment slot on a gun (sight / tactical / grip / barrel / magazine).
// `name` may be null when the API can't resolve the attachment id to a display name.
export interface GunAttachment {
  id: number;
  name: string | null;
}

// Decoded gun State the API attaches to gun items (P2P listings + vault items).
// `gun` is null on the parent item when the item isn't a gun.
export interface GunInfo {
  sight: GunAttachment | null;
  tactical: GunAttachment | null;
  grip: GunAttachment | null;
  barrel: GunAttachment | null;
  magazine: GunAttachment | null;
  ammo: number;
  hasAttachments: boolean;
}

// VaultItem joined with sv_items metadata on the API side for display.
// Matches api `VaultItemView`.
export interface EnrichedVaultItem extends VaultItem {
  name: string | null;
  description: string | null;
  image_url: string | null;
  type_id: number | null;
  type_name: string | null;
  // Decoded gun attachments/ammo; null when the item isn't a gun.
  gun?: GunInfo | null;
}

export interface VaultSummary {
  owner_steam: string;
  owner_name: string | null;
  name: string;
  item_count: number;
  last_update: string | null;
}

export interface VaultGridSize {
  width: number;
  height: number;
}

// v1: capacity hardcoded to 8x8 (see plan §"Still-open"). When API exposes tier sizes, swap.
export const DEFAULT_VAULT_GRID: VaultGridSize = { width: 8, height: 8 };

export interface VaultDetail extends VaultSummary {
  items: EnrichedVaultItem[];
  grid: VaultGridSize;
}

export type P2pListingStatus = 'active' | 'sold' | 'cancelled' | 'expired';

// Matches api `P2PListingView`.
// `seller_discord_name` / `buyer_discord_name` are Discord snowflake IDs (numeric string) joined from sv_links,
// not usernames. Use `formatActorLabel()` to render them with a `Discord #...` / `Steam #...` prefix.
/** One item inside a bundle listing/purchase (names/images joined server-side). */
export interface P2pBundleItem {
  item_id: number;
  amount: number;
  quality: number;
  item_name?: string | null;
  image_url?: string | null;
}

export interface P2pListing {
  id: number;
  seller_steam: string;
  seller_discord_name: string | null;
  item_id: number;
  item_name: string | null;
  image_url: string | null;
  type_id: number | null;
  type_name: string | null;
  amount: number;
  quality: number;
  rot: number;
  state: string;
  price: number;
  status: P2pListingStatus;
  buyer_steam: string | null;
  buyer_discord_name: string | null;
  created_at: string;
  closed_at: string | null;
  // Populated by GET /p2p/listings/me on a closed listing that minted a refund redeem code
  // (P2P rework / A5) — in practice the 'expired' case. `redeem_code` is the code the seller
  // redeems in-game to get the item back; `code_expires_at` is that code's own expiry (ISO).
  // Both null/absent on listings that didn't mint a code. This row field is the source of truth
  // for the my-listings "Show code" button (more robust than the notification, which can be read).
  redeem_code?: string | null;
  code_expires_at?: string | null;
  // Decoded gun attachments/ammo; null when the listed item isn't a gun.
  gun?: GunInfo | null;
  // Bundle listing: item_id=0 sentinel, real items in bundleItems (amount = child count).
  is_bundle?: number | boolean;
  bundleItems?: P2pBundleItem[];
}

export interface P2pCreatePayload {
  vault_name: string;
  item_index: number;
  price: number;
}

// Sentinel the bot writes when the user has deleted their Discord account.
// Templates can detect it via `isDeletedActor()` to style differently (italic / ghost).
export const DELETED_DISCORD_SENTINEL = '<deleted>';

/** Render an actor identity for the UI.
 *  - `discordName` set     → `@<name>` (post-#13: real Discord username via COALESCE)
 *  - sentinel              → `@<deleted>` (caller can style italic/ghost via isDeletedActor)
 *  - no discord, steam set → `Steam #<last 8 of steamid>`
 *  - neither               → `—`
 */
export function formatActorLabel(discordName: string | null, steamId: string | null): string {
  if (discordName) return `@${discordName}`;
  if (steamId) return `Steam #${steamId.slice(-8)}`;
  return '—';
}

export function isDeletedActor(discordName: string | null): boolean {
  return discordName === DELETED_DISCORD_SENTINEL;
}

// Raw shape returned by GET /config/p2p. Percentages are whole numbers (e.g. 25 = 25%).
//   commission_pct       — sale commission taken from the seller
//   refund_code_ttl_days — how long a refund redeem code stays valid
//   cancel_penalty_pct   — % of the listing price charged when the seller cancels (coins can go negative)
export interface P2pConfigRaw {
  commission_pct: number;
  refund_code_ttl_days: number;
  cancel_penalty_pct: number;
}

// Normalized config used across the UI. `commission` is a 0-1 fraction (kept for the
// existing payout preview); `commission_pct` / `cancel_penalty_pct` are whole-number percentages.
export interface P2pConfig {
  commission: number;          // 0-1 fraction (commission_pct / 100)
  commission_pct: number;      // whole-number percent
  ttl_days: number;            // = refund_code_ttl_days
  cancel_penalty_pct: number;  // whole-number percent
}
