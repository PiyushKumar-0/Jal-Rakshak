/**
 * JalRakshak AI — Village Water Risk Intelligence Platform
 * Hackathon Track: AI/ML + Sustainability / Open Innovation
 * Tagline: Predict water risks. Prioritize action. Protect villages.
 */

import { useState, useEffect } from 'react';
import { UserRole, AppLanguage, CitizenReport, AdvisoryBroadcast, SpatioTemporalCluster } from './types';
import { SHIVPUR_WARDS, SHIVPUR_ASSETS, getInitialReports, INITIAL_CLUSTERS, INITIAL_ADVISORIES } from './services/villageData';
import { calculateRiskAndPriority } from './services/aiIntelligence';
import { playAudioFeedback } from './services/speechService';
import { RoleHeader } from './components/RoleHeader';
import { CitizenView } from './components/CitizenView';
import { PanchayatCockpit } from './components/PanchayatCockpit';
import { FieldTeamView } from './components/FieldTeamView';
import { DistrictEvalView } from './components/DistrictEvalView';
import { DemoScriptModal } from './components/DemoScriptModal';
import { AuthModal } from './components/AuthModal';
import { UserProfile, getCurrentUserProfile } from './services/auth';
import { createWaterReport, fetchWaterReports, syncOfflineReports } from './services/reports';
import { createTask } from './services/tasks';
import { submitInspection } from './services/inspections';
import { submitCitizenFeedback } from './services/feedback';
import { isSupabaseConfigured } from './lib/supabase';
import { Shield, Droplets, CheckCircle2, Wifi, WifiOff } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('panchayat');
  const [language, setLanguage] = useState<AppLanguage>('hi');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [rainfallMm, setRainfallMm] = useState<number>(45);

  // Auth & Profile state
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Core village state
  const [wards, setWards] = useState(SHIVPUR_WARDS);
  const [assets] = useState(SHIVPUR_ASSETS);
  const [reports, setReports] = useState<CitizenReport[]>(() => getInitialReports());
  const [clusters, setClusters] = useState<SpatioTemporalCluster[]>(INITIAL_CLUSTERS);
  const [advisories, setAdvisories] = useState<AdvisoryBroadcast[]>(INITIAL_ADVISORIES);
  const [offlineDraftsCount, setOfflineDraftsCount] = useState<number>(0);

  // Demo script modal
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);

  const [appError, setAppError] = useState<string | null>(null);

  // Load initial Supabase data and User session
  useEffect(() => {
    async function loadInitialData() {
      if (isSupabaseConfigured) {
        const profile = await getCurrentUserProfile();
        if (profile) {
          setCurrentUser(profile);
          setCurrentRole(profile.role);
        }
        const dbReports = await fetchWaterReports();
        if (dbReports && dbReports.length > 0) {
          setReports(dbReports);
        }
      }
    }
    loadInitialData();
  }, []);

  // Track offline drafts count
  useEffect(() => {
    const drafts = reports.filter(r => r.isOfflineDraft).length;
    setOfflineDraftsCount(drafts);
  }, [reports]);

  // Handle citizen submitting a report
  const handleSubmitReport = async (partialReport: Partial<CitizenReport>) => {
    setAppError(null);
    const newId = `rep-${Date.now().toString().slice(-4)}`;
    const ward = wards.find(w => w.id === partialReport.wardId) || wards[2];
    const asset = assets.find(a => a.id === partialReport.assetId);

    // AI Risk calculation
    const riskScores = calculateRiskAndPriority({
      category: partialReport.category || 'smell_colour',
      text: partialReport.text || '',
      healthFlag: !!partialReport.healthFlag,
      affectedHouseholds: partialReport.affectedHouseholdsCount || 10,
      ward,
      asset,
      recentRainfallMm: rainfallMm,
      corroboratingReportsCount: 2,
      reporterTrustScore: 0.90,
      daysOpen: 1,
    });

    const newReport: CitizenReport = {
      id: newId,
      reporterHash: currentUser ? currentUser.id.slice(0, 8) : `usr_${Math.random().toString(36).substring(2, 8)}`,
      reporterName: currentUser ? currentUser.full_name : 'ग्रामीण नागरिक (वार्ड निवासी)',
      wardId: partialReport.wardId || 'ward-3',
      assetId: partialReport.assetId,
      category: partialReport.category || 'smell_colour',
      text: partialReport.text || '',
      transcript: partialReport.transcript || partialReport.text,
      language: 'hi',
      photoUrl: partialReport.photoUrl,
      healthFlag: !!partialReport.healthFlag,
      affectedHouseholdsCount: partialReport.affectedHouseholdsCount || 10,
      trustScore: 0.90,
      status: isOffline ? 'saved_offline' : 'under_review',
      createdAt: 'अभी-अभी (Just now)',
      isOfflineDraft: isOffline,
      riskScores,
      assignedTo: riskScores.priorityScore >= 70 ? 'विनोद कुमार (जल मिस्त्री)' : undefined,
      slaDueHours: riskScores.priorityScore >= 70 ? 4 : 8,
    };

    // Save to Supabase backend if online & configured
    if (!isOffline && isSupabaseConfigured) {
      const res = await createWaterReport({
        category: newReport.category,
        description: newReport.text,
        ward: newReport.wardId,
        sourceId: newReport.assetId,
        photoUrl: newReport.photoUrl,
        healthFlag: newReport.healthFlag,
        affectedHouseholdsCount: newReport.affectedHouseholdsCount,
        isOffline: false,
        userId: currentUser?.id,
      });

      if (res.error) {
        setAppError(res.error);
      } else if (res.data && res.data.id) {
        newReport.id = res.data.id;
      }
    }

    setReports(prev => [newReport, ...prev]);

    // If report has a health flag or high priority in Ward 3, update ward risk
    if (newReport.riskScores.priorityScore >= 75) {
      setWards(prevWards =>
        prevWards.map(w =>
          w.id === newReport.wardId
            ? {
                ...w,
                currentRiskScore: Math.min(100, w.currentRiskScore + 8),
                activeComplaints: w.activeComplaints + 1,
                healthFlagsCount: newReport.healthFlag ? w.healthFlagsCount + 1 : w.healthFlagsCount,
                status: 'high_risk',
              }
            : w
        )
      );
    }
  };

  // Sync offline queue when reconnecting
  const handleSyncOfflineQueue = async () => {
    playAudioFeedback('success');
    if (isSupabaseConfigured) {
      const offlineReports = reports.filter(r => r.isOfflineDraft);
      await syncOfflineReports(offlineReports);
    }
    setReports(prevReports =>
      prevReports.map(rep => {
        if (rep.isOfflineDraft) {
          return {
            ...rep,
            isOfflineDraft: false,
            status: 'under_review',
            syncedAt: 'अभी-अभी सिंक हुआ',
          };
        }
        return rep;
      })
    );
  };

  // Field team assigns task
  const handleAssignTask = async (reportId: string, assignee: string) => {
    if (isSupabaseConfigured) {
      await createTask({
        reportId,
        title: `Repair / Inspection task for ${reportId}`,
        assignedTo: undefined,
        priority: 'high',
      });
    }
    setReports(prev =>
      prev.map(r =>
        r.id === reportId
          ? {
              ...r,
              status: 'assigned',
              assignedTo: assignee,
              assignedAt: 'अभी आवंटित किया गया',
            }
          : r
      )
    );
  };

  // Field worker verifies and closes report
  const handleResolveReport = async (reportId: string, notes: string, testFindings?: string) => {
    if (isSupabaseConfigured) {
      await submitInspection({
        taskId: `task-${reportId}`,
        reportId,
        observations: notes,
        waterQualityStatus: testFindings || 'tested_safe',
      });
    }
    setReports(prev =>
      prev.map(r =>
        r.id === reportId
          ? {
              ...r,
              status: 'resolved',
              inspectionNotes: notes,
              resolvedAt: 'अभी सत्यापित व बंद',
            }
          : r
      )
    );

    // Reduce ward risk slightly
    setWards(prev =>
      prev.map(w => {
        const matchingReport = reports.find(r => r.id === reportId);
        if (matchingReport && matchingReport.wardId === w.id) {
          return {
            ...w,
            currentRiskScore: Math.max(20, w.currentRiskScore - 15),
            activeComplaints: Math.max(0, w.activeComplaints - 1),
          };
        }
        return w;
      })
    );
  };

  // Citizen confirms resolution or reopens
  const handleConfirmResolution = async (reportId: string, confirmed: boolean, comment?: string) => {
    playAudioFeedback('success');
    if (isSupabaseConfigured) {
      await submitCitizenFeedback({
        reportId,
        confirmed,
        comment,
        userId: currentUser?.id,
      });
    }
    setReports(prev =>
      prev.map(r =>
        r.id === reportId
          ? {
              ...r,
              citizenConfirmed: confirmed,
              status: confirmed ? 'resolved' : 'reopened',
              citizenComment: comment,
            }
          : r
      )
    );
  };

  // Send an advisory broadcast
  const handleSendAdvisory = (newAdv: Partial<AdvisoryBroadcast>) => {
    const adv: AdvisoryBroadcast = {
      id: `adv-${Date.now()}`,
      wardId: newAdv.wardId || 'ward-3',
      wardName: newAdv.wardName || 'Ward 3',
      title: newAdv.title || 'Water Alert',
      textHi: newAdv.textHi || '',
      textEn: newAdv.textEn || '',
      approvedBy: newAdv.approvedBy || 'सरपंच',
      sentAt: newAdv.sentAt || 'अभी-अभी',
      channel: newAdv.channel || 'speaker',
    };
    setAdvisories(prev => [adv, ...prev]);
  };

  const isHi = language === 'hi';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      
      <div>
        {/* Top Navbar with Role Switcher, Airplane Mode & Language */}
        <RoleHeader
          currentRole={currentRole}
          setCurrentRole={setCurrentRole}
          language={language}
          setLanguage={setLanguage}
          isOffline={isOffline}
          setIsOffline={setIsOffline}
          offlineDraftsCount={offlineDraftsCount}
          onOpenDemoScript={() => setIsDemoModalOpen(true)}
          activeClusterCount={clusters.filter(c => c.status === 'active').length}
          onSyncOfflineQueue={handleSyncOfflineQueue}
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        {appError && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs font-semibold shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span>{appError}</span>
              </div>
              <button
                onClick={() => setAppError(null)}
                className="text-rose-600 hover:text-rose-900 font-bold ml-2 px-2 py-0.5 rounded hover:bg-rose-100 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Main Content by Selected Role */}
        <main className="pb-12">
          {currentRole === 'citizen' && (
            <CitizenView
              language={language}
              wards={wards}
              assets={assets}
              reports={reports}
              isOffline={isOffline}
              onSubmitReport={handleSubmitReport}
              onConfirmResolution={handleConfirmResolution}
            />
          )}

          {currentRole === 'panchayat' && (
            <PanchayatCockpit
              language={language}
              wards={wards}
              reports={reports}
              assets={assets}
              clusters={clusters}
              advisories={advisories}
              rainfallMm={rainfallMm}
              setRainfallMm={setRainfallMm}
              onAssignTask={handleAssignTask}
              onSendAdvisory={handleSendAdvisory}
            />
          )}

          {currentRole === 'field' && (
            <FieldTeamView
              language={language}
              wards={wards}
              assets={assets}
              reports={reports}
              onResolveReport={handleResolveReport}
            />
          )}

          {currentRole === 'district' && (
            <DistrictEvalView
              language={language}
              wards={wards}
            />
          )}
        </main>
      </div>

      {/* 90-Second Demo Script Guide Modal */}
      <DemoScriptModal
        language={language}
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        onSelectRole={setCurrentRole}
        onToggleOffline={setIsOffline}
        onTriggerSampleReport={() => {
          handleSubmitReport({
            category: 'illness_cluster',
            wardId: 'ward-3',
            assetId: 'asset-hp-01',
            text: 'हैंडपंप से पीला व बदबूदार पानी आ रहा है और बच्चों की तबीयत खराब है।',
            healthFlag: true,
            affectedHouseholdsCount: 30,
          });
        }}
        onSetRainfall={setRainfallMm}
      />

      {/* Supabase Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={userProfile => {
          setCurrentUser(userProfile);
          if (userProfile?.role) {
            setCurrentRole(userProfile.role);
          }
        }}
        language={language}
      />

      {/* Footer & SDG Badges */}
      <footer className="bg-white border-t border-slate-200 py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
              JR
            </div>
            <div>
              <span className="font-bold text-slate-800">JalRakshak AI (जल रक्षक)</span> —{' '}
              <span>{isHi ? 'ग्राम जल जोखिम विश्लेषण एवं प्राथमिकता निर्णय प्रणाली' : 'Village Water Risk Intelligence Layer'}</span>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-semibold">
              SDG 6: Clean Water & Sanitation
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
              SDG 3: Good Health & Well-being
            </span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
              SDG 11: Resilient Communities
            </span>
          </div>

          <div className="text-slate-400 text-[11px]">
            Open Innovation Hackathon • AI/ML + Sustainability
          </div>
        </div>
      </footer>

    </div>
  );
}
