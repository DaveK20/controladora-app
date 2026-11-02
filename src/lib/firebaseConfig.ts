import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';

// getReactNativePersistence existe no build React Native do firebase/auth (resolvido pelo
// Metro), mas não consta nos tipos empacotados — workaround oficial do Expo, ver
// https://expo.fyi/firebase-js-auth-setup
// @ts-expect-error
import { getReactNativePersistence } from 'firebase/auth';

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
// No React Native, getAuth(app) sozinho não persiste a sessão (fica só em memória — por
// isso era preciso logar de novo a cada abertura do app); initializeAuth com
// getReactNativePersistence guarda o token no AsyncStorage entre aberturas.
//
// Na web é o contrário: o build de browser do firebase/auth NÃO exporta
// getReactNativePersistence (chamá-la quebra o app no boot com
// "getReactNativePersistence is not a function"), e getAuth(app) já persiste
// sozinho em indexedDB/localStorage. Por isso a guarda de plataforma.
export const auth =
  Platform.OS === 'web'
    ? getAuth(app)
    : initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
export const functions = getFunctions(app, 'us-central1');
