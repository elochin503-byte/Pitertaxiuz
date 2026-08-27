import { db } from './db';

export class TelegramBotService {
  private token: string;
  private isPolling = false;
  private lastUpdateId = 0;
  public botInfo: any = null;
  public botLogs: { timestamp: string; level: string; message: string }[] = [];

  constructor() {
    this.token = process.env.TELEGRAM_BOT_TOKEN || '8705407224:AAEq4aAfApA3mObYg2ROJqNTC4vIZR6mOWs';
  }

  log(level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS', message: string) {
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message
    };
    this.botLogs.unshift(entry);
    if (this.botLogs.length > 100) this.botLogs.pop();
    console.log(`[TELEGRAM ${level}] ${message}`);
  }

  async init(appUrl?: string) {
    if (!this.token || this.token.includes('MY_BOT_TOKEN')) {
      this.log('WARN', 'Telegram Bot token not set. Operating in simulation mode.');
      return;
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/getMe`);
      const data = await res.json();
      if (data.ok) {
        this.botInfo = data.result;
        this.log('SUCCESS', `Connected to @${this.botInfo.username} (${this.botInfo.first_name})`);
        this.startPolling(appUrl);
      } else {
        this.log('ERROR', `Telegram getMe failed: ${data.description}`);
      }
    } catch (err: any) {
      this.log('WARN', `Telegram network check: ${err.message || err}. Local mock mode active.`);
    }
  }

  private async startPolling(appUrl?: string) {
    if (this.isPolling) return;
    this.isPolling = true;
    this.log('INFO', 'Started Telegram long polling...');

    const poll = async () => {
      if (!this.isPolling) return;
      try {
        const res = await fetch(
          `https://api.telegram.org/bot${this.token}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=20`
        );
        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
            await this.handleUpdate(update, appUrl);
          }
        }
      } catch (err: any) {
        // Network timeout or transient error - wait before retry
      }
      setTimeout(poll, 2500);
    };

    poll();
  }

  async handleUpdate(update: any, appUrl?: string) {
    const targetUrl = appUrl || process.env.APP_URL || 'https://piter-taxi.local';
    
    if (update.message) {
      const msg = update.message;
      const chatId = msg.chat?.id;
      const text = msg.text?.trim() || '';
      const from = msg.from;

      this.log('INFO', `Received message from @${from?.username || from?.id}: "${text}"`);

      // Auto-register/sync user with our DB
      let user = db.users.find(u => u.telegramId === String(from?.id));
      if (!user && from) {
        user = {
          id: 'usr_tg_' + from.id,
          telegramId: String(from.id),
          username: from.username,
          fullName: `${from.first_name || ''} ${from.last_name || ''}`.trim() || 'Telegram Foydalanuvchi',
          phone: '+7 900 000 0000',
          role: 'CLIENT',
          createdAt: new Date().toISOString(),
          status: 'ACTIVE',
          referralCode: 'TG' + from.id.toString().slice(-4),
          referralCount: 0,
          bonusBalance: 100
        };
        db.users.push(user);
        db.addAuditLog(user.id, user.fullName, 'CLIENT', 'TELEGRAM_REGISTER', 'User registered via Telegram Bot');
      }

      if (text.startsWith('/start')) {
        const welcomeText = 
          `🚕 *“O‘ZIMIZ UCHUN | PITER TAXI”* ga xush kelibsiz!\n\n` +
          `Sankt-Peterburgdagi o‘zbek va Markaziy Osiyo hamjamiyati uchun eng qulay va ishonchli taksi xizmati.\n\n` +
          `🔹 *Qulay narxlar*\n` +
          `🔹 *O‘zimizning haydovchilar*\n` +
          `🔹 *Tezkor buyurtma berish*\n` +
          `🔹 *24/7 qo‘llab-quvvatlash*\n\n` +
          `Quyidagi tugmalar orqali xizmatlardan foydalanishingiz mumkin:`;

        const keyboard = {
          inline_keyboard: [
            [
              {
                text: '📱 Ilovani ochish (Mini App)',
                web_app: { url: targetUrl }
              }
            ],
            [
              { text: '🚕 Tezkor buyurtma', callback_data: 'quick_order' },
              { text: '🚗 Haydovchi bo‘lish', callback_data: 'become_driver' }
            ],
            [
              { text: '📦 Buyurtmalarim', callback_data: 'my_orders' },
              { text: '👤 Profilim', callback_data: 'my_profile' }
            ],
            [
              { text: '🆘 Yordam / Aloqa', callback_data: 'support' }
            ]
          ]
        };

        await this.sendMessage(chatId, welcomeText, keyboard);
      } else if (text === '/order' || text.toLowerCase().includes('buyurtma')) {
        await this.sendMessage(
          chatId,
          `🚕 Buyurtma berish uchun quyidagi Mini App tugmasini bosing yoki manzilni yozing:`,
          {
            inline_keyboard: [
              [{ text: '📱 Mini App orqali buyurtma berish', web_app: { url: targetUrl } }]
            ]
          }
        );
      } else if (text === '/driver' || text.toLowerCase().includes('haydovchi')) {
        await this.sendMessage(
          chatId,
          `🚗 *Haydovchilar uchun shartlar:*\n\n` +
          `🎁 *7 kun BEPUL sinov muddati!*\n` +
          `💳 Sinovdan so‘ng — *oyiga 500 ₽*\n` +
          `✅ 0% komissiya, barcha daromad sizda qoladi!\n\n` +
          `Ro‘yxatdan o‘tish uchun Mini App'ni oching:`,
          {
            inline_keyboard: [
              [{ text: '📝 Haydovchi bo‘lib ro‘yxatdan o‘tish', web_app: { url: targetUrl + '?view=driver_register' } }]
            ]
          }
        );
      } else {
        await this.sendMessage(
          chatId,
          `Xabaringiz qabul qilindi. Tezkor buyurtma va profilingizni boshqarish uchun Mini App'dan foydalaning:`,
          {
            inline_keyboard: [
              [{ text: '📱 Ilovani ochish', web_app: { url: targetUrl } }]
            ]
          }
        );
      }
    } else if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data;
      const chatId = cb.message?.chat?.id;

      if (data === 'quick_order') {
        await this.sendMessage(
          chatId,
          `📍 Qayerdan va qayerga borishni xohlaysiz? Mini App orqali xaritada qulay tanlang:`,
          {
            inline_keyboard: [[{ text: '🚕 Buyurtma berish', web_app: { url: targetUrl } }]]
          }
        );
      } else if (data === 'become_driver') {
        await this.sendMessage(
          chatId,
          `🚗 Haydovchi bo‘lish uchun Mini App orqali arizangizni yuboring. 7 kun bepul!`,
          {
            inline_keyboard: [[{ text: '📝 Haydovchi bo‘lish', web_app: { url: targetUrl } }]]
          }
        );
      } else if (data === 'my_orders') {
        const userOrders = db.orders.filter(o => o.clientTelegramId === String(chatId));
        if (userOrders.length === 0) {
          await this.sendMessage(chatId, `📦 Sizda hali faol buyurtmalar yo‘q. Yangi safar buyurtma qiling!`);
        } else {
          const last = userOrders[0];
          await this.sendMessage(
            chatId,
            `📦 *Oxirgi buyurtmangiz #${last.orderNumber}:*\n\n` +
            `📍 *Qayerdan:* ${last.from.address}\n` +
            `🏁 *Qayerga:* ${last.to.address}\n` +
            `💰 *Narx:* ${last.finalPrice} ₽\n` +
            `📊 *Status:* ${last.status}\n\n` +
            `To‘liq ma'lumot ilovada:`,
            {
              inline_keyboard: [[{ text: '📱 Ilovada ko‘rish', web_app: { url: targetUrl } }]]
            }
          );
        }
      } else if (data === 'my_profile') {
        const user = db.users.find(u => u.telegramId === String(chatId));
        await this.sendMessage(
          chatId,
          `👤 *Sizning profilingiz:*\n\n` +
          `Ism: *${user?.fullName || 'Foydalanuvchi'}*\n` +
          `Telegram ID: \`${chatId}\`\n` +
          `Referral kodingiz: \`${user?.referralCode || 'REF77'}\`\n` +
          `Bonus hisobingiz: *${user?.bonusBalance || 0} ₽*`
        );
      } else if (data === 'support') {
        await this.sendMessage(
          chatId,
          `🆘 *Mijozlar qo‘llab-quvvatlash xizmati*\n\n` +
          `Biz bilan bog‘lanish:\n` +
          `📞 Tel: +7 999 001 2233\n` +
          `💬 Telegram: @piter_taxi_support\n` +
          `Savollaringiz bo‘lsa, yozing!`
        );
      }
    }
  }

  async sendMessage(chatId: string | number, text: string, replyMarkup?: any): Promise<boolean> {
    if (!this.token || this.token.includes('MY_BOT_TOKEN')) {
      this.log('INFO', `[Simulated Send] to ${chatId}: ${text.slice(0, 60)}...`);
      return true;
    }

    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          reply_markup: replyMarkup
        })
      });
      const data = await res.json();
      if (data.ok) {
        this.log('SUCCESS', `Notification sent to chat ${chatId}`);
        return true;
      } else {
        this.log('WARN', `Failed to send Telegram message: ${data.description}`);
        return false;
      }
    } catch (err: any) {
      this.log('ERROR', `Error sending Telegram message: ${err.message}`);
      return false;
    }
  }

  async broadcast(targetGroup: string, title: string, message: string): Promise<{ sent: number; total: number }> {
    let targetUsers = db.users.filter(u => u.telegramId);

    if (targetGroup === 'DRIVERS') {
      targetUsers = targetUsers.filter(u => u.role === 'DRIVER');
    } else if (targetGroup === 'CLIENTS') {
      targetUsers = targetUsers.filter(u => u.role === 'CLIENT');
    } else if (targetGroup === 'ACTIVE_DRIVERS') {
      const activeDriverUserIds = db.drivers.filter(d => d.isOnline).map(d => d.userId);
      targetUsers = targetUsers.filter(u => activeDriverUserIds.includes(u.id));
    }

    let sent = 0;
    const formatted = `📢 *${title}*\n\n${message}`;

    for (const user of targetUsers) {
      if (user.telegramId) {
        const ok = await this.sendMessage(user.telegramId, formatted);
        if (ok) sent++;
        // also store web notification
        db.addNotification(user.id, title, message, 'SYSTEM');
      }
    }

    this.log('SUCCESS', `Broadcast sent to ${sent}/${targetUsers.length} users (${targetGroup})`);
    return { sent, total: targetUsers.length };
  }
}

export const telegramBot = new TelegramBotService();
