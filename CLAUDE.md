# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

React Native app (Expo SDK 56) for managing one or more ESP32-based irrigation controllers, one account can have several devices. Communication between the app and the ESP32 hardware happens exclusively through Firebase Firestore/Cloud Functions — neither side talks to the other directly.

The ESP32 firmware lives in a separate repo: `irrigacao_setorial_freertos` (sibling checkout, e.g. `C:\Users\Dave\Documents\GitHub\irrigacao_setorial_freertos`). Its `firebase/` folder (`firestore.rules`, `functions/index.js`) is the **source of truth** for the backend contract — `firebase_schema_esp32.txt` in this repo mirrors it for quick reference, keep both in sync.

Always read the exact versioned Expo docs at **https://docs.expo.dev/versions/v56.0.0/** before writing code that touches Expo or Expo Router APIs.

## Commands

```bash
npm start              # start dev server (scan QR with Expo Go)
npm run android        # open on Android
npm run ios            # open on iOS
npx tsc --noEmit       # type check (no test suite exists)
npm run lint           # expo lint (not yet configured in this project — first run installs eslint)
```

There is no build step for Expo Go. Type checking (`npx tsc --noEmit`) is the primary correctness tool.

## Architecture

### Pareamento de dispositivo (não é mais "digitar o MAC")
Não existe cadastro manual de MAC. O fluxo é por código de 6 caracteres:
1. App chama a Cloud Function `gerarCodigoVinculacao` (`src/services/firebase.ts`), mostra o código + instruções na tela `src/app/adicionar-dispositivo.tsx`.
2. Usuário conecta no AP do ESP32 (`irrigacao-setup`, `192.168.4.1`) e digita WiFi + código no portal cativo do firmware.
3. O ESP32 chama a function `vincularComCodigo` (sem auth), recebe um Custom Token com claims `deviceMac`/`ownerUid`, e passa a autenticar sozinho no Firestore.
4. O app detecta o pareamento escutando `/users/{uid}/controllers` (via `subscribeControllers`) até aparecer o novo MAC, e navega para `/device/[mac]`.

Desvincular: `desvincularDispositivo(mac)` (Cloud Function), a partir da tela de status do dispositivo.

### Navegação (Expo Router)
- `src/app/index.tsx` — **lista de dispositivos** da conta. Se existir um "último dispositivo aberto" (`lastOpenedMac` no `AppContext`) ainda presente na lista, redireciona automaticamente pra ele uma vez por sessão (flag em módulo, não por navegação — "Voltar à lista" não sofre bounce-back).
- `src/app/adicionar-dispositivo.tsx` — tela de pareamento por código.
- `src/app/device/[mac]/` — rotas por dispositivo, com `_layout.tsx` (nativo, `NativeTabs`) e `_layout.web.tsx` (web, `expo-router/ui` Tabs — `NativeTabs` não funciona em web) definindo 3 abas: `index` (Status), `config` (Configuração), `logs` (Histórico).
- A rota de índice do segmento dinâmico é `/device/[mac]` (SEM `/index` — arquivos `index.tsx` não adicionam segmento à URL). Navegação programática usa a forma objeto: `router.push({ pathname: '/device/[mac]', params: { mac } })` — não usar template string (`` `/device/${mac}` ``), o typechecker rejeita. Usar `/device/[mac]/index` (com `/index` no pathname) compila mas causa "Unmatched Route" em runtime na web — confirmado via `.expo/types/router.d.ts`, que só lista `/device/[mac]` como Href válido.
- `src/app/explore.tsx` existe mas não é referenciado em nenhum tab trigger — resquício do template, não usar.

### Route vs non-route directories
Só arquivos dentro de `src/app/` viram rotas do Expo Router. `src/screens/` é uma pasta de componentes simples (não rotas) — usada por telas que não são rotas de topo, como `AuthScreen.tsx`.

### Boot flow
`_layout.tsx` renderiza `AuthProvider` → `AppProvider` → `Root`. `Root`:
- `authLoading` ou (`user` && `macsLoading`) → tela em branco
- sem `user` → `AuthScreen`
- com `user` → `Stack` (headerShown: false) — a lista de dispositivos e o pareamento são rotas normais dentro desse Stack, não mais uma alternância manual Setup/Tabs.

### AppContext (`src/contexts/AppContext.tsx`)
Multi-dispositivo — não guarda mais "o MAC", guarda a lista:
- `uid`
- `macs: string[]` — via `subscribeControllers` (onSnapshot em `/users/{uid}/controllers`), tempo real
- `lastOpenedMac` — persistido via `expo-secure-store` (`ultimo_dispositivo_{uid}`), só um atalho de navegação, não um gate de funcionalidade
- `setLastOpenedMac(mac)` — chamado a partir de `device/[mac]/_layout.tsx` sempre que um dashboard de dispositivo monta

O `status` de cada dispositivo não vive mais no contexto global — cada tela que precisa dele chama `subscribeStatus(uid, mac, ...)` diretamente (ver `src/app/index.tsx` e `src/app/device/[mac]/index.tsx`).

### Firebase (`src/services/firebase.ts` + `src/lib/firebaseConfig.ts`)
Usa o Firebase **JS SDK v12** (não `@react-native-firebase`). Funciona no Expo Go sem build nativo. Exporta `db`, `auth` e `functions` (`getFunctions(app, 'us-central1')`).

Todos os paths ficam sob `/users/{uid}/controllers/{mac}/...`. `{mac}` é sempre 12 hex maiúsculo **sem separador** (`src/lib/mac.ts`: `isValidMac`, `normalizeMac`, `formatMacDisplay` — este último só pra exibição, nunca usar no path).

| Path | Escreve | Lê |
|---|---|---|
| `/users/{uid}/controllers` (lista) | Cloud Function `vincularComCodigo` | App (`subscribeControllers`) |
| `config/main` | App | ESP32 |
| `status/main` | ESP32 | App (via `onSnapshot`) |
| `comandos/{id}` | App | ESP32 |
| `logs/{id}` | ESP32 | App (paginado, `getLogs`) |

`tempos` em `config/main` é um **mapa** de string do dia (`"0".."6"`) pra array de 12 minutos — Firestore não aceita array dentro de array, por isso não é `number[7][12]` literal.

`status.setorAtual` é 0-based (0–11); `-1` significa parado. Somar 1 ao exibir ("Setor 1".."Setor 12").

Comandos (iniciar/parar) são documentos com `processado: false`; o ESP32 executa e marca `processado: true`. O app não espera confirmação — dispara e confia no listener de `status` pra refletir o resultado.

### Constants
`src/constants/irrigation.ts` guarda as cores do design system (`C.*`), o array `DIAS`, e `NUM_SETORES = 12`. São restrições fixas de hardware e não devem virar configuráveis na UI.
