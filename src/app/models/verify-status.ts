import { ItemSubmission } from './item-submission';

export type VerifyKind = 'verified' | 'pending' | 'rejected' | 'unverified';

export interface VerifyStatus {
  kind: VerifyKind;
  /** i18n key for the tooltip (empty when verified). */
  tooltipKey: string;
  /** Optional translate params (used by `rejected` to render the admin note). */
  tooltipParams?: Record<string, unknown>;
  /** Caller dims the row when true (pending submission). */
  dimmed: boolean;
  /** Whether clicking the icon should open the suggest-edit modal (unverified only on player view). */
  clickable: boolean;
}

interface ItemMetadata {
  name: string | null;
  description?: string | null;
  image_url?: string | null;
  type_id?: number | null;
}

/**
 * Resolve verification state for an item the player owns/sees.
 * Pass `submission` only when the viewer is the submitter (or admin — but admin pages should
 * pass null so this function doesn't mark items as pending/rejected based on someone else's user).
 */
export function resolveVerifyStatus(
  meta: ItemMetadata,
  submission: ItemSubmission | null,
): VerifyStatus {
  if (submission) {
    if (submission.status === 'pending') {
      return { kind: 'pending', tooltipKey: 'verifyStatus.pending', dimmed: true, clickable: false };
    }
    if (submission.status === 'rejected') {
      return {
        kind: 'rejected',
        tooltipKey: 'verifyStatus.rejected',
        tooltipParams: { note: submission.admin_note ?? '' },
        dimmed: false,
        clickable: false,
      };
    }
    // approved → fall through to verified-by-master-data
  }
  const hasName = !!meta.name && meta.name.trim().length > 0;
  if (!hasName) {
    return { kind: 'unverified', tooltipKey: 'verifyStatus.unverified', dimmed: false, clickable: true };
  }
  return { kind: 'verified', tooltipKey: '', dimmed: false, clickable: false };
}

/**
 * Effective display name. For a pending submission with a new `name` patch, show the proposed
 * name (so the user sees what they suggested while waiting). Otherwise fall back to master data
 * or `#<id>` for unverified items.
 */
export function effectiveDisplayName(itemId: number, meta: ItemMetadata, submission: ItemSubmission | null): string {
  if (submission?.status === 'pending' && submission.name) return submission.name;
  if (meta.name && meta.name.trim()) return meta.name;
  return `#${itemId}`;
}

/**
 * Effective thumbnail. While a submission is pending, the proposed `image_url` takes precedence
 * so the user (and any admin glancing at the same vault) catches typos / wrong art before approve.
 * Approved / rejected / no submission → master metadata.
 */
export function effectiveImageUrl(meta: ItemMetadata, submission: ItemSubmission | null): string | null {
  if (submission?.status === 'pending' && submission.image_url) return submission.image_url;
  return meta.image_url ?? null;
}
