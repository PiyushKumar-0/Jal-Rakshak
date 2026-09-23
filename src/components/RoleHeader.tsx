import { Droplets, Shield, Wifi, WifiOff, Volume2, HelpCircle, CheckCircle2, User, LogIn } from 'lucide-react';
import { UserRole, AppLanguage } from '../types';
import { UserProfile } from '../services/auth';

interface RoleHeaderProps {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  isOffline: boolean;
  setIsOffline: (offline: boolean) => void;
  offlineDraftsCount: number;
  onOpenDemoScript: () => void;
  activeClusterCount: number;
  onSyncOfflineQueue: () => void;
  currentUser?: UserProfile | null;
  onOpenAuthModal?: () => void;
}

export function RoleHeader({
  currentRole,
  setCurrentRole,
  language,
  setLanguage,
  isOffline,
  setIsOffline,
  offlineDraftsCount,
  onOpenDemoScript,
  activeClusterCount,
  onSyncOfflineQueue,
  currentUser,
  onOpenAuthModal,
}: RoleHeaderProps) {
  const isHi = language === 'hi';

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 shadow-md">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 text-slate-950 font-bold shadow-md shadow-sky-500/20">
              <Droplets className="w-6 h-6 text-slate-950" />
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-slate-900">
                <Shield className="w-2.5 h-2.5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white font-display">
                  JalRakshak AI
                </span>
                <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  जल रक्षक
                </span>
                <span className="hidden md:inline-block text-[11px] font-medium text-slate-400">
                  Gram Panchayat Shivpur (शिवपुर)
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {isHi
                  ? 'जल जोखिम पूर्वानुमान • प्राथमिक कार्य सूची • ग्राम सुरक्षा'
                  : 'Predict water risks. Prioritize action. Protect villages.'}
              </p>
            </div>
          </div>

          {/* Controls: Offline Mode Toggle, Sync Badge, Language, Demo Script */}
          <div className="flex items-center flex-wrap gap-2.5">
            
            {/* Offline Simulator Switch */}
            <div className="flex items-center bg-slate-800/90 rounded-lg p-1 border border-slate-700">
              <button
                type="button"
                onClick={() => {
                  const nextState = !isOffline;
                  setIsOffline(nextState);
                  if (!nextState && offlineDraftsCount > 0) {
                    onSyncOfflineQueue();
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  isOffline
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                }`}
                title="Toggle simulated Airplane Mode to test offline drafts & instant safety advice"
              >
                {isOffline ? (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-slate-950 animate-bounce" />
                    <span>{isHi ? 'ऑफलाइन मोड (Airplane)' : 'Offline Mode (Airplane)'}</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{isHi ? 'इंटरनेट चालू' : 'Online'}</span>
                  </>
                )}
              </button>

              {offlineDraftsCount > 0 && (
                <button
                  type="button"
                  onClick={onSyncOfflineQueue}
                  className="ml-1 px-2 py-0.5 text-xs bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 rounded font-semibold flex items-center gap-1"
                  title="Click to sync offline drafts"
                >
                  <span>{offlineDraftsCount} {isHi ? 'पेंडिंग' : 'pending'}</span>
                  <CheckCircle2 className="w-3 h-3 text-sky-400" />
                </button>
              )}
            </div>

            {/* Language Toggle */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  language === 'hi'
                    ? 'bg-sky-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  language === 'en'
                    ? 'bg-sky-600 text-white font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                English
              </button>
            </div>

            {/* 90-Second Demo Button */}
            <button
              type="button"
              onClick={onOpenDemoScript}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{isHi ? '90-सेकंड लाइव डेमो' : '90s Demo Script'}</span>
            </button>

            {/* Supabase Auth Account Button */}
            {onOpenAuthModal && (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-sky-300 font-semibold text-xs rounded-lg border border-slate-700 transition-all"
              >
                {currentUser ? (
                  <>
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="max-w-[90px] truncate">{currentUser.full_name.split(' ')[0]}</span>
                    <span className="px-1 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] rounded uppercase font-bold">
                      {currentUser.role}
                    </span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5 text-sky-400" />
                    <span>{isHi ? 'लॉग इन / खाता' : 'Log In / Account'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Role Switcher Bar */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 flex items-center justify-between overflow-x-auto gap-2 scrollbar-none">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">
              {isHi ? 'भूमिका बदलें:' : 'View as:'}
            </span>

            {/* Citizen Role */}
            <button
              type="button"
              onClick={() => setCurrentRole('citizen')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'citizen'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>🧑‍🌾</span>
              <span>{isHi ? 'नागरिक पोर्टल' : 'Citizen App'}</span>
              <span className="text-[10px] opacity-75 font-normal">
                {isHi ? '(रिपोर्ट व सलाह)' : '(Offline/Voice)'}
              </span>
            </button>

            {/* Panchayat Cockpit */}
            <button
              type="button"
              onClick={() => setCurrentRole('panchayat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'panchayat'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>🏛️</span>
              <span>{isHi ? 'पंचायत कॉकपिट' : 'Panchayat Cockpit'}</span>
              {activeClusterCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold text-[10px] animate-pulse">
                  {activeClusterCount}
                </span>
              )}
            </button>

            {/* Field Team */}
            <button
              type="button"
              onClick={() => setCurrentRole('field')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'field'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>🔧</span>
              <span>{isHi ? 'फील्ड टीम / जल मिस्त्री' : 'Field Inspection'}</span>
            </button>

            {/* District / Evaluation */}
            <button
              type="button"
              onClick={() => setCurrentRole('district')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentRole === 'district'
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              <span>📊</span>
              <span>{isHi ? 'मूल्यांकन व AI मेट्रिक्स' : 'Evaluation & ML'}</span>
            </button>
          </div>

          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            <span>{isHi ? 'हिंदी वाक् संश्लेषण सक्षम' : 'Hindi Voice Readback Ready'}</span>
          </div>
        </div>

      </div>
    </header>
  );
}
