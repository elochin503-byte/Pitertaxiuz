import React from 'react';
import { Car, Shield, Sparkles, Users, Box, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TariffType } from '../types';

interface TariffsProps {
  onSelectTariff: (tariff: TariffType) => void;
}

export const TariffsSection: React.FC<TariffsProps> = ({ onSelectTariff }) => {
  const { t } = useLanguage();

  const tariffs: {
    type: TariffType;
    title: string;
    price: string;
    cars: string;
    desc: string;
    features: string[];
    isPopular?: boolean;
  }[] = [
    {
      type: 'STANDARD',
      title: 'Standart',
      price: '350 ₽ dan',
      cars: 'Solaris, Rio, Cobalt, Logan',
      desc: 'Shaharda har kungi tejamkor va qulay harakatlanish uchun',
      features: ['Tezkor qidiruv', '4 tagacha yo‘lovchi', 'Standard bagaj', 'Konditsioner'],
      isPopular: true
    },
    {
      type: 'COMFORT',
      title: 'Komfort',
      price: '480 ₽ dan',
      cars: 'Camry, K5, Octavia, Cerato',
      desc: 'Kengroq salon, sokin muhit va yangiroq rusumdagi avtomobillar',
      features: ['Keng va qulay salon', 'Telefon zaryadkasi', 'Ichimlik suvi', 'Yuqori toifadagi haydovchi']
    },
    {
      type: 'BUSINESS',
      title: 'Biznes',
      price: '750 ₽ dan',
      cars: 'Mercedes E-Class, BMW 5, Genesis',
      desc: 'Ishbilarmonlik uchrashuvlari va yuqori darajadagi kutib olishlar',
      features: ['Premium avtomobillar', 'Kostyum kiygan haydovchi', 'Klassik musiqa / Jimlik', 'Maksimal qulaylik']
    },
    {
      type: 'MINIVAN',
      title: 'Miniven (6-8 kishi)',
      price: '800 ₽ dan',
      cars: 'Hyundai Starex, VW Caravelle, Vito',
      desc: 'Katta oilalar, guruhlar yoki katta hajmdagi aeroport bagajlari uchun',
      features: ['6-8 ta o‘rindiq', 'Katta yukxona', 'Aeroport transferi', 'Bolalar o‘rindig‘i']
    },
    {
      type: 'DELIVERY',
      title: 'Yetkazib berish',
      price: '300 ₽ dan',
      cars: 'Kuryer / Yengil avtomobil',
      desc: 'Hujjatlar, posilkalar, milliy taomlar va kutilmagan sovg‘alarni eltib berish',
      features: ['Eshikdan eshikkacha', 'Posilkani jonli kuzatish', 'Xavfsiz topshirish', 'Tezkor yetkazish']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Siz uchun mos tariflar</h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Shaffof narxlar, yashirin to‘lovlarsiz. Har bir safar uchun eng ma‘qul tarifni tanlang.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {tariffs.map(item => (
          <div
            key={item.type}
            className={`bg-slate-900 border rounded-3xl p-5 flex flex-col justify-between relative transition-all duration-300 hover:scale-[1.02] ${
              item.isPopular
                ? 'border-amber-500 shadow-xl shadow-amber-500/10 ring-1 ring-amber-500/30'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            {item.isPopular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 font-bold text-[10px] px-3 py-0.5 rounded-full uppercase tracking-wider shadow">
                Eng Ommabop
              </span>
            )}

            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-white text-base">{item.title}</h3>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{item.cars}</p>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="text-2xl font-black text-amber-400 font-mono">{item.price}</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>

              <ul className="space-y-1.5 pt-2 text-[11px] text-slate-400">
                {item.features.map((feat, fIdx) => (
                  <li key={fIdx} className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => onSelectTariff(item.type)}
              className={`mt-5 w-full py-2.5 rounded-xl font-bold text-xs transition ${
                item.isPopular
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
              }`}
            >
              Tanlash
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
