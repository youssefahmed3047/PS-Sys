import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc } from 'firebase/firestore';
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

async function fixVipPrices() {
  const snapshot = await getDocs(collection(db, 'Rooms'));

  for (const roomDoc of snapshot.docs) {
    const data = roomDoc.data();
    if (data.isVIP) {
      await updateDoc(roomDoc.ref, { vipPrice: data.vipPrice || 45 });
      console.log(`✓ ${data.name}: vipPrice = ${data.vipPrice || 45}`);
    }
  }

  console.log('\nتم التحديث');
  process.exit(0);
}

fixVipPrices().catch((err) => {
  console.error('خطأ:', err.message);
  process.exit(1);
});
