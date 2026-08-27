import React, { useState, useEffect } from 'react';
import { LanguageProvider } from './context/LanguageContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider, useRealtime } from './context/RealtimeContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { QuickOrderWidget } from './components/QuickOrderWidget';
import { DriverDirectory } from './components/DriverDirectory';
import { TariffsSection } from './components/TariffsSection';
import { OrderTrackingView } from './components/OrderTrackingView';
import { DriverDashboard } from './components/DriverDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { AdminPanel } from './components/AdminPanel';
import { TelegramBotSimulator } from './components/TelegramBotSimulator';
import { DriverRegistrationModal } from './components/DriverRegistrationModal';
import { SupportModal } from './components/SupportModal';
import { TariffType, Order, Driver } from './types';
import { X, CheckCircle, AlertTriangle, Info, Car } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { user } = useAuth();
  const { toasts, removeToast, activeOrder, setActiveOrder } = useRealtime();

  const [activeView, setActiveView] = useState<string>('home');
  const [selectedTariff, setSelectedTariff] = useState<TariffType>('STANDARD');
  const [selectedDriverForOrder, setSelectedDriverForOrder] = useState<Driver | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  // Hash route listener
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace('#', '');
      if (['home', 'directory', 'bot', 'driver', 'client', 'admin'].includes(hash)) {
        setActiveView(hash);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const changeView = (view: string) => {
    window.location.hash = view;
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectDriverFromCatalog = (driver: Driver) => {
    setSelectedDriverForOrder(driver);
    setSelectedTariff(driver.vehicle.tariff);
    changeView('home');
    setTimeout(() => {
      const el = document.getElementById('order-widget-box');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification Container */}
      <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-md flex items-start justify-between gap-3 transition-all transform animate-in slide-in-from-top-2 duration-300 ${
              t.type === 'success'
                ? 'bg-slate-900/95 border-emerald-500/50 text-emerald-300'
                : t.type === 'alert'
                ? 'bg-slate-900/95 border-rose-500/50 text-rose-300'
                : 'bg-slate-900/95 border-amber-500/50 text-amber-300'
            }`}
          >
            <div className="flex items-start gap-2.5">
              {t.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
              {t.type === 'alert' && <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
              {t.type === 'info' && <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
              <div>
                <p className="font-bold text-xs text-white">{t.title}</p>
                <p className="text-[11px] text-slate-300 mt-0.5">{t.message}</p>
              </div>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Main Navbar */}
      <Navbar activeView={activeView} setActiveView={changeView} />

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-12">
        {/* VIEW 1: HOME (WEB INTERFACE) */}
        {activeView === 'home' && (
          <div className="space-y-12">
            {/* Active order tracking banner if order is running */}
            {activeOrder && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                    <h2 className="text-base font-bold text-white">Faol Buyurtma #{activeOrder.orderNumber}</h2>
                  </div>
                  <button
                    onClick={() => setActiveOrder(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Yashirish
                  </button>
                </div>
                <OrderTrackingView order={activeOrder} onClose={() => setActiveOrder(null)} />
              </div>
            )}

            {/* Hero + Quick Order Widget Side by Side */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-7 space-y-6">
                <HeroSection
                  onOrderClick={() => {
                    const el = document.getElementById('order-widget-box');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onDriverClick={() => setIsDriverModalOpen(true)}
                  onOpenDirectory={() => changeView('directory')}
                  onOpenBot={() => changeView('bot')}
                />
              </div>

              <div id="order-widget-box" className="lg:col-span-5 sticky top-20">
                <QuickOrderWidget
                  initialTariff={selectedTariff}
                  preselectedDriver={selectedDriverForOrder}
                  onClearPreselectedDriver={() => setSelectedDriverForOrder(null)}
                  onOrderSuccess={(newOrder) => {
                    setActiveOrder(newOrder);
                    setSelectedDriverForOrder(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            </div>

            {/* Tariffs Section */}
            <div className="pt-4">
              <TariffsSection
                onSelectTariff={(t) => {
                  setSelectedTariff(t);
                  const el = document.getElementById('order-widget-box');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
              />
            </div>
          </div>
        )}

        {/* VIEW 2: ALL DRIVERS DIRECTORY / CATALOG */}
        {activeView === 'directory' && (
          <DriverDirectory
            onSelectDriver={handleSelectDriverFromCatalog}
            onOpenRegisterModal={() => setIsDriverModalOpen(true)}
          />
        )}

        {/* VIEW 3: TELEGRAM BOT SIMULATOR */}
        {activeView === 'bot' && (
          <div className="space-y-4">
            <div className="text-center max-w-xl mx-auto space-y-1">
              <span className="text-xs font-bold text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
                🤖 Telegram Bot Simulyatori
              </span>
              <h2 className="text-xl font-bold text-white">@PiterTaxi_Bot Jonli Muloqot</h2>
              <p className="text-xs text-slate-400">
                Telegram orqali to‘g‘ridan-to‘g‘ri taksi buyurtma berish bot integratsiyasi.
              </p>
            </div>
            <TelegramBotSimulator />
          </div>
        )}

        {/* VIEW 4: DRIVER DASHBOARD */}
        {activeView === 'driver' && <DriverDashboard />}

        {/* VIEW 5: CLIENT DASHBOARD */}
        {activeView === 'client' && (
          <ClientDashboard
            onSelectOrder={(ord) => {
              setActiveOrder(ord);
              changeView('home');
            }}
            onNewOrderClick={() => changeView('home')}
          />
        )}

        {/* VIEW 6: ADMIN PANEL */}
        {activeView === 'admin' && <AdminPanel />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 mt-16 py-10 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center font-bold text-slate-950">
                <Car className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-white text-sm">O‘ZIMIZ UCHUN</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Sankt-Peterburgdagi vatandoshlar uchun eng qulay, xavfsiz va ishonchli taksi xizmati.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs">Bo‘limlar</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button onClick={() => changeView('home')} className="hover:text-amber-400 transition">
                  🌐 Asosiy Sahifa
                </button>
              </li>
              <li>
                <button onClick={() => changeView('directory')} className="hover:text-amber-400 transition">
                  🚗 Barcha Haydovchilar Katalogi
                </button>
              </li>
              <li>
                <button onClick={() => changeView('bot')} className="hover:text-amber-400 transition">
                  🤖 Telegram Bot (@PiterTaxi_Bot)
                </button>
              </li>
              <li>
                <button onClick={() => changeView('driver')} className="hover:text-amber-400 transition">
                  🚕 Haydovchi Kabineti
                </button>
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs">Haydovchilarga</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <button onClick={() => setIsDriverModalOpen(true)} className="hover:text-amber-400 text-amber-300 font-semibold transition">
                  ✨ Haydovchi bo‘lish (500 ₽/oy)
                </button>
              </li>
              <li>0% Komissiya stavkasi</li>
              <li>Erkin ish grafigi</li>
              <li>24/7 Dispetcherlik qo‘llab-quvvatlash</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-white text-xs">Bog‘lanish va Aloqa</h4>
            <p className="font-mono text-slate-300 text-xs">+7 999 001 2233</p>
            <p className="text-sky-400 font-mono text-[11px]">@piter_taxi_support</p>
            <p className="text-slate-500 text-[10px] pt-1">
              Sankt-Peterburg shahri, Nevsky prospekt 100
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 mt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
          <p>© {new Date().getFullYear()} “O‘ZIMIZ UCHUN | PITER TAXI”. Barcha huquqlar himoyalangan.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSupportModalOpen(true)} className="hover:text-slate-300">
              Yordam
            </button>
            <button onClick={() => changeView('admin')} className="hover:text-slate-300">
              Admin
            </button>
          </div>
        </div>
      </footer>

      {/* Global Modals */}
      <DriverRegistrationModal isOpen={isDriverModalOpen} onClose={() => setIsDriverModalOpen(false)} />
      <SupportModal isOpen={isSupportModalOpen} onClose={() => setIsSupportModalOpen(false)} />
    </div>
  );
};

export function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <RealtimeProvider>
          <MainAppContent />
        </RealtimeProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
