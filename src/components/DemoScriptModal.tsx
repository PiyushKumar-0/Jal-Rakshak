import { useState } from 'react';
import { 
  Play, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  Sparkles, 
  Volume2, 
  WifiOff, 
  Sliders, 
  Radio, 
  MapPin,
  ExternalLink
} from 'lucide-react';
import { AppLanguage, UserRole } from '../types';

interface DemoScriptModalProps {
  language: AppLanguage;
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: UserRole) => void;
  onToggleOffline: (offline: boolean) => void;
  onTriggerSampleReport: () => void;
  onSetRainfall: (rainfall: number) => void;
}

export function DemoScriptModal({
  language,
  isOpen,
  onClose,
  onSelectRole,
  onToggleOffline,
  onTriggerSampleReport,
  onSetRainfall,
}: DemoScriptModalProps) {
  const isHi = language === 'hi';
  const [currentStep, setCurrentStep] = useState<number>(1);

  if (!isOpen) return null;

  const demoSteps = [
    {
      step: 1,
      title: 'Scan QR & Hindi Voice Report',
      titleHi: 'चरण 1: QR स्कैन एवं हिन्दी वाक् रिपोर्टिंग',
      action: 'Scan handpump QR on phone; speak in Hindi: "पानी में स्मेल आ रही है और रंग बदल गया है"',
      actionHi: 'हैंडपंप का QR स्कैन करें और हिन्दी में बोलें: "पानी में बदबू आ रही है और रंग बदल गया है"',
      whatJudgeSees: 'Asset and ward auto-filled; live speech transcript appears on screen.',
      whatJudgeSeesHi: 'स्रोत व वार्ड अपने आप भर जाता है; स्क्रीन पर लाइव वाक् प्रतिलेखन दिखता है।',
      role: 'citizen' as UserRole,
      actionBtn: 'नागरिक पोर्टल पर जाएं व नमूना भरें (Go to Citizen App)',
      execute: () => {
        onSelectRole('citizen');
        onToggleOffline(false);
      },
    },
    {
      step: 2,
      title: 'Airplane Mode & Instant Offline Safety Advice',
      titleHi: 'चरण 2: एयरप्लेन मोड व तात्कालिक ऑफलाइन जल सुरक्षा सलाह',
      action: 'Phone is in airplane mode; tap save.',
      actionHi: 'फोन को एयरप्लेन (ऑफलाइन) मोड में डालें और शिकायत सबमिट करें।',
      whatJudgeSees: '"Saved offline" badge plus instant on-device safety advice (boil water notice) before any network exists.',
      whatJudgeSeesHi: '"ऑफलाइन सुरक्षित" बैज और नेटवर्क के बिना ही तुरंत स्क्रीन पर पानी उबालने की सुरक्षा सलाह प्रकट होती है।',
      role: 'citizen' as UserRole,
      actionBtn: 'ऑफलाइन मोड चालू करें (Toggle Offline Airplane Mode)',
      execute: () => {
        onToggleOffline(true);
        onSelectRole('citizen');
      },
    },
    {
      step: 3,
      title: 'Restore Connectivity & Background Sync',
      titleHi: 'चरण 3: इंटरनेट बहाली व ऑटोमैटिक बैकग्राउंड सिंक',
      action: 'Turn network back on.',
      actionHi: 'इंटरनेट वापस चालू करें।',
      whatJudgeSees: 'Status instantly changes to "Synced" with idempotent ID; report flows into Panchayat AI pipeline.',
      whatJudgeSeesHi: 'स्टेटस तुरंत "सिंक हुआ" में बदल जाता है और रिपोर्ट पंचायत AI कॉकपिट में पहुंच जाती है।',
      role: 'citizen' as UserRole,
      actionBtn: 'इंटरनेट चालू करें (Go Online & Sync)',
      execute: () => {
        onToggleOffline(false);
      },
    },
    {
      step: 4,
      title: 'Panchayat Heatmap: Spatial Hotspot Flagged',
      titleHi: 'चरण 4: पंचायत हीटमैप पर संवेदनशील वार्ड लाल चिन्हित',
      action: 'Open Panchayat Decision Cockpit.',
      actionHi: 'पंचायत निर्णय कॉकपिट खोलें।',
      whatJudgeSees: 'Ward 3 turns high-risk alert; active illness cluster boundary pulses on the village map.',
      whatJudgeSeesHi: 'वार्ड 3 अति-संवेदनशील लाल रंग में बदल जाता है और संदूषण क्लस्टर पल्स करने लगता है।',
      role: 'panchayat' as UserRole,
      actionBtn: 'पंचायत कॉकपिट देखें (Open Cockpit)',
      execute: () => {
        onSelectRole('panchayat');
      },
    },
    {
      step: 5,
      title: '"Solve First" Queue with Hindi Voice Readback',
      titleHi: 'चरण 5: प्राथमिकता सूची में शीर्ष पर आना व हिन्दी वाक् वाचन',
      action: 'Inspect top issue in Solve First queue; tap speaker icon.',
      actionHi: 'प्राथमिकता सूची में शीर्ष मामले पर स्पीकर बटन दबाएं।',
      whatJudgeSees: 'Issue moves to #1; AI reads explainable reasons aloud in Hindi ("उच्च जोखिम: 3x शिकायतें व डायरिया...").',
      whatJudgeSeesHi: 'मामला #1 पर आ जाता है और AI हिन्दी में स्पष्ट कारण बोलकर समझाता है।',
      role: 'panchayat' as UserRole,
      actionBtn: 'प्राथमिकता सूची पर जाएं (View Solve First)',
      execute: () => {
        onSelectRole('panchayat');
      },
    },
    {
      step: 6,
      title: 'Drag What-If Monsoon Rainfall Slider',
      titleHi: 'चरण 6: मानसून सिमुलेटर स्लाइडर खिसकाएं',
      action: 'Drag the rainfall slider to 85mm.',
      actionHi: 'बारिश स्लाइडर को 85 मिमी तक ले जाएं।',
      whatJudgeSees: 'Ward contamination risk spikes dynamically with rainfall infiltration model; cluster expands.',
      whatJudgeSeesHi: 'बारिश के कारण निचले वार्डों में जोखिम स्कोर वास्तविक समय में उछल जाता है।',
      role: 'panchayat' as UserRole,
      actionBtn: 'बारिश 85mm सेट करें (Simulate 85mm Rain)',
      execute: () => {
        onSetRainfall(85);
        onSelectRole('panchayat');
      },
    },
    {
      step: 7,
      title: 'Assign Field Inspection & Close the Loop',
      titleHi: 'चरण 7: फील्ड जांच, वाटर टेस्टिंग व समाधान पुष्टि',
      action: 'Assign task to Jal Mitra; record water test & submit resolution.',
      actionHi: 'जल मित्र को काम सौंपें, TDS/pH जांच भरें और सत्यापित कर बंद करें।',
      whatJudgeSees: 'Citizen screen shows "Resolved"; resident can confirm or reopen with 1-tap feedback.',
      whatJudgeSeesHi: 'नागरिक के फोन पर "समाधान हुआ" दिखता है और नागरिक अपनी संतुष्टि की पुष्टि करता है।',
      role: 'field' as UserRole,
      actionBtn: 'फील्ड टीम पोर्टल खोलें (Go to Field Inspection)',
      execute: () => {
        onSelectRole('field');
      },
    },
    {
      step: 8,
      title: 'Evaluation Chart: 34.2 Hours Earlier Warning',
      titleHi: 'चरण 8: मूल्यांकन चार्ट — 34.2 घंटे पहले चेतावनी',
      action: 'Show District AI Evaluation dashboard.',
      actionHi: 'जिला स्तरीय मॉडल मूल्यांकन डैशबोर्ड दिखाएं।',
      whatJudgeSees: '"We detect biological clusters 34.2 hours earlier than traditional complaint-count threshold rules."',
      whatJudgeSeesHi: 'पारंपरिक व्यवस्था की तुलना में 34.2 घंटे पहले जलजनित प्रकोप की पहचान का प्रत्यक्ष प्रमाण।',
      role: 'district' as UserRole,
      actionBtn: 'मूल्यांकन डैशबोर्ड देखें (Open Evaluation)',
      execute: () => {
        onSelectRole('district');
      },
    },
  ];

  const activeStepData = demoSteps[currentStep - 1];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 text-amber-900 font-bold">
              🎯
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                {isHi ? '90-सेकंड लाइव डेमो स्क्रिप्ट (Live Demo Script)' : '90-Second Live Hackathon Demo Walkthrough'}
              </h3>
              <p className="text-xs text-slate-500">
                {isHi ? 'प्रोजेक्ट प्लान सेक्शन 10 पर आधारित सटीक डेमो क्रम' : 'Directly from Section 10 of the official Blueprint'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Step Progress Tracker */}
        <div className="flex items-center justify-between gap-1">
          {demoSteps.map((s) => (
            <button
              key={s.step}
              type="button"
              onClick={() => setCurrentStep(s.step)}
              className={`flex-1 h-2 rounded-full transition-all ${
                s.step === currentStep
                  ? 'bg-sky-600 ring-2 ring-sky-300'
                  : s.step < currentStep
                  ? 'bg-emerald-500'
                  : 'bg-slate-200'
              }`}
              title={`Step ${s.step}`}
            />
          ))}
        </div>

        {/* Active Step Content */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2.5 py-1 rounded-full">
              {isHi ? `चरण ${activeStepData.step} / 8` : `Step ${activeStepData.step} of 8`}
            </span>
            <span className="text-xs font-bold text-slate-500">
              भूमिका: {activeStepData.role.toUpperCase()}
            </span>
          </div>

          <div>
            <h4 className="text-base font-bold text-slate-900 font-display">
              {isHi ? activeStepData.titleHi : activeStepData.title}
            </h4>
            <p className="text-xs text-slate-700 font-medium mt-1">
              <strong>{isHi ? 'डेमो क्रिया (Action):' : 'Demo Action:'}</strong> {isHi ? activeStepData.actionHi : activeStepData.action}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-1">
            <span className="font-bold text-emerald-800 block">
              👀 {isHi ? 'जज क्या देखेंगे (What the Judge Sees):' : 'What the Judges Notice:'}
            </span>
            <p className="leading-relaxed">
              {isHi ? activeStepData.whatJudgeSeesHi : activeStepData.whatJudgeSees}
            </p>
          </div>

          {/* Quick Helper Button */}
          <button
            type="button"
            onClick={() => {
              activeStepData.execute();
              onClose();
            }}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{activeStepData.actionBtn}</span>
          </button>
        </div>

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>{isHi ? 'पिछला' : 'Previous'}</span>
          </button>

          <span className="text-xs text-slate-400 font-medium">
            Step {currentStep} / {demoSteps.length}
          </span>

          <button
            type="button"
            disabled={currentStep === demoSteps.length}
            onClick={() => setCurrentStep(prev => Math.min(demoSteps.length, prev + 1))}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-40 flex items-center gap-1"
          >
            <span>{isHi ? 'अगला' : 'Next'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
