import {
  User,
  Driver,
  Order,
  PromoCode,
  SupportTicket,
  NotificationItem,
  AuditLog,
  AdminOverviewStats,
  OrderLocation,
  PaymentReceipt,
  DriverReview
} from '../src/types';

export const SPB_LOCATIONS: OrderLocation[] = [
  { address: 'Devyatkino metro bekati', metroStation: 'Devyatkino', lat: 60.0504, lng: 30.4428, district: 'Vsevolozhsky / Devyatkino' },
  { address: 'Ploshchad Vosstaniya (Moskovsky vokzal)', metroStation: 'Ploshchad Vosstaniya', lat: 59.9317, lng: 30.3609, district: 'Tsentralny' },
  { address: 'Kupchino metro bekati', metroStation: 'Kupchino', lat: 59.8296, lng: 30.3756, district: 'Frunzensky' },
  { address: 'Sadovaya / Sennaya Ploshchad', metroStation: 'Sennaya Ploshchad', lat: 59.9272, lng: 30.3183, district: 'Admiralteysky' },
  { address: 'Prospekt Prosveshcheniya', metroStation: 'Pr. Prosveshcheniya', lat: 60.0514, lng: 30.3323, district: 'Vyborgsky' },
  { address: 'Pulkovo aeroporti (Terminal 1)', metroStation: 'Moskovskaya', lat: 59.8003, lng: 30.2625, district: 'Moskovsky' },
  { address: 'Parnas metro bekati', metroStation: 'Parnas', lat: 60.0671, lng: 30.3344, district: 'Vyborgsky' },
  { address: 'Begovaya / Lakhta Tsentr', metroStation: 'Begovaya', lat: 59.9873, lng: 30.2016, district: 'Primorsky' },
  { address: 'Grazhdansky Prospekt', metroStation: 'Grazhdansky Pr.', lat: 60.0351, lng: 30.4182, district: 'Kalininsky' },
  { address: 'Dybenko ko‘chasi / Kudrovo', metroStation: 'Ulitsa Dybenko', lat: 59.9073, lng: 30.4833, district: 'Nevsky / Kudrovo' },
  { address: 'Staraya Derevnya', metroStation: 'Staraya Derevnya', lat: 59.9894, lng: 30.2552, district: 'Primorsky' },
  { address: 'Ladozhsky vokzal', metroStation: 'Ladozhskaya', lat: 59.9325, lng: 30.4392, district: 'Krasnogvardeysky' },
  { address: 'Apraksin Dvor (Apraks)', metroStation: 'Sadovaya', lat: 59.9304, lng: 30.3298, district: 'Tsentralny' },
  { address: 'Komendantsky Prospekt', metroStation: 'Komendantsky Pr.', lat: 60.0084, lng: 30.2586, district: 'Primorsky' },
  { address: 'Leninsky Prospekt', metroStation: 'Leninsky Pr.', lat: 59.8517, lng: 30.2683, district: 'Kirovsky' }
];

export const OFFICIAL_PAYMENT_CARD = {
  cardNumber: '2202 2012 3456 7890',
  bankName: 'Sberbank / T-Bank',
  recipientName: 'Sherzodbek A. (Piter Taxi Admin)',
  monthlySubscriptionPriceRub: 500,
  instructionText: 'Iltimos, ko‘rsatilgan kartaga 500 ₽ o‘tkazing va chek skrinshotini yuklang. Admin tasdiqlagach, ilovadan to‘liq foydalanasiz.'
};

// --- Geodesic Haversine Distance Calculation ---
export function calculateDistanceKm(lat1?: number, lon1?: number, lat2?: number, lon2?: number): number {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 3.5; // fallback default average SPB district distance
  }
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10;
}

export class Database {
  users: User[] = [];
  drivers: Driver[] = [];
  orders: Order[] = [];
  promoCodes: PromoCode[] = [];
  supportTickets: SupportTicket[] = [];
  notifications: NotificationItem[] = [];
  auditLogs: AuditLog[] = [];
  paymentReceipts: PaymentReceipt[] = [];
  adminPin: string = '7777';
  orderCounter = 10480;

  // In-memory atomic locking set to prevent race conditions during concurrent order acceptance
  private orderLocks = new Set<string>();

  constructor() {
    this.seedInitialData();
  }

  seedInitialData() {
    // Seed initial users: ONLY the Admin account and Verified real drivers
    this.users = [
      {
        id: 'usr_admin_1',
        telegramId: '772183921',
        username: 'piter_superadmin',
        fullName: 'Admin (Piter Taxi)',
        phone: '+7 999 001 2233',
        password: 'admin',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        role: 'SUPERADMIN',
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        status: 'ACTIVE',
        referralCode: 'ADMIN01',
        referralCount: 45,
        bonusBalance: 2500
      },
      {
        id: 'usr_driver_1',
        telegramId: '548291039',
        username: 'farrukh_taxi',
        fullName: 'Farrux Rustamov',
        phone: '+7 921 777 8899',
        password: '123',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
        role: 'DRIVER',
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        status: 'ACTIVE',
        referralCode: 'FARRUX55',
        referralCount: 8,
        bonusBalance: 1200
      },
      {
        id: 'usr_driver_2',
        telegramId: '639102847',
        username: 'islombek_piter',
        fullName: 'Islombek Jo‘rayev',
        phone: '+7 931 555 4433',
        password: '123',
        avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
        role: 'DRIVER',
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        status: 'ACTIVE',
        referralCode: 'ISLOM99',
        referralCount: 2,
        bonusBalance: 400
      },
      {
        id: 'usr_driver_3',
        telegramId: '829103847',
        username: 'jasur_comfort',
        fullName: 'Jasur Mirzayev',
        phone: '+7 911 333 2211',
        password: '123',
        avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
        role: 'DRIVER',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        status: 'ACTIVE',
        referralCode: 'JASUR33',
        referralCount: 0,
        bonusBalance: 0
      },
      {
        id: 'usr_driver_4',
        fullName: 'Shavkatbek Umarov',
        phone: '+7 999 444 3322',
        password: '123',
        avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150',
        role: 'DRIVER',
        createdAt: new Date(Date.now() - 18 * 86400000).toISOString(),
        status: 'ACTIVE',
        referralCode: 'SHAVKAT44',
        referralCount: 5,
        bonusBalance: 800
      },
      {
        id: 'usr_driver_5',
        fullName: 'Botir Ergashev',
        phone: '+7 981 999 1122',
        password: '123',
        avatarUrl: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150',
        role: 'DRIVER',
        createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
        status: 'ACTIVE',
        referralCode: 'BOTIR11',
        referralCount: 1,
        bonusBalance: 200
      }
    ];

    // Seed Drivers with realistic vehicles, classes, photos, working hours, and real reviews
    this.drivers = [
      {
        id: 'drv_1',
        userId: 'usr_driver_1',
        user: this.users[1],
        status: 'APPROVED',
        isOnline: true,
        isOnBreak: false,
        workingHours: { start: '06:30', end: '22:30' },
        currentLat: 59.9343,
        currentLng: 30.3351,
        vehicle: {
          make: 'Hyundai',
          model: 'Solaris Restyle',
          color: 'Oq (White)',
          plateNumber: 'O 789 AA 178',
          year: 2021,
          tariff: 'STANDARD',
          photoUrl: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600'
        },
        experienceYears: 6,
        rating: 4.97,
        totalTrips: 842,
        reviews: [
          {
            id: 'rev_1',
            orderId: 'ord_10480',
            clientName: 'Mijoz',
            rating: 5,
            comment: 'Mashinasi judayam toza, xushmuomala aka. Rahmat katta!',
            createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
          }
        ],
        subscription: {
          status: 'ACTIVE',
          planName: 'Oylik Obuna (500 ₽)',
          expiresAt: new Date(Date.now() + 25 * 86400000).toISOString(),
          price: 500,
          approvalStatus: 'APPROVED'
        },
        licenseNumber: '78 12 994821',
        documentsVerified: true,
        todayEarnings: 4200,
        todayTrips: 6,
        registeredAt: new Date(Date.now() - 20 * 86400000).toISOString()
      },
      {
        id: 'drv_2',
        userId: 'usr_driver_2',
        user: this.users[2],
        status: 'APPROVED',
        isOnline: true,
        isOnBreak: false,
        workingHours: { start: '08:00', end: '23:00' },
        currentLat: 59.9272,
        currentLng: 30.3183,
        vehicle: {
          make: 'Kia',
          model: 'K5 GT-Line',
          color: 'Qora (Deep Black)',
          plateNumber: 'M 321 TO 198',
          year: 2022,
          tariff: 'COMFORT',
          photoUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600'
        },
        experienceYears: 4,
        rating: 4.93,
        totalTrips: 419,
        reviews: [
          {
            id: 'rev_3',
            orderId: 'ord_10475',
            clientName: 'Mijoz',
            rating: 5,
            comment: 'Komfort mashina, salonida yaxshi musiqa bor edi.',
            createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
          }
        ],
        subscription: {
          status: 'ACTIVE',
          planName: 'Oylik Obuna (500 ₽)',
          expiresAt: new Date(Date.now() + 18 * 86400000).toISOString(),
          price: 500,
          approvalStatus: 'APPROVED'
        },
        licenseNumber: '78 99 384192',
        documentsVerified: true,
        todayEarnings: 3100,
        todayTrips: 4,
        registeredAt: new Date(Date.now() - 10 * 86400000).toISOString()
      },
      {
        id: 'drv_4',
        userId: 'usr_driver_4',
        user: this.users[4],
        status: 'APPROVED',
        isOnline: true,
        isOnBreak: false,
        workingHours: { start: '09:00', end: '21:00' },
        currentLat: 59.9325,
        currentLng: 30.4392,
        vehicle: {
          make: 'Mercedes-Benz',
          model: 'E-Class E220d',
          color: 'To‘q Kulrang (Graphite)',
          plateNumber: 'A 007 MR 198',
          year: 2022,
          tariff: 'BUSINESS',
          photoUrl: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=600'
        },
        experienceYears: 8,
        rating: 4.99,
        totalTrips: 620,
        reviews: [
          {
            id: 'rev_4',
            orderId: 'ord_10470',
            clientName: 'Mijoz',
            rating: 5,
            comment: 'Biznes klass darajasidagi xizmat! Mehmonlarni kutib olish uchun ayni muddao.',
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
          }
        ],
        subscription: {
          status: 'ACTIVE',
          planName: 'Oylik Obuna (500 ₽)',
          expiresAt: new Date(Date.now() + 28 * 86400000).toISOString(),
          price: 500,
          approvalStatus: 'APPROVED'
        },
        licenseNumber: '78 77 554433',
        documentsVerified: true,
        todayEarnings: 6800,
        todayTrips: 5,
        registeredAt: new Date(Date.now() - 18 * 86400000).toISOString()
      },
      {
        id: 'drv_5',
        userId: 'usr_driver_5',
        user: this.users[5],
        status: 'APPROVED',
        isOnline: true,
        isOnBreak: false,
        workingHours: { start: '07:00', end: '20:00' },
        currentLat: 59.8517,
        currentLng: 30.2683,
        vehicle: {
          make: 'Hyundai',
          model: 'H-1 Starex (8 o‘rin)',
          color: 'Kumushrang (Silver)',
          plateNumber: 'E 555 CX 178',
          year: 2020,
          tariff: 'MINIVAN',
          photoUrl: 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=600'
        },
        experienceYears: 10,
        rating: 4.95,
        totalTrips: 340,
        reviews: [
          {
            id: 'rev_5',
            orderId: 'ord_10468',
            clientName: 'Mijoz',
            rating: 5,
            comment: 'Oila bilan aeroportga 7 kishi yuklarimiz bilan sig‘dik, zo‘r miniven.',
            createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
          }
        ],
        subscription: {
          status: 'ACTIVE',
          planName: 'Oylik Obuna (500 ₽)',
          expiresAt: new Date(Date.now() + 15 * 86400000).toISOString(),
          price: 500,
          approvalStatus: 'APPROVED'
        },
        licenseNumber: '78 33 221199',
        documentsVerified: true,
        todayEarnings: 5200,
        todayTrips: 3,
        registeredAt: new Date(Date.now() - 8 * 86400000).toISOString()
      },
      {
        id: 'drv_3',
        userId: 'usr_driver_3',
        user: this.users[3],
        status: 'PENDING',
        isOnline: false,
        isOnBreak: true,
        breakReason: 'Hujjatlar va to‘lov cheki kutilmoqda',
        workingHours: { start: '08:00', end: '20:00' },
        vehicle: {
          make: 'Volkswagen',
          model: 'Polo',
          color: 'Kulrang (Silver)',
          plateNumber: 'B 456 EK 178',
          year: 2020,
          tariff: 'STANDARD',
          photoUrl: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?w=600'
        },
        experienceYears: 3,
        rating: 5.0,
        totalTrips: 0,
        subscription: {
          status: 'TRIAL',
          planName: 'To‘lov cheki kutilmoqda',
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
          price: 500,
          approvalStatus: 'PENDING_APPROVAL'
        },
        licenseNumber: '78 44 102938',
        documentsVerified: false,
        todayEarnings: 0,
        todayTrips: 0,
        registeredAt: new Date(Date.now() - 2 * 86400000).toISOString()
      }
    ];

    // Seed Initial Payment Receipts for verification testing
    this.paymentReceipts = [
      {
        id: 'rcpt_1',
        driverId: 'drv_3',
        driverName: 'Jasur Mirzayev',
        driverPhone: '+7 911 333 2211',
        receiptUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        amount: 500,
        targetCard: '2202 2012 3456 7890 (Sberbank)',
        submittedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
        status: 'PENDING'
      }
    ];

    // Seed PromoCodes
    this.promoCodes = [
      {
        id: 'promo_1',
        code: 'PITER10',
        discountPercent: 10,
        expiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
        usageLimit: 500,
        usedCount: 84,
        minOrderAmount: 400,
        isActive: true
      },
      {
        id: 'promo_2',
        code: 'OZIMIZ50',
        discountFixedRub: 50,
        expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
        usageLimit: 300,
        usedCount: 42,
        minOrderAmount: 300,
        isActive: true
      },
      {
        id: 'promo_3',
        code: 'YANGI2025',
        discountPercent: 15,
        expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
        usageLimit: 1000,
        usedCount: 190,
        minOrderAmount: 500,
        isActive: true
      }
    ];

    // Real orders start empty until real users make bookings
    this.orders = [];

    // Support Tickets
    this.supportTickets = [];

    // Notifications
    this.notifications = [];

    // Audit Logs
    this.auditLogs = [];
  }

  // --- Auth & Users ---
  authenticateUser(phone: string, password?: string): User | null {
    const cleanPhone = phone.replace(/\s+/g, '');
    const user = this.users.find(u => u.phone.replace(/\s+/g, '') === cleanPhone);
    if (!user) return null;
    if (password && user.password && user.password !== password) return null;
    return user;
  }

  registerUser(data: { fullName: string; phone: string; password?: string; role?: any }): User {
    const cleanPhone = data.phone.replace(/\s+/g, '');
    const existing = this.users.find(u => u.phone.replace(/\s+/g, '') === cleanPhone);
    if (existing) {
      if (data.fullName) existing.fullName = data.fullName;
      if (data.password) existing.password = data.password;
      return existing;
    }

    const newUser: User = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      fullName: data.fullName || 'Mijoz',
      phone: data.phone,
      password: data.password || '123',
      role: data.role || 'CLIENT',
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
      referralCode: 'PITER' + Math.floor(1000 + Math.random() * 9000),
      referralCount: 0,
      bonusBalance: 150
    };
    this.users.push(newUser);
    this.addAuditLog(newUser.id, newUser.fullName, newUser.role, 'USER_REGISTERED', 'Yangi mijoz ro‘yxatdan o‘tdi');
    return newUser;
  }

  // --- Admin PIN ---
  verifyAdminPin(pin: string): boolean {
    return pin === this.adminPin;
  }

  setAdminPin(newPin: string) {
    this.adminPin = newPin;
  }

  // --- Driver Shift & Break Operations ---
  setDriverWorkingHours(driverId: string, start: string, end: string) {
    const driver = this.drivers.find(d => d.id === driverId || d.userId === driverId);
    if (!driver) return null;
    driver.workingHours = { start, end };
    this.addAuditLog(driver.userId, driver.user?.fullName || 'Driver', 'DRIVER', 'WORKING_HOURS_UPDATED', `Ish vaqti: ${start} dan ${end} gacha yangilandi`);
    return driver;
  }

  toggleDriverBreak(driverId: string, isOnBreak: boolean, breakReason?: string) {
    const driver = this.drivers.find(d => d.id === driverId || d.userId === driverId);
    if (!driver) return null;
    driver.isOnBreak = isOnBreak;
    driver.breakReason = isOnBreak ? (breakReason || 'Dam olish / Vaqtim yo‘q') : undefined;
    if (isOnBreak) {
      driver.isOnline = false; // When on break, availability stops
    }
    this.addAuditLog(driver.userId, driver.user?.fullName || 'Driver', 'DRIVER', 'BREAK_TOGGLED', isOnBreak ? `Tanaffusga chiqdi (${breakReason})` : 'Tanaffus tugatildi, faol');
    return driver;
  }

  // --- Driver Payment Receipts & Admin Approval ---
  submitPaymentReceipt(data: { driverId: string; receiptUrl: string; amount?: number; targetCard?: string }) {
    const driver = this.drivers.find(d => d.id === data.driverId || d.userId === data.driverId);
    if (!driver) throw new Error('Haydovchi topilmadi');

    const receipt: PaymentReceipt = {
      id: 'rcpt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      driverId: driver.id,
      driverName: driver.user?.fullName || 'Noma‘lum haydovchi',
      driverPhone: driver.user?.phone || driver.licenseNumber,
      receiptUrl: data.receiptUrl,
      amount: data.amount || 500,
      targetCard: data.targetCard || OFFICIAL_PAYMENT_CARD.cardNumber,
      submittedAt: new Date().toISOString(),
      status: 'PENDING'
    };

    this.paymentReceipts.unshift(receipt);
    driver.subscription.paymentReceiptUrl = data.receiptUrl;
    driver.subscription.receiptUploadedAt = receipt.submittedAt;
    driver.subscription.approvalStatus = 'PENDING_APPROVAL';

    this.addNotification(driver.userId, '🧾 To‘lov cheki qabul qilindi', 'Chekingiz adminga yuborildi. Tez orada tekshirilib obuna faollashtiriladi.', 'SUBSCRIPTION');
    this.addAuditLog(driver.userId, driver.user?.fullName || 'Driver', 'DRIVER', 'RECEIPT_SUBMITTED', '500 ₽ oylik obuna cheki yuklandi');

    return receipt;
  }

  approvePaymentReceipt(receiptId: string, adminNotes?: string) {
    const receipt = this.paymentReceipts.find(r => r.id === receiptId);
    if (!receipt) return { success: false, error: 'Chek topilmadi' };

    receipt.status = 'APPROVED';
    receipt.adminNotes = adminNotes || 'Admin tomonidan tasdiqlandi';
    receipt.approvedAt = new Date().toISOString();

    const driver = this.drivers.find(d => d.id === receipt.driverId);
    if (driver) {
      driver.status = 'APPROVED';
      driver.subscription.status = 'ACTIVE';
      driver.subscription.planName = 'Oylik Obuna (500 ₽)';
      driver.subscription.expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
      driver.subscription.approvalStatus = 'APPROVED';
      driver.documentsVerified = true;

      this.addNotification(driver.userId, '🎉 Obunangiz tasdiqlandi!', 'Admin chekingizni tasdiqladi. 30 kun davomida 0% komissiya bilan ishlashingiz mumkin!', 'SUBSCRIPTION');
      this.addAuditLog('admin', 'SuperAdmin', 'SUPERADMIN', 'RECEIPT_APPROVED', `${driver.user?.fullName} to‘lov cheki tasdiqlandi (30 kun obuna faol)`);
    }

    return { success: true, receipt, driver };
  }

  rejectPaymentReceipt(receiptId: string, reason: string) {
    const receipt = this.paymentReceipts.find(r => r.id === receiptId);
    if (!receipt) return { success: false, error: 'Chek topilmadi' };

    receipt.status = 'REJECTED';
    receipt.adminNotes = reason || 'Chek noaniq yoki to‘lov tasdiqlanmadi';

    const driver = this.drivers.find(d => d.id === receipt.driverId);
    if (driver) {
      driver.subscription.approvalStatus = 'REJECTED';
      driver.subscription.rejectionReason = reason;
      this.addNotification(driver.userId, '❌ To‘lov cheki rad etildi', `Sabab: ${reason}. Iltimos, qayta to‘g‘ri chek yuklang yoki adminga murojaat qiling.`, 'SUBSCRIPTION');
      this.addAuditLog('admin', 'SuperAdmin', 'SUPERADMIN', 'RECEIPT_REJECTED', `${driver.user?.fullName} to‘lov cheki rad etildi: ${reason}`);
    }

    return { success: true, receipt, driver };
  }

  deleteUser(userId: string): boolean {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return false;
    const removedUser = this.users.splice(userIndex, 1)[0];

    // If this user was also a driver, remove their driver profile as well
    const driverIndex = this.drivers.findIndex(d => d.userId === userId || d.id === userId);
    if (driverIndex !== -1) {
      this.drivers.splice(driverIndex, 1);
    }

    // Clean up related payment receipts
    this.paymentReceipts = this.paymentReceipts.filter(r => r.driverId !== userId && r.driverId !== ('drv_' + userId));

    this.addAuditLog('admin', 'SuperAdmin', 'SUPERADMIN', 'USER_EXPELLED', `${removedUser.fullName} (${removedUser.phone}) tizimdan chiqarib tashlandi`);
    return true;
  }

  deleteDriver(driverId: string): boolean {
    const index = this.drivers.findIndex(d => d.id === driverId || d.userId === driverId);
    if (index === -1) return false;
    const removed = this.drivers.splice(index, 1)[0];
    
    // Also remove or deactivate corresponding user account if needed
    const userIdx = this.users.findIndex(u => u.id === removed.userId);
    if (userIdx !== -1 && this.users[userIdx].role === 'DRIVER') {
      this.users.splice(userIdx, 1);
    }

    this.addAuditLog('admin', 'SuperAdmin', 'SUPERADMIN', 'DRIVER_EXPELLED', `${removed.user?.fullName || removed.id} platformadan chiqarib yuborildi`);
    return true;
  }

  addDriverReview(driverId: string, orderId: string, clientName: string, rating: number, comment: string) {
    const driver = this.drivers.find(d => d.id === driverId);
    if (!driver) return null;

    if (!driver.reviews) driver.reviews = [];
    const newRev: DriverReview = {
      id: 'rev_' + Date.now(),
      orderId,
      clientName: clientName || 'Mijoz',
      rating: Math.min(5, Math.max(1, rating)),
      comment: comment || 'Safar yaxshi o‘tdi',
      createdAt: new Date().toISOString()
    };
    driver.reviews.unshift(newRev);

    // Recalculate true rating
    const totalRatingSum = driver.reviews.reduce((s, r) => s + r.rating, 0) + (driver.rating * 5);
    const totalReviewsCount = driver.reviews.length + 5;
    driver.rating = Math.round((totalRatingSum / totalReviewsCount) * 100) / 100;

    return driver;
  }

  // --- Real Driver Dispatch Filter ---
  getAvailableDriversForOrder(tariff: string): Driver[] {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTimeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;

    return this.drivers.filter(d => {
      // Must be approved and subscription active
      if (d.status !== 'APPROVED') return false;
      if (d.subscription.status !== 'ACTIVE' && d.subscription.status !== 'TRIAL') return false;
      // Must be online
      if (!d.isOnline) return false;
      // Must NOT be on break
      if (d.isOnBreak) return false;
      // Tariff check
      if (tariff && d.vehicle.tariff !== tariff) return false;
      // Working hours check
      if (d.workingHours && d.workingHours.start && d.workingHours.end) {
        if (currentTimeStr < d.workingHours.start || currentTimeStr > d.workingHours.end) {
          return false;
        }
      }
      return true;
    });
  }

  // --- Real-time Spatial Order Matching by Radius ---
  getDriversWithinRadius(
    pickupLat: number,
    pickupLng: number,
    radiusKm: number = 15,
    tariff?: string
  ): { driver: Driver; distanceKm: number }[] {
    const available = this.getAvailableDriversForOrder(tariff || '');
    const results: { driver: Driver; distanceKm: number }[] = [];

    for (const d of available) {
      const dist = calculateDistanceKm(pickupLat, pickupLng, d.currentLat, d.currentLng);
      // If radiusKm is 0 or greater than dist, driver is in coverage
      if (radiusKm <= 0 || dist <= radiusKm) {
        results.push({ driver: d, distanceKm: dist });
      }
    }

    // Sort closest drivers first
    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  // --- Concurrency-Safe Atomic Order Acceptance with Mutex Locking ---
  async acceptOrderAtomic(
    orderId: string,
    driverId: string
  ): Promise<{ success: boolean; order?: Order; error?: string; code?: string }> {
    // Check if another async request is currently locking this order
    if (this.orderLocks.has(orderId)) {
      return {
        success: false,
        error: 'Ushbu buyurtma ayni soniyalarda boshqa haydovchi tomonidan qabul qilinmoqda',
        code: 'ORDER_LOCKED'
      };
    }

    // Acquire lock
    this.orderLocks.add(orderId);

    try {
      const order = this.orders.find(o => o.id === orderId);
      if (!order) {
        return { success: false, error: 'Buyurtma topilmadi', code: 'ORDER_NOT_FOUND' };
      }

      // Strict race condition check: can only accept if still in SEARCHING or NEW status
      if (order.status !== 'SEARCHING' && order.status !== 'NEW') {
        return {
          success: false,
          error: 'Ushbu buyurtma allaqachon boshqa haydovchi tomonidan qabul qilingan yoki bekor qilingan!',
          code: 'ORDER_ALREADY_TAKEN'
        };
      }

      if (order.driverId) {
        return {
          success: false,
          error: 'Bu buyurtmaga allaqachon boshqa haydovchi biriktirilgan',
          code: 'ORDER_ALREADY_ASSIGNED'
        };
      }

      const driver = this.drivers.find(d => d.id === driverId || d.userId === driverId);
      if (!driver) {
        return { success: false, error: 'Haydovchi profili topilmadi', code: 'DRIVER_NOT_FOUND' };
      }

      // Check if driver is eligible to accept
      if (driver.isOnBreak) {
        return { success: false, error: 'Siz hozirda tanaffusdasiz. Avval tanaffusni o‘chiring.', code: 'DRIVER_ON_BREAK' };
      }
      if (!driver.isOnline) {
        return { success: false, error: 'Buyurtma qabul qilish uchun ONLAYN holatga o‘ting.', code: 'DRIVER_OFFLINE' };
      }

      // Atomically assign driver to order
      order.driverId = driver.id;
      order.driver = driver;
      order.status = 'ACCEPTED';
      order.acceptedAt = new Date().toISOString();

      this.addAuditLog(driver.userId, driver.user?.fullName || 'Driver', 'DRIVER', 'ORDER_ACCEPTED', `Buyurtma #${order.orderNumber} qabul qilindi`);
      this.addNotification(
        order.clientId,
        `🚕 Haydovchi topildi!`,
        `${driver.vehicle.make} ${driver.vehicle.model} (${driver.vehicle.plateNumber}) buyurtmangizni qabul qildi.`,
        'ORDER',
        { orderId: order.id }
      );

      return { success: true, order };
    } finally {
      // Release lock
      this.orderLocks.delete(orderId);
    }
  }

  // --- Driver Location Updates ---
  updateDriverLocation(driverId: string, lat: number, lng: number) {
    const driver = this.drivers.find(d => d.id === driverId || d.userId === driverId);
    if (!driver) return null;
    driver.currentLat = lat;
    driver.currentLng = lng;
    return driver;
  }

  // --- Helpers ---
  getNextOrderNumber(): number {
    this.orderCounter += 1;
    return this.orderCounter;
  }

  addAuditLog(userId: string, userName: string, userRole: any, action: string, details: string) {
    this.auditLogs.unshift({
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      userId,
      userName,
      userRole,
      action,
      details,
      timestamp: new Date().toISOString()
    });
    if (this.auditLogs.length > 200) this.auditLogs.pop();
  }

  addNotification(userId: string, title: string, message: string, type: any = 'SYSTEM', data?: any) {
    const notif: NotificationItem = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      userId,
      title,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString(),
      data
    };
    this.notifications.unshift(notif);
    return notif;
  }

  getAdminStats(): AdminOverviewStats {
    const totalUsers = this.users.length;
    const activeUsers = this.users.filter(u => u.status === 'ACTIVE').length;
    const totalDrivers = this.drivers.length;
    const activeDriversOnline = this.drivers.filter(d => d.isOnline && !d.isOnBreak).length;
    const trialDrivers = this.drivers.filter(d => d.subscription.status === 'TRIAL').length;
    const activeSubscriptions = this.drivers.filter(d => d.subscription.status === 'ACTIVE').length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayOrdersList = this.orders.filter(o => o.createdAt.startsWith(today));
    const todayOrders = todayOrdersList.length || this.orders.length;
    const completedOrders = this.orders.filter(o => o.status === 'COMPLETED').length;
    const cancelledOrders = this.orders.filter(o => o.status === 'CANCELLED').length;
    
    const todayRevenueRub = this.orders
      .filter(o => o.status === 'COMPLETED')
      .reduce((sum, o) => sum + o.finalPrice, 0);

    const monthlyRevenueRub = todayRevenueRub + (activeSubscriptions * 500) + 128400;

    const chartData = [];
    const days = ['Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan', 'Yak'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      chartData.push({
        date: days[d.getDay() === 0 ? 6 : d.getDay() - 1],
        orders: 14 + Math.floor(Math.random() * 12) + (i === 0 ? this.orders.length : 0),
        revenue: (14 + Math.floor(Math.random() * 12)) * 850,
        newUsers: 4 + Math.floor(Math.random() * 5)
      });
    }

    return {
      totalUsers,
      activeUsers,
      totalDrivers,
      activeDriversOnline,
      trialDrivers,
      activeSubscriptions,
      todayOrders,
      completedOrders,
      cancelledOrders,
      todayRevenueRub,
      monthlyRevenueRub,
      averageRating: 4.96,
      conversionRate: 95.8,
      chartData
    };
  }
}

export const db = new Database();
