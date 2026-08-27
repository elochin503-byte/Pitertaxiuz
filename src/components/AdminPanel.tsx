import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  Sparkles,
  TrendingUp,
  Users,
  Car,
  CheckCircle2,
  XCircle,
  Trash2,
  Plus,
  Search,
  KeyRound,
  FileCheck,
  AlertTriangle,
  Send,
  Eye,
  Coffee,
  Clock,
  Zap,
  MapPin,
  Flame,
  Award
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useRealtime } from '../context/RealtimeContext';
import { Driver, User, PaymentReceipt, PromoCode, AiAdminAnalytics } from '../types';

export const AdminPanel: React.FC = () => {
  const { lang, t } = useLanguage();
  const { addToast } = useRealtime();

  // Admin PIN Protection State
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('piter_taxi_admin_auth') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  // Active Admin Tabs
  const [activeTab, setActiveTab] = useState<'ai_analytics' | 'drivers' | 'receipts' | 'promos' | 'users' | 'logs'>('ai_analytics');

  // Data States
  const [stats, setStats] = useState<any>(null);
  const [aiAnalytics, setAiAnalytics] = useState<AiAdminAnalytics | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Promo code creation form modal
  const [isCreatePromoOpen, setIsCreatePromoOpen] = useState(false);
  const [newPromoCode, setNewPromoCode] = useState('');
  const [newPromoDiscount, setNewPromoDiscount] = useState('10');
  const [newPromoMinAmount, setNewPromoMinAmount] = useState('400');

  // Change PIN modal
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');

  // Selected receipt for preview modal
  const [previewReceipt, setPreviewReceipt] = useState<PaymentReceipt | null>(null);

  // Verify PIN handler
  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setIsVerifyingPin(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinInput })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PIN noto‘g‘ri');

      setIsAdminAuthenticated(true);
      sessionStorage.setItem('piter_taxi_admin_auth', 'true');
      addToast('Admin Huquqi Tasdiqlandi', 'Boshqaruv paneliga xush kelibsiz', 'success');
      loadAllAdminData();
    } catch (err: any) {
      setPinError(err.message || 'PIN kod xato! (Standart: 7777)');
    } finally {
      setIsVerifyingPin(false);
    }
  };

  const handleLogoutAdmin = () => {
    setIsAdminAuthenticated(false);
    sessionStorage.removeItem('piter_taxi_admin_auth');
    setPinInput('');
  };

  const loadAllAdminData = async () => {
    try {
      const [sRes, dRes, rRes, pRes, uRes, lRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/drivers'),
        fetch('/api/admin/receipts'),
        fetch('/api/promocodes'),
        fetch('/api/users'),
        fetch('/api/admin/logs')
      ]);

      if (sRes.ok) setStats(await sRes.json());
      if (dRes.ok) setDrivers(await dRes.json());
      if (rRes.ok) setReceipts(await rRes.json());
      if (pRes.ok) setPromos(await pRes.json());
      if (uRes.ok) setUsersList(await uRes.json());
      if (lRes.ok) setLogs(await lRes.json());
    } catch (e) {
      console.error('Error loading admin data:', e);
    }
  };

  const fetchAiAnalytics = async () => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/admin/ai-analytics');
      if (res.ok) {
        const data = await res.json();
        setAiAnalytics(data);
      }
    } catch (e) {
      console.error('AI Analytics fetch error:', e);
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadAllAdminData();
      fetchAiAnalytics();
      const interval = setInterval(loadAllAdminData, 6000);
      return () => clearInterval(interval);
    }
  }, [isAdminAuthenticated]);

  // User Expel/Delete by Admin
  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Haqiqatan ham "${userName}" foydalanuvchini platformadan chiqarib yubormoqchimisiz?`)) return;
    try {
      const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Foydalanuvchi chiqarildi', `${userName} tizimdan butunlay o‘chirildi`, 'info');
        loadAllAdminData();
      } else {
        const data = await res.json();
        alert(data.error || 'O‘chirishda xatolik yuz berdi');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Driver Expel/Delete
  const handleDeleteDriver = async (driverId: string, driverName: string) => {
    if (!window.confirm(`Haqiqatan ham "${driverName}" haydovchini tizimdan chiqarib yubormoqchimisiz?`)) return;
    try {
      const res = await fetch(`/api/drivers/${driverId}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Haydovchi chiqarildi', `${driverName} tizimdan o‘chirildi`, 'info');
        loadAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Approve receipt
  const handleApproveReceipt = async (receiptId: string) => {
    try {
      const res = await fetch(`/api/admin/receipts/${receiptId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Admin tomonidan tasdiqlandi' })
      });
      if (res.ok) {
        addToast('Chek tasdiqlandi!', 'Haydovchi obunasi 30 kunga faollashtirildi.', 'success');
        setPreviewReceipt(null);
        loadAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Reject receipt
  const handleRejectReceipt = async (receiptId: string) => {
    const reason = window.prompt('Rad etish sababini kiriting:', 'To‘lov cheki aniq emas yoki summa yetarli emas');
    if (reason === null) return;

    try {
      const res = await fetch(`/api/admin/receipts/${receiptId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        addToast('Chek rad etildi', 'Haydovchiga xabarnoma yuborildi', 'info');
        setPreviewReceipt(null);
        loadAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Promocode
  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCode.trim()) return;
    try {
      const res = await fetch('/api/promocodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newPromoCode.trim(),
          discountPercent: Number(newPromoDiscount),
          minOrderAmount: Number(newPromoMinAmount)
        })
      });
      if (res.ok) {
        addToast('Promokod yaratildi', `${newPromoCode} kodi faollashtirildi`, 'success');
        setIsCreatePromoOpen(false);
        setNewPromoCode('');
        loadAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Promocode
  const handleDeletePromo = async (promoId: string) => {
    try {
      const res = await fetch(`/api/promocodes/${promoId}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Promokod o‘chirildi', '', 'info');
        loadAllAdminData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Change Admin PIN
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'PIN o‘zgartirishda xatolik');

      addToast('PIN kod muvaffaqiyatli yangilandi', '', 'success');
      setIsChangePinOpen(false);
      setCurrentPin('');
      setNewPin('');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // -------------------------------------------------------------
  // RENDER PIN PROTECTION SCREEN IF NOT AUTHENTICATED
  // -------------------------------------------------------------
  if (!isAdminAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center space-y-6 animate-in fade-in">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto text-amber-400">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-white">Admin Panelga Kirish</h2>
          <p className="text-xs text-slate-400 mt-1">
            Xavfsizlik uchun maxfiy Admin PIN kodini kiriting.
          </p>
        </div>

        {pinError && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-2xl text-rose-300 text-xs">
            {pinError}
          </div>
        )}

        <form onSubmit={handleVerifyPin} className="space-y-4">
          <div>
            <input
              type="password"
              maxLength={8}
              autoFocus
              required
              placeholder="Maxfiy PIN kod"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-3.5 text-center text-xl font-mono tracking-widest text-white focus:outline-none transition shadow-inner"
            />
          </div>

          <button
            type="submit"
            disabled={isVerifyingPin}
            className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-2xl transition shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isVerifyingPin ? 'Tekshirilmoqda...' : 'Kirishni Tasdiqlash'}</span>
          </button>
        </form>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER FULL AUTHENTICATED ADMIN DASHBOARD
  // -------------------------------------------------------------
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Banner with Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white">Admin Boshqaruv Markazi</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950">
                PRO-SECURE
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Haqiqiy tushum, Gemini AI tahlili, haydovchilar to‘lov cheklari va promokodlar nazorati.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsChangePinOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>PIN o‘zgartirish</span>
          </button>

          <button
            onClick={handleLogoutAdmin}
            className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition"
          >
            Chiqish
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {[
          { id: 'ai_analytics', label: '✨ AI Moliya & Tahlil', icon: Sparkles },
          { id: 'drivers', label: `🚗 Haydovchilar (${drivers.length})`, icon: Car },
          { id: 'receipts', label: `💳 To‘lov Cheklari (${receipts.filter(r => r.status === 'PENDING').length} kutilmoqda)`, icon: FileCheck },
          { id: 'promos', label: `🏷 Promokodlar (${promos.length})`, icon: Award },
          { id: 'users', label: `👥 Foydalanuvchilar (${usersList.length})`, icon: Users },
          { id: 'logs', label: '📜 Tizim Loglari', icon: Shield }
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold shrink-0 transition flex items-center gap-2 ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: AI FINANCIAL & STATISTICAL ANALYTICS                    */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'ai_analytics' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Quick Metrics Bar */}
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <span className="text-xs text-slate-400 font-semibold">Bugungi Safar Tushumi:</span>
                <p className="text-2xl font-black text-amber-400 font-mono mt-1">
                  {stats.todayRevenueRub?.toLocaleString()} ₽
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Bugun {stats.todayOrders} ta buyurtma</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <span className="text-xs text-slate-400 font-semibold">Oylik Jami Tushum:</span>
                <p className="text-2xl font-black text-emerald-400 font-mono mt-1">
                  {stats.monthlyRevenueRub?.toLocaleString()} ₽
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Safarlar + 500 ₽ obunalar</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <span className="text-xs text-slate-400 font-semibold">Faol Obunalar (Haydovchilar):</span>
                <p className="text-2xl font-black text-blue-400 font-mono mt-1">
                  {stats.activeSubscriptions} / {stats.totalDrivers}
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Onlayn: {stats.activeDriversOnline} ta haydovchi</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
                <span className="text-xs text-slate-400 font-semibold">Mijozlar Qoniqishi & Reyting:</span>
                <p className="text-2xl font-black text-purple-400 font-mono mt-1">
                  {stats.averageRating} ⭐
                </p>
                <p className="text-[10px] text-slate-500 mt-1">Konversiya darajasi: {stats.conversionRate}%</p>
              </div>
            </div>
          )}

          {/* Gemini AI Strategic Analysis Box */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-white">Gemini AI Biznes va Moliyaviy Tahlili</h3>
                  <p className="text-xs text-slate-400">Haqiqiy baza ma‘lumotlari asosida avtomatik hisoblangan</p>
                </div>
              </div>

              <button
                onClick={fetchAiAnalytics}
                disabled={isAiLoading}
                className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 rounded-xl text-xs font-bold transition flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAiLoading ? 'AI Hisoblamoqda...' : 'Tahlilni Yangilash'}</span>
              </button>
            </div>

            {isAiLoading ? (
              <div className="py-12 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs font-semibold text-slate-300">
                  Gemini Sankt-Peterburg tumanlari va tushum dinamikasini hisoblamoqda...
                </p>
              </div>
            ) : aiAnalytics ? (
              <div className="space-y-6">
                {/* Summary */}
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed">
                  <p className="font-semibold text-amber-400 mb-1">Xulosa va Holat:</p>
                  <p>{aiAnalytics.summary}</p>
                </div>

                {/* Grid: High Demand Districts & Recommendations */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* High Demand Districts */}
                  <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>Yuqori Talab Tumanlari (SPB Ko‘chalari):</span>
                    </div>
                    <div className="space-y-2">
                      {aiAnalytics.highDemandDistricts?.map((d, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-slate-900 text-xs">
                          <span className="text-slate-200 font-semibold">📍 {d.district}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-amber-400 font-mono font-bold">x{d.surgeFactor} koeffitsiyent</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300">
                              {d.demandLevel}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>AI Tavsiyalari:</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {aiAnalytics.recommendations?.map((rec, i) => (
                        <li key={i} className="p-2 bg-slate-900 rounded-xl flex items-start gap-2">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Risk checks */}
                <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Xavfsizlik va Nazorat Eslatmasi:</h5>
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {aiAnalytics.fraudOrRiskAlerts?.map((alert, i) => (
                        <span key={i} className="text-[11px] text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg">
                          🛡 {alert}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: DRIVERS MANAGEMENT (VIEW, EXPEL, HOURS, STATUS)        */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'drivers' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-white">Ro‘yxatdan O‘tgan Haydovchilar</h3>
            <span className="text-xs text-slate-400 font-mono font-bold">Jami: {drivers.length} ta</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map(d => (
              <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden p-5 space-y-4 shadow-xl flex flex-col justify-between">
                <div>
                  {/* Photo and Status */}
                  <div className="relative h-40 rounded-2xl overflow-hidden bg-slate-950 mb-3">
                    <img
                      src={d.vehicle.photoUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400'}
                      alt="Car"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[10px] font-black text-amber-400 border border-amber-500/30">
                      {d.vehicle.tariff}
                    </div>

                    <div className="absolute top-2 right-2">
                      {d.isOnBreak ? (
                        <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Coffee className="w-3 h-3" /> Vaqti yo‘q
                        </span>
                      ) : d.isOnline ? (
                        <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                          Onlayn
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-400 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Oflayn
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 left-2 bg-white text-slate-950 font-mono font-black text-[11px] px-2 py-0.5 rounded shadow">
                      {d.vehicle.plateNumber}
                    </div>
                  </div>

                  <h4 className="font-extrabold text-white text-sm">{d.user?.fullName}</h4>
                  <p className="text-xs text-slate-400 font-mono">{d.user?.phone}</p>
                  <p className="text-xs text-slate-300 mt-1">
                    {d.vehicle.make} {d.vehicle.model} ({d.vehicle.color})
                  </p>

                  <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Ish grafigi:</span>
                    <span className="text-amber-400 font-bold font-mono">
                      {d.workingHours ? `${d.workingHours.start} - ${d.workingHours.end}` : '08:00 - 22:00'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Obuna holati:</span>
                    <span className={`font-bold ${d.subscription.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {d.subscription.planName}
                    </span>
                  </div>
                </div>

                {/* Expel / Delete Button */}
                <button
                  onClick={() => handleDeleteDriver(d.id, d.user?.fullName || 'Haydovchi')}
                  className="w-full py-2.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 mt-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Haydovchini Tizimdan Chiqarish</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: MONTHLY PAYMENT RECEIPTS APPROVAL                      */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'receipts' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-white">Haydovchilar To‘lov Cheklari</h3>
              <p className="text-xs text-slate-400">
                Oylik 500 ₽ obunasi uchun yuborilgan cheklarni tekshirib tasdiqlang yoki rad eting.
              </p>
            </div>
          </div>

          {receipts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center text-slate-400 text-xs">
              To‘lov cheklari mavjud emas
            </div>
          ) : (
            <div className="space-y-3">
              {receipts.map(r => (
                <div
                  key={r.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={r.receiptUrl}
                      alt="Chek"
                      onClick={() => setPreviewReceipt(r)}
                      className="w-16 h-16 rounded-xl object-cover border border-slate-700 cursor-pointer hover:opacity-80 transition"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{r.driverName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : r.status === 'REJECTED'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300 animate-pulse'
                        }`}>
                          {r.status === 'APPROVED' ? 'TASDIQLANGAN' : r.status === 'REJECTED' ? 'RAD ETILGAN' : 'KUTILMOQDA'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{r.driverPhone}</p>
                      <p className="text-xs text-amber-400 font-mono mt-0.5">Summa: {r.amount} ₽</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewReceipt(r)}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Chekni ko‘rish</span>
                    </button>

                    {r.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleApproveReceipt(r.id)}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl transition shadow flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tasdiqlash</span>
                        </button>
                        <button
                          onClick={() => handleRejectReceipt(r.id)}
                          className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-xl transition"
                        >
                          Rad etish
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 4: PROMOCODES MANAGEMENT                                 */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'promos' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-white">Faol Promokodlar</h3>
            <button
              onClick={() => setIsCreatePromoOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition shadow flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Yangi Promokod Yaratish</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {promos.map(p => (
              <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-black text-base text-amber-400">{p.code}</span>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {p.discountPercent ? `${p.discountPercent}% chegirma` : `${p.discountFixedRub} ₽ chegirma`}
                    </p>
                    <p className="text-[10px] text-slate-500">Minimal buyurtma: {p.minOrderAmount || 0} ₽</p>
                  </div>
                  <button
                    onClick={() => handleDeletePromo(p.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex justify-between">
                  <span>Ishlatildi: {p.usedCount} marta</span>
                  <span className="text-emerald-400 font-bold">Faol</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 5: USERS & CLIENTS LIST                                   */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'users' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-white">Barcha Foydalanuvchilar va Haydovchilar</h3>
              <p className="text-xs text-slate-400">Admin istalgan profilni tizimdan chiqarib tashlashi (Expel) mumkin.</p>
            </div>
            <span className="text-xs font-mono px-3 py-1 bg-slate-900 border border-slate-800 rounded-xl text-slate-400">
              Jami: {usersList.length} ta
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3.5">Foydalanuvchi</th>
                  <th className="p-3.5">Telefon</th>
                  <th className="p-3.5">Roli</th>
                  <th className="p-3.5">Bonus Balans</th>
                  <th className="p-3.5">Holati</th>
                  <th className="p-3.5 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/50">
                    <td className="p-3.5 font-bold text-white flex items-center gap-2">
                      <span>{u.fullName}</span>
                      {u.role === 'SUPERADMIN' && (
                        <span className="px-1.5 py-0.5 bg-rose-500/20 text-rose-300 text-[9px] rounded font-mono">ADMIN</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono">{u.phone}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'DRIVER'
                          ? 'bg-blue-500/20 text-blue-300'
                          : u.role === 'SUPERADMIN' || u.role === 'ADMIN'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-emerald-400 font-bold">{u.bonusBalance || 0} ₽</td>
                    <td className="p-3.5">
                      <span className="text-emerald-400 font-semibold">{u.status}</span>
                    </td>
                    <td className="p-3.5 text-right">
                      {u.role !== 'SUPERADMIN' ? (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.fullName)}
                          title="Foydalanuvchini platformadan chiqarish"
                          className="px-2.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 rounded-xl text-[11px] font-bold transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Chiqarib tashlash</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">Bosh admin</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 6: AUDIT LOGS                                             */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'logs' && (
        <div className="space-y-4 animate-in fade-in">
          <h3 className="text-lg font-extrabold text-white">Tizim Audit Loglari</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 max-h-96 overflow-y-auto space-y-2">
            {logs.map((log: any) => (
              <div key={log.id} className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-white mr-2">[{log.action}]</span>
                  <span className="text-slate-300">{log.details}</span>
                  <span className="text-slate-500 text-[10px] ml-2">({log.userName} • {log.userRole})</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Receipt Preview */}
      {previewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative space-y-4">
            <h3 className="text-base font-bold text-white">To‘lov Cheki: {previewReceipt.driverName}</h3>
            <div className="h-80 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
              <img
                src={previewReceipt.receiptUrl}
                alt="Receipt"
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewReceipt(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                Yopish
              </button>
              {previewReceipt.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleApproveReceipt(previewReceipt.id)}
                    className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl"
                  >
                    Tasdiqlash
                  </button>
                  <button
                    onClick={() => handleRejectReceipt(previewReceipt.id)}
                    className="flex-1 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-xl"
                  >
                    Rad etish
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Promocode */}
      {isCreatePromoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-white">Yangi Promokod Yaratish</h3>
            <form onSubmit={handleCreatePromo} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Promokod kodi:</label>
                <input
                  type="text"
                  required
                  placeholder="PITER15"
                  value={newPromoCode}
                  onChange={e => setNewPromoCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Chegirma foizi (%):</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newPromoDiscount}
                  onChange={e => setNewPromoDiscount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Minimal buyurtma summasi (₽):</label>
                <input
                  type="number"
                  value={newPromoMinAmount}
                  onChange={e => setNewPromoMinAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatePromoOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl"
                >
                  Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change PIN */}
      {isChangePinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl space-y-4">
            <h3 className="text-base font-extrabold text-white">Admin PIN Kodini O‘zgartirish</h3>
            <form onSubmit={handleChangePin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amaldagi PIN:</label>
                <input
                  type="password"
                  required
                  placeholder="Amaldagi PIN"
                  value={currentPin}
                  onChange={e => setCurrentPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Yangi PIN (kamida 4 xonali):</label>
                <input
                  type="password"
                  required
                  placeholder="Yangi PIN"
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChangePinOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-xl"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
