import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            'AIzaSyDyEdm6CgEPk4PxGjAjXg-zxTbFtqJWAiE',
  authDomain:        'controladora-irrigacao.firebaseapp.com',
  projectId:         'controladora-irrigacao',
  storageBucket:     'controladora-irrigacao.firebasestorage.app',
  messagingSenderId: '741020624028',
  appId:             '1:741020624028:web:786a4a06136e954ba6b959',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db   = getFirestore(app);
export const auth = getAuth(app);
