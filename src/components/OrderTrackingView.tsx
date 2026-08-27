import React, { useState, useEffect } from 'react';
import {
  Car,
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  Star,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Shield,
  Send,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Order, OrderStatus } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useRealtime } from '../context/RealtimeContext';
import { InteractiveSPBMap } from './InteractiveSPBMap';

interface TrackingProps {
  order: Order;
  onClose: () => void;
}

export const OrderTrackingView: React.FC<TrackingProps> = ({ order: initialOrder, onClose }) => {
  const { t } = useLanguage();
  const { setActiveOrder, addToast, triggerSound } = useRealtime();

  const [order, setOrder] = useState<Order>(initialOrder);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [isRatingSubmitted, setIsRatingSubmitted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [tripProgress, setTripProgress] = useState(0);

  // Sync with real-time updates
  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  // Trip progress animation simulator when IN_PROGRESS
  useEffect(() => {
    let interval: any = null;
    if (order.status === 'IN_PROGRESS') {
      interval = setInterval(() => {
        setTripProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 1.5;
        });
      }, 400);
    } else if (order.status === 'ACCEPTED' || order.status === 'DRIVER_ARRIVING') {
      setTripProgress(20);
    } else if (order.status === 'ARRIVED') {
      setTripProgress(40);
    } else if (order.status === 'COMPLETED') {
      setTripProgress(100);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [order.status]);

  // Confetti on completed
  useEffect(() => {
    if (order.status === 'COMPLETED' && !isRatingSubmitted) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (e) {}
    }
  }, [order.status, isRatingSubmitted]);

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setOrder(updated);
        setActiveOrder(updated);
        if (newStatus === 'COMPLETED') {
          triggerSound('success');
          addToast('🎉 Safar yakunlandi', 'Xizmatimizdan foydalanganingiz uchun rahmat!', 'success');
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRateDriver = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/orders/${order.id}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: reviewComment })
      });
      if (res.ok) {
        setIsRatingSubmitted(true);
        addToast('⭐ Rahmat!', 'Bahoyingiz qabul qilindi', 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  // State machine steps indicator
  const steps: { key: OrderStatus; label: string; icon: string }[] = [
    { key: 'SEARCHING', label: 'Qidirilmoqda', icon: '🔎' },
    { key: 'ACCEPTED', label: 'Haydovchi topildi', icon: '🚕' },
    { key: 'DRIVER_ARRIVING', label: 'Yo‘lda', icon: '📍' },
    { key: 'ARRIVED', label: 'Yetib keldi', icon: '🚗' },
    { key: 'IN_PROGRESS', label: 'Safarda', icon: '🛣' },
    { key: 'COMPLETED', label: 'Tugadi', icon: '✅' }
  ];

  const getStepIndex = (status: OrderStatus) => {
    const map: Record<OrderStatus, number> = {
      NEW: 0,
      SEARCHING: 0,
      ACCEPTED: 1,
      DRIVER_ARRIVING: 2,
      ARRIVED: 3,
      IN_PROGRESS: 4,
      COMPLETED: 5,
      CANCELLED: -1,
      EXPIRED: -1
    };
    return map[status] ?? 0;
  };

  const currentStepIdx = getStepIndex(order.status);

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 shadow-2xl space-y-6">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-amber-500/20 text-amber-400 font-mono font-bold text-xs px-2.5 py-1 rounded-lg">
              #{order.orderNumber}
            </span>
            <h2 className="text-lg font-bold text-white">Buyurtma holati</h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date(order.createdAt).toLocaleTimeString()} · {order.tariff} tarifi
          </p>
        </div>

        <button
          onClick={onClose}
          className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition"
        >
          Yopish
        </button>
      </div>

      {/* State Progress Bar */}
      {order.status !== 'CANCELLED' ? (
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80">
          <div className="grid grid-cols-6 gap-1 relative">
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={step.key} className="flex flex-col items-center text-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 ring-4 ring-amber-500/20 scale-110'
                        : isPast
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-800 text-slate-500'
                    }`}
                  >
                    {isPast ? '✓' : step.icon}
                  </div>
                  <span
                    className={`text-[10px] mt-1.5 line-clamp-1 ${
                      isCurrent ? 'text-amber-400 font-bold' : isPast ? 'text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-rose-950/40 border border-rose-800 p-4 rounded-2xl text-rose-300 text-sm flex items-center gap-3">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="font-bold">Buyurtma bekor qilingan</p>
            <p className="text-xs text-rose-300/80">{order.cancelReason || 'Bekor qilish sababi ko‘rsatilmadi'}</p>
          </div>
        </div>
      )}

      {/* Map & Live Visualizer */}
      <div className="relative">
        <InteractiveSPBMap
          from={order.from}
          to={order.to}
          tripProgress={tripProgress}
          isDriving={order.status === 'IN_PROGRESS' || order.status === 'DRIVER_ARRIVING'}
          carStatusText={
            order.status === 'SEARCHING'
              ? 'Haydovchi qidirilmoqda...'
              : order.status === 'ACCEPTED'
              ? 'Haydovchi buyurtmani qabul qildi'
              : order.status === 'DRIVER_ARRIVING'
              ? 'Haydovchi siz tomonga yo‘lda'
              : order.status === 'ARRIVED'
              ? 'Haydovchi manzilga yetib keldi'
              : order.status === 'IN_PROGRESS'
              ? 'Safar davom etmoqda...'
              : 'Safar yakunlandi'
          }
        />
      </div>

      {/* Driver Card & Vehicle Information (If Assigned) */}
      {order.driver ? (
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src={order.driver.user?.avatarUrl || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'}
              alt={order.driver.user?.fullName}
              className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-500 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">{order.driver.user?.fullName || 'Farrux Rustamov'}</h3>
                <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-md flex items-center gap-1 font-bold">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {order.driver.rating || 4.96}
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {order.driver.vehicle.make} {order.driver.vehicle.model} · <span className="text-slate-400">{order.driver.vehicle.color}</span>
              </p>
              <div className="inline-block bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-[11px] font-mono text-amber-300 font-bold mt-1">
                {order.driver.vehicle.plateNumber}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <a
              href={`tel:${order.driver.user?.phone || '+79217778899'}`}
              className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <Phone className="w-4 h-4" />
              {t.tracking.call}
            </a>
            <a
              href={`https://t.me/${order.driver.user?.username || 'farrukh_taxi'}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 md:flex-initial bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition"
            >
              <MessageSquare className="w-4 h-4" />
              {t.tracking.telegramChat}
            </a>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center animate-spin">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{t.tracking.searching}</p>
            <p className="text-xs text-slate-400">{t.tracking.searchingDesc}</p>
          </div>
        </div>
      )}

      {/* Trip Details & Fare Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-[11px]">Qayerdan:</span>
              <span className="text-slate-200 font-medium">{order.from.address}</span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Navigation className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-[11px]">Qayerga:</span>
              <span className="text-slate-200 font-medium">{order.to.address}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between border-t sm:border-t-0 sm:border-l border-slate-800 pt-2 sm:pt-0 sm:pl-4">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Masofa / Vaqt:</span>
            <span className="text-slate-200 font-mono font-semibold">
              {order.estimatedDistanceKm} km · ~{order.estimatedDurationMin} daq
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">To‘lov usuli:</span>
            <span className="text-amber-400 font-semibold">{order.paymentMethod}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <span className="text-slate-300 font-bold">Jami narx:</span>
            <span className="text-xl font-extrabold text-amber-400 font-mono">{order.finalPrice} ₽</span>
          </div>
        </div>
      </div>

      {/* Simulation / Action Controls for Demo & Live Operation */}
      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Jonli sinov / Demo boshqaruvi:
          </span>
          <span className="font-mono text-slate-500">Status: {order.status}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {order.status === 'SEARCHING' && (
            <button
              onClick={() => handleUpdateStatus('ACCEPTED')}
              disabled={isUpdating}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3 py-2 rounded-xl transition"
            >
              🚕 Haydovchi qabul qilsin
            </button>
          )}

          {order.status === 'ACCEPTED' && (
            <button
              onClick={() => handleUpdateStatus('ARRIVED')}
              disabled={isUpdating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition"
            >
              🚗 Haydovchi yetib keldi
            </button>
          )}

          {order.status === 'ARRIVED' && (
            <button
              onClick={() => handleUpdateStatus('IN_PROGRESS')}
              disabled={isUpdating}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition"
            >
              🛣 Safarni boshlash
            </button>
          )}

          {order.status === 'IN_PROGRESS' && (
            <button
              onClick={() => handleUpdateStatus('COMPLETED')}
              disabled={isUpdating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition"
            >
              ✅ Safarni yakunlash
            </button>
          )}

          {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
            <button
              onClick={() => handleUpdateStatus('CANCELLED')}
              disabled={isUpdating}
              className="bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-200 text-xs px-3 py-2 rounded-xl border border-slate-700 transition"
            >
              {t.tracking.cancelOrder}
            </button>
          )}
        </div>
      </div>

      {/* Completed Rating Form */}
      {order.status === 'COMPLETED' && !isRatingSubmitted && (
        <form onSubmit={handleRateDriver} className="bg-gradient-to-br from-slate-950 to-amber-950/20 p-5 rounded-2xl border border-amber-500/40 space-y-3">
          <div className="text-center">
            <h3 className="text-base font-bold text-white">{t.tracking.rateDriver}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{t.tracking.rateDesc}</p>
          </div>

          <div className="flex justify-center gap-2 py-1">
            {[1, 2, 3, 4, 5].map(star => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 transition transform hover:scale-125"
              >
                <Star
                  className={`w-7 h-7 ${
                    star <= rating
                      ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]'
                      : 'text-slate-600'
                  }`}
                />
              </button>
            ))}
          </div>

          <input
            type="text"
            value={reviewComment}
            onChange={(e) => setReviewComment(e.target.value)}
            placeholder="Haydovchi haqida iliq so‘zlaringiz (ixtiyoriy)..."
            className="w-full bg-slate-900 text-slate-100 text-xs rounded-xl px-3 py-2.5 border border-slate-700 focus:border-amber-500 focus:outline-none"
          />

          <button
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl shadow-lg transition"
          >
            {t.tracking.submitRating}
          </button>
        </form>
      )}

      {isRatingSubmitted && (
        <div className="bg-emerald-950/50 border border-emerald-800 p-4 rounded-2xl text-center text-emerald-300 text-xs">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
          <p className="font-bold">Fikringiz uchun tashakkur!</p>
          <p className="text-emerald-400/80">Sizning bahoyingiz haydovchi profiliga qo‘shildi.</p>
        </div>
      )}
    </div>
  );
};
