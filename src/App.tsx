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
import { Shield, Droplets, CheckCircle2, Wifi, WifiOff } from 'lucide-react';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('panchayat');
  const [language, setLanguage] = useState<AppLanguage>('hi');
  const [isOffline, setIsOffline] = useState<boolean>(false);
  const [rainfallMm, setRainfallMm] = useState<number>(45);

  // Core village state
  const [wards, setWards] = useState(SHIVPUR_WARDS);
  const [assets] = useState(SHIVPUR_ASSETS);
  const [reports, setReports] = useState<CitizenReport[]>(() => getInitialReports());
  const [clusters, setClusters] = useState<SpatioTemporalCluster[]>(INITIAL_CLUSTERS);
  const [advisories, setAdvisories] = useState<AdvisoryBroadcast[]>(INITIAL_ADVISORIES);
  const [offlineDraftsCount, setOfflineDraftsCount] = useState<number>(0);

  // Demo script modal
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);

  // Track offline drafts count
  useEffect(() => {
    const drafts = reports.filter(r => r.isOfflineDraft).length;
    setOfflineDraftsCount(drafts);
  }, [reports]);

  // Handle citizen submitting a report
  const handleSubmitReport = (partialReport: Partial<CitizenReport>) => {
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
      reporterHash: `usr_${Math.random().toString(36).substring(2, 8)}`,
      reporterName: 'ग्रामीण नागरिक (वार्ड निवासी)',
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
  const handleSyncOfflineQueue = () => {
    playAudioFeedback('success');
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
  const handleAssignTask = (reportId: string, assignee: string) => {
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
  const handleResolveReport = (reportId: string, notes: string, testFindings?: string) => {
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
  const handleConfirmResolution = (reportId: string, confirmed: boolean, comment?: string) => {
    playAudioFeedback('success');
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
        />

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
