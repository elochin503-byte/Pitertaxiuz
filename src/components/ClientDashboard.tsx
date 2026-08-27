import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Package,
  Star,
  Heart,
  CreditCard,
  Gift,
  Share2,
  Copy,
  Check,
  MapPin,
  Navigation,
  Clock,
  Car,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useRealtime } from '../context/RealtimeContext';
import { Order } from '../types';
import { SPB_LOCATIONS } from '../../server/db';

interface ClientDashboardProps {
  onSelectOrder?: (order: Order) => void;
  onNewOrderClick?: () => void;
}

export const ClientDashboard: React.FC<ClientDashboardProps> = ({ onSelectOrder, onNewOrderClick }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useRealtime();

  const [orders, setOrders] = useState<Order[]>([]);
  const [copiedRef, setCopiedRef] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'favorites' | 'referral' | 'promos'>('orders');

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders?clientId=${user?.id || 'usr_client_1'}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user?.id]);

  const copyReferralLink = () => {
    const link = `https://t.me/PiterTaxi_Bot?start=ref_${user?.referralCode || 'REF77'}`;
    navigator.clipboard.writeText(link);
    setCopiedRef(true);
    addToast('Havola nusxalandi', link, 'info');
    setTimeout(() => setCopiedRef(false), 3000);
  };

  const favoritePlaces = [
    { title: 'Uy', address: 'Devyatkino metro bekati', loc: SPB_LOCATIONS[0], icon: '🏠' },
    { title: 'Ishxona', address: 'Ploshchad Vosstaniya / Moskovsky', loc: SPB_LOCATIONS[1], icon: '💼' },
    { title: 'Bozor / Apraks', address: 'Apraksin Dvor (Sadovaya)', loc: SPB_LOCATIONS[13], icon: '🛒' },
    { title: 'Aeroport', address: 'Pulkovo aeroporti (Terminal 1)', loc: SPB_LOCATIONS[6], icon: '✈️' }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Profile summary card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}
            alt={user?.fullName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-emerald-500 shadow-md"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{user?.fullName || 'Nodirbek Qodirov'}</h2>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                Mijoz
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">{user?.phone || '+7 981 123 4567'}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Telegram ID: {user?.telegramId || '109827364'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Bonus hisobingiz</span>
            <span className="text-xl font-extrabold text-amber-400 font-mono">{user?.bonusBalance || 300} ₽</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            🎁
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto scrollbar-none">
        {[
          { id: 'orders', label: 'Buyurtmalar tarixi', icon: Package, count: orders.length },
          { id: 'favorites', label: 'Sevimli manzillar', icon: Heart },
          { id: 'referral', label: 'Referral & Bonus', icon: Share2 },
          { id: 'promos', label: 'Promokodlar', icon: Gift }
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                isSelected
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-slate-950 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab: Orders History */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-12 bg-slate-900/60 rounded-3xl border border-slate-800">
              <Package className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">Buyurtmalaringiz hali yo‘q</p>
              <p className="text-xs text-slate-500 mt-1">Sankt-Peterburg bo‘ylab birinchi safaringizni buyurtma qiling!</p>
              {onNewOrderClick && (
                <button
                  onClick={onNewOrderClick}
                  className="mt-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition"
                >
                  🚕 Yangi buyurtma berish
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {orders.map(order => (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder && onSelectOrder(order)}
                  className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer transition group"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-500/20 text-amber-400 font-mono text-xs px-2 py-0.5 rounded font-bold">
                        #{order.orderNumber}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          order.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : order.status === 'CANCELLED'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800 animate-pulse'
                        }`}
                      >
                        {order.status}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(order.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">{order.from.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Navigation className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span className="truncate">{order.to.address}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto border-t md:border-t-0 border-slate-800 pt-2 md:pt-0">
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-amber-400 font-mono">{order.finalPrice} ₽</span>
                      <span className="text-[10px] text-slate-400 block">{order.paymentMethod}</span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-amber-400 transition transform group-hover:translate-x-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Favorites */}
      {activeTab === 'favorites' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {favoritePlaces.map((fav, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{fav.icon}</span>
                <div>
                  <h4 className="font-bold text-white text-sm">{fav.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-1">{fav.address}</p>
                </div>
              </div>
              <button
                onClick={onNewOrderClick}
                className="bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-xl transition"
              >
                Taksi chaqirish
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Referral */}
      {activeTab === 'referral' && (
        <div className="bg-gradient-to-br from-slate-900 to-amber-950/20 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl font-bold">
              🎁
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Do‘stlaringizni taklif qiling va 100 ₽ bonus oling!</h3>
              <p className="text-xs text-slate-400">
                Har bir taklif qilingan do‘stingiz birinchi buyurtmasini amalga oshirganda hisobingizga 100 ₽ tushadi.
              </p>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center justify-between gap-3">
            <div className="truncate">
              <span className="text-[10px] text-slate-400 block">Sizning shaxsiy referral havolangiz:</span>
              <span className="text-xs font-mono text-amber-300 font-bold truncate">
                https://t.me/PiterTaxi_Bot?start=ref_{user?.referralCode || 'REF77'}
              </span>
            </div>
            <button
              onClick={copyReferralLink}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition shrink-0"
            >
              {copiedRef ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedRef ? 'Nusxalandi' : 'Nusxalash'}
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Taklif qilinganlar</span>
              <span className="text-xl font-bold text-white font-mono">{user?.referralCount || 3} ta</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Ishlangan bonus</span>
              <span className="text-xl font-bold text-emerald-400 font-mono">{user?.bonusBalance || 300} ₽</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-slate-400 block text-[10px]">Referral kodingiz</span>
              <span className="text-xl font-bold text-amber-400 font-mono">{user?.referralCode || 'NODIR77'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Promos */}
      {activeTab === 'promos' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { code: 'PITER10', discount: '10% chegirma', desc: '400 ₽ dan yuqori buyurtmalar uchun', badge: 'Ommabop' },
            { code: 'OZIMIZ50', discount: '50 ₽ chegirma', desc: 'Barcha safarlar uchun amal qiladi', badge: 'Yangi' },
            { code: 'YANGI2025', discount: '15% chegirma', desc: 'Yangi foydalanuvchilar uchun maxsus', badge: 'Eksklyuziv' }
          ].map((promo, idx) => (
            <div key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-2 relative overflow-hidden">
              <span className="absolute top-2 right-2 text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">
                {promo.badge}
              </span>
              <span className="font-mono text-base font-extrabold text-white tracking-wider bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 inline-block">
                {promo.code}
              </span>
              <h4 className="text-sm font-bold text-emerald-400">{promo.discount}</h4>
              <p className="text-xs text-slate-400">{promo.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
