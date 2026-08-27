import React, { useState } from 'react';
import {
  Car,
  Globe,
  Bot,
  Shield,
  User as UserIcon,
  Sparkles,
  Menu,
  X,
  LogIn,
  LogOut,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { DriverRegistrationModal } from './DriverRegistrationModal';
import { AuthModal } from './AuthModal';

interface NavbarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeView, setActiveView }) => {
  const { user, role, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const navItems = [
    { id: 'home', label: lang === 'uz' ? 'Asosiy' : lang === 'ru' ? 'Главная' : 'Home', icon: Globe },
    { id: 'directory', label: lang === 'uz' ? 'Haydovchilar' : lang === 'ru' ? 'Водители' : 'Drivers', icon: Users },
    { id: 'driver', label: lang === 'uz' ? 'Haydovchi Paneli' : lang === 'ru' ? 'Кабинет водителя' : 'Driver Desk', icon: Car },
    { id: 'bot', label: 'Telegram Bot', icon: Bot },
    { id: 'admin', label: 'Admin', icon: Shield }
  ];

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Logo */}
          <button
            onClick={() => setActiveView('home')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <Car className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-base tracking-tight">O‘ZIMIZ UCHUN</span>
                <span className="bg-amber-500 text-slate-950 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                  SPB
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-medium block -mt-0.5">
                Sankt-Peterburg Taxi
              </span>
            </div>
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-2xl text-xs font-semibold">
            {navItems.map(item => {
              const Icon = item.icon;
              const isSelected = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold shadow'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Tools: Language, Driver Register, Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Driver Register CTA */}
            <button
              onClick={() => setIsDriverModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-xl shadow-md transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{lang === 'uz' ? 'Haydovchi bo‘lish' : lang === 'ru' ? 'Стать водителем' : 'Become Driver'}</span>
            </button>

            {/* Language Selector (Instant Switcher UZ / RU / EN) */}
            <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-[11px] font-bold text-slate-400">
              {(['uz', 'ru', 'en'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2 py-1 rounded-lg uppercase transition ${
                    lang === l ? 'bg-amber-500 text-slate-950 font-black shadow' : 'hover:text-white'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            {/* Client Login / Profile */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-200 transition"
            >
              <UserIcon className="w-3.5 h-3.5 text-amber-400" />
              <span className="max-w-[100px] truncate">{user?.fullName ? user.fullName.split(' ')[0] : 'Kirish'}</span>
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5 text-slate-200" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden bg-slate-950 border-b border-slate-800 px-4 py-4 space-y-2 animate-in slide-in-from-top-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const isSelected = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-bold transition ${
                    isSelected ? 'bg-amber-500 text-slate-950' : 'text-slate-300 bg-slate-900/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <button
              onClick={() => {
                setIsDriverModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-extrabold bg-amber-500 text-slate-950 shadow"
            >
              <Sparkles className="w-4 h-4" />
              <span>Haydovchi sifatida qo‘shilish (500 ₽/oy)</span>
            </button>
          </div>
        )}
      </header>

      {/* Driver Registration Modal */}
      <DriverRegistrationModal
        isOpen={isDriverModalOpen}
        onClose={() => setIsDriverModalOpen(false)}
      />

      {/* Auth Modal for Login/Registration */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
};
