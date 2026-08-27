import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Car,
  Clock,
  Coffee,
  Power,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Upload,
  Phone,
  Navigation,
  MapPin,
  Star,
  Sparkles,
  Shield,
  RotateCw,
  Copy,
  Radio,
  Compass,
  Crosshair,
  Volume2,
  Check,
  X,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Driver, Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useRealtime } from '../context/RealtimeContext';
import { SPB_LOCATIONS, calculateDistanceKm } from '../../server/db';

export const DriverDashboard: React.FC = () => {
  const { user, driver: authDriver, refreshAuth } = useAuth();
  const { lang, t } = useLanguage();
  const { addToast, triggerSound } = useRealtime();

  const [driver, setDriver] = useState<Driver | null>(authDriver);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [myCurrentOrder, setMyCurrentOrder] = useState<Order | null>(null);

  // Radar & Real-time Order Offer state
  const [incomingOffer, setIncomingOffer] = useState<Order | null>(null);
  const [offerCountdown, setOfferCountdown] = useState<number>(30);
  const [selectedRadius, setSelectedRadius] = useState<number>(15); // in km (0 = all)
  const [isAcceptingOrder, setIsAcceptingOrder] = useState(false);
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);

  // Shift & working hours state
  const [shiftStart, setShiftStart] = useState('08:00');
  const [shiftEnd, setShiftEnd] = useState('22:00');
  const [isSavingHours, setIsSavingHours] = useState(false);

  // Subscription receipt upload state
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState('');
  const [isSubmittingReceipt, setIsSubmittingReceipt] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const offerTimerRef = useRef<any>(null);

  const fetchDriverData = useCallback(async () => {
    try {
      const dId = driver?.id || authDriver?.id || 'drv_1';
      const [dRes, oRes, assignedRes] = await Promise.all([
        fetch(`/api/drivers/${dId}`),
        fetch(`/api/orders/nearby?lat=${driver?.currentLat || 59.9343}&lng=${driver?.currentLng || 30.3351}&radius=${selectedRadius}`),
        fetch(`/api/orders?driverId=${dId}`)
      ]);

      if (dRes.ok) {
        const dData = await dRes.json();
        setDriver(dData);
        if (dData.workingHours) {
          setShiftStart(dData.workingHours.start);
          setShiftEnd(dData.workingHours.end);
        }
      }

      if (oRes.ok) {
        const oList: Order[] = await oRes.json();
        setActiveOrders(oList);
      }

      if (assignedRes.ok) {
        const myOrders: Order[] = await assignedRes.json();
        const ongoing = myOrders.find(o =>
          ['ACCEPTED', 'DRIVER_ARRIVING', 'ARRIVED', 'IN_PROGRESS'].includes(o.status)
        );
        setMyCurrentOrder(ongoing || null);
      }
    } catch (e) {
      console.error('Error fetching driver state:', e);
    }
  }, [driver?.id, driver?.currentLat, driver?.currentLng, authDriver?.id, selectedRadius]);

  // Initial load and periodic refresh
  useEffect(() => {
    fetchDriverData();
    const interval = setInterval(fetchDriverData, 5000);
    return () => clearInterval(interval);
  }, [fetchDriverData]);

  // Real-time SSE event listener for instant order broadcasts & concurrency updates
  useEffect(() => {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          const { type, data } = payload;

          if (type === 'ORDER_CREATED') {
            // Check if current driver is eligible to receive this order
            if (driver && driver.isOnline && !driver.isOnBreak && driver.status === 'APPROVED') {
              // Calculate distance to order pickup
              const dist = calculateDistanceKm(
                driver.currentLat || 59.9343,
                driver.currentLng || 30.3351,
                data.from?.lat || 59.9311,
                data.from?.lng || 30.3609
              );

              // If within coverage radius
              if (selectedRadius <= 0 || dist <= (data.searchRadiusKm || selectedRadius || 20)) {
                // If not currently busy on an order
                if (!myCurrentOrder) {
                  const orderWithDist: Order = {
                    ...data,
                    distanceToPickupKm: dist
                  };
                  setIncomingOffer(orderWithDist);
                  setOfferCountdown(30);
                  triggerSound('alert');
                  addToast(
                    '⚡ Yangi Buyurtma Radarda!',
                    `${dist} km masofada #${data.orderNumber}: ${data.from?.address} -> ${data.to?.address} (${data.finalPrice} ₽)`,
                    'order'
                  );
                }
              }
            }
            fetchDriverData();
          } else if (type === 'ORDER_ACCEPTED') {
            // Another driver accepted this order!
            if (incomingOffer && incomingOffer.id === data.orderId) {
              if (data.driverId !== driver?.id) {
                addToast(
                  '⚠️ Buyurtma olingan',
                  'Ushbu buyurtmani boshqa haydovchi qabul qildi.',
                  'info'
                );
                setIncomingOffer(null);
              }
            }
            fetchDriverData();
          } else if (type === 'ORDER_UPDATED') {
            if (myCurrentOrder && myCurrentOrder.id === data.id) {
              setMyCurrentOrder(data);
            }
            fetchDriverData();
          }
        } catch (err) {
          console.warn('SSE Parse error in DriverDashboard:', err);
        }
      };
    } catch (e) {
      console.warn('SSE Setup failed in DriverDashboard:', e);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [driver, myCurrentOrder, incomingOffer, selectedRadius, fetchDriverData, addToast, triggerSound]);

  // Countdown timer for incoming offer modal
  useEffect(() => {
    if (incomingOffer) {
      offerTimerRef.current = setInterval(() => {
        setOfferCountdown(prev => {
          if (prev <= 1) {
            clearInterval(offerTimerRef.current);
            setIncomingOffer(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (offerTimerRef.current) clearInterval(offerTimerRef.current);
    }

    return () => {
      if (offerTimerRef.current) clearInterval(offerTimerRef.current);
    };
  }, [incomingOffer]);

  // Online / Offline toggle
  const handleToggleOnline = async () => {
    if (!driver) return;
    try {
      const res = await fetch(`/api/drivers/${driver.id}/toggle-online`, { method: 'PATCH' });
      if (res.ok) {
        const updated = await res.json();
        setDriver(updated);
        addToast(
          updated.isOnline ? 'Siz Onlaynsiz' : 'Siz Oflaynsiz',
          updated.isOnline
            ? 'Yangi buyurtmalarni qabul qilishingiz mumkin'
            : 'Buyurtmalar qabul qilinishi to‘xtatildi',
          updated.isOnline ? 'success' : 'info'
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  // "Meni vaqtim yo'q" (Break Toggle)
  const handleToggleBreak = async () => {
    if (!driver) return;
    const newBreakState = !driver.isOnBreak;
    try {
      const res = await fetch(`/api/drivers/${driver.id}/toggle-break`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isOnBreak: newBreakState,
          reason: newBreakState ? 'Haydovchi tanaffusda (Vaqtim yo‘q)' : undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDriver(data.driver);
        addToast(
          newBreakState ? 'Tanaffus yoqildi (Meni vaqtim yo‘q)' : 'Tanaffus yakunlandi',
          newBreakState
            ? 'Mijozlar sizga buyurtma bera olmaydi'
            : 'Siz yana buyurtmalarni qabul qilishga tayyorsiz',
          newBreakState ? 'info' : 'success'
        );
        if (newBreakState) setIncomingOffer(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Change Driver Current SPB Location / District
  const handleUpdateLocation = async (lat: number, lng: number) => {
    if (!driver) return;
    setIsUpdatingLocation(true);
    try {
      const res = await fetch(`/api/drivers/${driver.id}/location`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng })
      });
      if (res.ok) {
        const data = await res.json();
        setDriver(data.driver);
        addToast('📍 Joylashuvingiz yangilandi', 'Buyurtmalar masofasi qayta hisoblandi', 'success');
        fetchDriverData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  // Browser Geolocation Detector
  const handleUseBrowserGPS = () => {
    if (!navigator.geolocation) {
      addToast('GPS Xatolik', 'Brauzeringizda geolokatsiya qo‘llab-quvvatlanmaydi', 'alert');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        handleUpdateLocation(pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        // Fallback default center of SPB
        handleUpdateLocation(59.9343, 30.3351);
        addToast('GPS standart o‘rnatildi', 'Sankt-Peterburg markazi tanlandi', 'info');
      }
    );
  };

  // Save Working Hours
  const handleSaveWorkingHours = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver) return;
    setIsSavingHours(true);
    try {
      const res = await fetch(`/api/drivers/${driver.id}/working-hours`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: shiftStart, end: shiftEnd })
      });
      if (res.ok) {
        const data = await res.json();
        setDriver(data.driver);
        addToast('Ish vaqti saqlandi', `${shiftStart} dan ${shiftEnd} gacha belgilandi`, 'success');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSavingHours(false);
    }
  };

  // Accept Order with Concurrency Locking
  const handleAcceptOrder = async (orderId: string) => {
    if (!driver) return;
    setIsAcceptingOrder(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: driver.id })
      });

      if (res.status === 409) {
        // Lock failure: order already taken
        const errData = await res.json();
        addToast(
          '❌ Kech qoldingiz!',
          errData.error || 'Bu buyurtmani boshqa haydovchi qabul qilib ulgurdi!',
          'alert'
        );
        setIncomingOffer(null);
        fetchDriverData();
        return;
      }

      if (!res.ok) {
        const errData = await res.json();
        addToast('Xatolik', errData.error || 'Buyurtmani qabul qilib bo‘lmadi', 'alert');
        return;
      }

      const order = await res.json();
      setMyCurrentOrder(order);
      setIncomingOffer(null);
      triggerSound('success');
      addToast(
        '🎉 Buyurtma qabul qilindi!',
        `#${order.orderNumber} mijoz tomon yo‘l oling: ${order.from.address}`,
        'success'
      );
      fetchDriverData();
    } catch (e) {
      console.error(e);
      addToast('Tarmoq xatosi', 'Iltimos qayta urinib ko‘ring', 'alert');
    } finally {
      setIsAcceptingOrder(false);
    }
  };

  // Update order status
  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = await res.json();
        setMyCurrentOrder(updated);
        triggerSound('ping');
        fetchDriverData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // "Mijozni manzilga yetkazdim" / Complete Trip
  const handleCompleteTrip = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/complete-trip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        triggerSound('success');
        addToast(
          '🎉 Safar muvaffaqiyatli yakunlandi!',
          'Mijoz yetkazildi va mablag‘ hisobingizga qo‘shildi.',
          'success'
        );
        setMyCurrentOrder(null);
        fetchDriverData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit subscription renewal receipt
  const handleSubmitReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!driver || !receiptUrl) return;
    setIsSubmittingReceipt(true);
    try {
      const res = await fetch(`/api/drivers/${driver.id}/upload-receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptUrl, amount: 500 })
      });
      if (res.ok) {
        addToast('Chek yuborildi', 'Admin tasdiqlashi uchun yuborildi', 'success');
        setIsRenewModalOpen(false);
        setReceiptUrl('');
        fetchDriverData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingReceipt(false);
    }
  };

  if (!driver) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl">
        <Car className="w-12 h-12 text-slate-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white">Haydovchi profili topilmadi</h3>
        <p className="text-xs text-slate-400 mt-1">
          Iltimos yuqoridagi 'Haydovchi bo‘lish' tugmasi orqali ro‘yxatdan o‘ting.
        </p>
      </div>
    );
  }

  const currentLocationName =
    SPB_LOCATIONS.find(
      l =>
        Math.abs(l.lat - (driver.currentLat || 59.9343)) < 0.02 &&
        Math.abs(l.lng - (driver.currentLng || 30.3351)) < 0.02
    )?.metroStation || 'Sankt-Peterburg (Markaz)';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ---------------------------------------------------- */}
      {/* REAL-TIME INCOMING ORDER POPUP MODAL WITH LOCKING    */}
      {/* ---------------------------------------------------- */}
      {incomingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl max-w-lg w-full p-6 text-slate-100 shadow-2xl relative overflow-hidden">
            {/* Top pulse radar header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
                </span>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    ⚡ Yangi Buyurtma Radarda!
                  </h3>
                  <p className="text-xs text-amber-400 font-bold">
                    #{incomingOffer.orderNumber} • {incomingOffer.tariff} tarifi
                  </p>
                </div>
              </div>

              {/* Countdown badge */}
              <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-xs font-mono font-black text-amber-400">
                  {offerCountdown}s
                </span>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-5 border border-slate-800">
              <div
                className="bg-amber-500 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${(offerCountdown / 30) * 100}%` }}
              />
            </div>

            {/* Fare & Distance highlights */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 font-semibold">Safar narxi:</span>
                <p className="text-2xl font-black text-amber-400 font-mono">
                  {incomingOffer.finalPrice} ₽
                </p>
                <span className="text-[10px] text-slate-500">
                  To‘lov: {incomingOffer.paymentMethod === 'CASH' ? 'Naqd pul' : 'Karta / O‘tkazma'}
                </span>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                <span className="text-[11px] text-slate-400 font-semibold">Sizgacha masofa:</span>
                <p className="text-2xl font-black text-emerald-400 font-mono">
                  {incomingOffer.distanceToPickupKm || 1.8} km
                </p>
                <span className="text-[10px] text-slate-500">
                  Yetib borish: ~{Math.round((incomingOffer.distanceToPickupKm || 1.8) * 2.2 + 2)} daqiqa
                </span>
              </div>
            </div>

            {/* Route Details */}
            <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 mb-4 text-xs">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 font-semibold">Qayerdan (Mijoz turgan joy):</span>
                  <p className="text-white font-bold">{incomingOffer.from.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 pt-2 border-t border-slate-800/80">
                <Navigation className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 font-semibold">Qayerga (Borish manzili):</span>
                  <p className="text-white font-bold">{incomingOffer.to.address}</p>
                </div>
              </div>

              {incomingOffer.comment && (
                <div className="pt-2 border-t border-slate-800/80 text-amber-300 italic">
                  “{incomingOffer.comment}”
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIncomingOffer(null)}
                className="flex-1 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>O‘tkazib yuborish</span>
              </button>

              <button
                type="button"
                disabled={isAcceptingOrder}
                onClick={() => handleAcceptOrder(incomingOffer.id)}
                className="flex-[2] py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black transition shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 animate-pulse"
              >
                <Check className="w-5 h-5" />
                <span>{isAcceptingOrder ? 'Band qilinmoqda...' : '⚡ QABUL QILISH'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Status & Controls Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Driver identity */}
          <div className="flex items-center gap-4">
            <img
              src={driver.vehicle.photoUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=400'}
              alt="Car"
              className="w-16 h-16 rounded-2xl object-cover border border-amber-500/40 shadow"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white">
                  {driver.user?.fullName || 'Haydovchi'}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950">
                  {driver.vehicle.tariff}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {driver.vehicle.make} {driver.vehicle.model} • {driver.vehicle.plateNumber} • {driver.user?.phone}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400" /> {driver.rating.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500">• {driver.totalTrips} ta safar</span>
              </div>
            </div>
          </div>

          {/* Action Buttons: Online toggle & "Meni vaqtim yo'q" toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Break mode button ("Meni vaqtim yo'q") */}
            <button
              onClick={handleToggleBreak}
              className={`px-4 py-3 rounded-2xl font-extrabold text-xs sm:text-sm flex items-center gap-2 transition shadow-lg ${
                driver.isOnBreak
                  ? 'bg-amber-500 text-slate-950 border border-amber-400 shadow-amber-500/20 animate-pulse'
                  : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-700'
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>
                {driver.isOnBreak
                  ? lang === 'uz'
                    ? '☕ Meni vaqtim yo‘q (Tanaffusda)'
                    : '☕ На перерыве'
                  : lang === 'uz'
                  ? '☕ Meni vaqtim yo‘q (Tanaffus)'
                  : '☕ Взять перерыв'}
              </span>
            </button>

            {/* Online / Offline master switch */}
            <button
              onClick={handleToggleOnline}
              className={`px-6 py-3 rounded-2xl font-black text-xs sm:text-sm flex items-center gap-2 transition shadow-xl ${
                driver.isOnline
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
                  : 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{driver.isOnline ? 'ONLAYN (Ishlamoqdaman)' : 'OFLAYN (Dam olish)'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Location / Radar Radius Bar */}
        <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-2xl">
          {/* Driver current GPS location selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                Hozirgi turgan joyingiz (SPB):
              </span>
              <button
                type="button"
                onClick={handleUseBrowserGPS}
                className="text-[11px] text-amber-400 hover:underline font-bold"
              >
                🛰️ GPS aniqlash
              </button>
            </div>
            <select
              value={currentLocationName}
              onChange={e => {
                const found = SPB_LOCATIONS.find(l => l.metroStation === e.target.value);
                if (found) handleUpdateLocation(found.lat, found.lng);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              {SPB_LOCATIONS.map(loc => (
                <option key={loc.metroStation} value={loc.metroStation}>
                  📍 {loc.metroStation} ({loc.district})
                </option>
              ))}
            </select>
          </div>

          {/* Search Radius Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Qidiruv radiusi (Radar masofasi):
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                {selectedRadius === 0 ? 'Barcha SPB' : `${selectedRadius} km`}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[5, 10, 15, 0].map(rad => (
                <button
                  key={rad}
                  type="button"
                  onClick={() => setSelectedRadius(rad)}
                  className={`py-1.5 rounded-xl text-xs font-bold transition border ${
                    selectedRadius === rad
                      ? 'bg-amber-500 text-slate-950 border-amber-400'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {rad === 0 ? 'Barchasi' : `${rad} km`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Shift and Working Hours Bar */}
        <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>{lang === 'uz' ? 'Kunlik ish vaqti grafigi:' : 'График работы:'}</span>
          </div>

          <form onSubmit={handleSaveWorkingHours} className="flex items-center gap-2 flex-wrap">
            <input
              type="time"
              value={shiftStart}
              onChange={e => setShiftStart(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white font-mono"
            />
            <span className="text-xs text-slate-500">—</span>
            <input
              type="time"
              value={shiftEnd}
              onChange={e => setShiftEnd(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1 text-xs text-white font-mono"
            />
            <button
              type="submit"
              disabled={isSavingHours}
              className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-xl transition"
            >
              {isSavingHours ? 'Saqlanmoqda...' : 'Vaqtni Saqlash'}
            </button>
          </form>
        </div>
      </div>

      {/* Stats and Subscription Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's earnings */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">
              {lang === 'uz' ? 'Bugungi daromad' : 'Заработок сегодня'}
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            {driver.todayEarnings.toLocaleString()} ₽
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Bugun {driver.todayTrips || 0} ta safar bajarildi
          </p>
        </div>

        {/* Subscription Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold">
                {lang === 'uz' ? 'Oylik Obuna (500 ₽)' : 'Подписка'}
              </span>
              <Shield className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {driver.subscription?.planName}
              </span>
              {driver.subscription?.status === 'ACTIVE' && (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Muddati:{' '}
              {new Date(driver.subscription?.expiresAt || Date.now()).toLocaleDateString()} gacha
            </p>
          </div>

          <button
            onClick={() => setIsRenewModalOpen(true)}
            className="mt-3 w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-xl transition"
          >
            {lang === 'uz' ? 'Obunani uzaytirish / Chek yuklash' : 'Продлить подписку'}
          </button>
        </div>

        {/* Rating and Reviews */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">
              {lang === 'uz' ? 'Mijozlar bahosi' : 'Рейтинг и отзывы'}
            </span>
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <p className="text-2xl font-black text-amber-400 font-mono">
            {driver.rating.toFixed(1)} <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {driver.reviews?.length || 0} ta sharh qoldirilgan
          </p>
        </div>
      </div>

      {/* Active in-progress order box (with "Mijozni manzilga yetkazdim" button) */}
      {myCurrentOrder && (
        <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 border-2 border-amber-500 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              <h3 className="text-base sm:text-lg font-extrabold text-white">
                🚕 Jarayondagi Buyurtma #{myCurrentOrder.orderNumber}
              </h3>
            </div>
            <span className="px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-xl font-mono">
              {myCurrentOrder.finalPrice} ₽
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <p className="text-slate-400 font-semibold">Yo‘nalish:</p>
              <p className="text-white font-bold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{myCurrentOrder.from.address}</span>
              </p>
              <p className="text-white font-bold flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{myCurrentOrder.to.address}</span>
              </p>
              <div className="pt-2">
                <a
                  href={`https://yandex.ru/maps/?rtext=${encodeURIComponent(myCurrentOrder.from.address)}~${encodeURIComponent(myCurrentOrder.to.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline font-bold"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Yandex Navigator orqali ochish
                </a>
              </div>
            </div>

            <div className="space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <p className="text-slate-400 font-semibold">Mijoz ma‘lumotlari:</p>
              <p className="text-white font-bold">{myCurrentOrder.clientName}</p>
              <a
                href={`tel:${myCurrentOrder.clientPhone}`}
                className="inline-flex items-center gap-1.5 text-amber-400 hover:underline font-mono font-bold"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>{myCurrentOrder.clientPhone}</span>
              </a>
              {myCurrentOrder.comment && (
                <p className="text-slate-400 italic">“{myCurrentOrder.comment}”</p>
              )}
            </div>
          </div>

          {/* Workflow status buttons including DELIVERED */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            {myCurrentOrder.status === 'ACCEPTED' && (
              <button
                onClick={() => handleUpdateOrderStatus(myCurrentOrder.id, 'ARRIVED')}
                className="px-5 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-2xl transition text-xs sm:text-sm shadow"
              >
                🚗 Manzilga Yetib Keldim (Kutmoqdaman)
              </button>
            )}

            {myCurrentOrder.status === 'ARRIVED' && (
              <button
                onClick={() => handleUpdateOrderStatus(myCurrentOrder.id, 'IN_PROGRESS')}
                className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl transition text-xs sm:text-sm shadow"
              >
                🛣 Safarni Boshlash (Mijoz mindi)
              </button>
            )}

            {myCurrentOrder.status === 'IN_PROGRESS' && (
              <button
                onClick={() => handleCompleteTrip(myCurrentOrder.id)}
                className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl transition text-sm shadow-xl shadow-emerald-500/25 flex items-center gap-2 animate-bounce"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>✅ Mijozni Manzilga Yetkazdim (Safar yakunlandi)</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Available Live Orders Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                {lang === 'uz' ? 'Jonli Buyurtmalar Radari' : 'Радар доступных заказов'}
              </h3>
              <p className="text-xs text-slate-400">
                {driver.isOnBreak
                  ? lang === 'uz'
                    ? 'Siz hozirda tanaffusdasiz. Buyurtma qabul qilish uchun tanaffusni o‘chiring.'
                    : 'Вы на перерыве'
                  : !driver.isOnline
                  ? lang === 'uz'
                    ? 'Siz oflaynsiz. Buyurtma olish uchun ONLAYN tugmasini bosing.'
                    : 'Вы офлайн'
                  : lang === 'uz'
                  ? `Radius: ${selectedRadius === 0 ? 'Barcha SPB' : selectedRadius + ' km'} bo‘yicha yangilanmoqda`
                  : 'Заказы рядом с вами'}
              </p>
            </div>
          </div>
          <button
            onClick={fetchDriverData}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        {activeOrders.length === 0 ? (
          <div className="bg-slate-950 p-8 rounded-2xl text-center border border-slate-800">
            <Car className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-slate-400">
              {lang === 'uz'
                ? 'Hozircha sizning radiusingizda yangi buyurtmalar yo‘q'
                : 'Новых заказов поблизости пока нет'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Yangi buyurtma paydo bo‘lganda radarda darhol xabar chiqadi.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeOrders.map(order => {
              const dist =
                order.distanceToPickupKm ||
                calculateDistanceKm(
                  driver.currentLat || 59.9343,
                  driver.currentLng || 30.3351,
                  order.from?.lat || 59.9311,
                  order.from?.lng || 30.3609
                );

              return (
                <div
                  key={order.id}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition"
                >
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">#{order.orderNumber}</span>
                      <span className="bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded text-[10px]">
                        {order.tariff}
                      </span>
                      <span className="text-emerald-400 font-bold font-mono">
                        📍 {dist} km uzoqlikda
                      </span>
                      <span className="text-slate-400">• {order.clientName}</span>
                    </div>
                    <p className="text-slate-300 font-medium">📍 {order.from.address}</p>
                    <p className="text-slate-300 font-medium">🏁 {order.to.address}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-amber-400 font-mono">
                      {order.finalPrice} ₽
                    </span>
                    <button
                      disabled={!driver.isOnline || driver.isOnBreak || isAcceptingOrder}
                      onClick={() => handleAcceptOrder(order.id)}
                      className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 ${
                        driver.isOnline && !driver.isOnBreak
                          ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Qabul qilish</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Subscription Renewal Modal with Payment Card & Receipt Upload */}
      {isRenewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
            <h3 className="text-lg font-extrabold text-white mb-2">
              {lang === 'uz' ? 'Oylik Obunani Uzaytirish' : 'Продление подписки'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Oylik to‘lov 500 ₽. Quyidagi kartaga o‘tkazib chek rasmini yuklang:
            </p>

            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 mb-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Qabul qiluvchi karta:</span>
                <span className="text-xs font-bold text-amber-400">500 ₽</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900 p-2 rounded-xl">
                <span className="font-mono text-sm font-bold text-white">2202 2033 4455 6677</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('2202203344556677');
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2000);
                  }}
                  className="text-xs text-amber-400 font-bold px-2 py-1 bg-amber-500/10 rounded-lg"
                >
                  {isCopied ? 'Nusxalandi' : 'Nusxalash'}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmitReceipt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  To‘lov cheki rasmi havolasi (URL):
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://... chek rasmi"
                  value={receiptUrl}
                  onChange={e => setReceiptUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRenewModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReceipt}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold"
                >
                  {isSubmittingReceipt ? 'Yuborilmoqda...' : 'Chekni Yuborish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
