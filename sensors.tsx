import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Image,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useApp } from "@/context/AppContext";

type Tab = "camera" | "gps";

export default function SensorsScreen() {
  const insets = useSafeAreaInsets();
  const { gpsLogs, photoLogs, addGPSLog, addPhotoLog } = useApp();
  const [tab, setTab] = useState<Tab>("camera");
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [capturing, setCapturing] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const trackingInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const headerPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  useEffect(() => {
    return () => {
      if (trackingInterval.current) clearInterval(trackingInterval.current);
    };
  }, []);

  const capturePhoto = async () => {
    if (!cameraRef.current) return;
    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        addPhotoLog(photo.uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.warn("Camera capture failed", e);
    } finally {
      setCapturing(false);
    }
  };

  const logGPS = async () => {
    if (!locationPermission?.granted) {
      await requestLocationPermission();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setCurrentLocation(loc);
      addGPSLog({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: Math.round(loc.coords.accuracy ?? 0),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.warn("GPS error", e);
    }
  };

  const toggleTracking = async () => {
    if (!locationPermission?.granted) {
      await requestLocationPermission();
      return;
    }
    if (tracking) {
      if (trackingInterval.current) clearInterval(trackingInterval.current);
      trackingInterval.current = null;
      setTracking(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      setTracking(true);
      logGPS();
      trackingInterval.current = setInterval(logGPS, 30000);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
  };

  const renderCamera = () => {
    if (!cameraPermission) {
      return (
        <View style={styles.permCenter}>
          <Ionicons name="camera-outline" size={48} color={Colors.textDim} />
          <Text style={styles.permText}>Loading camera...</Text>
        </View>
      );
    }
    if (!cameraPermission.granted) {
      return (
        <View style={styles.permCenter}>
          <Ionicons name="camera-outline" size={48} color={Colors.textDim} />
          <Text style={styles.permTitle}>Camera Access Needed</Text>
          <Text style={styles.permSubtitle}>Capture offline photos for local storage</Text>
          <Pressable onPress={requestCameraPermission} style={styles.permBtn}>
            <Text style={styles.permBtnText}>Grant Permission</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.cameraSection}>
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.cameraOverlay}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
          </CameraView>
        </View>

        <View style={styles.cameraControls}>
          <View style={styles.captureInfo}>
            <Text style={styles.captureCount}>{photoLogs.length}</Text>
            <Text style={styles.captureLabel}>SAVED</Text>
          </View>
          <Pressable
            onPress={capturePhoto}
            disabled={capturing}
            style={({ pressed }) => [styles.captureBtn, { opacity: pressed || capturing ? 0.7 : 1 }]}
          >
            <View style={styles.captureBtnInner}>
              <Ionicons name="camera" size={28} color={Colors.bgDeep} />
            </View>
          </Pressable>
          <View style={styles.captureInfo}>
            <Text style={styles.captureCount}>LOCAL</Text>
            <Text style={styles.captureLabel}>STORAGE</Text>
          </View>
        </View>

        {photoLogs.length > 0 && (
          <View style={styles.photoGrid}>
            <Text style={styles.sectionLabel}>RECENT CAPTURES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}
              contentContainerStyle={{ gap: 8 }}>
              {photoLogs.slice(0, 10).map(p => (
                <Image key={p.id} source={{ uri: p.uri }} style={styles.photoThumb} />
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const renderGPS = () => {
    if (!locationPermission) {
      return (
        <View style={styles.permCenter}>
          <Ionicons name="location-outline" size={48} color={Colors.textDim} />
          <Text style={styles.permText}>Loading...</Text>
        </View>
      );
    }
    if (!locationPermission.granted) {
      return (
        <View style={styles.permCenter}>
          <Ionicons name="location-outline" size={48} color={Colors.textDim} />
          <Text style={styles.permTitle}>Location Access Needed</Text>
          <Text style={styles.permSubtitle}>Log GPS coordinates offline</Text>
          <Pressable onPress={requestLocationPermission} style={styles.permBtn}>
            <Text style={styles.permBtnText}>Grant Permission</Text>
          </Pressable>
        </View>
      );
    }

    return (
      <View style={styles.gpsSection}>
        {/* Current Location */}
        <View style={styles.gpsCard}>
          <View style={styles.gpsCardHeader}>
            <Ionicons name="location" size={18} color={Colors.accent} />
            <Text style={styles.gpsCardTitle}>CURRENT POSITION</Text>
            {tracking && (
              <View style={styles.trackingBadge}>
                <View style={styles.trackingDot} />
                <Text style={styles.trackingText}>LIVE</Text>
              </View>
            )}
          </View>
          {currentLocation ? (
            <View style={styles.coordsGrid}>
              <View style={styles.coordItem}>
                <Text style={styles.coordLabel}>LATITUDE</Text>
                <Text style={styles.coordValue}>{currentLocation.coords.latitude.toFixed(6)}</Text>
              </View>
              <View style={styles.coordItem}>
                <Text style={styles.coordLabel}>LONGITUDE</Text>
                <Text style={styles.coordValue}>{currentLocation.coords.longitude.toFixed(6)}</Text>
              </View>
              <View style={styles.coordItem}>
                <Text style={styles.coordLabel}>ACCURACY</Text>
                <Text style={styles.coordValue}>{Math.round(currentLocation.coords.accuracy ?? 0)}m</Text>
              </View>
              <View style={styles.coordItem}>
                <Text style={styles.coordLabel}>LOGS</Text>
                <Text style={styles.coordValue}>{gpsLogs.length}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noLocText}>Tap Log or Start Tracking to get position</Text>
          )}
        </View>

        {/* Controls */}
        <View style={styles.gpsControls}>
          <Pressable
            onPress={logGPS}
            style={({ pressed }) => [styles.gpsBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="locate" size={18} color={Colors.textPrimary} />
            <Text style={styles.gpsBtnText}>LOG NOW</Text>
          </Pressable>

          <Pressable
            onPress={toggleTracking}
            style={({ pressed }) => [
              styles.gpsTrackBtn,
              { backgroundColor: tracking ? Colors.danger + "20" : Colors.success + "20", opacity: pressed ? 0.7 : 1 }
            ]}
          >
            <Ionicons
              name={tracking ? "stop-circle" : "play-circle"}
              size={18}
              color={tracking ? Colors.danger : Colors.success}
            />
            <Text style={[styles.gpsBtnText, { color: tracking ? Colors.danger : Colors.success }]}>
              {tracking ? "STOP TRACK" : "AUTO TRACK"}
            </Text>
          </Pressable>
        </View>

        {/* Logs */}
        <Text style={[styles.sectionLabel, { marginTop: 16, marginBottom: 8 }]}>GPS LOG HISTORY</Text>
        {gpsLogs.length === 0 ? (
          <View style={styles.emptyGPS}>
            <Ionicons name="map-outline" size={36} color={Colors.textDim} />
            <Text style={styles.emptyGPSText}>No GPS logs yet</Text>
          </View>
        ) : (
          <FlatList
            data={gpsLogs.slice(0, 50)}
            keyExtractor={item => item.id}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View style={[styles.gpsLogRow, index === 0 && { borderTopWidth: 0 }]}>
                <Ionicons name="location" size={12} color={Colors.accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.gpsLogCoords}>
                    {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                  </Text>
                  <Text style={styles.gpsLogTime}>
                    {new Date(item.timestamp).toLocaleString()} · ±{item.accuracy}m
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: headerPad }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>RUBEL ENGINE</Text>
          <Text style={styles.headerTitle}>SENSORS</Text>
        </View>
        <View style={[styles.offlineBadge]}>
          <Ionicons name="wifi-outline" size={12} color={Colors.success} />
          <Text style={styles.offlineText}>OFFLINE READY</Text>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <Pressable onPress={() => setTab("camera")} style={[styles.tabItem, tab === "camera" && styles.tabItemActive]}>
          <Ionicons name="camera-outline" size={16} color={tab === "camera" ? Colors.accent : Colors.textDim} />
          <Text style={[styles.tabText, tab === "camera" && { color: Colors.accent }]}>CAMERA</Text>
        </Pressable>
        <Pressable onPress={() => setTab("gps")} style={[styles.tabItem, tab === "gps" && styles.tabItemActive]}>
          <Ionicons name="location-outline" size={16} color={tab === "gps" ? Colors.accent : Colors.textDim} />
          <Text style={[styles.tabText, tab === "gps" && { color: Colors.accent }]}>GPS TRACKER</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, paddingBottom: bottomPad + 100 }}
      >
        {tab === "camera" ? renderCamera() : renderGPS()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDeep },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerSub: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 11,
    letterSpacing: 3,
    color: Colors.textDim,
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 26,
    letterSpacing: 2,
    color: Colors.textPrimary,
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.success + "15",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.success + "30",
  },
  offlineText: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
    color: Colors.success,
  },
  tabBar: {
    flexDirection: "row",
    marginHorizontal: 16,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabItemActive: {
    backgroundColor: Colors.bgElevated,
  },
  tabText: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 12,
    letterSpacing: 1.5,
    color: Colors.textDim,
  },
  permCenter: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    gap: 12,
  },
  permText: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 14,
    color: Colors.textDim,
  },
  permTitle: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 20,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  permSubtitle: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  permBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  permBtnText: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 15,
    color: Colors.bgDeep,
    letterSpacing: 1,
  },
  cameraSection: { gap: 16 },
  cameraContainer: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.bgBorder,
  },
  camera: { height: 260 },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: Colors.accent,
    opacity: 0.8,
  },
  cornerTL: { top: 16, left: 16, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: 16, right: 16, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: 16, left: 16, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: 16, right: 16, borderBottomWidth: 2, borderRightWidth: 2 },
  cameraControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  captureInfo: { alignItems: "center", width: 70 },
  captureCount: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 22,
    color: Colors.accent,
    letterSpacing: 1,
  },
  captureLabel: {
    fontFamily: "Rajdhani_500Medium",
    fontSize: 9,
    letterSpacing: 2,
    color: Colors.textDim,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  captureBtnInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  photoGrid: { gap: 0 },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: Colors.bgCard,
  },
  sectionLabel: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 11,
    letterSpacing: 3,
    color: Colors.textDim,
  },
  gpsSection: { gap: 0 },
  gpsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    marginBottom: 12,
    gap: 12,
  },
  gpsCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gpsCardTitle: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 13,
    letterSpacing: 2,
    color: Colors.textPrimary,
    flex: 1,
  },
  trackingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.danger + "20",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  trackingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.danger,
  },
  trackingText: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    color: Colors.danger,
  },
  coordsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  coordItem: { width: "46%", gap: 2 },
  coordLabel: {
    fontFamily: "Rajdhani_500Medium",
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.textDim,
  },
  coordValue: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 16,
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  noLocText: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 13,
    color: Colors.textDim,
    textAlign: "center",
    paddingVertical: 8,
  },
  gpsControls: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  gpsBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
  },
  gpsTrackBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
  },
  gpsBtnText: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 13,
    letterSpacing: 1.5,
    color: Colors.textPrimary,
  },
  emptyGPS: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyGPSText: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 14,
    color: Colors.textDim,
  },
  gpsLogRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.bgBorder + "50",
  },
  gpsLogCoords: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  gpsLogTime: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 11,
    color: Colors.textDim,
    marginTop: 1,
  },
});
