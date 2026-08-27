import React, { useState } from 'react';
import { HelpCircle, ChevronDown, Send, CheckCircle2, MessageSquare, Phone, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';

interface SupportProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { addToast } = useRealtime();

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('ORDER');
  const [message, setMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  if (!isOpen) return null;

  const faqs = [
    {
      q: "Taksi narxi qanday hisoblanadi?",
      a: "Narx masofa va tanlangan tarifga asosan avtomatik hisoblanadi (Standart: 350 ₽ dan, Komfort: 480 ₽ dan). Yo‘lda tirbandlik bo‘lsa ham narx sun'iy ravishda oshirilmaydi."
    },
    {
      q: "Haydovchilar uchun 7 kunlik bepul sinov qanday ishlaydi?",
      a: "Ro‘yxatdan o‘tganingizdan so‘ng sizga avtomatik tarzda 7 kunlik bepul sinov muddati beriladi. Bu muddat davomida 0% komissiya bilan cheksiz buyurtmalarni qabul qilishingiz mumkin. Sinovdan so‘ng oylik to‘lov bor-yo‘g‘i 500 ₽."
    },
    {
      q: "Buyurtmani qanday bekor qilish mumkin?",
      a: "Buyurtma berilgach, kuzatuv ekranidagi 'Buyurtmani bekor qilish' tugmasini bosib bekor qilishingiz mumkin."
    },
    {
      q: "To‘lov usullari qanday?",
      a: "Naqd pul, Sberbank / T-Bank kartasiga o‘tkazish (perevod) orqali haydovchi bilan to‘g‘ridan-to‘g‘ri hisob-kitob qilishingiz mumkin."
    }
  ];

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'usr_client_1',
          userName: user?.fullName || 'Mijoz',
          userRole: user?.role || 'CLIENT',
          subject: subject || 'Yordam so‘rovi',
          category,
          message: message.trim()
        })
      });

      if (res.ok) {
        setIsSent(true);
        addToast('Murojaat yuborildi', 'Operatorimiz tez orada siz bilan bog‘lanadi', 'success');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800 hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            🆘
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Yordam va Qo‘llab-quvvatlash</h2>
            <p className="text-xs text-slate-400">Ko‘p beriladigan savollar va operator bilan aloqa</p>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-2 mb-6">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Ko‘p beriladigan savollar (FAQ)</h3>
          {faqs.map((faq, i) => (
            <div key={i} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-3.5 text-left text-xs font-bold text-slate-200 flex items-center justify-between hover:bg-slate-900 transition"
              >
                <span>{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
              </button>
              {openFaq === i && (
                <div className="p-3.5 pt-0 text-xs text-slate-400 leading-relaxed border-t border-slate-900">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Direct Contacts */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <a
            href="tel:+79990012233"
            className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center gap-2.5 hover:border-slate-700 transition text-xs"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 block">Qaynoq aloqa:</span>
              <span className="font-mono text-white font-bold">+7 999 001 2233</span>
            </div>
          </a>
          <a
            href="https://t.me/PiterTaxi_Bot"
            target="_blank"
            rel="noreferrer"
            className="bg-slate-950 border border-slate-800 p-3 rounded-2xl flex items-center gap-2.5 hover:border-slate-700 transition text-xs"
          >
            <MessageSquare className="w-4 h-4 text-sky-400" />
            <div>
              <span className="text-[10px] text-slate-400 block">Telegram Support:</span>
              <span className="font-mono text-white font-bold">@piter_taxi_support</span>
            </div>
          </a>
        </div>

        {/* Operator ticket form */}
        {!isSent ? (
          <form onSubmit={handleSubmitTicket} className="space-y-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <h4 className="text-xs font-bold text-white">Operatorga xabar qoldirish</h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Mavzu (masalan: Haydovchi topilmadi)"
                className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-slate-800 focus:border-amber-500"
              />
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="bg-slate-900 text-white text-xs rounded-xl px-3 py-2 border border-slate-800"
              >
                <option value="ORDER">Buyurtma bo‘yicha</option>
                <option value="PAYMENT">To‘lov bo‘yicha</option>
                <option value="DRIVER">Haydovchilik / Obuna</option>
                <option value="TECHNICAL">Texnik muammo</option>
              </select>
            </div>
            <textarea
              rows={3}
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Muammo yoki savolingizni batafsil yozing..."
              className="w-full bg-slate-900 text-white text-xs rounded-xl p-3 border border-slate-800 focus:border-amber-500"
            />
            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition"
            >
              Yuborish
            </button>
          </form>
        ) : (
          <div className="bg-emerald-950/60 border border-emerald-800 p-4 rounded-2xl text-center text-xs text-emerald-300">
            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-1" />
            <p className="font-bold text-sm">Xabaringiz qabul qilindi!</p>
            <p className="mt-0.5 text-slate-400">Tez orada operatorimiz siz bilan bog‘lanadi.</p>
          </div>
        )}
      </div>
    </div>
  );
};
