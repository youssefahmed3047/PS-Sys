export interface User {
  username: string;
}

export interface Room {
  id: string;
  name: string;
  number: number;
  status: 'available' | 'busy';
  isVIP: boolean;
  vipPrice?: number;
  consoleType: 'PS5' | 'PS4';
  icon: 'gamepad';
  order: number;
  activeSessionId?: string;
}

export interface SessionItem {
  productId: string;
  name: string;
  category: string;
  quantity: number;
  price: number;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  createdAt: Date;
}

export interface Session {
  id: string;
  roomId: string;
  roomName: string;
  startTime: Date;
  playMode: 'single' | 'multi';
  consoleType: string;
  hourlyRate: number;
  isVIP: boolean;
  items: SessionItem[];
  status: 'active' | 'ended';
}

export interface Settings {
  ps5Single: number;
  ps5Multi: number;
  ps4Single: number;
  ps4Multi: number;
  totalRooms: number;
}

export interface Product {
  id: string;
  name: string;
  sellingPrice: number;
  category: string;
}

export interface DailyStat {
  id: string;
  date: string;
  beforeCosts: number;
  afterCostsNet: number;
  totalDiscounts: number;
  netAfterDiscounts: number;
  expensesTotal?: number;
}

export interface MonthlyStat {
  id: string;
  monthYear: string;
  beforeCosts: number;
  afterCostsNet: number;
  totalDiscounts: number;
  netAfterDiscounts: number;
  monthlyExpenses?: number;
  growthRate: string;
}

export interface CurrentDay {
  beforeCosts: number;
  afterCostsNet: number;
  totalDiscounts: number;
  netAfterDiscounts: number;
  lastUpdate: string;
}
