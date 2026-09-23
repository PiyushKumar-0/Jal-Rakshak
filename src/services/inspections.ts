import { supabase, isSupabaseConfigured, formatSupabaseError } from '../lib/supabase';

export interface InspectionRecord {
  id: string;
  task_id: string;
  inspector_id?: string;
  result?: string;
  water_quality_status?: string;
  observations?: string;
  evidence_url?: string;
  verified: boolean;
  created_at?: string;
}

function toValidUUID(str?: string): string | null {
  if (!str) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str) ? str : null;
}

export async function submitInspection(params: {
  taskId: string;
  reportId: string;
  observations: string;
  waterQualityStatus?: string;
  evidenceUrl?: string;
  inspectorId?: string;
}) {
  if (!isSupabaseConfigured) {
    return { data: null, error: null };
  }

  try {
    let validTaskId = toValidUUID(params.taskId);
    const validReportId = toValidUUID(params.reportId);

    // If taskId is not a valid UUID but reportId is, search for task in DB
    if (!validTaskId && validReportId) {
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('report_id', validReportId)
        .maybeSingle();

      if (existingTask) {
        validTaskId = existingTask.id;
      }
    }

    let inspectionData = null;
    if (validTaskId) {
      const { data, error } = await supabase
        .from('inspections')
        .insert([
          {
            task_id: validTaskId,
            inspector_id: toValidUUID(params.inspectorId),
            observations: params.observations,
            water_quality_status: params.waterQualityStatus || 'tested_safe',
            evidence_url: params.evidenceUrl || null,
            verified: true,
          },
        ])
        .select()
        .maybeSingle();

      if (error) console.error('Inspection insert warning:', error);
      inspectionData = data;

      // Update task to completed
      await supabase
        .from('tasks')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', validTaskId);
    }

    // Update report status to resolved
    if (validReportId) {
      await supabase
        .from('water_reports')
        .update({ status: 'resolved', updated_at: new Date().toISOString() })
        .eq('id', validReportId);
    }

    return { data: inspectionData, error: null };
  } catch (err: any) {
    console.error('Error submitting inspection:', err);
    return { data: null, error: formatSupabaseError(err) };
  }
}

export async function uploadInspectionEvidence(file: File): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const fileExt = file.name.split('.').pop() || 'jpeg';
    const fileName = `${Date.now()}_evidence.${fileExt}`;
    const filePath = `evidence/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('inspection-evidence')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('inspection-evidence')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Error uploading evidence photo:', err);
    return null;
  }
}

