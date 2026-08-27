export type UserRole = 'CLIENT' | 'DRIVER' | 'ADMIN' | 'MODERATOR' | 'SUPERADMIN';

export type OrderStatus =
  | 'NEW'
  | 'SEARCHING'
  | 'ACCEPTED'
  | 'DRIVER_ARRIVING'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'EXPIRING'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'SUSPENDED';

export type DriverVerificationStatus =
  | 'PENDING'
  | 'VERIFICATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

export type PaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export type SupportTicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type TariffType = 'STANDARD' | 'COMFORT' | 'BUSINESS' | 'MINIVAN' | 'DELIVERY';

export interface User {
  id: string;
  telegramId?: string;
  username?: string;
  fullName: string;
  phone: string;
  password?: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  status: 'ACTIVE' | 'BLOCKED';
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  bonusBalance: number; // in RUB
}

export interface Vehicle {
  make: string;
  model: string;
  color: string;
  plateNumber: string;
  year?: number;
  tariff: TariffType;
  photoUrl?: string;
}

export interface DriverReview {
  id: string;
  orderId: string;
  clientName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface WorkingHours {
  start: string; // e.g. "07:00"
  end: string;   // e.g. "23:00"
  days?: string[];
}

export interface Driver {
  id: string;
  userId: string;
  user?: User;
  status: DriverVerificationStatus;
  isOnline: boolean;
  isOnBreak?: boolean;
  breakReason?: string;
  workingHours: WorkingHours;
  currentLat?: number;
  currentLng?: number;
  vehicle: Vehicle;
  experienceYears: number;
  rating: number;
  totalTrips: number;
  reviews?: DriverReview[];
  subscription: {
    status: SubscriptionStatus;
    planName: string;
    trialEndsAt?: string;
    expiresAt: string;
    price: number;
    paymentReceiptUrl?: string;
    receiptUploadedAt?: string;
    approvalStatus?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    rejectionReason?: string;
  };
  licenseNumber: string;
  documentsVerified: boolean;
  todayEarnings: number;
  todayTrips: number;
  registeredAt: string;
}

export interface PaymentReceipt {
  id: string;
  driverId: string;
  driverName: string;
  driverPhone: string;
  receiptUrl: string;
  amount: number;
  targetCard: string;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes?: string;
  approvedAt?: string;
}

export interface AiDispatchResult {
  matched: boolean;
  driver?: Driver;
  message: string;
  reason?: string;
  estimatedArrivalMin?: number;
  alternativeTariffs?: TariffType[];
}

export interface AiAdminAnalytics {
  summary: string;
  estimatedMonthlyNetRevenue: number;
  driverEfficiencyScore: number;
  highDemandDistricts: { district: string; demandLevel: 'HIGH' | 'MEDIUM' | 'LOW'; surgeFactor: number }[];
  fraudOrRiskAlerts: string[];
  recommendations: string[];
  generatedAt: string;
}

export interface OrderLocation {
  address: string;
  metroStation?: string;
  lat: number;
  lng: number;
  district?: string;
}

export interface OrderOptions {
  luggage?: boolean;
  childSeat?: boolean;
  airConditioner?: boolean;
  waiting?: boolean;
  passengers?: number;
  customComment?: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  clientId: string;
  clientName: string;
  clientPhone: string;
  clientTelegramId?: string;
  driverId?: string;
  driver?: Driver;
  from: OrderLocation;
  to: OrderLocation;
  tariff: TariffType;
  scheduledTime: string; // ISO string or 'now'
  price: number; // in RUB
  discountAmount?: number;
  finalPrice: number;
  promoCode?: string;
  comment?: string;
  options: OrderOptions;
  status: OrderStatus;
  createdAt: string;
  acceptedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  estimatedDistanceKm: number;
  estimatedDurationMin: number;
  ratingGiven?: number;
  reviewComment?: string;
  searchRadiusKm?: number;
  distanceToPickupKm?: number;
  paymentMethod: 'CASH' | 'CARD_TRANSFER' | 'SBER_PAY' | 'T_BANK';
  paymentStatus: PaymentStatus;
}

export interface PromoCode {
  id: string;
  code: string;
  discountPercent?: number;
  discountFixedRub?: number;
  expiresAt: string;
  usageLimit: number;
  usedCount: number;
  minOrderAmount?: number;
  isActive: boolean;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  subject: string;
  category: 'PAYMENT' | 'ORDER' | 'DRIVER' | 'SUBSCRIPTION' | 'CANCELLATION' | 'TECHNICAL' | 'OTHER';
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: {
    id: string;
    senderId: string;
    senderName: string;
    isAdmin: boolean;
    text: string;
    createdAt: string;
  }[];
}

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ORDER' | 'PAYMENT' | 'SUBSCRIPTION' | 'SYSTEM' | 'PROMO';
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  details: string;
  timestamp: string;
  ip?: string;
}

export interface AdminOverviewStats {
  totalUsers: number;
  activeUsers: number;
  totalDrivers: number;
  activeDriversOnline: number;
  trialDrivers: number;
  activeSubscriptions: number;
  todayOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  todayRevenueRub: number;
  monthlyRevenueRub: number;
  averageRating: number;
  conversionRate: number;
  chartData: {
    date: string;
    orders: number;
    revenue: number;
    newUsers: number;
  }[];
}
