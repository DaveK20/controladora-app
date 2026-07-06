import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
// getReactNativePersistence existe no build React Native do firebase/auth (resolvido pelo
// Metro), mas não consta nos tipos empacotados — workaround oficial do Expo, ver
// https://expo.fyi/firebase-js-auth-setup
// @ts-expect-error
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

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
// getAuth(app) sozinho não persiste a sessão no React Native (fica só em memória — por
// isso era preciso logar de novo a cada abertura do app). initializeAuth com
// getReactNativePersistence guarda o token no AsyncStorage entre aberturas.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const functions = getFunctions(app, 'us-central1');
