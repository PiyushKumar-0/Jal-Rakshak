import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { calculateRiskAndPriority } from './aiIntelligence';
import { IssueCategory, ReportRiskScore } from '../types';
import { SHIVPUR_WARDS } from './villageData';

export interface ExplainableRiskOutput {
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reasons: string[];
  reasonsHi: string[];
  model_version: string;
}

function toValidUUID(str?: string): string | null {
  if (!str) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str) ? str : null;
}

export function determineRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score < 25) return 'low';
  if (score < 50) return 'medium';
  if (score < 75) return 'high';
  return 'critical';
}

export async function calculateAndSaveRiskScore(params: {
  reportId: string;
  category: IssueCategory;
  description: string;
  ward: string;
  healthFlag: boolean;
  affectedHouseholds: number;
  recentRainfallMm?: number;
}): Promise<ExplainableRiskOutput> {
  const targetWard = SHIVPUR_WARDS.find(w => w.id === params.ward) || SHIVPUR_WARDS[2];

  // Calculate using explainable rule-based engine v1
  const calculated: ReportRiskScore = calculateRiskAndPriority({
    category: params.category,
    text: params.description,
    healthFlag: params.healthFlag,
    affectedHouseholds: params.affectedHouseholds,
    ward: targetWard,
    recentRainfallMm: params.recentRainfallMm || 45,
    corroboratingReportsCount: 2,
    reporterTrustScore: 0.90,
  });

  const riskScoreNum = calculated.priorityScore;
  const riskLevel = determineRiskLevel(riskScoreNum);

  const output: ExplainableRiskOutput = {
    risk_score: riskScoreNum,
    risk_level: riskLevel,
    confidence: calculated.confidence,
    reasons: calculated.reasonsEn,
    reasonsHi: calculated.reasonsHi,
    model_version: 'rule-based-v1',
  };

  const validReportId = toValidUUID(params.reportId);
  if (isSupabaseConfigured && validReportId) {
    try {
      await supabase.from('risk_scores').insert([
        {
          report_id: validReportId,
          risk_score: riskScoreNum,
          risk_level: riskLevel,
          confidence: calculated.confidence,
          severity_factor: calculated.severity,
          frequency_factor: calculated.supplyRisk,
          recurrence_factor: calculated.infraRisk,
          persistence_factor: calculated.persistence,
          reach_factor: calculated.reach,
          explanation: {
            reasonsEn: calculated.reasonsEn,
            reasonsHi: calculated.reasonsHi,
            actionRecommendation: calculated.actionRecommendation,
            actionRecommendationHi: calculated.actionRecommendationHi,
          },
          model_version: 'rule-based-v1',
        },
      ]);
    } catch (err) {
      console.error('Error persisting risk score to database:', err);
    }
  }

  return output;
}

export async function getRiskScoreByReportId(reportId: string): Promise<ExplainableRiskOutput | null> {
  if (!isSupabaseConfigured) return null;

  const validReportId = toValidUUID(reportId);
  if (!validReportId) return null;

  try {
    const { data, error } = await supabase
      .from('risk_scores')
      .select('*')
      .eq('report_id', validReportId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      risk_score: Number(data.risk_score),
      risk_level: data.risk_level as any,
      confidence: Number(data.confidence),
      reasons: data.explanation?.reasonsEn || [],
      reasonsHi: data.explanation?.reasonsHi || [],
      model_version: data.model_version || 'rule-based-v1',
    };
  } catch (err) {
    console.error('Error fetching risk score:', err);
    return null;
  }
}

