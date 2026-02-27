import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  interpolate,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useApp } from "@/context/AppContext";

function PulseRing({ active }: { active: boolean }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(withTiming(1.4, { duration: 900, easing: Easing.out(Easing.ease) }), withTiming(1, { duration: 0 })),
        -1,
        false
      );
      opacity.value = withRepeat(
        withSequence(withTiming(0, { duration: 900, easing: Easing.out(Easing.ease) }), withTiming(0.6, { duration: 0 })),
        -1,
        false
      );
    } else {
      scale.value = withTiming(1);
      opacity.value = withTiming(0.2);
    }
  }, [active]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 16,
          height: 16,
          borderRadius: 8,
          borderWidth: 2,
          borderColor: active ? Colors.success : Colors.textDim,
        },
        style,
      ]}
    />
  );
}

interface StatusTileProps {
  icon: string;
  iconLib?: "ionicons" | "mci";
  label: string;
  value: string;
  unit?: string;
  active?: boolean;
  color?: string;
}

function StatusTile({ icon, iconLib = "ionicons", label, value, unit, active = false, color }: StatusTileProps) {
  const tileColor = color || (active ? Colors.accent : Colors.textSecondary);

  return (
    <View style={[styles.tile, { borderColor: active ? Colors.bgBorder : "transparent", borderWidth: active ? 1 : 0 }]}>
      <View style={[styles.tileIconWrap, { backgroundColor: tileColor + "18" }]}>
        {iconLib === "mci" ? (
          <MaterialCommunityIcons name={icon as any} size={20} color={tileColor} />
        ) : (
          <Ionicons name={icon as any} size={20} color={tileColor} />
        )}
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
      <View style={styles.tileValueRow}>
        <Text style={[styles.tileValue, { color: tileColor }]}>{value}</Text>
        {unit ? <Text style={styles.tileUnit}>{unit}</Text> : null}
      </View>
    </View>
  );
}

interface FeatureRowProps {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  onToggle: (id: string) => void;
}

function FeatureRow({ id, name, description, category, enabled, onToggle }: FeatureRowProps) {
  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(id);
  };

  return (
    <View style={styles.featureRow}>
      <View style={styles.featureInfo}>
        <View style={styles.featureCategoryBadge}>
          <Text style={styles.featureCategoryText}>{category}</Text>
        </View>
        <Text style={styles.featureName}>{name}</Text>
        <Text style={styles.featureDesc}>{description}</Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={handleToggle}
        thumbColor={enabled ? Colors.accent : Colors.textDim}
        trackColor={{ false: Colors.bgBorder, true: Colors.accentDim + "88" }}
        ios_backgroundColor={Colors.bgBorder}
      />
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { features, gpsLogs, photoLogs, commandLogs, toggleFeature } = useApp();

  const headerPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const enabledCount = features.filter(f => f.enabled).length;
  const totalCount = features.length;

  const scanAnim = useSharedValue(0);
  useEffect(() => {
    scanAnim.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scanAnim.value, [0, 1], [0, 80]) }],
    opacity: interpolate(scanAnim.value, [0, 0.5, 1], [0, 0.6, 0]),
  }));

  return (
    <View style={[styles.container, { paddingTop: headerPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 100 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>SYSTEM CONTROL</Text>
            <Text style={styles.headerTitle}>RUBEL ENGINE</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot}>
              <PulseRing active={true} />
              <View style={[styles.statusDotCore, { backgroundColor: Colors.success }]} />
            </View>
            <Text style={styles.statusText}>ONLINE</Text>
          </View>
        </View>

        {/* Scan Banner */}
        <View style={styles.scanBanner}>
          <View style={styles.scanOverflow}>
            <Animated.View style={[styles.scanLine, scanStyle]} />
          </View>
          <View style={styles.scanContent}>
            <Ionicons name="shield-checkmark" size={28} color={Colors.accent} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.scanTitle}>SYSTEM ACTIVE</Text>
              <Text style={styles.scanSub}>{enabledCount}/{totalCount} modules running</Text>
            </View>
          </View>
          <View style={styles.scanStats}>
            <Text style={styles.scanStatVal}>{gpsLogs.length}</Text>
            <Text style={styles.scanStatLabel}>GPS LOGS</Text>
          </View>
          <View style={styles.scanStats}>
            <Text style={styles.scanStatVal}>{photoLogs.length}</Text>
            <Text style={styles.scanStatLabel}>CAPTURES</Text>
          </View>
          <View style={styles.scanStats}>
            <Text style={styles.scanStatVal}>{commandLogs.length}</Text>
            <Text style={styles.scanStatLabel}>COMMANDS</Text>
          </View>
        </View>

        {/* Status Grid */}
        <Text style={styles.sectionLabel}>SYSTEM STATUS</Text>
        <View style={styles.tileGrid}>
          <StatusTile icon="radio" label="Network" value="Connected" active color={Colors.success} />
          <StatusTile icon="location" label="GPS" value={gpsLogs.length > 0 ? "Active" : "Ready"} active={gpsLogs.length > 0} color={Colors.accent} />
          <StatusTile icon="camera" label="Camera" value="Available" active color={Colors.warning} />
          <StatusTile icon="layers-outline" label="Features" value={String(enabledCount)} unit={`/ ${totalCount}`} active color={Colors.accent} />
          <StatusTile icon="server-outline" label="Storage" value="Local" active color={Colors.success} />
          <StatusTile icon="lock-closed" label="Privacy" value="100%" active color={Colors.success} />
        </View>

        {/* Feature Toggles */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>FEATURE MODULES</Text>
          <Text style={styles.sectionCount}>{enabledCount} active</Text>
        </View>

        <View style={styles.featureList}>
          {features.map(feature => (
            <FeatureRow
              key={feature.id}
              {...feature}
              onToggle={toggleFeature}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
  },
  scroll: {
    padding: 16,
    gap: 0,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
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
    fontSize: 30,
    letterSpacing: 2,
    color: Colors.textPrimary,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
  },
  statusDot: {
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusDotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: "absolute",
  },
  statusText: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 12,
    letterSpacing: 1,
    color: Colors.success,
  },
  scanBanner: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    overflow: "hidden",
    gap: 12,
  },
  scanOverflow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    overflow: "hidden",
  },
  scanLine: {
    height: 2,
    backgroundColor: Colors.accent,
    opacity: 0.4,
  },
  scanContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  scanTitle: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 16,
    letterSpacing: 2,
    color: Colors.textPrimary,
  },
  scanSub: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  scanStats: {
    alignItems: "center",
  },
  scanStatVal: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 22,
    color: Colors.accent,
    letterSpacing: 1,
  },
  scanStatLabel: {
    fontFamily: "Rajdhani_500Medium",
    fontSize: 10,
    letterSpacing: 1.5,
    color: Colors.textDim,
    marginTop: 2,
  },
  sectionLabel: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 11,
    letterSpacing: 3,
    color: Colors.textDim,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 24,
  },
  sectionCount: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 1,
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 4,
  },
  tile: {
    width: "48%",
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  tileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    fontFamily: "Rajdhani_500Medium",
    fontSize: 12,
    letterSpacing: 1,
    color: Colors.textDim,
  },
  tileValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  tileValue: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  tileUnit: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 12,
    color: Colors.textDim,
  },
  featureList: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    overflow: "hidden",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgBorder + "60",
  },
  featureInfo: {
    flex: 1,
    marginRight: 12,
    gap: 3,
  },
  featureCategoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.bgElevated,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginBottom: 2,
  },
  featureCategoryText: {
    fontFamily: "Rajdhani_500Medium",
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.textDim,
  },
  featureName: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  featureDesc: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
