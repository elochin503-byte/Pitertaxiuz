import React, { useState } from 'react';
import { X, User, Phone, Lock, Sparkles, LogIn, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, defaultMode = 'login' }) => {
  const { loginWithCredentials, registerClient, user } = useAuth();
  const { lang, t } = useLanguage();

  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+7 ');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phone.trim(), password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Kirishda xatolik yuz berdi');

        loginWithCredentials(data.user);
        setSuccessMsg(lang === 'uz' ? 'Muvaffaqiyatli kirdingiz!' : lang === 'ru' ? 'Вы успешно вошли!' : 'Logged in successfully!');
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        if (!fullName.trim()) throw new Error('Ism-familiyangizni kiriting');
        if (phone.length < 10) throw new Error('To‘g‘ri telefon raqam kiriting');

        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName: fullName.trim(), phone: phone.trim(), password, role: 'CLIENT' })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Ro‘yxatdan o‘tishda xatolik');

        registerClient(data.user);
        setSuccessMsg(lang === 'uz' ? 'Ro‘yxatdan muvaffaqiyatli o‘tdingiz va saqlab qolindingiz!' : 'Успешная регистрация!');
        setTimeout(() => {
          onClose();
        }, 800);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative text-slate-100 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Mode Selector Tabs */}
        <div className="flex bg-slate-950/70 p-1 rounded-2xl border border-slate-800/80 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mode === 'login' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>{lang === 'uz' ? 'Kirish' : lang === 'ru' ? 'Вход' : 'Login'}</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(''); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
              mode === 'register' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>{lang === 'uz' ? 'Ro‘yxatdan o‘tish' : lang === 'ru' ? 'Регистрация' : 'Register'}</span>
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3 text-amber-400">
            {mode === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <h3 className="text-lg font-bold text-white">
            {mode === 'login'
              ? (lang === 'uz' ? 'Profilga kirish' : lang === 'ru' ? 'Вход в профиль' : 'Sign In')
              : (lang === 'uz' ? 'Mijoz sifatida ro‘yxatdan o‘tish' : lang === 'ru' ? 'Регистрация клиента' : 'Create Client Account')}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {lang === 'uz'
              ? 'Sankt-Peterburg bo‘ylab qulay taksi buyurtma qiling va ma‘lumotlaringiz doimiy saqlanadi.'
              : 'Удобно заказывайте такси в СПб с сохранением истории и бонусов.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {lang === 'uz' ? 'Ism va Familiyangiz' : lang === 'ru' ? 'ФИО' : 'Full Name'} *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder={lang === 'uz' ? 'Masalan: Sherzod Rahimov' : 'Например: Шерзод'}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {lang === 'uz' ? 'Telefon raqamingiz' : lang === 'ru' ? 'Номер телефона' : 'Phone Number'} *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                placeholder="+7 (999) 000-00-00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {lang === 'uz' ? 'Parol' : lang === 'ru' ? 'Пароль' : 'Password'} *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>
            {mode === 'register' && (
              <p className="text-[11px] text-slate-500 mt-1">
                {lang === 'uz' ? 'Keyingi safar tizimga kirish uchun parolingizni eslab qoling.' : 'Запомните пароль для входа.'}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <span className="animate-pulse">{lang === 'uz' ? 'Bajarilmoqda...' : 'Загрузка...'}</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>{lang === 'uz' ? 'Tizimga kirish' : lang === 'ru' ? 'Войти' : 'Sign In'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{lang === 'uz' ? 'Ro‘yxatdan o‘tish va Saqlash' : 'Зарегистрироваться'}</span>
              </>
            )}
          </button>
        </form>

        {/* Saved Persistence Hint */}
        <div className="mt-4 pt-4 border-t border-slate-800 text-center">
          <p className="text-[11px] text-slate-400">
            {lang === 'uz'
              ? '💡 Sizning barcha buyurtmalaringiz va bonuslaringiz ushbu profilga biriktiriladi.'
              : 'Все ваши поездки будут автоматически сохраняться.'}
          </p>
        </div>
      </div>
    </div>
  );
};
