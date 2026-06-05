/**
 * سكربت لإضافة البيانات الأولية في Firestore
 * الاستخدام:
 *   1. أنشئ مشروع Firebase من Console
 *   2. انسخ بيانات الاعتماد إلى .env
 *   3. شغّل: node scripts/seed.mjs
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  collection,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
    const content = readFileSync(envPath, 'utf-8');
    const env = {};
    content.split('\n').forEach((line) => {
      const [key, ...vals] = line.split('=');
      if (key && vals.length) env[key.trim()] = vals.join('=').trim();
    });
    return env;
  } catch {
    console.error('ملف .env غير موجود. انسخ .env.example إلى .env وأضف بيانات Firebase');
    process.exit(1);
  }
}

const env = loadEnv();

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

async function seed() {
  console.log('جاري إضافة البيانات الأولية...\n');

  await addDoc(collection(db, 'Users'), {
    username: 'admin',
    password: 'admin123',
  });
  console.log('✓ Users: admin / admin123 (username + password فقط)');

  await setDoc(doc(db, 'Settings', 'main'), {
    ps5Single: 50,
    ps5Multi: 70,
    ps4Single: 30,
    ps4Multi: 45,
    totalRooms: 12,
  });
  console.log('✓ Settings');

  const rooms = [
    { name: 'غرفة VIP 1', number: 1, status: 'busy', isVIP: true, vipPrice: 45, consoleType: 'PS5', icon: 'gamepad', order: 1 },
    { name: 'غرفة فردي', number: 2, status: 'available', isVIP: false, consoleType: 'PS5', icon: 'gamepad', order: 2 },
    { name: 'غرفة 3', number: 3, status: 'busy', isVIP: false, consoleType: 'PS4', icon: 'gamepad', order: 3 },
    { name: 'غرفة VIP 2', number: 4, status: 'available', isVIP: true, vipPrice: 45, consoleType: 'PS5', icon: 'gamepad', order: 4 },
    { name: 'غرفة 5', number: 5, status: 'busy', isVIP: false, consoleType: 'PS4', icon: 'gamepad', order: 5 },
  ];

  const roomIds = [];
  for (const room of rooms) {
    const ref = await addDoc(collection(db, 'Rooms'), room);
    roomIds.push({ id: ref.id, ...room });
    console.log(`✓ Room: ${room.name}`);
  }

  const busyRooms = roomIds.filter((r) => r.status === 'busy');
  for (const room of busyRooms) {
    const sessionRef = await addDoc(collection(db, 'Sessions'), {
      roomId: room.id,
      roomName: room.name,
      startTime: Timestamp.fromDate(new Date(Date.now() - 6156000)),
      playMode: 'single',
      consoleType: room.consoleType,
      hourlyRate: room.isVIP ? 45 : 50,
      isVIP: room.isVIP,
      items: [],
      status: 'active',
    });
    await setDoc(doc(db, 'Rooms', room.id), {
      ...room,
      activeSessionId: sessionRef.id,
    });
    console.log(`✓ Session for: ${room.name}`);
  }

  const products = [
    { name: 'كولا / بيبسي', sellingPrice: 20, category: 'مشروبات غازية' },
    { name: 'بيبسي بارد', sellingPrice: 5, category: 'مشروبات غازية' },
    { name: 'نودلز حار', sellingPrice: 22, category: 'وجبات خفيفة' },
  ];

  for (const product of products) {
    await addDoc(collection(db, 'Products'), product);
    console.log(`✓ Product: ${product.name}`);
  }

  await setDoc(doc(db, 'CurrentDay', 'today'), {
    beforeCosts: 1250,
    afterCostsNet: 850,
    totalDiscounts: 150,
    netAfterDiscounts: 700,
    lastUpdate: new Date().toISOString(),
  });
  console.log('✓ CurrentDay');

  await addDoc(collection(db, 'MonthlyStats'), {
    monthYear: '2023-10',
    beforeCosts: 34800,
    afterCostsNet: 22450,
    totalDiscounts: 2100,
    netAfterDiscounts: 20350,
    growthRate: '+12% نمو',
  });
  console.log('✓ MonthlyStats');

  const dailyLogs = [
    { date: '2024-05-25', beforeCosts: 1250, afterCostsNet: 850, totalDiscounts: 150, netAfterDiscounts: 700 },
    { date: '2024-05-24', beforeCosts: 1100, afterCostsNet: 900, totalDiscounts: 100, netAfterDiscounts: 1000 },
    { date: '2024-05-23', beforeCosts: 1450, afterCostsNet: 1200, totalDiscounts: 200, netAfterDiscounts: 1250 },
  ];

  for (const log of dailyLogs) {
    await addDoc(collection(db, 'DailyStats'), log);
    console.log(`✓ DailyStat: ${log.date}`);
  }

  console.log('\nتم إضافة جميع البيانات بنجاح!');
  console.log('بيانات الدخول: admin / admin123');
  process.exit(0);
}

seed().catch((err) => {
  console.error('خطأ:', err.message);
  process.exit(1);
});
