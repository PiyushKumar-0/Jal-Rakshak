import { supabase, isSupabaseConfigured, formatSupabaseError } from '../lib/supabase';

export interface CitizenFeedback {
  id: string;
  report_id: string;
  user_id?: string;
  rating?: number;
  resolved: boolean;
  comment?: string;
  created_at?: string;
}

function toValidUUID(str?: string): string | null {
  if (!str) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str) ? str : null;
}

export async function submitCitizenFeedback(params: {
  reportId: string;
  confirmed: boolean;
  comment?: string;
  rating?: number;
  userId?: string;
}) {
  if (!isSupabaseConfigured) {
    return { data: null, error: null };
  }

  const validReportId = toValidUUID(params.reportId);
  const validUserId = toValidUUID(params.userId);

  if (!validReportId) {
    console.warn(`[submitCitizenFeedback] reportId '${params.reportId}' is not a valid DB UUID.`);
    return { data: null, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('feedback')
      .insert([
        {
          report_id: validReportId,
          user_id: validUserId,
          resolved: params.confirmed,
          comment: params.comment || null,
          rating: params.rating || (params.confirmed ? 5 : 1),
        },
      ])
      .select()
      .maybeSingle();

    if (error) throw error;

    // If citizen indicates issue is NOT resolved, mark status as reopened
    if (!params.confirmed) {
      await supabase
        .from('water_reports')
        .update({ status: 'reopened', updated_at: new Date().toISOString() })
        .eq('id', validReportId);
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Error submitting feedback:', err);
    return { data: null, error: formatSupabaseError(err) };
  }
}

