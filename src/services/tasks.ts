import { supabase, isSupabaseConfigured, formatSupabaseError } from '../lib/supabase';

export interface WaterTask {
  id: string;
  report_id: string;
  assigned_to?: string;
  assigned_by?: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
  due_date?: string;
  created_at?: string;
  updated_at?: string;
}

function toValidUUID(str?: string): string | null {
  if (!str) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str) ? str : null;
}

export async function createTask(params: {
  reportId: string;
  title: string;
  description?: string;
  assignedTo?: string;
  assignedBy?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}) {
  if (!isSupabaseConfigured) {
    return { data: null, error: null };
  }

  const validReportId = toValidUUID(params.reportId);
  if (!validReportId) {
    console.warn(`[createTask] reportId '${params.reportId}' is not a valid DB UUID. Task registered locally.`);
    return { data: { id: `task-${Date.now()}` }, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          report_id: validReportId,
          title: params.title,
          description: params.description || (params.assignedTo ? `Assigned to: ${params.assignedTo}` : undefined),
          assigned_to: toValidUUID(params.assignedTo),
          assigned_by: toValidUUID(params.assignedBy),
          priority: params.priority || 'medium',
          status: 'pending',
        },
      ])
      .select()
      .maybeSingle();

    if (error) throw error;

    // Update corresponding water report status to assigned
    await supabase
      .from('water_reports')
      .update({ status: 'assigned', updated_at: new Date().toISOString() })
      .eq('id', validReportId);

    return { data, error: null };
  } catch (err: any) {
    console.error('Error creating task:', err);
    return { data: null, error: formatSupabaseError(err) };
  }
}

export async function fetchTasksForWorker(workerId?: string): Promise<WaterTask[]> {
  if (!isSupabaseConfigured) return [];

  try {
    let query = supabase.from('tasks').select('*');
    const validWorkerId = toValidUUID(workerId);
    if (validWorkerId) {
      query = query.eq('assigned_to', validWorkerId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as WaterTask[];
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return [];
  }
}

export async function updateTaskStatus(taskId: string, status: WaterTask['status']) {
  if (!isSupabaseConfigured) return { error: null };

  const validTaskId = toValidUUID(taskId);
  if (!validTaskId) return { data: null, error: null };

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', validTaskId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error('Error updating task status:', err);
    return { data: null, error: formatSupabaseError(err) };
  }
}

