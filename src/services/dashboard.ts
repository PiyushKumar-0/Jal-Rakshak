import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SHIVPUR_WARDS } from './villageData';

export interface DashboardStats {
  totalReports: number;
  openReports: number;
  assignedTasks: number;
  highRiskWardsCount: number;
  resolvedThisMonth: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  if (!isSupabaseConfigured) {
    return {
      totalReports: 18,
      openReports: 4,
      assignedTasks: 3,
      highRiskWardsCount: 2,
      resolvedThisMonth: 12,
    };
  }

  try {
    const { count: totalReports } = await supabase.from('water_reports').select('*', { count: 'exact', head: true });
    const { count: openReports } = await supabase.from('water_reports').select('*', { count: 'exact', head: true }).eq('status', 'open');
    const { count: assignedTasks } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    const { count: resolvedThisMonth } = await supabase.from('water_reports').select('*', { count: 'exact', head: true }).eq('status', 'resolved');

    return {
      totalReports: totalReports || 0,
      openReports: openReports || 0,
      assignedTasks: assignedTasks || 0,
      highRiskWardsCount: SHIVPUR_WARDS.filter(w => w.status === 'high_risk').length,
      resolvedThisMonth: resolvedThisMonth || 0,
    };
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    return {
      totalReports: 0,
      openReports: 0,
      assignedTasks: 0,
      highRiskWardsCount: 0,
      resolvedThisMonth: 0,
    };
  }
}
