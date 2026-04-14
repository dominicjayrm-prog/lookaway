/**
 * reportUser — submits a report row to public.user_reports.
 *
 * Required for App Store Guideline 1.2: any app that lets users
 * interact socially must offer a way to report other users. Our
 * interaction surface is narrow (friend requests, challenges,
 * username display) but Apple still expects a reporting path.
 *
 * RLS on user_reports allows only `auth.uid() = reporter_id` inserts
 * and enforces reporter_id <> reported_id, so this utility is safe
 * to call from the client without additional server checks.
 */
import { supabase } from '@/src/lib/supabase';
import { log } from '@/src/lib/logger';

export type ReportReason =
  | 'inappropriate_username'
  | 'harassment'
  | 'spam'
  | 'impersonation'
  | 'other';

export const REPORT_REASONS: { id: ReportReason; label: string; description: string }[] = [
  { id: 'inappropriate_username', label: 'Inappropriate username', description: 'Offensive, vulgar, or abusive' },
  { id: 'harassment', label: 'Harassment', description: 'Targeted abuse through challenges or messages' },
  { id: 'spam', label: 'Spam', description: 'Excessive unwanted friend requests or challenges' },
  { id: 'impersonation', label: 'Impersonation', description: 'Pretending to be someone else' },
  { id: 'other', label: 'Other', description: "Doesn't fit the options above" },
];

export interface ReportResult {
  ok: boolean;
  /** True when the reporter has already submitted an active report
   *  against this user — the unique constraint blocks duplicates. */
  alreadyReported?: boolean;
  message?: string;
}

export async function reportUser(
  reporterId: string,
  reportedId: string,
  reason: ReportReason,
  details?: string,
): Promise<ReportResult> {
  if (reporterId === reportedId) {
    return { ok: false, message: "You can't report yourself." };
  }

  const { error } = await supabase.from('user_reports').insert({
    reporter_id: reporterId,
    reported_id: reportedId,
    reason,
    details: details?.trim() || null,
  });

  if (error) {
    // unique_violation — reporter already has an active report on this user.
    if ((error as { code?: string }).code === '23505') {
      return { ok: false, alreadyReported: true, message: 'You have already reported this user. Our team is reviewing.' };
    }
    log.supabaseError('reportUser', 'insert user_report', error, { reporterId, reportedId, reason });
    return { ok: false, message: 'Could not submit report. Please try again.' };
  }

  return { ok: true };
}
