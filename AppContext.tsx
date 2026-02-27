import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Feature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: string;
  addedAt: string;
}

export interface GPSLog {
  id: string;
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
}

export interface PhotoLog {
  id: string;
  uri: string;
  timestamp: string;
}

export interface CommandLog {
  id: string;
  command: string;
  result: string;
  timestamp: string;
  type: "success" | "error" | "info";
}

export interface EmailQueue {
  id: string;
  subject: string;
  body: string;
  createdAt: string;
  sent: boolean;
}

const DEFAULT_FEATURES: Feature[] = [
  { id: "f001", name: "GPS Tracking", description: "Real-time location logging", enabled: true, category: "Sensors", addedAt: new Date().toISOString() },
  { id: "f002", name: "Camera Capture", description: "Offline photo capture", enabled: true, category: "Sensors", addedAt: new Date().toISOString() },
  { id: "f003", name: "Email Sync", description: "Sync data when online", enabled: true, category: "Network", addedAt: new Date().toISOString() },
  { id: "f004", name: "Dark Mode", description: "Always-on dark interface", enabled: true, category: "UI", addedAt: new Date().toISOString() },
  { id: "f005", name: "Haptic Feedback", description: "Tactile button responses", enabled: true, category: "UI", addedAt: new Date().toISOString() },
  { id: "f006", name: "Auto GPS Log", description: "Log GPS every 30 seconds", enabled: false, category: "Sensors", addedAt: new Date().toISOString() },
  { id: "f007", name: "Battery Monitor", description: "Track battery usage", enabled: false, category: "System", addedAt: new Date().toISOString() },
  { id: "f008", name: "Network Watch", description: "Monitor connectivity state", enabled: true, category: "Network", addedAt: new Date().toISOString() },
  { id: "f009", name: "Command History", description: "Save all command logs", enabled: true, category: "System", addedAt: new Date().toISOString() },
  { id: "f010", name: "Photo Compression", description: "Compress photos on save", enabled: false, category: "Sensors", addedAt: new Date().toISOString() },
];

interface AppContextValue {
  features: Feature[];
  gpsLogs: GPSLog[];
  photoLogs: PhotoLog[];
  commandLogs: CommandLog[];
  emailQueue: EmailQueue[];
  emailAddress: string;
  isOnline: boolean;
  setEmailAddress: (email: string) => void;
  toggleFeature: (id: string) => void;
  addFeature: (name: string, description: string, category: string) => void;
  removeFeature: (id: string) => void;
  addGPSLog: (log: Omit<GPSLog, "id" | "timestamp">) => void;
  addPhotoLog: (uri: string) => void;
  addCommandLog: (command: string, result: string, type: CommandLog["type"]) => void;
  addEmailQueue: (subject: string, body: string) => void;
  clearCommandLogs: () => void;
  clearGPSLogs: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Feature[]>(DEFAULT_FEATURES);
  const [gpsLogs, setGpsLogs] = useState<GPSLog[]>([]);
  const [photoLogs, setPhotoLogs] = useState<PhotoLog[]>([]);
  const [commandLogs, setCommandLogs] = useState<CommandLog[]>([]);
  const [emailQueue, setEmailQueue] = useState<EmailQueue[]>([]);
  const [emailAddress, setEmailAddressState] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [f, g, p, c, e, em] = await Promise.all([
          AsyncStorage.getItem("features"),
          AsyncStorage.getItem("gpsLogs"),
          AsyncStorage.getItem("photoLogs"),
          AsyncStorage.getItem("commandLogs"),
          AsyncStorage.getItem("emailQueue"),
          AsyncStorage.getItem("emailAddress"),
        ]);
        if (f) setFeatures(JSON.parse(f));
        if (g) setGpsLogs(JSON.parse(g));
        if (p) setPhotoLogs(JSON.parse(p));
        if (c) setCommandLogs(JSON.parse(c));
        if (e) setEmailQueue(JSON.parse(e));
        if (em) setEmailAddressState(em);
      } catch (_) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem("features", JSON.stringify(features));
  }, [features, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem("gpsLogs", JSON.stringify(gpsLogs));
  }, [gpsLogs, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem("photoLogs", JSON.stringify(photoLogs));
  }, [photoLogs, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem("commandLogs", JSON.stringify(commandLogs));
  }, [commandLogs, loaded]);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem("emailQueue", JSON.stringify(emailQueue));
  }, [emailQueue, loaded]);

  function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  const setEmailAddress = (email: string) => {
    setEmailAddressState(email);
    AsyncStorage.setItem("emailAddress", email);
  };

  const toggleFeature = (id: string) => {
    setFeatures(prev => prev.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f));
  };

  const addFeature = (name: string, description: string, category: string) => {
    const newFeature: Feature = {
      id: uid(),
      name,
      description,
      enabled: false,
      category,
      addedAt: new Date().toISOString(),
    };
    setFeatures(prev => [...prev, newFeature]);
  };

  const removeFeature = (id: string) => {
    setFeatures(prev => prev.filter(f => f.id !== id));
  };

  const addGPSLog = (log: Omit<GPSLog, "id" | "timestamp">) => {
    const entry: GPSLog = { ...log, id: uid(), timestamp: new Date().toISOString() };
    setGpsLogs(prev => [entry, ...prev].slice(0, 200));
  };

  const addPhotoLog = (uri: string) => {
    const entry: PhotoLog = { id: uid(), uri, timestamp: new Date().toISOString() };
    setPhotoLogs(prev => [entry, ...prev].slice(0, 100));
  };

  const addCommandLog = (command: string, result: string, type: CommandLog["type"]) => {
    const entry: CommandLog = { id: uid(), command, result, type, timestamp: new Date().toISOString() };
    setCommandLogs(prev => [entry, ...prev].slice(0, 500));
  };

  const addEmailQueue = (subject: string, body: string) => {
    const entry: EmailQueue = { id: uid(), subject, body, createdAt: new Date().toISOString(), sent: false };
    setEmailQueue(prev => [...prev, entry]);
  };

  const clearCommandLogs = () => setCommandLogs([]);
  const clearGPSLogs = () => setGpsLogs([]);

  const value = useMemo(() => ({
    features, gpsLogs, photoLogs, commandLogs, emailQueue, emailAddress, isOnline,
    setEmailAddress, toggleFeature, addFeature, removeFeature,
    addGPSLog, addPhotoLog, addCommandLog, addEmailQueue,
    clearCommandLogs, clearGPSLogs,
  }), [features, gpsLogs, photoLogs, commandLogs, emailQueue, emailAddress, isOnline, loaded]);

  if (!loaded) return null;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
