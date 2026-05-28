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

// VaultItem joined with sv_items metadata on the API side for display.
// Matches api `VaultItemView`.
export interface EnrichedVaultItem extends VaultItem {
  name: string | null;
  description: string | null;
  image_url: string | null;
  type_id: number | null;
  type_name: string | null;
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

export interface P2pConfig {
  commission: number;
  ttl_days: number;
}
