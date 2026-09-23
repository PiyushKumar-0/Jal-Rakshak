import { useState } from 'react';
import { UserProfile, signInUser, signUpUser, signOutUser } from '../services/auth';
import { isSupabaseConfigured } from '../lib/supabase';
import { User, LogIn, UserPlus, LogOut, X, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AppLanguage } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onAuthSuccess: (user: UserProfile | null) => void;
  language: AppLanguage;
}

export function AuthModal({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  language,
}: AuthModalProps) {
  const isHi = language === 'hi';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [ward, setWard] = useState('ward-3');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await signInUser(email, password);
    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(isHi ? 'सफलतापूर्वक लॉग इन किया गया!' : 'Successfully signed in!');
      onAuthSuccess(res.profile);
      setTimeout(() => onClose(), 1200);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await signUpUser({
      email,
      password,
      fullName,
      phone,
      ward,
      village: 'Shivpur',
    });
    setLoading(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      setSuccessMsg(
        isHi
          ? 'खाता सफलतापूर्वक बनाया गया! (डिफ़ॉल्ट भूमिका: नागरिक)'
          : 'Account created successfully! (Default Role: Citizen)'
      );
      onAuthSuccess(res.profile);
      setTimeout(() => onClose(), 1500);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    await signOutUser();
    setLoading(false);
    onAuthSuccess(null);
    setSuccessMsg(isHi ? 'लॉग आउट किया गया' : 'Signed out');
    setTimeout(() => onClose(), 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500 text-slate-950 flex items-center justify-center font-bold">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {isHi ? 'जल रक्षक पहचान एवं प्रमाणीकरण' : 'JalRakshak Authentication'}
              </h3>
              <p className="text-xs text-slate-400">
                {isHi ? 'सुरक्षित सुपेबेस ऑथेंटिकेशन' : 'Secured by Supabase Auth'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Supabase Status Banner */}
        {!isSupabaseConfigured && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {isHi
                ? 'सुपेबेस API कुंजी सेट नहीं है। आप डेमो मोड में प्रवेश कर रहे हैं।'
                : 'Supabase API keys not yet configured in .env. Running in offline demo mode.'}
            </span>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-6">
          
          {/* Current User Session Status */}
          {currentUser ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center mx-auto mb-3 text-xl font-bold">
                <User className="w-8 h-8 text-sky-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-lg">{currentUser.full_name}</h4>
              <p className="text-xs text-slate-500 mb-2">
                {currentUser.phone ? `📱 ${currentUser.phone}` : 'गाँव: शिवपुर'} • वार्ड: {currentUser.ward}
              </p>
              
              <div className="inline-block px-3 py-1 bg-sky-100 text-sky-800 rounded-full font-bold text-xs mb-6 capitalize border border-sky-200">
                {isHi ? `भूमिका: ${currentUser.role}` : `Role: ${currentUser.role}`}
              </div>

              {successMsg && (
                <div className="mb-4 text-xs font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-lg flex items-center justify-center gap-1.5 border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>{successMsg}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleSignOut}
                disabled={loading}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-sm rounded-xl border border-rose-200 flex items-center justify-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>{isHi ? 'लॉग आउट करें' : 'Sign Out'}</span>
              </button>
            </div>
          ) : (
            <div>
              {/* Toggle Form Mode */}
              <div className="flex bg-slate-100 p-1 rounded-xl mb-5 border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    mode === 'signin'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5 inline mr-1" />
                  {isHi ? 'लॉग इन (Sign In)' : 'Sign In'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMsg(null);
                  }}
                  className={`flex-1 py-2 rounded-lg transition-all ${
                    mode === 'signup'
                      ? 'bg-white text-slate-900 shadow-sm font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 inline mr-1" />
                  {isHi ? 'नया पंजीकरण (Sign Up)' : 'Sign Up'}
                </button>
              </div>

              {errorMsg && (
                <div className="mb-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-3.5">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isHi ? 'पूरा नाम (Full Name)' : 'Full Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder={isHi ? 'उदा. रामेश्वर प्रसाद' : 'e.g. Rameshwar Prasad'}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHi ? 'ईमेल पता (Email)' : 'Email Address'}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="user@village.org"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isHi ? 'पासवर्ड (Password)' : 'Password'}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none"
                  />
                </div>

                {mode === 'signup' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isHi ? 'फोन नंबर (Phone)' : 'Phone Number'}
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="9876543210"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isHi ? 'वार्ड (Ward)' : 'Ward'}
                      </label>
                      <select
                        value={ward}
                        onChange={e => setWard(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-sky-500 focus:bg-white transition-all outline-none"
                      >
                        <option value="ward-1">Ward 1 - Uttar Basti</option>
                        <option value="ward-2">Ward 2 - Purana Bazaar</option>
                        <option value="ward-3">Ward 3 - Talab Tola</option>
                        <option value="ward-4">Ward 4 - Harijan Basti</option>
                        <option value="ward-5">Ward 5 - Paschim Dih</option>
                        <option value="ward-6">Ward 6 - Naya Kheda</option>
                      </select>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 mt-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span>{isHi ? 'प्रक्रिया जारी है...' : 'Processing...'}</span>
                  ) : mode === 'signin' ? (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>{isHi ? 'लॉग इन करें' : 'Sign In'}</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4" />
                      <span>{isHi ? 'खाता बनाएं' : 'Create Account'}</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
