/**
 * سكربت لإعادة تهيئة Firestore لمساحة اختبار نظيفة.
 * الاستخدام:
 *   node scripts/reset.mjs
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  deleteDoc,
  addDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env');
  const content = readFileSync(envPath, 'utf-8');
  const env = {};
  content.split('\n').forEach((line) => {
    const [key, ...vals] = line.split('=');
    if (key && vals.length) env[key.trim()] = vals.join('=').trim();
  });
  return env;
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

async function clearCollection(name) {
  const snapshot = await getDocs(collection(db, name));
  for (const docSnap of snapshot.docs) {
    await deleteDoc(docSnap.ref);
    console.log(`✓ تم حذف ${name} / ${docSnap.id}`);
  }
}

async function reset() {
  console.log('جاري مسح البيانات الحالية...\n');
  await clearCollection('Users');
  await clearCollection('Rooms');
  await clearCollection('Sessions');
  await clearCollection('Products');
  await clearCollection('Expenses');
  await clearCollection('DailyStats');
  await clearCollection('MonthlyStats');

  await deleteDoc(doc(db, 'Settings', 'main'));
  await deleteDoc(doc(db, 'CurrentDay', 'today'));
  console.log('✓ تم مسح Settings و CurrentDay\n');

  console.log('جاري إعادة تهيئة البيانات لاختبار التطبيق...\n');

  await addDoc(collection(db, 'Users'), {
    username: 'admin',
    password: 'admin123',
  });
  console.log('✓ Users: admin / admin123');

  await setDoc(doc(db, 'Settings', 'main'), {
    ps5Single: 50,
    ps5Multi: 70,
    ps4Single: 30,
    ps4Multi: 45,
    totalRooms: 12,
  });
  console.log('✓ Settings');

  const rooms = [
    { name: 'غرفة VIP 1', number: 1, status: 'available', isVIP: true, vipPrice: 45, consoleType: 'PS5', icon: 'gamepad', order: 1 },
    { name: 'غرفة فردي', number: 2, status: 'available', isVIP: false, consoleType: 'PS5', icon: 'gamepad', order: 2 },
    { name: 'غرفة 3', number: 3, status: 'available', isVIP: false, consoleType: 'PS4', icon: 'gamepad', order: 3 },
    { name: 'غرفة VIP 2', number: 4, status: 'available', isVIP: true, vipPrice: 45, consoleType: 'PS5', icon: 'gamepad', order: 4 },
    { name: 'غرفة 5', number: 5, status: 'available', isVIP: false, consoleType: 'PS4', icon: 'gamepad', order: 5 },
  ];

  for (const room of rooms) {
    await addDoc(collection(db, 'Rooms'), {
      ...room,
      activeSessionId: null,
    });
    console.log(`✓ Room: ${room.name}`);
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
    beforeCosts: 0,
    afterCostsNet: 0,
    totalDiscounts: 0,
    netAfterDiscounts: 0,
    lastUpdate: new Date().toISOString(),
  });
  console.log('✓ CurrentDay (صفر)');

  console.log('\nتم إعادة تهيئة النظام وتجهيزه للاختبار!');
  console.log('بيانات الدخول: admin / admin123');
  process.exit(0);
}

reset().catch((err) => {
  console.error('خطأ:', err.message);
  process.exit(1);
});
