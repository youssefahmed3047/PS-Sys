/**
 * إعادة ضبط collection Users ليحتوي فقط على username و password
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  addDoc,
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

async function fixUsers() {
  console.log('جاري تنظيف Users collection...\n');

  const snapshot = await getDocs(collection(db, 'Users'));
  for (const userDoc of snapshot.docs) {
    await deleteDoc(userDoc.ref);
    console.log(`✓ تم حذف: ${userDoc.id}`);
  }

  await addDoc(collection(db, 'Users'), {
    username: 'admin',
    password: 'admin123',
  });
  console.log('✓ تم إضافة مستخدم: admin / admin123');
  console.log('\nالحقول الموجودة فقط: username, password');
  process.exit(0);
}

fixUsers().catch((err) => {
  console.error('خطأ:', err.message);
  process.exit(1);
});
