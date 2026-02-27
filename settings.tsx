import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useApp } from "@/context/AppContext";

const SECRET_TAPS = 7;
const SECRET_TIMEOUT = 3000;

interface AdminFeatureCardProps {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
}

function AdminFeatureCard({ id, name, description, category, enabled, onRemove, onToggle }: AdminFeatureCardProps) {
  const handleRemove = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Remove Feature", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => onRemove(id) },
    ]);
  };

  return (
    <View style={styles.adminCard}>
      <View style={styles.adminCardTop}>
        <View style={styles.adminCardInfo}>
          <View style={styles.catBadge}>
            <Text style={styles.catBadgeText}>{category}</Text>
          </View>
          <Text style={styles.adminCardName}>{name}</Text>
          <Text style={styles.adminCardDesc}>{description}</Text>
        </View>
        <View style={styles.adminCardActions}>
          <Pressable onPress={() => onToggle(id)} style={[styles.toggleChip, { backgroundColor: enabled ? Colors.success + "20" : Colors.bgElevated }]}>
            <Text style={[styles.toggleChipText, { color: enabled ? Colors.success : Colors.textDim }]}>
              {enabled ? "ON" : "OFF"}
            </Text>
          </Pressable>
          <Pressable onPress={handleRemove} style={styles.removeBtn}>
            <Ionicons name="trash-outline" size={16} color={Colors.danger} />
          </Pressable>
        </View>
      </View>
      <Text style={styles.adminCardId}>ID: {id}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { features, emailAddress, setEmailAddress, addFeature, removeFeature, toggleFeature, emailQueue, clearCommandLogs, clearGPSLogs } = useApp();
  const [emailInput, setEmailInput] = useState(emailAddress);
  const [showAdmin, setShowAdmin] = useState(false);
  const [newFeatureName, setNewFeatureName] = useState("");
  const [newFeatureDesc, setNewFeatureDesc] = useState("");
  const [newFeatureCat, setNewFeatureCat] = useState("Custom");
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const headerPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const handleSecretTap = () => {
    tapCount.current += 1;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (tapTimer.current) clearTimeout(tapTimer.current);

    if (tapCount.current >= SECRET_TAPS) {
      tapCount.current = 0;
      setShowAdmin(prev => !prev);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, SECRET_TIMEOUT);
  };

  const saveEmail = () => {
    setEmailAddress(emailInput.trim());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Saved", `Email set to: ${emailInput.trim()}`);
  };

  const syncEmail = () => {
    if (!emailAddress) {
      Alert.alert("No Email", "Please set your email address first.");
      return;
    }
    const subject = encodeURIComponent("Rubel Engine Data Sync");
    const enabledFeatures = features.filter(f => f.enabled).map(f => f.name).join(", ");
    const body = encodeURIComponent(
      `Rubel Engine Sync Report\n` +
      `Date: ${new Date().toLocaleString()}\n\n` +
      `Active Features: ${enabledFeatures}\n` +
      `Total Features: ${features.length}\n` +
      `Queue Items: ${emailQueue.length}`
    );
    Linking.openURL(`mailto:${emailAddress}?subject=${subject}&body=${body}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const addNewFeature = () => {
    if (!newFeatureName.trim() || !newFeatureDesc.trim()) {
      Alert.alert("Required", "Name and description are required.");
      return;
    }
    addFeature(newFeatureName.trim(), newFeatureDesc.trim(), newFeatureCat.trim() || "Custom");
    setNewFeatureName("");
    setNewFeatureDesc("");
    setNewFeatureCat("Custom");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View style={[styles.container, { paddingTop: headerPad }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header with secret tap trigger */}
        <View style={styles.header}>
          <Pressable onPress={handleSecretTap}>
            <Text style={styles.headerSub}>RUBEL ENGINE</Text>
            <Text style={styles.headerTitle}>SETTINGS</Text>
          </Pressable>
          {showAdmin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield" size={12} color={Colors.warning} />
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
          )}
        </View>

        {/* Email Configuration */}
        <Text style={styles.sectionLabel}>EMAIL SYNC</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <Ionicons name="mail-outline" size={18} color={Colors.accent} />
            <Text style={styles.cardLabel}>Private Email Address</Text>
          </View>
          <Text style={styles.cardSubtitle}>Data syncs to this email when online</Text>
          <TextInput
            style={styles.textInput}
            value={emailInput}
            onChangeText={setEmailInput}
            placeholder="your@email.com"
            placeholderTextColor={Colors.textDim}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.emailActions}>
            <Pressable onPress={saveEmail} style={[styles.actionBtn, { backgroundColor: Colors.accent }]}>
              <Ionicons name="save-outline" size={16} color={Colors.bgDeep} />
              <Text style={[styles.actionBtnText, { color: Colors.bgDeep }]}>SAVE</Text>
            </Pressable>
            <Pressable onPress={syncEmail} style={[styles.actionBtn, { backgroundColor: Colors.bgElevated }]}>
              <Ionicons name="send-outline" size={16} color={Colors.textPrimary} />
              <Text style={styles.actionBtnText}>SYNC NOW</Text>
            </Pressable>
          </View>
          {emailAddress ? (
            <View style={styles.emailSet}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.emailSetText}>Configured: {emailAddress}</Text>
            </View>
          ) : null}
        </View>

        {/* App Info */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>APP INFO</Text>
        <View style={styles.card}>
          {[
            { label: "App Name", value: "Rubel Engine Project" },
            { label: "Version", value: "1.0.0" },
            { label: "Platform", value: Platform.OS.toUpperCase() },
            { label: "Storage", value: "100% Local (AsyncStorage)" },
            { label: "Network Required", value: "No" },
            { label: "Subscription", value: "None - Free Forever" },
            { label: "Email Queue", value: `${emailQueue.length} pending` },
            { label: "Features", value: `${features.filter(f => f.enabled).length}/${features.length} active` },
          ].map((item, i, arr) => (
            <View key={item.label} style={[styles.infoRow, i < arr.length - 1 && styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Data Management */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>DATA MANAGEMENT</Text>
        <View style={styles.card}>
          <Pressable
            onPress={() => Alert.alert("Clear Commands", "Clear all command logs?", [
              { text: "Cancel", style: "cancel" },
              { text: "Clear", style: "destructive", onPress: clearCommandLogs },
            ])}
            style={styles.dangerRow}
          >
            <Ionicons name="terminal-outline" size={18} color={Colors.danger} />
            <Text style={styles.dangerText}>Clear Command Logs</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
          </Pressable>
          <Pressable
            onPress={() => Alert.alert("Clear GPS", "Clear all GPS logs?", [
              { text: "Cancel", style: "cancel" },
              { text: "Clear", style: "destructive", onPress: clearGPSLogs },
            ])}
            style={styles.dangerRow}
          >
            <Ionicons name="location-outline" size={18} color={Colors.danger} />
            <Text style={styles.dangerText}>Clear GPS Logs</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textDim} />
          </Pressable>
        </View>

        {/* Hidden Admin Panel */}
        {!showAdmin && (
          <View style={styles.secretHint}>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.textDim} />
            <Text style={styles.secretHintText}>Tap the title {SECRET_TAPS} times to unlock Admin</Text>
          </View>
        )}

        {showAdmin && (
          <>
            <View style={styles.adminHeader}>
              <Ionicons name="shield-checkmark" size={20} color={Colors.warning} />
              <Text style={styles.adminTitle}>ADMIN PANEL</Text>
              <Pressable onPress={() => setShowAdmin(false)} style={styles.adminClose}>
                <Ionicons name="close" size={20} color={Colors.textDim} />
              </Pressable>
            </View>

            {/* Add Feature */}
            <Text style={styles.sectionLabel}>ADD NEW FEATURE</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.textInput}
                value={newFeatureName}
                onChangeText={setNewFeatureName}
                placeholder="Feature name"
                placeholderTextColor={Colors.textDim}
              />
              <TextInput
                style={[styles.textInput, { marginTop: 8 }]}
                value={newFeatureDesc}
                onChangeText={setNewFeatureDesc}
                placeholder="Description"
                placeholderTextColor={Colors.textDim}
              />
              <TextInput
                style={[styles.textInput, { marginTop: 8 }]}
                value={newFeatureCat}
                onChangeText={setNewFeatureCat}
                placeholder="Category (e.g. Sensors, UI, Network)"
                placeholderTextColor={Colors.textDim}
              />
              <Pressable onPress={addNewFeature} style={[styles.actionBtn, { backgroundColor: Colors.accent, marginTop: 12, alignSelf: "flex-start" }]}>
                <Ionicons name="add" size={16} color={Colors.bgDeep} />
                <Text style={[styles.actionBtnText, { color: Colors.bgDeep }]}>ADD FEATURE</Text>
              </Pressable>
            </View>

            {/* Feature List */}
            <Text style={[styles.sectionLabel, { marginTop: 16 }]}>ALL FEATURES ({features.length})</Text>
            <View style={{ gap: 8 }}>
              {features.map(f => (
                <AdminFeatureCard
                  key={f.id}
                  {...f}
                  onRemove={removeFeature}
                  onToggle={toggleFeature}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDeep },
  scroll: { padding: 16, gap: 0 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.warning + "20",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.warning + "40",
  },
  adminBadgeText: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 11,
    letterSpacing: 1.5,
    color: Colors.warning,
  },
  sectionLabel: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 11,
    letterSpacing: 3,
    color: Colors.textDim,
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    gap: 4,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  cardLabel: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 12,
    color: Colors.textDim,
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "Rajdhani_500Medium",
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
  },
  emailActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionBtnText: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 13,
    letterSpacing: 1.5,
    color: Colors.textPrimary,
  },
  emailSet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  emailSetText: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 12,
    color: Colors.success,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgBorder + "60",
  },
  infoLabel: {
    fontFamily: "Rajdhani_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  infoValue: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 13,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  dangerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgBorder + "40",
  },
  dangerText: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 14,
    color: Colors.danger,
    flex: 1,
    letterSpacing: 0.3,
  },
  secretHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 32,
    opacity: 0.5,
  },
  secretHintText: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 12,
    color: Colors.textDim,
    letterSpacing: 0.5,
  },
  adminHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 28,
    marginBottom: 16,
    padding: 14,
    backgroundColor: Colors.warning + "12",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning + "30",
  },
  adminTitle: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 16,
    letterSpacing: 3,
    color: Colors.warning,
    flex: 1,
  },
  adminClose: {
    padding: 4,
  },
  adminCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    gap: 8,
  },
  adminCardTop: {
    flexDirection: "row",
    gap: 10,
  },
  adminCardInfo: {
    flex: 1,
    gap: 3,
  },
  catBadge: {
    alignSelf: "flex-start",
    backgroundColor: Colors.bgElevated,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  catBadgeText: {
    fontFamily: "Rajdhani_500Medium",
    fontSize: 9,
    letterSpacing: 1.5,
    color: Colors.textDim,
  },
  adminCardName: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 15,
    color: Colors.textPrimary,
    letterSpacing: 0.3,
  },
  adminCardDesc: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 12,
    color: Colors.textSecondary,
  },
  adminCardActions: {
    alignItems: "center",
    gap: 8,
  },
  toggleChip: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
  },
  toggleChipText: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 11,
    letterSpacing: 1,
  },
  removeBtn: {
    padding: 6,
    backgroundColor: Colors.danger + "15",
    borderRadius: 8,
  },
  adminCardId: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 10,
    color: Colors.textDim,
    letterSpacing: 0.5,
  },
});
