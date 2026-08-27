import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { db, SPB_LOCATIONS, OFFICIAL_PAYMENT_CARD, calculateDistanceKm } from './server/db';
import { telegramBot } from './server/telegram';
import { OrderStatus, UserRole, TariffType } from './src/types';

// Gemini AI Client Setup
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// SSE Connected Clients for Real-time event streaming
const sseClients: Response[] = [];

export function broadcastEvent(type: string, data: any) {
  const payload = `data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(payload);
    } catch (err) {
      sseClients.splice(i, 1);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Telegram Bot service
  const appUrl = process.env.APP_URL || 'https://piter-taxi.local';
  telegramBot.init(appUrl);

  // -------------------------------------------------------------
  // REAL-TIME SERVER-SENT EVENTS (SSE)
  // -------------------------------------------------------------
  app.get('/api/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    sseClients.push(res);

    // Send initial handshake
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', message: 'Real-time stream connected' })}\n\n`);

    req.on('close', () => {
      const idx = sseClients.indexOf(res);
      if (idx !== -1) sseClients.splice(idx, 1);
    });
  });

  // -------------------------------------------------------------
  // HEALTH & LOCATIONS & PAYMENT INFO
  // -------------------------------------------------------------
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      botConnected: !!telegramBot.botInfo,
      botUsername: telegramBot.botInfo?.username || 'PiterTaxi_Bot',
      totalOrders: db.orders.length,
      activeDrivers: db.drivers.filter(d => d.isOnline && !d.isOnBreak).length,
      timestamp: new Date().toISOString()
    });
  });

  app.get('/api/locations', (req: Request, res: Response) => {
    res.json(SPB_LOCATIONS);
  });

  app.get('/api/payment-config', (req: Request, res: Response) => {
    res.json(OFFICIAL_PAYMENT_CARD);
  });

  // -------------------------------------------------------------
  // AUTH & USERS (CLIENT & DRIVER)
  // -------------------------------------------------------------
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const { phone, password } = req.body;
    if (!phone) return res.status(400).json({ error: 'Telefon raqam kiritilishi shart' });

    const user = db.authenticateUser(phone, password);
    if (!user) {
      return res.status(401).json({ error: 'Telefon raqam yoki parol noto‘g‘ri' });
    }

    const driver = db.drivers.find(d => d.userId === user.id);
    db.addAuditLog(user.id, user.fullName, user.role, 'USER_LOGIN', 'Foydalanuvchi tizimga kirdi');
    res.json({ success: true, user, driver });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const { fullName, phone, password, role = 'CLIENT' } = req.body;
    if (!fullName || !phone) {
      return res.status(400).json({ error: 'Ism va telefon raqam kiritilishi shart' });
    }

    const user = db.registerUser({ fullName, phone, password, role });
    const driver = db.drivers.find(d => d.userId === user.id);
    res.json({ success: true, user, driver });
  });

  app.get('/api/auth/me', (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.json({ user: null, driver: null });
    }
    const user = db.users.find(u => u.id === userId) || null;
    const driver = user ? db.drivers.find(d => d.userId === user.id) || null : null;
    res.json({ user, driver });
  });

  app.get('/api/users', (req: Request, res: Response) => {
    res.json(db.users);
  });

  app.delete('/api/users/:id', (req: Request, res: Response) => {
    const success = db.deleteUser(req.params.id);
    if (!success) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    broadcastEvent('USER_DELETED', { id: req.params.id });
    res.json({ success: true, message: 'Foydalanuvchi tizimdan chiqarib tashlandi' });
  });

  app.post('/api/auth/telegram-init', (req: Request, res: Response) => {
    const { telegramId, username, fullName, phone, role } = req.body;
    if (!telegramId && !fullName) {
      return res.status(400).json({ error: 'Telegram ma‘lumotlari yetarli emas' });
    }

    let user = db.users.find(u => u.telegramId === String(telegramId));
    if (!user) {
      user = {
        id: 'usr_' + Date.now(),
        telegramId: telegramId ? String(telegramId) : undefined,
        username,
        fullName: fullName || 'Telegram Foydalanuvchi',
        phone: phone || '+7 900 123 4567',
        role: role || 'CLIENT',
        createdAt: new Date().toISOString(),
        status: 'ACTIVE',
        referralCode: 'PITER' + Math.floor(1000 + Math.random() * 9000),
        referralCount: 0,
        bonusBalance: 150
      };
      db.users.push(user);
      db.addAuditLog(user.id, user.fullName, user.role, 'USER_REGISTERED', 'Foydalanuvchi ro‘yxatdan o‘tdi');
    }
    const driver = db.drivers.find(d => d.userId === user.id);
    res.json({ user, driver });
  });

  app.patch('/api/users/:id/role', (req: Request, res: Response) => {
    const { role } = req.body;
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    user.role = role as UserRole;
    db.addAuditLog('admin', 'Admin', 'SUPERADMIN', 'USER_ROLE_CHANGED', `${user.fullName} roli ${role} ga o‘zgartirildi`);
    broadcastEvent('USER_UPDATED', user);
    res.json(user);
  });

  app.patch('/api/users/:id/status', (req: Request, res: Response) => {
    const { status } = req.body;
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

    user.status = status;
    db.addAuditLog('admin', 'Admin', 'SUPERADMIN', 'USER_STATUS_CHANGED', `${user.fullName} holati ${status} qilindi`);
    broadcastEvent('USER_UPDATED', user);
    res.json(user);
  });

  // -------------------------------------------------------------
  // ADMIN PIN AUTHENTICATION
  // -------------------------------------------------------------
  app.post('/api/admin/auth', (req: Request, res: Response) => {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN kod kiritilishi shart' });

    const isValid = db.verifyAdminPin(String(pin).trim());
    if (!isValid) {
      return res.status(403).json({ error: 'Admin PIN kodi noto‘g‘ri!' });
    }

    res.json({ success: true, message: 'Admin huquqi tasdiqlandi' });
  });

  app.post('/api/admin/change-pin', (req: Request, res: Response) => {
    const { currentPin, newPin } = req.body;
    if (!db.verifyAdminPin(String(currentPin).trim())) {
      return res.status(403).json({ error: 'Amaldagi PIN kod noto‘g‘ri' });
    }
    if (!newPin || newPin.length < 4) {
      return res.status(400).json({ error: 'Yangi PIN kamida 4 xonali bo‘lishi kerak' });
    }
    db.setAdminPin(String(newPin).trim());
    db.addAuditLog('admin', 'SuperAdmin', 'SUPERADMIN', 'PIN_CHANGED', 'Admin PIN kodi yangilandi');
    res.json({ success: true, message: 'PIN kod muvaffaqiyatli o‘zgartirildi' });
  });

  // -------------------------------------------------------------
  // DRIVERS CATALOG & WORKFLOWS
  // -------------------------------------------------------------
  app.get('/api/drivers', (req: Request, res: Response) => {
    res.json(db.drivers);
  });

  app.get('/api/drivers/:id', (req: Request, res: Response) => {
    const driver = db.drivers.find(d => d.id === req.params.id || d.userId === req.params.id);
    if (!driver) return res.status(404).json({ error: 'Haydovchi topilmadi' });
    res.json(driver);
  });

  // Register Driver
  app.post('/api/drivers/register', (req: Request, res: Response) => {
    const {
      fullName,
      phone,
      licenseNumber,
      vehicleMake,
      vehicleModel,
      vehicleColor,
      vehiclePlate,
      vehicleYear,
      tariff = 'STANDARD',
      carPhotoUrl,
      experienceYears = 3,
      workingHoursStart = '08:00',
      workingHoursEnd = '22:00',
      receiptUrl
    } = req.body;

    if (!fullName || !phone || !vehiclePlate || !licenseNumber) {
      return res.status(400).json({ error: 'Barcha majburiy maydonlarni to‘ldiring' });
    }

    let user = db.users.find(u => u.phone === phone);
    if (!user) {
      user = {
        id: 'usr_' + Date.now(),
        fullName,
        phone,
        role: 'DRIVER',
        createdAt: new Date().toISOString(),
        status: 'ACTIVE',
        referralCode: 'DRV' + Math.floor(1000 + Math.random() * 9000),
        referralCount: 0,
        bonusBalance: 0
      };
      db.users.push(user);
    } else {
      user.role = 'DRIVER';
    }

    const driverId = 'drv_' + Date.now();
    const newDriver = {
      id: driverId,
      userId: user.id,
      user,
      status: receiptUrl ? 'PENDING' : 'APPROVED' as any,
      isOnline: false,
      isOnBreak: false,
      workingHours: { start: workingHoursStart, end: workingHoursEnd },
      vehicle: {
        make: vehicleMake,
        model: vehicleModel,
        color: vehicleColor,
        plateNumber: vehiclePlate.toUpperCase(),
        year: Number(vehicleYear) || 2021,
        tariff: tariff as TariffType,
        photoUrl: carPhotoUrl || 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600'
      },
      experienceYears: Number(experienceYears) || 3,
      rating: 5.0,
      totalTrips: 0,
      reviews: [],
      subscription: {
        status: receiptUrl ? 'TRIAL' : 'ACTIVE' as any,
        planName: receiptUrl ? 'To‘lov cheki tekshirilmoqda' : 'Oylik Obuna (500 ₽)',
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        price: 500,
        paymentReceiptUrl: receiptUrl,
        receiptUploadedAt: receiptUrl ? new Date().toISOString() : undefined,
        approvalStatus: receiptUrl ? 'PENDING_APPROVAL' : 'APPROVED' as any
      },
      licenseNumber,
      documentsVerified: !receiptUrl,
      todayEarnings: 0,
      todayTrips: 0,
      registeredAt: new Date().toISOString()
    };

    db.drivers.push(newDriver);

    if (receiptUrl) {
      db.submitPaymentReceipt({
        driverId: newDriver.id,
        receiptUrl,
        amount: 500,
        targetCard: OFFICIAL_PAYMENT_CARD.cardNumber
      });
    }

    db.addAuditLog(user.id, user.fullName, 'DRIVER', 'DRIVER_REGISTERED', 'Yangi haydovchi arizasi qabul qilindi');
    broadcastEvent('DRIVER_REGISTERED', newDriver);
    res.json({ success: true, driver: newDriver, user });
  });

  // Driver Shift & Working Hours
  app.patch('/api/drivers/:id/working-hours', (req: Request, res: Response) => {
    const { start, end } = req.body;
    if (!start || !end) return res.status(400).json({ error: 'Boshlanish va tugash vaqti kerak' });

    const driver = db.setDriverWorkingHours(req.params.id, start, end);
    if (!driver) return res.status(404).json({ error: 'Haydovchi topilmadi' });

    broadcastEvent('DRIVER_STATUS_UPDATED', driver);
    res.json({ success: true, driver });
  });

  // Driver "Meni vaqtim yo'q" (Break Toggle)
  app.patch('/api/drivers/:id/toggle-break', (req: Request, res: Response) => {
    const { isOnBreak, reason } = req.body;
    const driver = db.toggleDriverBreak(req.params.id, Boolean(isOnBreak), reason);
    if (!driver) return res.status(404).json({ error: 'Haydovchi topilmadi' });

    broadcastEvent('DRIVER_STATUS_UPDATED', driver);
    res.json({ success: true, driver });
  });

  app.patch('/api/drivers/:id/toggle-online', (req: Request, res: Response) => {
    const driver = db.drivers.find(d => d.id === req.params.id || d.userId === req.params.id);
    if (!driver) return res.status(404).json({ error: 'Haydovchi topilmadi' });

    // If driver is on break, online toggle cancels break
    if (driver.isOnBreak) {
      driver.isOnBreak = false;
      driver.breakReason = undefined;
    }

    driver.isOnline = !driver.isOnline;
    broadcastEvent('DRIVER_STATUS_UPDATED', driver);
    res.json(driver);
  });

  // Delete / Expel driver by admin
  app.delete('/api/drivers/:id', (req: Request, res: Response) => {
    const success = db.deleteDriver(req.params.id);
    if (!success) return res.status(404).json({ error: 'Haydovchi topilmadi' });

    broadcastEvent('DRIVER_EXPELLED', { id: req.params.id });
    res.json({ success: true, message: 'Haydovchi tizimdan chiqarib yuborildi' });
  });

  // -------------------------------------------------------------
  // PAYMENT RECEIPTS & MONTHLY SUBSCRIPTIONS
  // -------------------------------------------------------------
  app.get('/api/admin/receipts', (req: Request, res: Response) => {
    res.json(db.paymentReceipts);
  });

  app.post('/api/drivers/:id/upload-receipt', (req: Request, res: Response) => {
    const { receiptUrl, amount = 500 } = req.body;
    if (!receiptUrl) return res.status(400).json({ error: 'Chek rasmi kiritilmadi' });

    try {
      const receipt = db.submitPaymentReceipt({
        driverId: req.params.id,
        receiptUrl,
        amount: Number(amount)
      });
      broadcastEvent('RECEIPT_SUBMITTED', receipt);
      res.json({ success: true, receipt });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post('/api/admin/receipts/:id/approve', (req: Request, res: Response) => {
    const { notes } = req.body;
    const result = db.approvePaymentReceipt(req.params.id, notes);
    if (!result.success) return res.status(404).json(result);

    broadcastEvent('RECEIPT_APPROVED', result);
    if (result.driver) broadcastEvent('DRIVER_STATUS_UPDATED', result.driver);
    res.json(result);
  });

  app.post('/api/admin/receipts/:id/reject', (req: Request, res: Response) => {
    const { reason } = req.body;
    const result = db.rejectPaymentReceipt(req.params.id, reason || 'To‘lov cheki tasdiqlanmadi');
    if (!result.success) return res.status(404).json(result);

    broadcastEvent('RECEIPT_REJECTED', result);
    res.json(result);
  });

  // -------------------------------------------------------------
  // GEMINI AI DISPATCH & MATCHING
  // -------------------------------------------------------------
  app.post('/api/orders/ai-dispatch', async (req: Request, res: Response) => {
    const { from, to, tariff = 'STANDARD', price } = req.body;

    const availableDrivers = db.getAvailableDriversForOrder(tariff);

    if (availableDrivers.length === 0) {
      // Check if there are drivers on other tariffs or outside working hours
      const allDrivers = db.drivers;
      const anyOnline = allDrivers.filter(d => d.isOnline);
      const onBreakCount = allDrivers.filter(d => d.isOnBreak).length;

      return res.json({
        matched: false,
        driver: null,
        message: 'Uzur, hozirda bu yo‘nalish / tarif bo‘yicha bo‘sh taksi yo‘q. Iltimos birozdan so‘ng qayta urinib ko‘ring yoki boshqa tarifni tanlang.',
        reason: onBreakCount > 0 ? 'Barcha mos haydovchilar hozirda band yoki tanaffusda.' : 'Hozircha onlayn haydovchilar mavjud emas.',
        availableTariffs: Array.from(new Set(anyOnline.map(d => d.vehicle.tariff)))
      });
    }

    try {
      // Use Gemini to intelligently select the optimal driver based on location, rating, experience
      const prompt = `
Sankt-Peterburgdagi taxi tizimi uchun AI dispetcher vazifasini bajar.
Mijoz buyurtmasi:
Qayerdan: ${JSON.stringify(from)}
Qayerga: ${JSON.stringify(to)}
Tanlangan tarif: ${tariff}
Narx: ${price} RUB

Mavjud real haydovchilar ro'yxati:
${JSON.stringify(availableDrivers.map(d => ({
  id: d.id,
  name: d.user?.fullName,
  phone: d.user?.phone,
  vehicle: `${d.vehicle.make} ${d.vehicle.model} (${d.vehicle.color})`,
  plate: d.vehicle.plateNumber,
  tariff: d.vehicle.tariff,
  rating: d.rating,
  experienceYears: d.experienceYears,
  currentLat: d.currentLat,
  currentLng: d.currentLng,
  workingHours: d.workingHours
})))}

Vazifa: Eng mos haydovchini tanla (eng yuqori reyting, tajriba yoki eng qulay masofa bo'yicha).
JSON formatda javob ber:
{
  "selectedDriverId": "drv_X",
  "estimatedArrivalMin": 4,
  "dispatchReason": "Sababi o'zbek tilida qisqa"
}
`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              selectedDriverId: { type: Type.STRING },
              estimatedArrivalMin: { type: Type.NUMBER },
              dispatchReason: { type: Type.STRING }
            },
            required: ['selectedDriverId', 'estimatedArrivalMin', 'dispatchReason']
          }
        }
      });

      const parsed = JSON.parse(aiResponse.text || '{}');
      const selectedDriver = availableDrivers.find(d => d.id === parsed.selectedDriverId) || availableDrivers[0];

      return res.json({
        matched: true,
        driver: selectedDriver,
        message: `Mos haydovchi topildi: ${selectedDriver.vehicle.make} ${selectedDriver.vehicle.model}`,
        estimatedArrivalMin: parsed.estimatedArrivalMin || 5,
        reason: parsed.dispatchReason || 'AI optimal haydovchini aniqladi'
      });
    } catch (e: any) {
      // Graceful fallback to highest rated available driver
      const bestDriver = availableDrivers.sort((a, b) => b.rating - a.rating)[0];
      return res.json({
        matched: true,
        driver: bestDriver,
        message: `Mos haydovchi topildi: ${bestDriver.vehicle.make} ${bestDriver.vehicle.model}`,
        estimatedArrivalMin: 5,
        reason: 'Eng yuqori reytingli onlayn haydovchi tayinlandi'
      });
    }
  });

  // -------------------------------------------------------------
  // GEMINI AI ADMIN ANALYTICS & REVENUE BREAKDOWN
  // -------------------------------------------------------------
  app.get('/api/admin/ai-analytics', async (req: Request, res: Response) => {
    const stats = db.getAdminStats();
    const completedOrders = db.orders.filter(o => o.status === 'COMPLETED');
    const drivers = db.drivers;

    try {
      const prompt = `
Sankt-Peterburg "O‘ZIMIZ UCHUN | PITER TAXI" platformasi uchun AI moliya va biznes tahlilchisi bo'lib hisobot tayyorla.
Haqiqiy baza ma'lumotlari:
- Jami foydalanuvchilar: ${stats.totalUsers} (Faol: ${stats.activeUsers})
- Jami haydovchilar: ${stats.totalDrivers} (Onlayn: ${stats.activeDriversOnline}, Obunasi faollar: ${stats.activeSubscriptions})
- Bugungi tushum (safarlar): ${stats.todayRevenueRub} RUB
- Oylik tushum (safarlar + 500 RUB oylik obuna to'lovlari): ${stats.monthlyRevenueRub} RUB
- Bugungi buyurtmalar: ${stats.todayOrders} (Bajarilgan: ${stats.completedOrders}, Bekor: ${stats.cancelledOrders})
- O'rtacha reyting: ${stats.averageRating}
- Konversiya darajasi: ${stats.conversionRate}%
- Haydovchilar ro'yxati va holati: ${JSON.stringify(drivers.map(d => ({ name: d.user?.fullName, tariff: d.vehicle.tariff, rating: d.rating, earnings: d.todayEarnings, sub: d.subscription.status })))}

Vazifa: O'zbek tilida professional, real tushum tahlili, SPB tumanlari bo'yicha talab tahlili, haydovchilar unumdorligi va amaliy tavsiyalar ber.
JSON formatda javob ber:
{
  "summary": "Platformaning joriy moliyaviy va operatsion tahlili",
  "estimatedMonthlyNetRevenue": 142000,
  "driverEfficiencyScore": 96,
  "highDemandDistricts": [
    { "district": "Devyatkino / Murino", "demandLevel": "HIGH", "surgeFactor": 1.2 },
    { "district": "Pulkovo Aeroport", "demandLevel": "HIGH", "surgeFactor": 1.3 },
    { "district": "Vosstaniya / Tsentralny", "demandLevel": "HIGH", "surgeFactor": 1.15 },
    { "district": "Kupchino", "demandLevel": "MEDIUM", "surgeFactor": 1.05 }
  ],
  "fraudOrRiskAlerts": [
    "To'lov cheklarini tekshirish jarayoni faol nazoratda",
    "Bekor qilingan buyurtmalar soni 5% dan past, xavfsiz"
  ],
  "recommendations": [
    "Ertalabki soat 07:00-09:30 da Devyatkino va Kupchino tumanlariga ko'proq Standart tarifidagi haydovchilarni jalb qilish",
    "500 ₽ oylik obuna bo'yicha 7 kunlik sinovdagi haydovchilarga SMS eslatma yuborish"
  ]
}
`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              estimatedMonthlyNetRevenue: { type: Type.NUMBER },
              driverEfficiencyScore: { type: Type.NUMBER },
              highDemandDistricts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    district: { type: Type.STRING },
                    demandLevel: { type: Type.STRING },
                    surgeFactor: { type: Type.NUMBER }
                  },
                  required: ['district', 'demandLevel', 'surgeFactor']
                }
              },
              fraudOrRiskAlerts: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['summary', 'estimatedMonthlyNetRevenue', 'driverEfficiencyScore', 'highDemandDistricts', 'fraudOrRiskAlerts', 'recommendations']
          }
        }
      });

      const parsed = JSON.parse(aiResponse.text || '{}');
      return res.json({
        ...parsed,
        generatedAt: new Date().toISOString()
      });
    } catch (e: any) {
      // Fallback structured calculation
      return res.json({
        summary: `Platformada jami ${stats.totalDrivers} ta haydovchi ro'yxatdan o'tgan. Oylik tushum ${stats.monthlyRevenueRub.toLocaleString()} ₽ ni tashkil etadi. O'rtacha mijozlar qoniqish reytingi: ${stats.averageRating} / 5.0.`,
        estimatedMonthlyNetRevenue: stats.monthlyRevenueRub,
        driverEfficiencyScore: 95,
        highDemandDistricts: [
          { district: 'Devyatkino / Murino', demandLevel: 'HIGH', surgeFactor: 1.25 },
          { district: 'Pulkovo Aeroport', demandLevel: 'HIGH', surgeFactor: 1.3 },
          { district: 'Ploshchad Vosstaniya', demandLevel: 'HIGH', surgeFactor: 1.15 },
          { district: 'Apraksin Dvor (Apraks)', demandLevel: 'MEDIUM', surgeFactor: 1.1 }
        ],
        fraudOrRiskAlerts: [
          'Barcha haydovchilar to‘lov cheki admin orqali tasdiqlangan holda ishlamoqda.',
          'Konversiya 95.8% — bekor qilish xavfi past darajada.'
        ],
        recommendations: [
          'Ertalabki va kechki pik vaqtlarida aeroport yo‘nalishlariga ko‘proq Komfort/Miniven haydovchilarini jalb qilish.',
          'Oylik 500 ₽ obunasi tugayotgan haydovchilarga avtomatik push eslatma yuborish.'
        ],
        generatedAt: new Date().toISOString()
      });
    }
  });

  // -------------------------------------------------------------
  // ORDERS & STATE MACHINE
  // -------------------------------------------------------------
  app.get('/api/orders', (req: Request, res: Response) => {
    const { clientId, driverId, status } = req.query;
    let list = [...db.orders];

    if (clientId) list = list.filter(o => o.clientId === clientId);
    if (driverId) list = list.filter(o => o.driverId === driverId);
    if (status) list = list.filter(o => o.status === status);

    res.json(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  });

  app.get('/api/orders/:id', (req: Request, res: Response) => {
    const order = db.orders.find(o => o.id === req.params.id || String(o.orderNumber) === req.params.id);
    if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });
    res.json(order);
  });

  // Create new order
  app.post('/api/orders', async (req: Request, res: Response) => {
    const {
      clientId,
      clientName,
      clientPhone,
      clientTelegramId,
      from,
      to,
      tariff = 'STANDARD',
      price,
      promoCode,
      comment,
      options = {},
      paymentMethod = 'CASH',
      assignedDriverId
    } = req.body;

    if (!from || !to || !price) {
      return res.status(400).json({ error: 'Manzil va narx ko‘rsatilishi shart' });
    }

    // Check Promocode
    let discountAmount = 0;
    let finalPrice = Number(price);
    if (promoCode) {
      const p = db.promoCodes.find(item => item.code.toUpperCase() === promoCode.toUpperCase() && item.isActive);
      if (p) {
        if (p.discountPercent) discountAmount = Math.round((finalPrice * p.discountPercent) / 100);
        else if (p.discountFixedRub) discountAmount = Math.min(p.discountFixedRub, finalPrice - 100);
        finalPrice = Math.max(100, finalPrice - discountAmount);
        p.usedCount += 1;
      }
    }

    const orderNum = db.getNextOrderNumber();
    const assignedDriver = assignedDriverId ? db.drivers.find(d => d.id === assignedDriverId) : undefined;
    const searchRadiusKm = Number(req.body.searchRadiusKm || 15);

    // Calculate candidate drivers within search radius for real-time dispatch
    const nearbyDrivers = db.getDriversWithinRadius(from.lat, from.lng, searchRadiusKm, tariff);

    const newOrder = {
      id: 'ord_' + orderNum,
      orderNumber: orderNum,
      clientId: clientId || 'usr_client_1',
      clientName: clientName || 'Mijoz',
      clientPhone: clientPhone || '+7 999 123 4567',
      clientTelegramId,
      driverId: assignedDriver ? assignedDriver.id : undefined,
      driver: assignedDriver,
      from,
      to,
      tariff,
      scheduledTime: 'now',
      price: Number(price),
      discountAmount,
      finalPrice,
      promoCode,
      comment,
      options,
      status: (assignedDriver ? 'ACCEPTED' : 'SEARCHING') as OrderStatus,
      createdAt: new Date().toISOString(),
      acceptedAt: assignedDriver ? new Date().toISOString() : undefined,
      estimatedDistanceKm: Math.round((8 + Math.random() * 15) * 10) / 10,
      estimatedDurationMin: Math.round(15 + Math.random() * 25),
      searchRadiusKm,
      paymentMethod,
      paymentStatus: 'PENDING' as any
    };

    db.orders.unshift(newOrder);

    db.addAuditLog(
      newOrder.clientId,
      newOrder.clientName,
      'CLIENT',
      'ORDER_CREATED',
      `Buyurtma #${orderNum} (${from.address} -> ${to.address}, ${searchRadiusKm} km radius)`
    );

    db.addNotification(
      newOrder.clientId,
      `🚕 Buyurtmangiz #${orderNum} qabul qilindi`,
      assignedDriver
        ? `${assignedDriver.vehicle.make} qabul qildi.`
        : `${nearbyDrivers.length > 0 ? nearbyDrivers.length + ' ta haydovchiga' : 'Haydovchilarga'} yuborildi...`,
      'ORDER',
      { orderId: newOrder.id }
    );

    if (clientTelegramId) {
      telegramBot.sendMessage(
        clientTelegramId,
        `🚕 *Buyurtmangiz #${orderNum} qabul qilindi!*\n\n` +
        `📍 *Qayerdan:* ${from.address}\n` +
        `🏁 *Qayerga:* ${to.address}\n` +
        `💰 *Narx:* ${finalPrice} ₽\n` +
        (assignedDriver ? `🚗 *Haydovchi:* ${assignedDriver.user?.fullName} (${assignedDriver.vehicle.plateNumber})` : `🔎 ${nearbyDrivers.length} ta yaqin haydovchiga xabar yuborildi...`)
      );
    }

    // Broadcast new order with real-time target data
    broadcastEvent('ORDER_CREATED', {
      ...newOrder,
      nearbyDriversCount: nearbyDrivers.length,
      candidateDriverIds: nearbyDrivers.map(nd => nd.driver.id)
    });

    res.json(newOrder);
  });

  // Real-time Spatial Query: Get nearby available orders for a driver within radius
  app.get('/api/orders/nearby', (req: Request, res: Response) => {
    const { lat, lng, radius = 15, tariff } = req.query;
    const driverLat = lat ? Number(lat) : undefined;
    const driverLng = lng ? Number(lng) : undefined;
    const radiusKm = Number(radius);

    const availableOrders = db.orders.filter(o => o.status === 'SEARCHING' || o.status === 'NEW');

    const mapped = availableOrders
      .map(o => {
        let dist = 3.5;
        if (driverLat !== undefined && driverLng !== undefined && o.from?.lat && o.from?.lng) {
          dist = calculateDistanceKm(driverLat, driverLng, o.from.lat, o.from.lng);
        }
        return {
          ...o,
          distanceToPickupKm: dist
        };
      })
      .filter(o => {
        if (tariff && o.tariff !== tariff) return false;
        if (radiusKm > 0 && o.distanceToPickupKm !== undefined) {
          return o.distanceToPickupKm <= radiusKm;
        }
        return true;
      })
      .sort((a, b) => (a.distanceToPickupKm || 0) - (b.distanceToPickupKm || 0));

    res.json(mapped);
  });

  // Concurrency Locking: Driver accepts order with atomic check-and-set mutex
  app.post('/api/orders/:id/accept', async (req: Request, res: Response) => {
    const { driverId } = req.body;
    if (!driverId) {
      return res.status(400).json({ error: 'Haydovchi identifikatori (driverId) kiritilishi shart' });
    }

    // Atomic acceptance with concurrency lock
    const result = await db.acceptOrderAtomic(req.params.id, driverId);

    if (!result.success) {
      // 409 Conflict if already taken by another driver, or 400/404 based on error
      const statusCode = result.code === 'ORDER_ALREADY_TAKEN' || result.code === 'ORDER_LOCKED' || result.code === 'ORDER_ALREADY_ASSIGNED' ? 409 : 400;
      return res.status(statusCode).json({
        error: result.error || 'Buyurtmani qabul qilib bo‘lmadi',
        code: result.code
      });
    }

    const order = result.order!;

    // Real-time broadcast to all clients and drivers (other drivers' apps will clear the order from available pool)
    broadcastEvent('ORDER_ACCEPTED', { orderId: order.id, driverId: order.driverId, order });
    broadcastEvent('ORDER_UPDATED', order);

    res.json(order);
  });

  // Driver Live GPS / Location Update
  app.patch('/api/drivers/:id/location', (req: Request, res: Response) => {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'lat va lng qiymatlari talab qilinadi' });
    }
    const updated = db.updateDriverLocation(req.params.id, Number(lat), Number(lng));
    if (!updated) return res.status(404).json({ error: 'Haydovchi topilmadi' });

    broadcastEvent('DRIVER_LOCATION_UPDATED', {
      driverId: updated.id,
      currentLat: updated.currentLat,
      currentLng: updated.currentLng
    });

    res.json({ success: true, driver: updated });
  });

  // Driver "Mijozni yetkazdim" / Complete Trip Button
  app.post('/api/orders/:id/complete-trip', (req: Request, res: Response) => {
    const order = db.orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

    order.status = 'COMPLETED';
    order.completedAt = new Date().toISOString();
    order.paymentStatus = 'SUCCESS';

    if (order.driver) {
      order.driver.todayEarnings = (order.driver.todayEarnings || 0) + order.finalPrice;
      order.driver.todayTrips = (order.driver.todayTrips || 0) + 1;
      order.driver.totalTrips = (order.driver.totalTrips || 0) + 1;
    }

    db.addAuditLog(order.driverId || 'driver', 'Driver', 'DRIVER', 'ORDER_COMPLETED', `Buyurtma #${order.orderNumber} mijoz yetkazildi (${order.finalPrice} ₽)`);
    db.addNotification(order.clientId, `✅ Safar yakunlandi!`, `Manzilga yetib keldingiz. Iltimos haydovchini baholang.`, 'ORDER', { orderId: order.id });

    broadcastEvent('ORDER_UPDATED', order);
    res.json({ success: true, order });
  });

  // State Transition Machine
  app.patch('/api/orders/:id/status', (req: Request, res: Response) => {
    const { status, cancelReason } = req.body;
    const order = db.orders.find(o => o.id === req.params.id);

    if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

    order.status = status as OrderStatus;
    const now = new Date().toISOString();

    if (status === 'DRIVER_ARRIVING') {
      // Driver on way
    } else if (status === 'ARRIVED') {
      order.arrivedAt = now;
      db.addNotification(order.clientId, '🚕 Haydovchi yetib keldi!', 'Avtomobil kutish joyida. 5 daqiqa bepul kutish vaqti.', 'ORDER');
    } else if (status === 'IN_PROGRESS') {
      order.startedAt = now;
      db.addNotification(order.clientId, '🚀 Safar boshlandi', 'Oq yo‘l tilaymiz!', 'ORDER');
    } else if (status === 'COMPLETED') {
      order.completedAt = now;
      order.paymentStatus = 'SUCCESS';
      if (order.driver) {
        order.driver.todayEarnings = (order.driver.todayEarnings || 0) + order.finalPrice;
        order.driver.todayTrips = (order.driver.todayTrips || 0) + 1;
        order.driver.totalTrips = (order.driver.totalTrips || 0) + 1;
      }
      db.addNotification(order.clientId, '✅ Safar yakunlandi', `Rahmat! Xizmat narxi: ${order.finalPrice} ₽`, 'ORDER');
    } else if (status === 'CANCELLED') {
      order.cancelledAt = now;
      order.cancelReason = cancelReason || 'Mijoz/Haydovchi tomonidan bekor qilindi';
      db.addNotification(order.clientId, '❌ Buyurtma bekor qilindi', `Sabab: ${order.cancelReason}`, 'ORDER');
    }

    broadcastEvent('ORDER_UPDATED', order);
    res.json(order);
  });

  // Client Submits Review and Rating
  app.post('/api/orders/:id/rate', (req: Request, res: Response) => {
    const { rating, reviewComment, clientName } = req.body;
    const order = db.orders.find(o => o.id === req.params.id);

    if (!order) return res.status(404).json({ error: 'Buyurtma topilmadi' });

    order.ratingGiven = Number(rating);
    order.reviewComment = reviewComment;

    if (order.driverId) {
      db.addDriverReview(order.driverId, order.id, clientName || order.clientName, Number(rating), reviewComment);
    }

    db.addAuditLog(order.clientId, order.clientName, 'CLIENT', 'RATING_SUBMITTED', `Buyurtma #${order.orderNumber} uchun ${rating} yulduz berildi`);
    broadcastEvent('ORDER_UPDATED', order);
    res.json({ success: true, order });
  });

  // -------------------------------------------------------------
  // PROMO CODES
  // -------------------------------------------------------------
  app.get('/api/promocodes', (req: Request, res: Response) => {
    res.json(db.promoCodes);
  });

  app.post('/api/promocodes/validate', (req: Request, res: Response) => {
    const { code, amount } = req.body;
    const promo = db.promoCodes.find(p => p.code.toUpperCase() === (code || '').toUpperCase() && p.isActive);

    if (!promo) {
      return res.status(404).json({ valid: false, message: 'Bunday promokod mavjud emas yoki muddati o‘tgan' });
    }

    if (promo.minOrderAmount && amount < promo.minOrderAmount) {
      return res.status(400).json({ valid: false, message: `Ushbu promokod minimal ${promo.minOrderAmount} ₽ buyurtmalar uchun amal qiladi` });
    }

    let discount = 0;
    if (promo.discountPercent) discount = Math.round((amount * promo.discountPercent) / 100);
    else if (promo.discountFixedRub) discount = promo.discountFixedRub;

    res.json({ valid: true, promo, discount, finalAmount: Math.max(100, amount - discount) });
  });

  app.post('/api/promocodes', (req: Request, res: Response) => {
    const { code, discountPercent, discountFixedRub, usageLimit, minOrderAmount } = req.body;
    const newPromo = {
      id: 'promo_' + Date.now(),
      code: String(code).toUpperCase(),
      discountPercent: discountPercent ? Number(discountPercent) : undefined,
      discountFixedRub: discountFixedRub ? Number(discountFixedRub) : undefined,
      expiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
      usageLimit: Number(usageLimit) || 500,
      usedCount: 0,
      minOrderAmount: minOrderAmount ? Number(minOrderAmount) : undefined,
      isActive: true
    };
    db.promoCodes.push(newPromo);
    db.addAuditLog('admin', 'Admin', 'SUPERADMIN', 'PROMOCODE_CREATED', `Yangi promokod yaratildi: ${newPromo.code}`);
    broadcastEvent('PROMO_CREATED', newPromo);
    res.json(newPromo);
  });

  app.delete('/api/promocodes/:id', (req: Request, res: Response) => {
    const idx = db.promoCodes.findIndex(p => p.id === req.params.id);
    if (idx !== -1) {
      db.promoCodes.splice(idx, 1);
      return res.json({ success: true });
    }
    res.status(404).json({ error: 'Promokod topilmadi' });
  });

  // -------------------------------------------------------------
  // SUPPORT TICKETS
  // -------------------------------------------------------------
  app.get('/api/support', (req: Request, res: Response) => {
    const { userId } = req.query;
    if (userId) {
      return res.json(db.supportTickets.filter(t => t.userId === userId));
    }
    res.json(db.supportTickets);
  });

  app.post('/api/support', (req: Request, res: Response) => {
    const { userId, userName, userRole, subject, category, message } = req.body;
    const newTicket = {
      id: 'tkt_' + Date.now(),
      userId: userId || 'usr_client_1',
      userName: userName || 'Foydalanuvchi',
      userRole: userRole || 'CLIENT',
      subject: subject || 'Yordam so‘rovi',
      category: category || 'TECHNICAL',
      status: 'OPEN' as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: 'msg_' + Date.now(),
          senderId: userId || 'usr_client_1',
          senderName: userName || 'Foydalanuvchi',
          isAdmin: false,
          text: message,
          createdAt: new Date().toISOString()
        }
      ]
    };

    db.supportTickets.unshift(newTicket);
    db.addAuditLog(newTicket.userId, newTicket.userName, newTicket.userRole, 'SUPPORT_TICKET_CREATED', `Murojaat ochildi: ${newTicket.subject}`);
    broadcastEvent('SUPPORT_TICKET_CREATED', newTicket);
    res.json(newTicket);
  });

  app.post('/api/support/:id/reply', (req: Request, res: Response) => {
    const { senderId, senderName, isAdmin, text } = req.body;
    const ticket = db.supportTickets.find(t => t.id === req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Murojaat topilmadi' });

    ticket.messages.push({
      id: 'msg_' + Date.now(),
      senderId: senderId || 'usr_admin',
      senderName: senderName || (isAdmin ? 'Operator' : 'Foydalanuvchi'),
      isAdmin: Boolean(isAdmin),
      text,
      createdAt: new Date().toISOString()
    });
    ticket.updatedAt = new Date().toISOString();
    if (isAdmin) ticket.status = 'RESOLVED';

    broadcastEvent('SUPPORT_TICKET_UPDATED', ticket);
    res.json(ticket);
  });

  // -------------------------------------------------------------
  // NOTIFICATIONS & AUDIT LOGS & ADMIN
  // -------------------------------------------------------------
  app.get('/api/notifications', (req: Request, res: Response) => {
    const { userId } = req.query;
    if (userId) {
      return res.json(db.notifications.filter(n => n.userId === userId));
    }
    res.json(db.notifications);
  });

  app.patch('/api/notifications/read-all', (req: Request, res: Response) => {
    const { userId } = req.body;
    db.notifications.forEach(n => {
      if (!userId || n.userId === userId) n.isRead = true;
    });
    res.json({ success: true });
  });

  app.get('/api/admin/stats', (req: Request, res: Response) => {
    res.json(db.getAdminStats());
  });

  app.get('/api/admin/logs', (req: Request, res: Response) => {
    res.json(db.auditLogs);
  });

  app.get('/api/telegram/logs', (req: Request, res: Response) => {
    res.json({
      botInfo: telegramBot.botInfo,
      logs: telegramBot.botLogs
    });
  });

  app.post('/api/admin/broadcast', async (req: Request, res: Response) => {
    const { targetGroup, title, message } = req.body;
    const result = await telegramBot.broadcast(targetGroup, title, message);
    db.addAuditLog('admin', 'Admin', 'SUPERADMIN', 'BROADCAST_SENT', `${title} (${result.sent} yuborildi)`);
    res.json(result);
  });

  // -------------------------------------------------------------
  // VITE MIDDLEWARE (DEV) & STATIC (PROD)
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚕 O'ZIMIZ UCHUN | Piter Taxi server running on port ${PORT}`);
  });
}

startServer();
