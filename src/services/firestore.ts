import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  setDoc,
  writeBatch,
  deleteField,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type {
  Room,
  Session,
  SessionItem,
  Settings,
  Product,
  Expense,
  DailyStat,
  MonthlyStat,
  CurrentDay,
} from '../types';
import { getHourlyRate, calculateTimeCost, calculateAddonsCost } from '../utils/calculations';

export function subscribeRooms(callback: (rooms: Room[]) => void) {
  const q = query(collection(db, 'Rooms'), orderBy('order', 'asc'));
  return onSnapshot(q, (snapshot) => {
    const rooms = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Room[];
    callback(rooms);
  });
}

export function subscribeSession(sessionId: string, callback: (session: Session | null) => void) {
  return onSnapshot(doc(db, 'Sessions', sessionId), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    const data = snapshot.data();
    callback({
      id: snapshot.id,
      ...data,
      startTime: data.startTime?.toDate() || new Date(),
    } as Session);
  });
}

export async function getSettings(): Promise<Settings> {
  const snapshot = await getDoc(doc(db, 'Settings', 'main'));
  const defaultSettings: Settings = {
    ps5Single: 50,
    ps5Multi: 70,
    ps4Single: 30,
    ps4Multi: 45,
    ps5Game: 20,
    ps4Game: 10,
    extraTimePrice: 15,
    totalRooms: 12,
  };
  if (!snapshot.exists()) {
    return defaultSettings;
  }
  return {
    ...defaultSettings,
    ...snapshot.data()
  } as Settings;
}

export function subscribeSettings(callback: (settings: Settings) => void) {
  return onSnapshot(doc(db, 'Settings', 'main'), (snapshot) => {
    const defaultSettings: Settings = {
      ps5Single: 50,
      ps5Multi: 70,
      ps4Single: 30,
      ps4Multi: 45,
      ps5Game: 20,
      ps4Game: 10,
      extraTimePrice: 15,
      totalRooms: 12,
    };
    if (!snapshot.exists()) {
      callback(defaultSettings);
      return;
    }
    callback({
      ...defaultSettings,
      ...snapshot.data()
    } as Settings);
  });
}

export function subscribeProducts(callback: (products: Product[]) => void) {
  return onSnapshot(collection(db, 'Products'), (snapshot) => {
    const products = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Product[];
    callback(products);
  });
}

export function subscribeCurrentDay(callback: (data: CurrentDay) => void) {
  return onSnapshot(doc(db, 'CurrentDay', 'today'), (snapshot) => {
    if (!snapshot.exists()) {
      callback({
        beforeCosts: 0,
        afterCostsNet: 0,
        totalDiscounts: 0,
        netAfterDiscounts: 0,
        lastUpdate: new Date().toISOString(),
      });
      return;
    }
    callback(snapshot.data() as CurrentDay);
  });
}

export function subscribeMonthlyStats(callback: (stats: MonthlyStat | null) => void) {
  const q = query(collection(db, 'MonthlyStats'), orderBy('monthYear', 'desc'));
  return onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      callback(null);
      return;
    }
    const d = snapshot.docs[0];
    callback({ id: d.id, ...d.data() } as MonthlyStat);
  });
}

export function subscribeDailyStats(callback: (stats: DailyStat[]) => void) {
  const q = query(collection(db, 'DailyStats'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const stats = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as DailyStat[];
    callback(stats);
  });
}

export function subscribeExpenses(callback: (expenses: Expense[]) => void) {
  const q = query(collection(db, 'Expenses'), orderBy('date', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(),
    })) as Expense[];
    callback(expenses);
  });
}

export async function addExpense(expense: Omit<Expense, 'id' | 'createdAt'>) {
  await addDoc(collection(db, 'Expenses'), {
    ...expense,
    createdAt: Timestamp.now(),
  });
}

export async function deleteExpense(expenseId: string) {
  await deleteDoc(doc(db, 'Expenses', expenseId));
}

export async function startSession(
  room: Room,
  playMode: 'single' | 'multi',
  settings: Settings,
  billingMode: 'time' | 'game' = 'time'
): Promise<string> {
  const hourlyRate = getHourlyRate(room, playMode, settings);
  const gamePrice = room.consoleType === 'PS5'
    ? (settings.ps5Game ?? 20)
    : (settings.ps4Game ?? 10);

  const sessionRef = await addDoc(collection(db, 'Sessions'), {
    roomId: room.id,
    roomName: room.name,
    startTime: Timestamp.now(),
    playMode,
    consoleType: room.consoleType,
    hourlyRate,
    gameCount: billingMode === 'game' ? 1 : 0,
    gamePrice,
    extraTimeCount: 0,
    extraTimePrice: settings.extraTimePrice ?? 15,
    isVIP: room.isVIP,
    items: [],
    status: 'active',
    billingMode,
  });

  await updateDoc(doc(db, 'Rooms', room.id), {
    status: 'busy',
    activeSessionId: sessionRef.id,
  });

  return sessionRef.id;
}

export async function stopSession(roomId: string, sessionId: string) {
  const sessionDoc = await getDoc(doc(db, 'Sessions', sessionId));
  if (!sessionDoc.exists()) return;

  const session = sessionDoc.data();
  const startTime = session.startTime.toDate();
  const elapsed = (Date.now() - startTime.getTime()) / 1000;
  const timeCost = session.billingMode === 'game' ? 0 : calculateTimeCost(elapsed, session.hourlyRate);
  const addonsCost = calculateAddonsCost(session.items || []);
  const gameCharge = (session.gameCount || 0) * (session.gamePrice || 0);
  const extraTimeCharge = (session.extraTimeCount || 0) * (session.extraTimePrice || 0);
  const totalBeforeCosts = timeCost + addonsCost + gameCharge + extraTimeCharge;
  const totalAfterCosts = totalBeforeCosts;

  await updateDoc(doc(db, 'Sessions', sessionId), { status: 'ended' });
  await updateDoc(doc(db, 'Rooms', roomId), {
    status: 'available',
    activeSessionId: null,
  });

  const currentDayDoc = await getDoc(doc(db, 'CurrentDay', 'today'));
  const current = currentDayDoc.exists()
    ? (currentDayDoc.data() as CurrentDay)
    : { beforeCosts: 0, afterCostsNet: 0, totalDiscounts: 0, netAfterDiscounts: 0, lastUpdate: '' };

  await setDoc(doc(db, 'CurrentDay', 'today'), {
    beforeCosts: current.beforeCosts + totalBeforeCosts,
    afterCostsNet: current.afterCostsNet + totalAfterCosts,
    totalDiscounts: current.totalDiscounts,
    netAfterDiscounts: current.netAfterDiscounts + totalAfterCosts,
    lastUpdate: new Date().toISOString(),
  });
}

export async function endSessionAndPay(sessionId: string, roomId: string) {
  await stopSession(roomId, sessionId);
}

export async function incrementSessionGameCount(sessionId: string) {
  await updateDoc(doc(db, 'Sessions', sessionId), {
    gameCount: increment(1),
  });
}

export async function incrementSessionExtraTimeCount(sessionId: string) {
  await updateDoc(doc(db, 'Sessions', sessionId), {
    extraTimeCount: increment(1),
  });
}

export async function decrementSessionExtraTimeCount(sessionId: string) {
  const docRef = doc(db, 'Sessions', sessionId);
  const snap = await getDoc(docRef);
  if (snap.exists() && (snap.data().extraTimeCount || 0) > 0) {
    await updateDoc(docRef, {
      extraTimeCount: increment(-1),
    });
  }
}

export async function addItemToSession(sessionId: string, item: SessionItem) {
  const sessionDoc = await getDoc(doc(db, 'Sessions', sessionId));
  if (!sessionDoc.exists()) return;

  const items = sessionDoc.data().items || [];
  const existing = items.find((i: SessionItem) => i.productId === item.productId);

  if (existing) {
    existing.quantity += item.quantity;
  } else {
    items.push(item);
  }

  await updateDoc(doc(db, 'Sessions', sessionId), { items });
}

export async function removeItemFromSession(sessionId: string, productId: string) {
  const sessionDoc = await getDoc(doc(db, 'Sessions', sessionId));
  if (!sessionDoc.exists()) return;

  const items = (sessionDoc.data().items || []).filter(
    (i: SessionItem) => i.productId !== productId
  );
  await updateDoc(doc(db, 'Sessions', sessionId), { items });
}

export async function saveSettings(settings: Settings) {
  await setDoc(doc(db, 'Settings', 'main'), settings);
}

export async function addRoom(room: Omit<Room, 'id'>) {
  await addDoc(collection(db, 'Rooms'), room);
}

export async function updateRoom(roomId: string, data: Partial<Room>) {
  const updateData: Partial<Room> = { ...data };
  if (updateData.isVIP === false && updateData.vipPrice === undefined) {
    (updateData as any).vipPrice = deleteField();
  }
  await updateDoc(doc(db, 'Rooms', roomId), updateData);
}

export async function deleteRoom(roomId: string) {
  await deleteDoc(doc(db, 'Rooms', roomId));
}

export async function addProduct(product: Omit<Product, 'id'>) {
  await addDoc(collection(db, 'Products'), product);
}

export async function updateProduct(productId: string, data: Partial<Product>) {
  await updateDoc(doc(db, 'Products', productId), data);
}

export async function deleteProduct(productId: string) {
  await deleteDoc(doc(db, 'Products', productId));
}

export async function startNewDay() {
  const currentDayDoc = await getDoc(doc(db, 'CurrentDay', 'today'));
  if (!currentDayDoc.exists()) return;

  const current = currentDayDoc.data() as CurrentDay;
  const today = new Date().toISOString().split('T')[0];
  const currentMonthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

  const expensesSnapshot = await getDocs(
    query(collection(db, 'Expenses'), where('date', '==', today))
  );
  let todayExpensesTotal = 0;
  expensesSnapshot.docs.forEach((expenseDoc) => {
    const data = expenseDoc.data() as Expense;
    todayExpensesTotal += data.amount || 0;
  });

  const currentMonthStatsSnapshot = await getDocs(
    query(collection(db, 'MonthlyStats'), where('monthYear', '==', currentMonthYear))
  );

  if (currentMonthStatsSnapshot.empty) {
    await addDoc(collection(db, 'MonthlyStats'), {
      monthYear: currentMonthYear,
      beforeCosts: current.beforeCosts,
      afterCostsNet: current.afterCostsNet,
      totalDiscounts: current.totalDiscounts,
      netAfterDiscounts: current.netAfterDiscounts,
      monthlyExpenses: todayExpensesTotal,
      growthRate: '+0% نمو',
    });
  } else {
    const monthDoc = currentMonthStatsSnapshot.docs[0];
    const monthData = monthDoc.data();
    await updateDoc(monthDoc.ref, {
      beforeCosts: (monthData.beforeCosts || 0) + current.beforeCosts,
      afterCostsNet: (monthData.afterCostsNet || 0) + current.afterCostsNet,
      totalDiscounts: (monthData.totalDiscounts || 0) + current.totalDiscounts,
      netAfterDiscounts: (monthData.netAfterDiscounts || 0) + current.netAfterDiscounts,
      monthlyExpenses: (monthData.monthlyExpenses || 0) + todayExpensesTotal,
    });
  }

  await addDoc(collection(db, 'DailyStats'), {
    date: today,
    beforeCosts: current.beforeCosts,
    afterCostsNet: current.afterCostsNet,
    totalDiscounts: current.totalDiscounts,
    netAfterDiscounts: current.netAfterDiscounts,
    expensesTotal: todayExpensesTotal,
  });

  for (const expenseDoc of expensesSnapshot.docs) {
    await deleteDoc(expenseDoc.ref);
  }

  await setDoc(doc(db, 'CurrentDay', 'today'), {
    beforeCosts: 0,
    afterCostsNet: 0,
    totalDiscounts: 0,
    netAfterDiscounts: 0,
    lastUpdate: new Date().toISOString(),
  });
}

export async function startNewMonth() {
  const dailyStats = await getDocs(
    query(collection(db, 'DailyStats'), orderBy('date', 'desc'))
  );

  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const closedMonthYear = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

  let beforeCosts = 0;
  let afterCostsNet = 0;
  let totalDiscounts = 0;
  let netAfterDiscounts = 0;

  dailyStats.docs.forEach((d) => {
    const data = d.data();
    beforeCosts += data.beforeCosts || 0;
    afterCostsNet += data.afterCostsNet || 0;
    totalDiscounts += data.totalDiscounts || 0;
    netAfterDiscounts += data.netAfterDiscounts || 0;
  });

  const currentDayDoc = await getDoc(doc(db, 'CurrentDay', 'today'));
  if (currentDayDoc.exists()) {
    const current = currentDayDoc.data() as CurrentDay;
    beforeCosts += current.beforeCosts;
    afterCostsNet += current.afterCostsNet;
    totalDiscounts += current.totalDiscounts;
    netAfterDiscounts += current.netAfterDiscounts;
  }

  const prevMonthStats = await getDocs(
    query(collection(db, 'MonthlyStats'), orderBy('monthYear', 'desc'))
  );

  let growthRate = '+0% نمو';
  if (!prevMonthStats.empty) {
    const prev = prevMonthStats.docs[0].data();
    if (prev.netAfterDiscounts > 0) {
      const growth = ((netAfterDiscounts - prev.netAfterDiscounts) / prev.netAfterDiscounts) * 100;
      growthRate = `${growth >= 0 ? '+' : ''}${Math.round(growth)}% نمو`;
    }
  }

  const currentMonthStats = await getDocs(
    query(collection(db, 'MonthlyStats'), where('monthYear', '==', currentMonthYear))
  );
  const currentMonthExpenses = currentMonthStats.empty
    ? 0
    : (currentMonthStats.docs[0].data().monthlyExpenses || 0);
  const currentMonthDocs = await getDocs(
    query(collection(db, 'MonthlyStats'), where('monthYear', '==', currentMonthYear))
  );
  const closedMonthDocs = await getDocs(
    query(collection(db, 'MonthlyStats'), where('monthYear', '==', closedMonthYear))
  );

  const batch = writeBatch(db);
  currentMonthDocs.docs.forEach((d) => batch.delete(d.ref));
  closedMonthDocs.docs.forEach((d) => batch.delete(d.ref));

  const closedMonthRef = doc(collection(db, 'MonthlyStats'));
  batch.set(closedMonthRef, {
    monthYear: closedMonthYear,
    beforeCosts,
    afterCostsNet,
    totalDiscounts,
    netAfterDiscounts,
    monthlyExpenses: currentMonthExpenses,
    growthRate,
  });

  const currentMonthRef = doc(collection(db, 'MonthlyStats'));
  batch.set(currentMonthRef, {
    monthYear: currentMonthYear,
    beforeCosts: 0,
    afterCostsNet: 0,
    totalDiscounts: 0,
    netAfterDiscounts: 0,
    monthlyExpenses: 0,
    growthRate: '+0% نمو',
  });

  dailyStats.docs.forEach((d) => batch.delete(d.ref));
  batch.set(doc(db, 'CurrentDay', 'today'), {
    beforeCosts: 0,
    afterCostsNet: 0,
    totalDiscounts: 0,
    netAfterDiscounts: 0,
    lastUpdate: new Date().toISOString(),
  });
  await batch.commit();
}
