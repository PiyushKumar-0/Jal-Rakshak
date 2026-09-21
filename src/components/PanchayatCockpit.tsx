import { useState } from 'react';
import { 
  AlertOctagon, 
  MapPin, 
  Volume2, 
  VolumeX, 
  Send, 
  Radio, 
  Sliders, 
  CloudRain, 
  CheckCircle, 
  Clock, 
  UserCheck, 
  ShieldAlert, 
  Filter,
  Sparkles,
  Info
} from 'lucide-react';
import { WardInfo, CitizenReport, WaterAsset, SpatioTemporalCluster, AdvisoryBroadcast, AppLanguage } from '../types';
import { speakAloud, stopSpeaking, playAudioFeedback } from '../services/speechService';

interface PanchayatCockpitProps {
  language: AppLanguage;
  wards: WardInfo[];
  reports: CitizenReport[];
  assets: WaterAsset[];
  clusters: SpatioTemporalCluster[];
  advisories: AdvisoryBroadcast[];
  rainfallMm: number;
  setRainfallMm: (val: number) => void;
  onAssignTask: (reportId: string, assignee: string) => void;
  onSendAdvisory: (advisory: Partial<AdvisoryBroadcast>) => void;
}

export function PanchayatCockpit({
  language,
  wards,
  reports,
  assets,
  clusters,
  advisories,
  rainfallMm,
  setRainfallMm,
  onAssignTask,
  onSendAdvisory,
}: PanchayatCockpitProps) {
  const isHi = language === 'hi';

  const [selectedWardFilter, setSelectedWardFilter] = useState<string>('all');
  const [speakingReportId, setSpeakingReportId] = useState<string | null>(null);
  const [showAdvisoryModal, setShowAdvisoryModal] = useState<boolean>(false);

  // Field worker assignment state
  const [assigneeModalReport, setAssigneeModalReport] = useState<CitizenReport | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string>('विनोद कुमार (जल मिस्त्री)');

  // New advisory inputs
  const [advisoryWardId, setAdvisoryWardId] = useState<string>('ward-3');
  const [advisoryTextHi, setAdvisoryTextHi] = useState<string>(
    'ग्राम पंचायत शिवपुर सूचना: वार्ड 3 के सभी निवासी ध्यान दें! हैंडपंप #1 के पानी में संदूषण की आशंका है। कृपया पानी को 10 मिनट उबालकर ही पिएं।'
  );
  const [advisoryTextEn, setAdvisoryTextEn] = useState<string>(
    'Gram Panchayat Shivpur Advisory: Residents of Ward 3, please boil all drinking water for at least 10 minutes due to heavy rain contamination risk.'
  );

  // Sort reports by Priority Score (Section 5.3)
  const sortedReports = [...reports].sort((a, b) => {
    return b.riskScores.priorityScore - a.riskScores.priorityScore;
  });

  const filteredReports = selectedWardFilter === 'all'
    ? sortedReports
    : sortedReports.filter(r => r.wardId === selectedWardFilter);

  // Top metric computations
  const openHighRiskCount = reports.filter(r => r.riskScores.priorityScore >= 70 && r.status !== 'resolved').length;
  const flaggedWardsCount = wards.filter(w => w.status === 'high_risk' || (rainfallMm > 60 && w.elevation === 'low_lying')).length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;
  const closureRate = reports.length > 0 ? Math.round((resolvedCount / reports.length) * 100) : 0;

  // Overall village risk (combining ward risks and rainfall)
  const baseVillageRisk = 68;
  const rainImpact = Math.round(rainfallMm * 0.22);
  const villageOverallRisk = Math.min(98, baseVillageRisk + rainImpact);

  const handleReadAloud = (report: CitizenReport) => {
    if (speakingReportId === report.id) {
      stopSpeaking();
      setSpeakingReportId(null);
      return;
    }

    playAudioFeedback('record_start');
    setSpeakingReportId(report.id);

    const textToSpeak = isHi
      ? `प्राथमिकता स्कोर ${report.riskScores.priorityScore}। ${report.riskScores.reasonsHi.join('. ')}। अनुशंसित कार्यवाही: ${report.riskScores.actionRecommendationHi}`
      : `Priority Score ${report.riskScores.priorityScore}. ${report.riskScores.reasonsEn.join('. ')}. Recommended action: ${report.riskScores.actionRecommendation}`;

    speakAloud(textToSpeak, language, () => {
      setSpeakingReportId(null);
    });
  };

  const handleConfirmAssignment = () => {
    if (assigneeModalReport) {
      onAssignTask(assigneeModalReport.id, selectedWorker);
      playAudioFeedback('success');
      setAssigneeModalReport(null);
    }
  };

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ward = wards.find(w => w.id === advisoryWardId);
    onSendAdvisory({
      wardId: advisoryWardId,
      wardName: ward?.name || 'All Wards',
      title: 'Emergency Water Boil Alert',
      textHi: advisoryTextHi,
      textEn: advisoryTextEn,
      approvedBy: isHi ? 'सरपंच श्रीमती शांति देवी' : 'Sarpanch Smt. Shanti Devi',
      channel: 'speaker',
      sentAt: 'Just now (SMS & लाउडस्पीकर)',
    });
    playAudioFeedback('alert');
    setShowAdvisoryModal(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* TOP STRIP: VILLAGE OVERVIEW METRICS (Explicitly labeled demo data) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-100 text-sky-800 font-bold">
              🏛️
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">
                {isHi ? 'ग्राम पंचायत निर्णय कॉकपिट — शिवपुर' : 'Panchayat Decision Cockpit — Shivpur'}
              </h2>
              <p className="text-xs text-slate-500">
                {isHi
                  ? 'निर्णय परत (Decision Layer): केवल शिकायतों का ढेर नहीं, बल्कि क्या और क्यों ठीक करना है'
                  : 'Decision Layer: Prioritizes what to fix first, why, and tracks closed-loop resolution'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              {isHi ? 'प्रोटोटाइप डेटा (Simulated Data)' : 'Demo Simulated Data'}
            </span>
            <button
              type="button"
              onClick={() => setShowAdvisoryModal(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{isHi ? 'वार्ड एडवाइजरी जारी करें' : 'Issue Ward Advisory'}</span>
            </button>
          </div>
        </div>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          
          {/* Metric 1: Overall Risk */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {isHi ? 'ग्राम समग्र जल जोखिम' : 'Village Risk Score'}
              </span>
              <AlertOctagon className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-display text-rose-600">
                {villageOverallRisk}/100
              </span>
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                {isHi ? 'अति-संवेदनशील' : 'High Alert'}
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${villageOverallRisk}%` }}
              />
            </div>
          </div>

          {/* Metric 2: Open High Risk Issues */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {isHi ? 'खुले उच्च-जोखिम मामले' : 'Open High-Risk Issues'}
              </span>
              <ShieldAlert className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-display text-slate-900">
                {openHighRiskCount}
              </span>
              <span className="text-xs text-slate-500">
                {isHi ? 'शीर्ष प्राथमिकता' : 'Prioritized queue'}
              </span>
            </div>
            <p className="text-[11px] text-amber-700 mt-1">
              {isHi ? 'वार्ड 3 में तत्काल हस्तक्षेप आवश्यक' : 'Immediate intervention in Ward 3'}
            </p>
          </div>

          {/* Metric 3: Wards Flagged */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {isHi ? 'चिन्हित संवेदनशील वार्ड' : 'Wards Flagged'}
              </span>
              <MapPin className="w-4 h-4 text-sky-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-display text-slate-900">
                {flaggedWardsCount} / {wards.length}
              </span>
              <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                Ward 3 & 4
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {isHi ? 'निचले इलाके + बारिश रिसाव' : 'Low-elevation runoff zones'}
            </p>
          </div>

          {/* Metric 4: Closure Rate */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {isHi ? 'सत्यापित समाधान दर' : 'Verified Closure Rate'}
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-display text-emerald-600">
                {closureRate}%
              </span>
              <span className="text-xs text-slate-500">
                {resolvedCount} {isHi ? 'हल हुए' : 'closed'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-700 mt-1">
              {isHi ? 'नागरिक फीडबैक द्वारा सत्यापित' : 'Confirmed with citizen feedback'}
            </p>
          </div>

        </div>
      </div>

      {/* MONSOON WHAT-IF SIMULATOR WIDGET (Differentiator #2 from plan) */}
      <div className="bg-gradient-to-r from-sky-900 via-slate-900 to-blue-950 text-white rounded-2xl p-5 shadow-md border border-sky-800/60">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CloudRain className="w-5 h-5 text-sky-400" />
              <h3 className="text-sm font-bold font-display tracking-tight text-sky-100">
                {isHi ? 'मानसून सिमुलेटर (What-If Rainfall Impact)' : 'What-If Monsoon Rainfall Simulator'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Open-Meteo API Sync
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {isHi
                ? 'स्लाइडर खिसकाकर देखें कि भारी बारिश से निचले वार्डों (वार्ड 3 व 4) में संदूषण का जोखिम कैसे अचानक बढ़ता है।'
                : 'Drag rainfall slider to observe real-time spatial risk spikes and groundwater infiltration in low-lying wards.'}
            </p>
          </div>

          <div className="w-full md:w-80 bg-slate-800/80 p-3.5 rounded-xl border border-slate-700 space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">
                {isHi ? '24 घंटे में वर्षा:' : '24h Rainfall:'}
              </span>
              <span className="font-bold font-mono text-sky-400 text-sm">
                {rainfallMm} mm
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={120}
              value={rainfallMm}
              onChange={(e) => setRainfallMm(Number(e.target.value))}
              className="w-full accent-sky-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0mm (सूखा)</span>
              <span>45mm (सामान्य)</span>
              <span>90mm+ (अतिवृष्टि)</span>
            </div>
          </div>
        </div>
      </div>

      {/* TWO-COLUMN COCKPIT LAYOUT: LEFT = WARD HEATMAP, RIGHT = SOLVE FIRST QUEUE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: INTERACTIVE WARD RISK HEATMAP (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-display flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-sky-600" />
                <span>{isHi ? 'वार्ड जोखिम हीटमैप (Spatial Heatmap)' : 'Ward Risk Heatmap & Assets'}</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                {isHi ? 'ग्राम शिवपुर के 6 वार्डों का भौगोलिक जोखिम स्तर' : 'Real-time polygon risk mapping for 6 wards'}
              </p>
            </div>

            {/* Ward Filter */}
            <select
              value={selectedWardFilter}
              onChange={(e) => setSelectedWardFilter(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium"
            >
              <option value="all">{isHi ? 'सभी वार्ड (All)' : 'All Wards'}</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>
                  {isHi ? w.nameHi : w.name}
                </option>
              ))}
            </select>
          </div>

          {/* ACTIVE OUTBREAK CLUSTER CARD IF PRESENT */}
          {clusters.map((cluster) => (
            <div
              key={cluster.id}
              className="bg-rose-50 border-2 border-rose-500 rounded-xl p-3.5 space-y-2 relative overflow-hidden shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white animate-pulse">
                  <AlertOctagon className="w-3 h-3" />
                  <span>{isHi ? 'सक्रिय संदूषण क्लस्टर' : 'Active Outbreak Cluster'}</span>
                </span>
                <span className="text-[11px] font-bold text-rose-800">
                  {cluster.wardName}
                </span>
              </div>
              <h4 className="text-xs font-bold text-rose-950">
                {isHi ? cluster.titleHi : cluster.title}
              </h4>
              <p className="text-[11px] text-rose-900 leading-relaxed">
                {isHi ? cluster.summaryHi : cluster.summaryEn}
              </p>
              <div className="flex items-center justify-between text-[10px] text-rose-700 pt-1 border-t border-rose-200/80 font-medium">
                <span>{isHi ? 'बीमारी के मामले:' : 'Reported Illness:'} <strong>{cluster.healthCasesCount} परिवार</strong></span>
                <span>{cluster.detectedAt}</span>
              </div>
            </div>
          ))}

          {/* WARD MAP CARDS GRID (Visual Geo Representation) */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {wards.map((ward) => {
              // Dynamically elevate risk if rainfall is high
              const rainElevationFactor = (rainfallMm > 50 && ward.elevation === 'low_lying') ? 18 : 0;
              const effectiveRisk = Math.min(100, ward.currentRiskScore + rainElevationFactor);
              const isHigh = effectiveRisk >= 65;
              const isModerate = effectiveRisk >= 35 && effectiveRisk < 65;
              const isSelected = selectedWardFilter === ward.id;

              return (
                <button
                  key={ward.id}
                  type="button"
                  onClick={() => setSelectedWardFilter(selectedWardFilter === ward.id ? 'all' : ward.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'ring-2 ring-sky-600 shadow-md'
                      : 'hover:shadow-xs'
                  } ${
                    isHigh
                      ? 'bg-rose-50/70 border-rose-300 text-rose-950'
                      : isModerate
                      ? 'bg-amber-50/60 border-amber-300 text-amber-950'
                      : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">
                      {isHi ? ward.nameHi : ward.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isHigh
                          ? 'bg-rose-600 text-white'
                          : isModerate
                          ? 'bg-amber-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {effectiveRisk}/100
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-600 space-y-0.5">
                    <div>जनसंख्या: <strong>{ward.population}</strong> ({ward.households} घर)</div>
                    <div>सक्रिय शिकायतें: <strong>{ward.activeComplaints}</strong></div>
                    {ward.hasSchool && <span className="inline-block mr-1 text-[9px] bg-slate-200 px-1 rounded">स्कूल</span>}
                    {ward.hasAnganwadi && <span className="inline-block text-[9px] bg-slate-200 px-1 rounded">आंगनवाड़ी</span>}
                  </div>

                  {ward.elevation === 'low_lying' && (
                    <div className="mt-1.5 text-[9px] font-bold text-rose-700 flex items-center gap-1">
                      <span>⚠️ निचला इलाका (जलभराव)</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* ASSET STATUS LIST */}
          <div className="pt-2 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-700 block mb-2">
              {isHi ? 'QR-टैग किए गए ग्राम जल स्रोत (Asset Telemetry):' : 'Monitored Assets & History:'}
            </span>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {assets.map((asset) => (
                <div
                  key={asset.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/70 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-800">
                      [{asset.qrCode}] {isHi ? asset.nameHi : asset.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {asset.locationDescription}
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        asset.failureCount >= 3
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {asset.failureCount} {isHi ? 'बार खराब' : 'failures'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: 'SOLVE FIRST' RANKED PRIORITY QUEUE (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  {isHi ? 'प्राथमिकता कार्य सूची (Solve First Queue)' : "'Solve First' Priority Decision Queue"}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                  {isHi ? 'सूत्र: जोखिम × गंभीरता × पुनरावृत्ति' : 'Formula Weighted Ranking'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isHi
                  ? 'पारदर्शी AI निर्णय: केवल शिकायत संख्या नहीं, बल्कि स्वास्थ्य जोखिम व संवेदनशीलता के आधार पर क्रमबद्ध'
                  : 'Explainable prioritization: Ranked by risk, severity, persistence & vulnerability with read-aloud support'}
              </p>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              {filteredReports.length} {isHi ? 'मामले' : 'items'}
            </div>
          </div>

          {/* RANKED LIST ITEMS */}
          <div className="space-y-3.5">
            {filteredReports.map((report, index) => {
              const ward = wards.find((w) => w.id === report.wardId);
              const asset = assets.find((a) => a.id === report.assetId);
              const isSpeaking = speakingReportId === report.id;

              return (
                <div
                  key={report.id}
                  className={`rounded-xl border p-4 transition-all relative ${
                    index === 0
                      ? 'border-rose-400 bg-rose-50/30 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Top Bar with Rank # and Priority Score */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center">
                        #{index + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {isHi ? ward?.nameHi : ward?.name}
                      </span>
                      {report.healthFlag && (
                        <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                          🚨 {isHi ? 'स्वास्थ्य चेतावनी' : 'Health Outbreak Flag'}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Priority Score Badge */}
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          report.riskScores.priorityScore >= 70
                            ? 'bg-rose-100 text-rose-900 border border-rose-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {isHi ? 'प्राथमिकता:' : 'Priority:'} {report.riskScores.priorityScore}/100
                      </span>

                      {/* Confidence Badge */}
                      <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                        {isHi ? 'विश्वास:' : 'Conf:'} {Math.round(report.riskScores.confidence * 100)}%
                        {report.riskScores.fastTrack && ' ⚡'}
                      </span>
                    </div>
                  </div>

                  {/* Issue Text */}
                  <p className="text-sm font-semibold text-slate-900 mb-1">
                    "{report.text}"
                  </p>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
                    <span>
                      {isHi ? 'दर्जकर्ता:' : 'Reporter:'} <strong>{report.reporterName}</strong>
                    </span>
                    <span>•</span>
                    <span>{report.createdAt}</span>
                    {asset && (
                      <>
                        <span>•</span>
                        <span>
                          स्रोत: <strong>[{asset.qrCode}] {isHi ? asset.nameHi : asset.name}</strong>
                        </span>
                      </>
                    )}
                  </div>

                  {/* EXPLAINABLE SHAP / RULE REASONS BOX */}
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                        <span>{isHi ? 'AI निर्णय के स्पष्ट कारण (Explainable Reasons):' : 'Explainable AI Decision Traces:'}</span>
                      </div>

                      {/* Speaker Read-Aloud Button */}
                      <button
                        type="button"
                        onClick={() => handleReadAloud(report)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                          isSpeaking
                            ? 'bg-rose-600 text-white animate-pulse'
                            : 'bg-sky-100 text-sky-800 hover:bg-sky-200'
                        }`}
                        title="Read reason aloud using Hindi Text-to-Speech"
                      >
                        {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        <span>{isSpeaking ? (isHi ? 'बोल रहा है...' : 'Speaking...') : (isHi ? 'बोलकर सुनें' : 'Read Aloud')}</span>
                      </button>
                    </div>

                    <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-600 pl-1">
                      {(isHi ? report.riskScores.reasonsHi : report.riskScores.reasonsEn).map((reason, rIdx) => (
                        <li key={rIdx}>{reason}</li>
                      ))}
                    </ul>

                    {/* Recommended Action */}
                    <div className="pt-1.5 border-t border-slate-200/70 text-[11px]">
                      <span className="font-bold text-slate-800">
                        {isHi ? 'अनुशंसित कार्यवाही:' : 'Recommended Action:'}{' '}
                      </span>
                      <span className="font-medium text-sky-900">
                        {isHi ? report.riskScores.actionRecommendationHi : report.riskScores.actionRecommendation}
                      </span>
                    </div>
                  </div>

                  {/* ACTION BUTTONS: ASSIGN & SLA */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">
                        {isHi ? 'स्थिति:' : 'Status:'}
                      </span>
                      <span className="font-bold text-slate-800">
                        {report.status === 'assigned'
                          ? `${isHi ? 'तैनात:' : 'Assigned:'} ${report.assignedTo}`
                          : report.status === 'resolved'
                          ? `✓ ${isHi ? 'हल हुआ' : 'Resolved'}`
                          : `${isHi ? 'अनावंटित (Unassigned)' : 'Unassigned'}`}
                      </span>
                      {report.slaDueHours && report.status !== 'resolved' && (
                        <span className="flex items-center gap-1 text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
                          <Clock className="w-3 h-3" />
                          <span>SLA: {report.slaDueHours} {isHi ? 'घंटे शेष' : 'hours'}</span>
                        </span>
                      )}
                    </div>

                    {report.status !== 'resolved' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAssigneeModalReport(report);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{isHi ? 'फील्ड वर्कर को सौंपें' : 'Assign to Field Team'}</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ASSIGNMENT MODAL */}
      {assigneeModalReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 font-display">
                {isHi ? 'फील्ड निरीक्षण दल को कार्य सौंपें' : 'Assign Field Inspection Task'}
              </h3>
              <button
                type="button"
                onClick={() => setAssigneeModalReport(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              मामला #{assigneeModalReport.id}: "{assigneeModalReport.text}"
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isHi ? 'जल मित्र / मिस्त्री चुनें:' : 'Select Field Worker:'}
              </label>
              <select
                value={selectedWorker}
                onChange={(e) => setSelectedWorker(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 bg-white"
              >
                <option value="विनोद कुमार (जल मिस्त्री)">विनोद कुमार (जल मिस्त्री - वार्ड 3)</option>
                <option value="सुरेश यादव (प्लम्बर दल)">सुरेश यादव (प्लम्बर दल - वार्ड 1)</option>
                <option value="राजेश पटेल (जल गुणवत्ता परीक्षक)">राजेश पटेल (फील्ड वाटर टेस्टिंग किट)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssigneeModalReport(null)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
              >
                {isHi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignment}
                className="flex-1 py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
              >
                {isHi ? 'कार्य सौंपें (Assign)' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CITIZEN ADVISORY BROADCAST MODAL */}
      {showAdvisoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleBroadcastSubmit} className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900 font-display">
                  {isHi ? 'वार्ड नागरिक सुरक्षा एडवाइजरी जारी करें' : 'Broadcast Ward Water Advisory'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAdvisoryModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              {isHi
                ? 'सरपंच द्वारा अधिकृत संदेश तुरंत लाउडस्पीकर एवं नागरिकों के मोबाइल पर भेजा जाएगा।'
                : 'Approved announcement broadcasted via SMS, PWA, and village speaker.'}
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isHi ? 'लक्षित वार्ड चुनें:' : 'Target Ward:'}
              </label>
              <select
                value={advisoryWardId}
                onChange={(e) => setAdvisoryWardId(e.target.value)}
                className="w-full p-2 text-xs rounded-xl border border-slate-300 bg-white"
              >
                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {isHi ? w.nameHi : w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isHi ? 'हिंदी संदेश (वॉइस ब्रॉडकास्ट हेतु):' : 'Hindi Announcement Message:'}
              </label>
              <textarea
                rows={3}
                value={advisoryTextHi}
                onChange={(e) => setAdvisoryTextHi(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl border border-slate-300"
                required
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAdvisoryModal(false)}
                className="flex-1 py-2 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
              >
                {isHi ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isHi ? 'संदेश प्रसारित करें' : 'Broadcast Advisory'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
