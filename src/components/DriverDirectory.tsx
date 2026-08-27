import React, { useState, useEffect } from 'react';
import {
  Car,
  Star,
  Clock,
  Phone,
  CheckCircle2,
  ShieldCheck,
  Coffee,
  Search,
  Filter,
  Sparkles,
  Award,
  AlertCircle
} from 'lucide-react';
import { Driver, TariffType } from '../types';
import { useLanguage } from '../context/LanguageContext';

interface DriverDirectoryProps {
  onSelectDriverForOrder?: (driver: Driver) => void;
  onOpenDriverRegister?: () => void;
}

export const DriverDirectory: React.FC<DriverDirectoryProps> = ({
  onSelectDriverForOrder,
  onOpenDriverRegister
}) => {
  const { lang } = useLanguage();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTariff, setSelectedTariff] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const fetchDrivers = async () => {
    try {
      const res = await fetch('/api/drivers');
      if (res.ok) {
        const list = await res.json();
        setDrivers(list);
      }
    } catch (e) {
      console.error('Failed to load drivers:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
    const interval = setInterval(fetchDrivers, 6000);
    return () => clearInterval(interval);
  }, []);

  const filteredDrivers = drivers.filter(d => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      (d.user?.fullName || '').toLowerCase().includes(query) ||
      (d.vehicle.make || '').toLowerCase().includes(query) ||
      (d.vehicle.model || '').toLowerCase().includes(query) ||
      (d.vehicle.plateNumber || '').toLowerCase().includes(query);

    const matchesTariff = selectedTariff === 'ALL' || d.vehicle.tariff === selectedTariff;

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ONLINE' && d.isOnline && !d.isOnBreak) ||
      (statusFilter === 'BREAK' && d.isOnBreak) ||
      (statusFilter === 'OFFLINE' && !d.isOnline && !d.isOnBreak);

    return matchesSearch && matchesTariff && matchesStatus;
  });

  const getTariffBadge = (tariff: TariffType) => {
    switch (tariff) {
      case 'COMFORT':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-400 border border-blue-500/30">KOMFORT</span>;
      case 'MINIVAN':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/20 text-purple-400 border border-purple-500/30">MINIVEN (6+)</span>;
      case 'DELIVERY':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">YETKAZIB BERISH</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-400 border border-amber-500/30">STANDART</span>;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold mb-3">
              <ShieldCheck className="w-4 h-4" />
              <span>
                {lang === 'uz' ? 'Tasdiqlangan va Tajribali Haydovchilar' : 'Проверенные водители Санкт-Петербурга'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {lang === 'uz' ? 'Sankt-Peterburg Taxichilar Katalogi' : 'Каталог водителей СПб'}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1.5 max-w-xl">
              {lang === 'uz'
                ? 'Barcha haydovchilar to‘liq tekshirilgan, oylik obunaga ega, avtomobil rasmlari va ish vaqti belgilangan holda xizmat ko‘rsatadi.'
                : 'Все водители проверены, имеют активную подписку и работают по прозрачным тарифам.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenDriverRegister && (
              <button
                onClick={onOpenDriverRegister}
                className="px-5 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm transition shadow-lg shadow-amber-500/20 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{lang === 'uz' ? 'Haydovchi sifatida qo‘shilish' : 'Стать водителем'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder={lang === 'uz' ? 'Haydovchi, mashina yoki davlat raqami...' : 'Поиск по имени, авто, госномеру...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
          />
        </div>

        {/* Tariff filter tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <span className="text-xs font-semibold text-slate-400 mr-1 hidden sm:inline">
            <Filter className="w-3.5 h-3.5 inline mr-1" />
            {lang === 'uz' ? 'Tarif:' : 'Тариф:'}
          </span>
          {[
            { id: 'ALL', label: lang === 'uz' ? 'Barchasi' : 'Все' },
            { id: 'STANDARD', label: 'Standart' },
            { id: 'COMFORT', label: 'Komfort' },
            { id: 'MINIVAN', label: 'Miniven' },
            { id: 'DELIVERY', label: 'Yetkazish' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTariff(t.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedTariff === t.id
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${statusFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
          >
            {lang === 'uz' ? 'Hammasi' : 'Все'}
          </button>
          <button
            onClick={() => setStatusFilter('ONLINE')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${statusFilter === 'ONLINE' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400'}`}
          >
            🟢 {lang === 'uz' ? 'Onlayn' : 'Онлайн'}
          </button>
          <button
            onClick={() => setStatusFilter('BREAK')}
            className={`px-2.5 py-1 rounded-lg font-bold transition ${statusFilter === 'BREAK' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400'}`}
          >
            ☕ {lang === 'uz' ? 'Tanaffus' : 'Перерыв'}
          </button>
        </div>
      </div>

      {/* Drivers Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 animate-pulse space-y-4">
              <div className="h-44 bg-slate-800 rounded-2xl" />
              <div className="h-5 bg-slate-800 rounded w-2/3" />
              <div className="h-4 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-4 text-slate-500">
            <Car className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">
            {lang === 'uz' ? 'Mos haydovchilar topilmadi' : 'Водители не найдены'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {lang === 'uz'
              ? 'Qidiruv parametrlarini o‘zgartiring yoki filtrlarni tozalang.'
              : 'Попробуйте изменить параметры поиска или фильтры.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrivers.map(d => {
            const isAvailable = d.isOnline && !d.isOnBreak;
            return (
              <div
                key={d.id}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition duration-300 flex flex-col group"
              >
                {/* Vehicle Image Container */}
                <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
                  <img
                    src={d.vehicle.photoUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600'}
                    alt={`${d.vehicle.make} ${d.vehicle.model}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {getTariffBadge(d.vehicle.tariff)}
                  </div>

                  <div className="absolute top-3 right-3">
                    {d.isOnBreak ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/90 text-slate-950 backdrop-blur-md flex items-center gap-1 shadow">
                        <Coffee className="w-3.5 h-3.5" />
                        <span>{lang === 'uz' ? 'Vaqti yo‘q (Tanaffus)' : 'Перерыв'}</span>
                      </span>
                    ) : d.isOnline ? (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500 text-slate-950 backdrop-blur-md flex items-center gap-1 shadow animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-slate-950" />
                        <span>{lang === 'uz' ? 'Onlayn (Bo‘sh)' : 'Онлайн'}</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400 backdrop-blur-md">
                        {lang === 'uz' ? 'Oflayn' : 'Офлайн'}
                      </span>
                    )}
                  </div>

                  {/* Plate Number on bottom of photo */}
                  <div className="absolute bottom-3 left-3 bg-white text-slate-950 px-2.5 py-1 rounded-lg font-mono font-black text-xs border border-slate-300 shadow-md tracking-wider flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500">RUS</span>
                    <span>{d.vehicle.plateNumber}</span>
                  </div>

                  {/* Rating Tag */}
                  <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md text-amber-400 px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 border border-amber-500/30">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{d.rating.toFixed(1)}</span>
                    <span className="text-slate-400 text-[10px] font-normal">({d.totalTrips})</span>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-extrabold text-white text-base">
                          {d.vehicle.make} {d.vehicle.model}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {d.vehicle.color} • {d.vehicle.year}-yil • {d.experienceYears} yil staj
                        </p>
                      </div>
                    </div>

                    {/* Driver Profile */}
                    <div className="mt-3.5 pt-3.5 border-t border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={d.user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                          alt={d.user?.fullName}
                          className="w-8 h-8 rounded-xl object-cover border border-slate-700"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-200">{d.user?.fullName || 'Haydovchi'}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{d.user?.phone}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">{lang === 'uz' ? 'Ish vaqti:' : 'График:'}</span>
                        <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 inline" />
                          {d.workingHours ? `${d.workingHours.start} - ${d.workingHours.end}` : '08:00 - 22:00'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reviews summary or note */}
                  {d.reviews && d.reviews.length > 0 ? (
                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800/80 text-[11px] text-slate-300 italic flex items-center gap-2">
                      <span className="text-amber-400 text-xs">“</span>
                      <span className="truncate">{d.reviews[d.reviews.length - 1].comment || 'Ajoyib va muloyim haydovchi'}</span>
                      <span className="text-amber-400 text-xs">”</span>
                    </div>
                  ) : null}

                  {/* Bottom Actions */}
                  <div className="pt-2 flex items-center gap-2">
                    <a
                      href={`tel:${d.user?.phone}`}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                      title={lang === 'uz' ? 'Qo‘ng‘iroq qilish' : 'Позвонить'}
                    >
                      <Phone className="w-4 h-4" />
                    </a>

                    <button
                      onClick={() => {
                        if (onSelectDriverForOrder) onSelectDriverForOrder(d);
                      }}
                      disabled={!isAvailable}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                        isAvailable
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Car className="w-4 h-4" />
                      <span>
                        {d.isOnBreak
                          ? (lang === 'uz' ? 'Vaqti yo‘q (Tanaffus)' : 'На перерыве')
                          : !d.isOnline
                          ? (lang === 'uz' ? 'Hozir oflayn' : 'Офлайн')
                          : (lang === 'uz' ? 'Taksi chaqirish' : 'Заказать эту машину')}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
