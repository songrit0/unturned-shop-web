export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

// Snapshot of the master item at the time the submission was created — used for diff view.
// Matches api `CurrentItemSnapshot`.
export interface CurrentItemSnapshot {
  name: string | null;
  description: string | null;
  image_url: string | null;
  type_id: number | null;
  type_name: string | null;
}

// Matches api `ItemSubmission` (items-submissions.types.ts).
// Discord names come from sv_links via the same COALESCE join as p2p — use formatActorLabel().
export interface ItemSubmission {
  id: number;
  item_id: number;
  submitter_steam: string;
  submitter_discord_name: string | null;
  name: string | null;
  description: string | null;
  image_url: string | null;
  type_id: number | null;
  status: SubmissionStatus;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewer_discord_name: string | null;
  reviewed_at: string | null;
  submitted_at: string;
  current_item: CurrentItemSnapshot | null;
}

export interface SubmissionPatch {
  name?: string | null;
  description?: string | null;
  image_url?: string | null;
  type_id?: number | null;
}
