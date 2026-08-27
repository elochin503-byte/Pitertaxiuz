import React, { useState } from 'react';
import {
  X,
  Car,
  CreditCard,
  Upload,
  CheckCircle2,
  Clock,
  Shield,
  FileText,
  Sparkles,
  AlertCircle,
  Image as ImageIcon,
  Copy
} from 'lucide-react';
import { TariffType } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useRealtime } from '../context/RealtimeContext';

interface DriverRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DriverRegistrationModal: React.FC<DriverRegistrationModalProps> = ({ isOpen, onClose }) => {
  const { lang } = useLanguage();
  const { addToast } = useRealtime();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('+7 ');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleMake, setVehicleMake] = useState('Toyota');
  const [vehicleModel, setVehicleModel] = useState('Camry');
  const [vehicleColor, setVehicleColor] = useState('Oq / Белый');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleYear, setVehicleYear] = useState('2022');
  const [tariff, setTariff] = useState<TariffType>('STANDARD');
  const [experienceYears, setExperienceYears] = useState('4');
  const [workingHoursStart, setWorkingHoursStart] = useState('08:00');
  const [workingHoursEnd, setWorkingHoursEnd] = useState('22:00');
  const [carPhotoUrl, setCarPhotoUrl] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isCopiedCard, setIsCopiedCard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const targetCard = "2202 2033 4455 6677";

  const handleCopyCard = () => {
    navigator.clipboard.writeText(targetCard.replace(/\s/g, ''));
    setIsCopiedCard(true);
    setTimeout(() => setIsCopiedCard(false), 2000);
  };

  const handleSampleReceipt = () => {
    // Quick helper for easy demonstration
    setReceiptUrl('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600');
  };

  const handleSampleCarPhoto = () => {
    setCarPhotoUrl('https://images.unsplash.com/photo-1550355291-bbee04a92027?w=600');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!vehiclePlate.trim()) {
      setErrorMsg(lang === 'uz' ? 'Davlat raqamini kiriting' : 'Введите госномер авто');
      return;
    }

    if (!receiptUrl) {
      setErrorMsg(lang === 'uz' ? 'To‘lov cheki rasmini joylashtiring' : 'Прикрепите фото чека об оплате');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/drivers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          licenseNumber,
          vehicleMake,
          vehicleModel,
          vehicleColor,
          vehiclePlate,
          vehicleYear,
          tariff,
          experienceYears,
          workingHoursStart,
          workingHoursEnd,
          carPhotoUrl: carPhotoUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600',
          receiptUrl
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Arizani yuborishda xatolik');

      setIsSuccess(true);
      addToast(
        lang === 'uz' ? 'Arizangiz qabul qilindi' : 'Заявка принята',
        lang === 'uz' ? 'To‘lov cheki adminga yuborildi. Tasdiqlangach to‘liq faollashadi.' : 'Чек отправлен администратору на проверку.',
        'success'
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Xatolik yuz berdi');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 my-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/70 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-3xl flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-extrabold text-white">
              {lang === 'uz' ? 'Arizangiz muvaffaqiyatli qabul qilindi!' : 'Заявка успешно отправлена!'}
            </h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              {lang === 'uz'
                ? 'Sizning to‘lov chekingiz va avtomobil ma‘lumotlaringiz adminga yuborildi. Admin tekshirib tasdiqlagach, siz buyurtmalarni qabul qilishni boshlashingiz mumkin.'
                : 'Ваш чек и данные отправлены администратору. После одобрения вы сможете принимать заказы.'}
            </p>
            <div className="pt-4">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl transition"
              >
                {lang === 'uz' ? 'Tushunarli' : 'Понятно'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-white">
                  {lang === 'uz' ? 'Haydovchi sifatida ro‘yxatdan o‘tish' : 'Регистрация нового водителя'}
                </h2>
                <p className="text-xs text-slate-400">
                  {lang === 'uz'
                    ? 'Oylik 500 ₽ obuna to‘lovi va 0% komissiya bilan erkin ishlang.'
                    : 'Работайте без скрытых комиссий с фиксированной подпиской 500 ₽/мес.'}
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Section 1: Personal info */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  1. {lang === 'uz' ? 'Shaxsiy ma‘lumotlar' : 'Личные данные'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'uz' ? 'F.I.SH (Ism-familiya)' : 'ФИО'} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jasur Alimov"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'uz' ? 'Telefon raqam' : 'Телефон'} *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+7 (999) 111-22-33"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'uz' ? 'Haydovchilik guvohnomasi (Prava)' : 'Номер ВУ'} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="78 99 123456"
                      value={licenseNumber}
                      onChange={e => setLicenseNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'uz' ? 'Haydovchilik staji (yil)' : 'Стаж вождения'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={experienceYears}
                      onChange={e => setExperienceYears(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Vehicle & Class */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  2. {lang === 'uz' ? 'Avtomobil ma‘lumotlari va Toifasi' : 'Данные автомобиля'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'uz' ? 'Rusumi (Make)' : 'Марка'} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Toyota / Kia / Hyundai"
                      value={vehicleMake}
                      onChange={e => setVehicleMake(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'uz' ? 'Modeli' : 'Модель'} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Camry / K5 / Solaris"
                      value={vehicleModel}
                      onChange={e => setVehicleModel(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'uz' ? 'Yili' : 'Год выпуска'}
                    </label>
                    <input
                      type="number"
                      placeholder="2021"
                      value={vehicleYear}
                      onChange={e => setVehicleYear(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'uz' ? 'Davlat raqami (Plate)' : 'Госномер'} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="O 777 OO 178"
                      value={vehiclePlate}
                      onChange={e => setVehiclePlate(e.target.value.toUpperCase())}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono tracking-wider"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'uz' ? 'Tarif toifasi (Class)' : 'Класс тарифа'}
                    </label>
                    <select
                      value={tariff}
                      onChange={e => setTariff(e.target.value as TariffType)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                    >
                      <option value="STANDARD">Standart (Ekonom)</option>
                      <option value="COMFORT">Komfort</option>
                      <option value="MINIVAN">Miniven (6+ kishi)</option>
                      <option value="DELIVERY">Yetkazib berish</option>
                    </select>
                  </div>
                </div>

                {/* Car Photo URL */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      {lang === 'uz' ? 'Mashina rasmi (URL yoki foto)' : 'Фото автомобиля'}
                    </label>
                    <button
                      type="button"
                      onClick={handleSampleCarPhoto}
                      className="text-[11px] text-amber-400 hover:underline"
                    >
                      {lang === 'uz' ? 'Avto-namuna tanlash' : 'Выбрать пример'}
                    </button>
                  </div>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={carPhotoUrl}
                    onChange={e => setCarPhotoUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 text-slate-300"
                  />
                </div>
              </div>

              {/* Section 3: Working Hours */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>3. {lang === 'uz' ? 'Ish vaqti grafigi' : 'График работы'}</span>
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'uz' ? 'Ish boshlanishi' : 'Начало смены'}
                    </label>
                    <input
                      type="time"
                      value={workingHoursStart}
                      onChange={e => setWorkingHoursStart(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {lang === 'uz' ? 'Ish tugashi' : 'Конец смены'}
                    </label>
                    <input
                      type="time"
                      value={workingHoursEnd}
                      onChange={e => setWorkingHoursEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Payment card & receipt upload */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>4. {lang === 'uz' ? 'Oylik obuna to‘lovi (500 ₽) va Chek' : 'Оплата подписки (500 ₽)'}</span>
                </h4>

                {/* Card details box */}
                <div className="bg-gradient-to-r from-amber-500/15 via-slate-950 to-slate-950 border border-amber-500/30 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300 font-semibold">
                      {lang === 'uz' ? 'To‘lov qabul qiluvchi karta:' : 'Карта для оплаты:'}
                    </span>
                    <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                      500 ₽ / oy
                    </span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                    <span className="font-mono text-sm sm:text-base font-bold text-white tracking-wider">
                      {targetCard}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCard}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-bold flex items-center gap-1 transition"
                    >
                      {isCopiedCard ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">{lang === 'uz' ? 'Nusxalandi' : 'Скопировано'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>{lang === 'uz' ? 'Nusxalash' : 'Копировать'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'uz'
                      ? 'Sberbank / T-Bank orqali 500 ₽ o‘tkazing va chek skrinshotini quyida joylashtiring.'
                      : 'Переведите 500 ₽ на указанную карту и прикрепите скриншот чека.'}
                  </p>
                </div>

                {/* Receipt Photo Input */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-300">
                      {lang === 'uz' ? 'To‘lov cheki rasmi (Chek rasmi joylashtirish)' : 'Скриншот чека об оплате'} *
                    </label>
                    <button
                      type="button"
                      onClick={handleSampleReceipt}
                      className="text-[11px] text-amber-400 hover:underline"
                    >
                      {lang === 'uz' ? 'Namuna chek biriktirish' : 'Прикрепить образец'}
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="https://... yoki chek rasmi havolasi"
                    value={receiptUrl}
                    onChange={e => setReceiptUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                  {receiptUrl && (
                    <div className="mt-2 flex items-center gap-2 text-emerald-400 text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{lang === 'uz' ? 'Chek biriktirildi. Admin tasdiqlashi uchun yuboriladi.' : 'Чек прикреплен'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm rounded-xl transition shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 mt-4"
              >
                {isLoading ? (
                  <span className="animate-pulse">{lang === 'uz' ? 'Yuborilmoqda...' : 'Отправка...'}</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{lang === 'uz' ? 'Arizani Adminga Yuborish' : 'Отправить на проверку администратору'}</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
