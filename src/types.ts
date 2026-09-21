export type UserRole = 'citizen' | 'panchayat' | 'field' | 'district';
export type AppLanguage = 'hi' | 'en';

export type IssueCategory = 
  | 'smell_colour' 
  | 'low_supply' 
  | 'leakage' 
  | 'handpump_failure' 
  | 'illness_cluster' 
  | 'sewage_mixing';

export type ReportStatus = 
  | 'pending' 
  | 'saved_offline' 
  | 'under_review' 
  | 'assigned' 
  | 'verified' 
  | 'resolved' 
  | 'reopened';

export interface WardInfo {
  id: string;
  number: number;
  name: string;
  nameHi: string;
  population: number;
  households: number;
  vulnerabilityScore: number; // 0 to 1 (near schools, anganwadis, PHC)
  hasSchool: boolean;
  hasAnganwadi: boolean;
  hasHealthCenter: boolean;
  elevation: 'low_lying' | 'medium' | 'high';
  currentRiskScore: number; // 0 to 100
  activeComplaints: number;
  healthFlagsCount: number;
  status: 'normal' | 'moderate' | 'high_risk';
  coordinates: { lat: number; lng: number };
}

export interface WaterAsset {
  id: string;
  name: string;
  nameHi: string;
  type: 'handpump' | 'overhead_tank' | 'pipeline' | 'public_tap';
  wardId: string;
  qrCode: string;
  locationDescription: string;
  installYear: number;
  failureCount: number;
  lastInspectionDate: string;
  coordinates: { lat: number; lng: number };
}

export interface ReportRiskScore {
  qualityRisk: number; // 0-100
  supplyRisk: number; // 0-100
  infraRisk: number; // 0-100
  combinedRisk: number; // 0-100
  severity: number; // 0-100
  persistence: number; // 0-100
  reach: number; // 0-100
  vulnerability: number; // 0-1
  priorityScore: number; // 0-100 (capped)
  confidence: number; // 0 to 1
  actionRecommendation: string;
  actionRecommendationHi: string;
  reasonsEn: string[];
  reasonsHi: string[];
  fastTrack: boolean;
  needsVerificationFirst: boolean;
}

export interface CitizenReport {
  id: string; // UUID
  reporterHash: string;
  reporterName: string;
  wardId: string;
  assetId?: string;
  category: IssueCategory;
  text: string;
  transcript?: string;
  language: 'hi' | 'en' | 'hinglish';
  photoUrl?: string;
  healthFlag: boolean; // diarrhoea / vomiting / fever in household
  affectedHouseholdsCount: number;
  trustScore: number; // 0 to 1
  status: ReportStatus;
  createdAt: string;
  syncedAt?: string;
  isOfflineDraft?: boolean;
  riskScores: ReportRiskScore;
  clusterId?: string;
  // Field action
  assignedTo?: string;
  assignedAt?: string;
  slaDueHours?: number;
  isEscalated?: boolean;
  inspectionNotes?: string;
  inspectionProofUrl?: string;
  resolvedAt?: string;
  citizenConfirmed?: boolean | null;
  citizenComment?: string;
}

export interface SpatioTemporalCluster {
  id: string;
  wardId: string;
  wardName: string;
  title: string;
  titleHi: string;
  reportIds: string[];
  healthCasesCount: number;
  detectedAt: string;
  clusterScore: number; // 0-100
  status: 'active' | 'investigating' | 'contained';
  primaryIssue: IssueCategory;
  summaryHi: string;
  summaryEn: string;
}

export interface AdvisoryBroadcast {
  id: string;
  wardId: string;
  wardName: string;
  title: string;
  textHi: string;
  textEn: string;
  approvedBy: string;
  sentAt: string;
  channel: 'sms' | 'speaker' | 'pwa';
  readoutAudioUrl?: string;
}

export interface BaselineComparisonMetric {
  metricName: string;
  description: string;
  baselineValue: string;
  jalRakshakValue: string;
  improvement: string;
}
