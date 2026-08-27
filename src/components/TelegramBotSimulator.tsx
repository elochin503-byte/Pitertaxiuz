import React, { useState } from 'react';
import { Send, Bot, User, Check, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';

export const TelegramBotSimulator: React.FC = () => {
  const { user } = useAuth();
  const { triggerSound } = useRealtime();

  const [messages, setMessages] = useState<
    {
      id: string;
      sender: 'user' | 'bot';
      text: string;
      time: string;
      keyboard?: { text: string; action: string; isWebApp?: boolean }[][];
    }[]
  >([
    {
      id: '1',
      sender: 'bot',
      text: `🚕 *“O‘ZIMIZ UCHUN | PITER TAXI”* ga xush kelibsiz!\n\nSankt-Peterburgdagi o‘zbek va Markaziy Osiyo hamjamiyati uchun eng qulay va ishonchli taksi xizmati.\n\n🔹 *Qulay narxlar*\n🔹 *O‘zimizning haydovchilar*\n🔹 *Tezkor buyurtma berish*\n🔹 *24/7 qo‘llab-quvvatlash*`,
      time: '12:00',
      keyboard: [
        [{ text: '📱 Ilovani ochish (Mini App)', action: 'open_mini_app', isWebApp: true }],
        [
          { text: '🚕 Tezkor buyurtma', action: 'order' },
          { text: '🚗 Haydovchi bo‘lish', action: 'driver' }
        ],
        [
          { text: '📦 Buyurtmalarim', action: 'my_orders' },
          { text: '👤 Profilim', action: 'my_profile' }
        ],
        [{ text: '🆘 Yordam / Aloqa', action: 'support' }]
      ]
    }
  ]);

  const [inputVal, setInputVal] = useState('');

  const sendUserMessage = (text: string) => {
    if (!text.trim()) return;

    const userMsg = {
      id: 'usr_' + Date.now(),
      sender: 'user' as const,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    triggerSound('ping');

    // Bot Response Logic
    setTimeout(() => {
      let botReply = '';
      let keyboard: any = null;

      const lower = text.toLowerCase();
      if (lower.startsWith('/start')) {
        botReply = `🚕 *“O‘ZIMIZ UCHUN | PITER TAXI”* ga xush kelibsiz!\n\nSankt-Peterburgdagi o‘zbek va do‘stona haydovchilar sizning xizmatingizda.`;
        keyboard = [
          [{ text: '📱 Ilovani ochish (Mini App)', action: 'open_mini_app', isWebApp: true }],
          [{ text: '🚕 Tezkor buyurtma', action: 'order' }, { text: '🚗 Haydovchi bo‘lish', action: 'driver' }]
        ];
      } else if (lower.includes('buyurtma') || lower === '/order') {
        botReply = `📍 Qayerdan va qayerga borishni xohlaysiz? Qulay xaritadan foydalanish uchun Mini App'ni oching:`;
        keyboard = [[{ text: '📱 Mini App orqali buyurtma berish', action: 'open_mini_app', isWebApp: true }]];
      } else if (lower.includes('haydovchi') || lower === '/driver') {
        botReply = `🚗 *Haydovchilar uchun imkoniyatlar:*\n\n🎁 *7 kun BEPUL sinov muddati!*\n💳 Sinovdan so‘ng — *oyiga 500 ₽*\n✅ 0% komissiya, barcha daromad sizda qoladi!`;
        keyboard = [[{ text: '📝 Haydovchi bo‘lib ro‘yxatdan o‘tish', action: 'open_mini_app', isWebApp: true }]];
      } else if (lower.includes('profil') || lower === '/profile') {
        botReply = `👤 *Sizning profilingiz:*\n\nIsm: *${user?.fullName || 'Nodirbek Qodirov'}*\nTelefon: \`${user?.phone || '+7 981 123 4567'}\`\nReferral kodingiz: \`${user?.referralCode || 'NODIR77'}\`\nBonus hisobingiz: *${user?.bonusBalance || 300} ₽*`;
      } else {
        botReply = `Xabaringiz qabul qilindi. Tezkor buyurtma va profilingizni boshqarish uchun Mini App'dan foydalaning.`;
        keyboard = [[{ text: '📱 Ilovani ochish', action: 'open_mini_app', isWebApp: true }]];
      }

      setMessages(prev => [
        ...prev,
        {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: botReply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          keyboard
        }
      ]);
      triggerSound('ping');
    }, 600);
  };

  const handleButtonClick = (action: string) => {
    if (action === 'open_mini_app') {
      window.location.hash = '#miniapp';
      return;
    }
    sendUserMessage(action === 'order' ? 'Buyurtma berish' : action === 'driver' ? 'Haydovchi bo‘lish' : action === 'my_orders' ? 'Buyurtmalarim' : 'Profilim');
  };

  return (
    <div className="max-w-2xl mx-auto bg-[#0e1621] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[680px]">
      {/* Bot Chat Header */}
      <div className="bg-[#17212b] p-4 flex items-center justify-between border-b border-slate-800 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-lg">
            🚕
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm">O‘ZIMIZ UCHUN | Piter Taxi</h3>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[11px] text-sky-400">@PiterTaxi_Bot · bot</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-mono">Token: 8705407224...</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0e1621] scrollbar-none">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-[#2b5278] text-white rounded-tr-none'
                  : 'bg-[#182533] text-slate-100 rounded-tl-none border border-slate-800'
              }`}
            >
              <div className="whitespace-pre-line">{msg.text}</div>
              <span className="text-[9px] text-slate-400 block text-right mt-1 font-mono">
                {msg.time} {msg.sender === 'user' ? '✓✓' : ''}
              </span>
            </div>

            {/* Inline Keyboard */}
            {msg.keyboard && (
              <div className="mt-2 space-y-1.5 w-full max-w-[85%]">
                {msg.keyboard.map((row, rIdx) => (
                  <div key={rIdx} className="flex gap-1.5">
                    {row.map((btn, bIdx) => (
                      <button
                        key={bIdx}
                        onClick={() => handleButtonClick(btn.action)}
                        className={`flex-1 text-xs py-2 px-2.5 rounded-xl font-medium transition text-center flex items-center justify-center gap-1.5 ${
                          btn.isWebApp
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow'
                            : 'bg-[#242f3d] hover:bg-[#2e3b4d] text-sky-300'
                        }`}
                      >
                        {btn.text}
                        {btn.isWebApp && <ExternalLink className="w-3 h-3" />}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chat Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendUserMessage(inputVal);
        }}
        className="bg-[#17212b] p-3 border-t border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          placeholder="Xabar yozing (masalan: /start, /order, /driver)..."
          className="flex-1 bg-[#0e1621] text-white text-xs rounded-xl px-3.5 py-2.5 border border-slate-700/60 focus:border-sky-500 focus:outline-none"
        />
        <button
          type="submit"
          className="bg-sky-600 hover:bg-sky-500 text-white p-2.5 rounded-xl transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
