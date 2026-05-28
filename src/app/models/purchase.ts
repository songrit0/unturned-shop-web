// Matches api `PurchaseView` (purchases.types.ts). `state` is opaque base64 — never decoded.
export interface PurchaseView {
  id: number;
  buyer_steam: string;
  listing_id: number;
  item_id: number;
  amount: number;
  quality: number;
  state: string;
  rot: number;
  purchased_at: string;
  claimed_at: string | null;
  redeem_code: string | null;
  item_name: string | null;
  image_url: string | null;
  type_id: number | null;
  type_name: string | null;
}

export type PurchaseFilter = 'unclaimed' | 'claimed' | 'all';
