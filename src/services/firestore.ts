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
  orderBy,
  Timestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import type {
  Room,
  Session,
  SessionItem,
  Settings,
  Product,
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
  if (!snapshot.exists()) {
    return {
      ps5Single: 50,
      ps5Multi: 70,
      ps4Single: 30,
      ps4Multi: 45,
      totalRooms: 12,
    };
  }
  return snapshot.data() as Settings;
}

export function subscribeSettings(callback: (settings: Settings) => void) {
  return onSnapshot(doc(db, 'Settings', 'main'), (snapshot) => {
    if (!snapshot.exists()) {
      callback({
        ps5Single: 50,
        ps5Multi: 70,
        ps4Single: 30,
        ps4Multi: 45,
        totalRooms: 12,
      });
      return;
    }
    callback(snapshot.data() as Settings);
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

export async function startSession(
  room: Room,
  playMode: 'single' | 'multi',
  settings: Settings
): Promise<string> {
  const hourlyRate = getHourlyRate(room, playMode, settings);

  const sessionRef = await addDoc(collection(db, 'Sessions'), {
    roomId: room.id,
    roomName: room.name,
    startTime: Timestamp.now(),
    playMode,
    consoleType: room.consoleType,
    hourlyRate,
    isVIP: room.isVIP,
    items: [],
    status: 'active',
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
  const timeCost = calculateTimeCost(elapsed, session.hourlyRate);
  const addonsCost = calculateAddonsCost(session.items || []);
  const totalBeforeCosts = timeCost + addonsCost;
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
  await updateDoc(doc(db, 'Rooms', roomId), data);
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

  await addDoc(collection(db, 'DailyStats'), {
    date: today,
    beforeCosts: current.beforeCosts,
    afterCostsNet: current.afterCostsNet,
    totalDiscounts: current.totalDiscounts,
    netAfterDiscounts: current.netAfterDiscounts,
  });

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
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

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

  await addDoc(collection(db, 'MonthlyStats'), {
    monthYear,
    beforeCosts,
    afterCostsNet,
    totalDiscounts,
    netAfterDiscounts,
    growthRate,
  });

  const batch = writeBatch(db);
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
