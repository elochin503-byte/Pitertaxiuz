import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Navigation,
  Clock,
  Car,
  Tag,
  MessageSquare,
  Sparkles,
  Shield,
  CreditCard,
  Banknote,
  Percent,
  CheckCircle2,
  AlertCircle,
  Phone,
  User,
  Star,
  Zap,
  Info
} from 'lucide-react';
import { TariffType, Order, Driver } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';

interface QuickOrderWidgetProps {
  initialTariff?: TariffType;
  onOrderSuccess?: (order: Order) => void;
  preselectedDriver?: Driver | null;
  onClearPreselectedDriver?: () => void;
}

export const QuickOrderWidget: React.FC<QuickOrderWidgetProps> = ({
  initialTariff = 'STANDARD',
  onOrderSuccess,
  preselectedDriver,
  onClearPreselectedDriver
}) => {
  const { lang, t } = useLanguage();
  const { user } = useAuth();
  const { addToast, setActiveOrder } = useRealtime();

  // Location text states allowing full free manual typing
  const [fromAddress, setFromAddress] = useState('Metro Vosstaniya, Ligovskiy pr. 43');
  const [toAddress, setToAddress] = useState('Pulkovo Aeroport, Terminal 1');
  const [tariff, setTariff] = useState<TariffType>(initialTariff);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'BONUS'>('CASH');
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoDiscount, setPromoDiscount] = useState<number>(0);
  const [promoMessage, setPromoMessage] = useState<string>('');
  const [comment, setComment] = useState('');
  const [clientPhone, setClientPhone] = useState(user?.phone || '+7 999 123 4567');
  const [clientName, setClientName] = useState(user?.fullName || 'Mijoz');

  // Options
  const [hasLuggage, setHasLuggage] = useState(false);
  const [hasChildSeat, setHasChildSeat] = useState(false);
  const [wantsAC, setWantsAC] = useState(false);

  // States for matching
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [noDriverError, setNoDriverError] = useState<string | null>(null);
  const [matchedDriver, setMatchedDriver] = useState<Driver | null>(preselectedDriver || null);
  const [matchedAiReason, setMatchedAiReason] = useState<string | null>(null);

  // Popular suggested spots for one-click fill
  const quickSuggestions = [
    { label: 'Vosstaniya', address: 'Metro Ploshchad Vosstaniya, Nevskiy pr.' },
    { label: 'Pulkovo (Aeroport)', address: 'Pulkovo Aeroport, Terminal 1' },
    { label: 'Devyatkino', address: 'Metro Devyatkino, Murino' },
    { label: 'Sadovaya (Apraks)', address: 'Metro Sadovaya, Sadovaya ul. 28' },
    { label: 'Kupchino', address: 'Metro Kupchino, Balkanskaya pl.' },
    { label: 'Begovaya', address: 'Metro Begovaya, Savushkina ul.' }
  ];

  // Base pricing calculation
  const getBasePrice = () => {
    let base = 350;
    if (tariff === 'COMFORT') base = 500;
    if (tariff === 'MINIVAN') base = 800;
    if (tariff === 'DELIVERY') base = 300;

    // Extra distance simulation
    if (toAddress.toLowerCase().includes('pulkovo') || fromAddress.toLowerCase().includes('pulkovo')) {
      base += 450;
    }
    if (toAddress.toLowerCase().includes('devyatkino') || fromAddress.toLowerCase().includes('devyatkino')) {
      base += 200;
    }

    if (hasLuggage) base += 50;
    if (hasChildSeat) base += 100;
    if (wantsAC) base += 50;

    return base;
  };

  const currentPrice = Math.max(100, getBasePrice() - promoDiscount);

  // Handle Promo validation
  const handleApplyPromo = async () => {
    if (!promoCodeInput.trim()) return;
    try {
      const res = await fetch('/api/promocodes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCodeInput.trim(), amount: getBasePrice() })
      });
      const data = await res.json();
      if (data.valid) {
        setPromoDiscount(data.discount);
        setPromoMessage(`✅ -${data.discount} ₽ promokod qo‘llandi!`);
      } else {
        setPromoDiscount(0);
        setPromoMessage(`❌ ${data.message}`);
      }
    } catch (e) {
      setPromoMessage('Promokodni tekshirishda xatolik');
    }
  };

  // Perform AI Driver Matching & Order creation
  const handleBookRide = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoDriverError(null);
    setMatchedDriver(null);
    setIsAiAnalyzing(true);

    try {
      // 1. Ask server AI dispatch for a real available driver matching criteria
      const aiRes = await fetch('/api/orders/ai-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: { address: fromAddress },
          to: { address: toAddress },
          tariff,
          price: currentPrice
        })
      });

      const aiData = await aiRes.json();

      if (!aiData.matched || !aiData.driver) {
        // Explicit required message if no driver available
        const errorText = aiData.message || (lang === 'uz' ? 'Uzur, hozirda bu yerga taksi yo‘q' : 'Извините, сейчас в этом направлении нет свободных машин.');
        setNoDriverError(errorText);
        setIsAiAnalyzing(false);
        return;
      }

      // Real driver found!
      const assigned = aiData.driver;
      setMatchedDriver(assigned);
      setMatchedAiReason(aiData.reason || 'AI optimal haydovchini aniqladi');

      // 2. Create the real order in Database
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: user?.id || 'usr_client_1',
          clientName: clientName || user?.fullName || 'Mijoz',
          clientPhone: clientPhone || user?.phone || '+7 999 123 4567',
          clientTelegramId: user?.telegramId,
          from: { address: fromAddress, lat: 59.9311, lng: 30.3609 },
          to: { address: toAddress, lat: 59.7997, lng: 30.2731 },
          tariff,
          price: getBasePrice(),
          promoCode: promoDiscount > 0 ? promoCodeInput : undefined,
          comment,
          options: {
            luggage: hasLuggage,
            childSeat: hasChildSeat,
            airConditioner: wantsAC
          },
          paymentMethod,
          assignedDriverId: assigned.id
        })
      });

      const newOrder = await orderRes.json();
      setActiveOrder(newOrder);

      addToast(
        lang === 'uz' ? 'Taksi muvaffaqiyatli topildi!' : 'Водитель найден!',
        `${assigned.user?.fullName} (${assigned.vehicle.make} ${assigned.vehicle.model} - ${assigned.vehicle.plateNumber})`,
        'success'
      );

      if (onOrderSuccess) {
        onOrderSuccess(newOrder);
      }
    } catch (err: any) {
      setNoDriverError(err.message || 'Buyurtma berishda xatolik');
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  return (
    <div id="order-widget-box" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base sm:text-lg">
              {lang === 'uz' ? 'Tezkor Taksi Buyurtma Qilish' : lang === 'ru' ? 'Быстрый заказ такси' : 'Quick Taxi Booking'}
            </h3>
            <p className="text-xs text-slate-400">
              {lang === 'uz' ? 'AI tahlil orqali faqat haqiqiy bo‘sh haydovchi biriktiriladi' : lang === 'ru' ? 'Умный подбор реального водителя' : 'Smart AI matching with verified active drivers'}
            </p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-xl text-amber-400 font-mono font-bold text-xs flex items-center gap-1">
          <Zap className="w-3.5 h-3.5" />
          <span>AI Dispatch</span>
        </div>
      </div>

      {/* Preselected Driver Notice if user chose from catalog */}
      {preselectedDriver && (
        <div className="mb-5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={preselectedDriver.vehicle.photoUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=200'}
              alt="Car"
              className="w-12 h-10 rounded-xl object-cover border border-amber-500/40"
            />
            <div>
              <p className="text-xs font-bold text-white">
                {preselectedDriver.vehicle.make} {preselectedDriver.vehicle.model} ({preselectedDriver.vehicle.plateNumber})
              </p>
              <p className="text-[11px] text-amber-400">
                {preselectedDriver.user?.fullName} • {preselectedDriver.rating} ⭐
              </p>
            </div>
          </div>
          {onClearPreselectedDriver && (
            <button
              onClick={onClearPreselectedDriver}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
            >
              {lang === 'uz' ? 'Boshqa avto' : lang === 'ru' ? 'Другое авто' : 'Change car'}
            </button>
          )}
        </div>
      )}

      {/* No driver error / Alert banner */}
      {noDriverError && (
        <div className="mb-5 p-4 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-rose-300 text-xs sm:text-sm space-y-2 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-rose-200">{noDriverError}</p>
              <p className="text-xs text-rose-300/80 mt-1">
                {lang === 'uz'
                  ? 'Iltimos boshqa tarifni (masalan: Komfort yoki Miniven) tanlab ko‘ring yoki 2-3 daqiqadan so‘ng qayta urinib ko‘ring.'
                  : lang === 'ru'
                  ? 'Попробуйте сменить класс авто или повторите заказ через пару минут.'
                  : 'Please try another tariff class (e.g. Comfort or Minivan) or retry in a few moments.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleBookRide} className="space-y-5">
        {/* Section: From & To Locations (Free text input supported) */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                {lang === 'uz' ? 'Qayerdan? (Pickup manzili)' : lang === 'ru' ? 'Откуда?' : 'From (Pickup)'} *
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                {lang === 'uz' ? 'Qo‘lda yozishingiz mumkin' : lang === 'ru' ? 'Можно ввести вручную' : 'Custom typing supported'}
              </span>
            </label>
            <input
              type="text"
              required
              placeholder={lang === 'uz' ? 'Metro bekati, ko‘cha yoki bino raqami...' : lang === 'ru' ? 'Станция метро или адрес...' : 'Metro station or street address...'}
              value={fromAddress}
              onChange={e => setFromAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                {lang === 'uz' ? 'Qayerga? (Borish manzili)' : lang === 'ru' ? 'Куда?' : 'To (Destination)'} *
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                {lang === 'uz' ? 'Istalgan manzilni yozing' : lang === 'ru' ? 'Введите адрес назначения' : 'Any destination...'}
              </span>
            </label>
            <input
              type="text"
              required
              placeholder={lang === 'uz' ? 'Aeroport, bozor, vokzal yoki uy manzili...' : lang === 'ru' ? 'Куда едем?...' : 'Airport, station or hotel address...'}
              value={toAddress}
              onChange={e => setToAddress(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-2xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
            />
          </div>

          {/* Quick presets badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <span className="text-slate-500 shrink-0">{lang === 'uz' ? 'Tezkor:' : lang === 'ru' ? 'Быстро:' : 'Quick:'}</span>
            {quickSuggestions.map(q => (
              <button
                type="button"
                key={q.label}
                onClick={() => setToAddress(q.address)}
                className="px-2.5 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 shrink-0 transition cursor-pointer"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section: Tariffs selector */}
        <div className="space-y-2 pt-2">
          <label className="block text-xs font-semibold text-slate-300">
            {lang === 'uz' ? 'Tarif toifasi' : lang === 'ru' ? 'Класс поездки' : 'Service Class'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'STANDARD', name: lang === 'uz' ? 'Standart' : lang === 'ru' ? 'Стандарт' : 'Standard', desc: lang === 'uz' ? 'Tejamkor' : lang === 'ru' ? 'Эконом' : 'Economy', icon: '🚕', fromPrice: '350 ₽' },
              { id: 'COMFORT', name: lang === 'uz' ? 'Komfort' : lang === 'ru' ? 'Комфорт' : 'Comfort', desc: lang === 'uz' ? 'Qulay yangi avto' : lang === 'ru' ? 'Свежие авто' : 'Modern car', icon: '✨', fromPrice: '500 ₽' },
              { id: 'MINIVAN', name: lang === 'uz' ? 'Miniven' : lang === 'ru' ? 'Минивэн' : 'Minivan', desc: lang === 'uz' ? '6+ o‘rindiq' : lang === 'ru' ? '6+ мест' : '6+ seats', icon: '🚐', fromPrice: '800 ₽' },
              { id: 'DELIVERY', name: lang === 'uz' ? 'Yetkazish' : lang === 'ru' ? 'Доставка' : 'Delivery', desc: lang === 'uz' ? 'Posilka & hujjat' : lang === 'ru' ? 'Посылки' : 'Parcels', icon: '📦', fromPrice: '300 ₽' }
            ].map(tItem => {
              const isSelected = tariff === tItem.id;
              return (
                <button
                  type="button"
                  key={tItem.id}
                  onClick={() => setTariff(tItem.id as TariffType)}
                  className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-white shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg">{tItem.icon}</span>
                    <span className="text-[10px] font-mono font-bold text-amber-400">{tItem.fromPrice}</span>
                  </div>
                  <div className="mt-2">
                    <p className={`text-xs font-bold ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                      {tItem.name}
                    </p>
                    <p className="text-[10px] text-slate-500">{tItem.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section: Client contact info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {lang === 'uz' ? 'Ismingiz' : lang === 'ru' ? 'Ваше имя' : 'Your Name'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {lang === 'uz' ? 'Telefon raqamingiz' : lang === 'ru' ? 'Номер телефона' : 'Phone Number'} *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="tel"
                required
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Extra options & Promocode */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setHasLuggage(!hasLuggage)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                hasLuggage ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              🧳 {lang === 'uz' ? 'Katta bagaj (+50 ₽)' : lang === 'ru' ? 'Багаж (+50 ₽)' : 'Luggage (+50 ₽)'}
            </button>
            <button
              type="button"
              onClick={() => setHasChildSeat(!hasChildSeat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                hasChildSeat ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              👶 {lang === 'uz' ? 'Bolalar o‘rindig‘i (+100 ₽)' : lang === 'ru' ? 'Детское кресло (+100 ₽)' : 'Child seat (+100 ₽)'}
            </button>
            <button
              type="button"
              onClick={() => setWantsAC(!wantsAC)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                wantsAC ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold' : 'bg-slate-950 text-slate-400 border-slate-800'
              }`}
            >
              ❄️ {lang === 'uz' ? 'Konditsioner (+50 ₽)' : lang === 'ru' ? 'Кондиционер (+50 ₽)' : 'A/C (+50 ₽)'}
            </button>
          </div>

          {/* Promocode input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder={lang === 'uz' ? 'Promokod (masalan: PITER10)' : lang === 'ru' ? 'Промокод' : 'Promo code'}
                value={promoCodeInput}
                onChange={e => setPromoCodeInput(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 uppercase font-mono"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyPromo}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              {lang === 'uz' ? 'Qo‘llash' : lang === 'ru' ? 'Применить' : 'Apply'}
            </button>
          </div>
          {promoMessage && (
            <p className="text-[11px] font-semibold text-amber-400">{promoMessage}</p>
          )}

          {/* Comment */}
          <div>
            <input
              type="text"
              placeholder={lang === 'uz' ? 'Haydovchiga izoh (masalan: 3-podyezd oldida, shoshilinch)...' : lang === 'ru' ? 'Комментарий водителю...' : 'Note for driver (optional)...'}
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Pricing Summary & Submit */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 block">{lang === 'uz' ? 'Safar narxi:' : lang === 'ru' ? 'Стоимость поездки:' : 'Estimated Fare:'}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-amber-400 font-mono">
                {currentPrice} ₽
              </span>
              {promoDiscount > 0 && (
                <span className="text-xs text-slate-500 line-through font-mono">
                  {getBasePrice()} ₽
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isAiAnalyzing}
            className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm rounded-2xl transition shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isAiAnalyzing ? (
              <>
                <Sparkles className="w-4 h-4 animate-spin text-slate-950" />
                <span>{lang === 'uz' ? 'AI haydovchini aniqlamoqda...' : lang === 'ru' ? 'Поиск водителя...' : 'AI matching driver...'}</span>
              </>
            ) : (
              <>
                <Car className="w-4 h-4" />
                <span>{lang === 'uz' ? 'Haqiqiy Taksi Chaqirish' : lang === 'ru' ? 'Заказать такси' : 'Book Real Taxi'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
