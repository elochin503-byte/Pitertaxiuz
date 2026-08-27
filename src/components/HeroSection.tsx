import React from 'react';
import { ShieldCheck, Clock, Award, Users, Car, Sparkles, ArrowRight, Bot, Compass } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface HeroProps {
  onOrderClick: () => void;
  onDriverClick: () => void;
  onOpenDirectory: () => void;
  onOpenBot: () => void;
}

export const HeroSection: React.FC<HeroProps> = ({
  onOrderClick,
  onDriverClick,
  onOpenDirectory,
  onOpenBot
}) => {
  const { lang } = useLanguage();

  return (
    <div className="relative overflow-hidden pt-2 pb-6 space-y-7">
      {/* Top Banner Accent */}
      <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-amber-400">
        <Sparkles className="w-3.5 h-3.5" />
        <span>
          {lang === 'uz'
            ? 'Sankt-Peterburgdagi o‘zbek va Markaziy Osiyo hamjamiyati taksi tarmog‘i'
            : 'Надежное такси для нашего сообщества в Санкт-Петербурге'}
        </span>
      </div>

      {/* Main Headline */}
      <div className="max-w-3xl space-y-3.5">
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
          O‘ZIMIZ UCHUN —{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">
            Sankt-Peterburg
          </span>{' '}
          bo‘ylab ishonchli va arzon taksi!
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
          {lang === 'uz'
            ? 'Faqat haqiqiy, tasdiqlangan haydovchilar. Pulkovo aeroporti, Devyatkino, Sadovaya va barcha vokzallarga tezkor yetib kelish.'
            : 'Только проверенные реальные водители, честные фиксированные цены и поддержка 24/7.'}
        </p>
      </div>

      {/* Quick Action Badges */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <button
          onClick={onOrderClick}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs sm:text-sm px-6 py-3.5 rounded-2xl shadow-xl shadow-amber-500/20 flex items-center gap-2 transition transform active:scale-95"
        >
          <Car className="w-4 h-4" />
          <span>{lang === 'uz' ? 'Taksi chaqirish' : 'Заказать такси'}</span>
        </button>

        <button
          onClick={onOpenDirectory}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm px-5 py-3.5 rounded-2xl border border-slate-800 flex items-center gap-2 transition"
        >
          <Compass className="w-4 h-4 text-amber-400" />
          <span>{lang === 'uz' ? 'Haydovchilar Katalogi' : 'Каталог водителей'}</span>
        </button>

        <button
          onClick={onDriverClick}
          className="bg-slate-950 hover:bg-slate-900 text-amber-400 font-bold text-xs px-4 py-3.5 rounded-2xl border border-amber-500/30 flex items-center gap-2 transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>{lang === 'uz' ? 'Haydovchi bo‘lish (500 ₽/oy)' : 'Стать водителем'}</span>
        </button>

        <button
          onClick={onOpenBot}
          className="bg-sky-950/60 hover:bg-sky-900/80 text-sky-300 font-bold text-xs px-4 py-3.5 rounded-2xl border border-sky-800/80 flex items-center gap-2 transition"
        >
          <Bot className="w-4 h-4 text-sky-400" />
          <span>Telegram Bot (@PiterTaxi_Bot)</span>
        </button>
      </div>

      {/* Trust & Advantage Points */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
        {[
          {
            title: lang === 'uz' ? '0% Komissiya' : '0% Комиссии',
            desc: lang === 'uz' ? 'Haydovchi 100% tushumni o‘zida saqlaydi' : 'Водители забирают всю выручку себе',
            icon: ShieldCheck
          },
          {
            title: lang === 'uz' ? 'Tezkor yetib kelish' : 'Быстрая подача',
            desc: lang === 'uz' ? 'Sankt-Peterburg bo‘ylab 5-10 daqiqada' : 'По СПб за 5-10 минут',
            icon: Clock
          },
          {
            title: lang === 'uz' ? 'Hamyonbop Narxlar' : 'Доступные цены',
            desc: lang === 'uz' ? 'Standart tarif 350 ₽ dan boshlanadi' : 'Поездки от 350 ₽',
            icon: Award
          },
          {
            title: lang === 'uz' ? 'Haqiqiy Ma‘lumotlar' : 'Реальные авто',
            desc: lang === 'uz' ? 'Barcha mashina va haydovchilar tekshirilgan' : 'Проверенные авто с фото и госномером',
            icon: Users
          }
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl space-y-1">
              <Icon className="w-5 h-5 text-amber-400 mb-1" />
              <h4 className="font-bold text-white text-xs">{item.title}</h4>
              <p className="text-[11px] text-slate-400 leading-snug">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
