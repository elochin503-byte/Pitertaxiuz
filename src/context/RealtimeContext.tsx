import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { NotificationItem, Order } from '../types';

interface RealtimeContextType {
  isConnected: boolean;
  activeOrder: Order | null;
  setActiveOrder: (order: Order | null) => void;
  notifications: NotificationItem[];
  unreadCount: number;
  markNotificationsAsRead: () => Promise<void>;
  triggerSound: (type?: 'ping' | 'success' | 'alert') => void;
  toasts: { id: string; title: string; message: string; type: string }[];
  removeToast: (id: string) => void;
  addToast: (title: string, message: string, type?: string) => void;
}

const RealtimeContext = createContext<RealtimeContextType | null>(null);

export const RealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<{ id: string; title: string; message: string; type: string }[]>([]);

  // Subtle web audio sound generator
  const triggerSound = useCallback((type: 'ping' | 'success' | 'alert' = 'ping') => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      if (type === 'ping') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === 'success') {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C E G C
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.08);
          gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + i * 0.08);
          osc.stop(ctx.currentTime + i * 0.08 + 0.25);
        });
      } else if (type === 'alert') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      // Audio autoplay policy catch
    }
  }, []);

  const addToast = useCallback((title: string, message: string, type: string = 'info') => {
    const id = 'tst_' + Date.now() + Math.random().toString(36).substr(2, 4);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, []);

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const fetchInitialNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const list = await res.json();
        setNotifications(list);
      }
    } catch (e) {
      console.warn('Notifications fetch error:', e);
    }
  };

  const markNotificationsAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (e) {
      console.warn('Read all notifs error:', e);
    }
  };

  // Connect SSE
  useEffect(() => {
    fetchInitialNotifications();

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          const { type, data } = payload;

          if (type === 'ORDER_CREATED') {
            triggerSound('ping');
            addToast('🚕 Yangi Buyurtma', `#${data.orderNumber} ${data.from?.address} -> ${data.to?.address}`, 'order');
          } else if (type === 'ORDER_UPDATED') {
            setActiveOrder(prev => (prev && prev.id === data.id ? data : prev));
            if (data.status === 'ACCEPTED') {
              triggerSound('success');
              addToast('✅ Haydovchi topildi!', `${data.driver?.vehicle?.make} ${data.driver?.vehicle?.model} (${data.driver?.vehicle?.plateNumber}) yo‘lga chiqdi.`, 'success');
            } else if (data.status === 'ARRIVED') {
              triggerSound('ping');
              addToast('🚗 Haydovchi yetib keldi!', 'Mashina ko‘rsatilgan joyda kutmoqda.', 'info');
            } else if (data.status === 'COMPLETED') {
              triggerSound('success');
              addToast('🎉 Safar yakunlandi!', `Xizmatdan foydalanganingiz uchun rahmat. Narx: ${data.finalPrice} ₽`, 'success');
            }
          } else if (type === 'NOTIFICATION_CREATED') {
            setNotifications(prev => [data, ...prev]);
          }
        } catch (err) {
          console.warn('SSE message parse error:', err);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
      };
    } catch (err) {
      console.warn('SSE connection error:', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [addToast, triggerSound]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <RealtimeContext.Provider
      value={{
        isConnected,
        activeOrder,
        setActiveOrder,
        notifications,
        unreadCount,
        markNotificationsAsRead,
        triggerSound,
        toasts,
        removeToast,
        addToast
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtime = () => {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used within RealtimeProvider');
  return context;
};
