# Rubel Engine Project

## Overview
A professional Android/iOS offline-first command & control application built with Expo React Native. 100% local operation - no external servers required.

## Architecture

### Frontend (Expo Router + React Native)
- **app/(tabs)/index.tsx** — Dashboard: system tiles, animated status, feature toggles
- **app/(tabs)/command.tsx** — Command Center: text command terminal with history
- **app/(tabs)/sensors.tsx** — Sensors: offline camera capture + GPS tracker
- **app/(tabs)/settings.tsx** — Settings: email config, data management, hidden admin panel

### State Management
- **context/AppContext.tsx** — Global app state using React Context + AsyncStorage for persistence
- All data stored 100% locally via AsyncStorage

### Backend (Express - minimal, serves landing page only)
- **server/index.ts** — Express server for development landing page only
- **server/routes.ts** — No API routes needed; app is fully self-contained

## Key Features
1. **Dashboard** - Live system status, sensor readings, feature toggles with animated scanning overlay
2. **Command Center** - Terminal-style command input; supports: help, list, enable, disable, add, remove, status, clear-logs, clear-gps, sync-email, version
3. **Sensors** - Offline camera capture (stored locally) + GPS tracker with auto-logging every 30s
4. **Settings** - Email sync configuration, data management, hidden admin panel (tap title 7x to unlock)
5. **Admin Panel** - Add/remove/toggle unlimited features, full feature management

## Design
- Dark theme: deep navy (#080C14) with electric cyan accent (#00D4FF)
- Font: Rajdhani (Google Fonts) - bold, technical, military aesthetic
- Offline-first: all data persists to AsyncStorage, no internet required for core functions
- Email sync: opens native email client when online

## Workflows
- **Start Backend**: `npm run server:dev` (port 5000) — serves landing page
- **Start Frontend**: `npm run expo:dev` (port 8081) — Expo dev server

## Packages Added
- expo-camera (offline photo capture)
- @expo-google-fonts/rajdhani (typography)
- expo-location (GPS tracking)
- expo-haptics (tactile feedback)
