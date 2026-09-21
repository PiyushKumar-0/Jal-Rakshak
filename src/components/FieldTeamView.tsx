import { useState } from 'react';
import { 
  CheckCircle2, 
  MapPin, 
  Camera, 
  Wrench, 
  FlaskConical, 
  Clock, 
  AlertTriangle,
  QrCode,
  FileCheck,
  Upload
} from 'lucide-react';
import { CitizenReport, WardInfo, WaterAsset, AppLanguage } from '../types';
import { playAudioFeedback } from '../services/speechService';

interface FieldTeamViewProps {
  language: AppLanguage;
  wards: WardInfo[];
  assets: WaterAsset[];
  reports: CitizenReport[];
  onResolveReport: (reportId: string, notes: string, testFindings?: string) => void;
}

export function FieldTeamView({
  language,
  wards,
  assets,
  reports,
  onResolveReport,
}: FieldTeamViewProps) {
  const isHi = language === 'hi';

  // Filter tasks assigned to field teams or high priority
  const assignedTasks = reports.filter(
    (r) => r.status === 'assigned' || r.status === 'under_review' || (r.riskScores.priorityScore >= 70 && r.status !== 'resolved')
  );

  const [selectedReportId, setSelectedReportId] = useState<string>(
    assignedTasks.length > 0 ? assignedTasks[0].id : ''
  );

  // Field Inspection Form State
  const [tdsPpm, setTdsPpm] = useState<number>(380);
  const [phLevel, setPhLevel] = useState<number>(7.2);
  const [chlorinePpm, setChlorinePpm] = useState<number>(0.1);
  const [turbidityLevel, setTurbidityLevel] = useState<'normal' | 'slight' | 'heavy_brown'>('heavy_brown');
  const [actionNotes, setActionNotes] = useState<string>(
    'हैंडपंप का वॉशर बदला गया, ब्लीचिंग पाउडर से क्लोरीनेशन किया गया। 15 मिनट पानी बहाकर परीक्षण किया गया।'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const currentTask = reports.find((r) => r.id === selectedReportId) || assignedTasks[0];
  const currentWard = currentTask ? wards.find((w) => w.id === currentTask.wardId) : null;
  const currentAsset = currentTask ? assets.find((a) => a.id === currentTask.assetId) : null;

  const handleCompleteInspection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTask) return;

    setIsSubmitting(true);
    playAudioFeedback('success');

    setTimeout(() => {
      const testSummary = `TDS: ${tdsPpm} ppm | pH: ${phLevel} | क्लोरीन: ${chlorinePpm} mg/L | मटमैलापन: ${turbidityLevel}`;
      onResolveReport(currentTask.id, actionNotes, testSummary);

      setIsSubmitting(false);
      setSuccessToast(
        isHi
          ? `मामला #${currentTask.id} सफलतापूर्वक सत्यापित एवं बंद किया गया। नागरिक को सूचना भेजी गई।`
          : `Task #${currentTask.id} verified and resolved. Citizen notified for closure confirmation.`
      );

      setTimeout(() => setSuccessToast(null), 4000);
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-900 font-bold">
            🔧
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">
              {isHi ? 'फील्ड टीम / जल मिस्त्री कार्यक्षेत्र' : 'Field Inspection & Verification Portal'}
            </h2>
            <p className="text-xs text-slate-500">
              {isHi
                ? 'लॉगिन: विनोद कुमार (जल मित्र, वार्ड 3 व 4) • ऑन-साइट परीक्षण और समाधान प्रविष्टि'
                : 'Worker: Vinod Kumar (Jal Mitra) • On-site water testing and resolution verification'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800">
            {assignedTasks.length} {isHi ? 'लंबित कार्य' : 'Active Tasks'}
          </span>
        </div>
      </div>

      {successToast && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Two Column Layout: Left Task List, Right Inspection & Closure Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Task List (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            {isHi ? 'आवंटित कार्य सूची (Assigned Tasks)' : 'Assigned Inspection Queue'}
          </h3>

          <div className="space-y-2.5">
            {assignedTasks.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                {isHi ? 'कोई लंबित कार्य नहीं है।' : 'No pending field tasks.'}
              </div>
            ) : (
              assignedTasks.map((task) => {
                const isSelected = selectedReportId === task.id;
                const ward = wards.find((w) => w.id === task.wardId);
                const asset = assets.find((a) => a.id === task.assetId);

                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => setSelectedReportId(task.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/50 ring-2 ring-sky-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">
                        #{task.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          task.riskScores.priorityScore >= 70
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        Priority {task.riskScores.priorityScore}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                      {task.text}
                    </p>

                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{isHi ? ward?.nameHi : ward?.name}</span>
                      {asset && <span>• [{asset.qrCode}]</span>}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Inspection Form (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          {currentTask ? (
            <form onSubmit={handleCompleteInspection} className="space-y-6">
              
              {/* Task Header Details */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 text-white text-xs font-bold">
                      #{currentTask.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">
                      {isHi ? currentWard?.nameHi : currentWard?.name}
                    </h3>
                  </div>

                  {currentTask.healthFlag && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      🚨 {isHi ? 'जलजनित बीमारी संदिग्ध' : 'Suspected Illness Cluster'}
                    </span>
                  )}
                </div>

                <p className="text-xs font-medium text-slate-800">
                  <strong>{isHi ? 'नागरिक शिकायत:' : 'Citizen Report:'}</strong> "{currentTask.text}"
                </p>

                {currentAsset && (
                  <div className="flex items-center gap-2 text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80">
                    <QrCode className="w-4 h-4 text-sky-600" />
                    <span>
                      स्रोत: <strong>[{currentAsset.qrCode}] {isHi ? currentAsset.nameHi : currentAsset.name}</strong> ({currentAsset.locationDescription})
                    </span>
                  </div>
                )}
              </div>

              {/* 1. Field Water Testing Kit Results */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <FlaskConical className="w-4 h-4 text-sky-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {isHi ? '1. ऑन-साइट जल गुणवत्ता परीक्षण (Field Test Kit Readings)' : '1. On-Site Water Test Kit Measurements'}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* TDS */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      TDS (कुल घुलित ठोस) ppm
                    </label>
                    <input
                      type="number"
                      value={tdsPpm}
                      onChange={(e) => setTdsPpm(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                      placeholder="e.g. 350"
                    />
                    <span className="text-[9px] text-slate-400 mt-1 block">मानक: &lt;500 ppm आदर्श</span>
                  </div>

                  {/* pH */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      pH मान (अम्लीय / क्षारीय)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={phLevel}
                      onChange={(e) => setPhLevel(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                      placeholder="e.g. 7.2"
                    />
                    <span className="text-[9px] text-slate-400 mt-1 block">मानक: 6.5 - 8.5 सुरक्षित</span>
                  </div>

                  {/* Residual Chlorine */}
                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      अवशिष्ट क्लोरीन (Chlorine) mg/L
                    </label>
                    <input
                      type="number"
                      step="0.05"
                      value={chlorinePpm}
                      onChange={(e) => setChlorinePpm(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white"
                      placeholder="e.g. 0.2"
                    />
                    <span className="text-[9px] text-slate-400 mt-1 block">मानक: 0.2 - 0.5 mg/L</span>
                  </div>
                </div>

                {/* Turbidity & Odor selector */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {isHi ? 'मटमैलापन एवं गंध परीक्षण:' : 'Visual Turbidity & Odor:'}
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setTurbidityLevel('normal')}
                      className={`p-2 rounded-lg border font-medium ${
                        turbidityLevel === 'normal'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      ✓ {isHi ? 'साफ एवं गंधहीन' : 'Clear & Odorless'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTurbidityLevel('slight')}
                      className={`p-2 rounded-lg border font-medium ${
                        turbidityLevel === 'slight'
                          ? 'border-amber-500 bg-amber-50 text-amber-800'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      ⚠️ {isHi ? 'हल्का मटमैला' : 'Slight Turbidity'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTurbidityLevel('heavy_brown')}
                      className={`p-2 rounded-lg border font-medium ${
                        turbidityLevel === 'heavy_brown'
                          ? 'border-rose-500 bg-rose-50 text-rose-800'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      🚨 {isHi ? 'गंदा / पीला / दुर्गंधयुक्त' : 'Severe Color / Stench'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. Action Taken & Repair Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-sky-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    {isHi ? '2. की गई कार्यवाही व समाधान का विवरण' : '2. Corrective Action & Repair Notes'}
                  </h4>
                </div>
                <textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-sky-500 bg-white"
                  placeholder="पाइपलाइन मरम्मत, ब्लीचिंग पाउडर क्लोरीनेशन, वॉशर बदलना आदि..."
                  required
                />
              </div>

              {/* 3. Proof Attachment Simulation */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-slate-600" />
                  <span className="text-slate-700 font-medium">
                    {isHi ? 'मरम्मत उपरांत फोटो प्रमाण: संलग्न' : 'After-repair photo evidence: Attached'}
                  </span>
                </div>
                <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded">
                  ✓ Geotagged (25.318° N, 82.978° E)
                </span>
              </div>

              {/* Submit & Close Loop Button */}
              <div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>
                    {isHi
                      ? 'सत्यापित कर मामला बंद करें (Close Loop with Verification)'
                      : 'Mark Verified & Resolved (Notify Citizen)'}
                  </span>
                </button>
                <p className="text-center text-[11px] text-slate-400 mt-2">
                  {isHi
                    ? 'समाधान बंद होने पर नागरिक को पुष्टि हेतु संदेश भेजा जाता है।'
                    : 'Resolution triggers citizen confirmation to prevent fake closures.'}
                </p>
              </div>

            </form>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              {isHi ? 'बाईं ओर से कोई कार्य चुनें।' : 'Select a task from the left list.'}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
