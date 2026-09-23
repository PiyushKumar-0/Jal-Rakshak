import { supabase, isSupabaseConfigured, formatSupabaseError } from '../lib/supabase';
import { CitizenReport, IssueCategory, ReportStatus } from '../types';
import { calculateAndSaveRiskScore } from './risk';

export interface WaterReportDB {
  id: string;
  user_id?: string;
  source_id?: string;
  issue_category: string;
  description: string;
  language: string;
  severity: number;
  latitude?: number;
  longitude?: number;
  village: string;
  ward: string;
  photo_url?: string;
  offline_created: boolean;
  status: string;
  verification_status: string;
  created_at?: string;
  updated_at?: string;
}

function toValidUUID(str?: string): string | null {
  if (!str) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str) ? str : null;
}

export async function createWaterReport(params: {
  category: IssueCategory;
  description: string;
  ward: string;
  village?: string;
  sourceId?: string;
  photoUrl?: string;
  healthFlag?: boolean;
  affectedHouseholdsCount?: number;
  language?: string;
  isOffline?: boolean;
  userId?: string;
}) {
  if (!isSupabaseConfigured) {
    console.log('Supabase offline/mock mode: report registered locally');
    return { data: null, error: null };
  }

  try {
    const reportData = {
      user_id: toValidUUID(params.userId),
      source_id: toValidUUID(params.sourceId),
      issue_category: params.category,
      description: params.description,
      language: params.language || 'hi',
      severity: params.healthFlag ? 4 : 2,
      village: params.village || 'Shivpur',
      ward: params.ward,
      photo_url: params.photoUrl || null,
      offline_created: Boolean(params.isOffline),
      status: params.isOffline ? 'saved_offline' : 'under_review',
      verification_status: 'unverified',
    };

    const { data, error } = await supabase
      .from('water_reports')
      .insert([reportData])
      .select()
      .single();

    if (error) throw error;

    // Trigger Risk Score Calculation & Storage
    if (data && data.id) {
      await calculateAndSaveRiskScore({
        reportId: data.id,
        category: params.category,
        description: params.description,
        ward: params.ward,
        healthFlag: Boolean(params.healthFlag),
        affectedHouseholds: params.affectedHouseholdsCount || 10,
      });
    }

    return { data, error: null };
  } catch (err: any) {
    console.error('Error creating water report:', err);
    return { data: null, error: formatSupabaseError(err) };
  }
}

export async function fetchWaterReports(): Promise<CitizenReport[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('water_reports')
      .select(`
        *,
        risk_scores (*)
      `)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((item: any) => {
      const risk = item.risk_scores && item.risk_scores[0];
      return {
        id: item.id,
        reporterHash: item.user_id ? item.user_id.slice(0, 8) : 'anon',
        reporterName: 'ग्रामीण नागरिक (वार्ड निवासी)',
        wardId: item.ward || 'ward-3',
        assetId: item.source_id,
        category: item.issue_category as IssueCategory,
        text: item.description || '',
        transcript: item.description,
        language: item.language || 'hi',
        photoUrl: item.photo_url,
        healthFlag: item.severity >= 4,
        affectedHouseholdsCount: 15,
        trustScore: 0.9,
        status: item.status as ReportStatus,
        createdAt: item.created_at ? new Date(item.created_at).toLocaleTimeString() : 'हाल ही में',
        isOfflineDraft: item.offline_created,
        riskScores: risk ? {
          qualityRisk: Number(risk.severity_factor) || 50,
          supplyRisk: Number(risk.frequency_factor) || 30,
          infraRisk: Number(risk.recurrence_factor) || 30,
          combinedRisk: Number(risk.risk_score) || 50,
          severity: Number(risk.severity_factor) || 50,
          persistence: Number(risk.persistence_factor) || 30,
          reach: Number(risk.reach_factor) || 30,
          vulnerability: 0.5,
          priorityScore: Math.round(Number(risk.risk_score)) || 50,
          confidence: Number(risk.confidence) || 0.7,
          actionRecommendation: risk.explanation?.actionRecommendation || 'निरीक्षण किट भेजें',
          actionRecommendationHi: risk.explanation?.actionRecommendationHi || 'निरीक्षण किट भेजें',
          reasonsEn: risk.explanation?.reasonsEn || [],
          reasonsHi: risk.explanation?.reasonsHi || [],
          fastTrack: Number(risk.risk_score) >= 75,
          needsVerificationFirst: false,
        } : {
          qualityRisk: 50,
          supplyRisk: 30,
          infraRisk: 30,
          combinedRisk: 50,
          severity: 50,
          persistence: 30,
          reach: 30,
          vulnerability: 0.5,
          priorityScore: 50,
          confidence: 0.7,
          actionRecommendation: 'स्रोत की जांच करें',
          actionRecommendationHi: 'स्रोत की जांच करें',
          reasonsEn: [],
          reasonsHi: [],
          fastTrack: false,
          needsVerificationFirst: false,
        },
      };
    });
  } catch (err) {
    console.error('Error fetching water reports:', err);
    return [];
  }
}

export async function uploadReportPhoto(file: File): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const fileExt = file.name.split('.').pop() || 'jpeg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    const filePath = `reports/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('report-images')
      .upload(filePath, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('report-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  } catch (err) {
    console.error('Error uploading photo:', err);
    return null;
  }
}

export async function syncOfflineReports(reports: Partial<CitizenReport>[]) {
  if (!isSupabaseConfigured) return { synced: 0 };

  let count = 0;
  for (const rep of reports) {
    if (rep.isOfflineDraft && rep.category && rep.wardId) {
      const res = await createWaterReport({
        category: rep.category,
        description: rep.text || '',
        ward: rep.wardId,
        healthFlag: rep.healthFlag,
        affectedHouseholdsCount: rep.affectedHouseholdsCount,
        photoUrl: rep.photoUrl,
        isOffline: false,
      });
      if (res.data) count++;
    }
  }
  return { synced: count };
}

