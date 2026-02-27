import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSequence } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Colors } from "@/constants/colors";
import { useApp, Feature } from "@/context/AppContext";

type CommandResult = {
  success: boolean;
  message: string;
  data?: any;
};

function processCommand(
  input: string,
  features: Feature[],
  actions: {
    toggleFeature: (id: string) => void;
    addFeature: (name: string, desc: string, cat: string) => void;
    removeFeature: (id: string) => void;
    clearCommandLogs: () => void;
    clearGPSLogs: () => void;
    addEmailQueue: (sub: string, body: string) => void;
    emailAddress: string;
  }
): CommandResult {
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1);

  switch (cmd) {
    case "help":
      return {
        success: true,
        message: `Available commands:\n  help — show this list\n  list — list all features\n  enable <id> — enable feature\n  disable <id> — disable feature\n  add <name> | <desc> | <category> — add feature\n  remove <id> — remove feature\n  status — system status\n  clear-logs — clear command logs\n  clear-gps — clear GPS logs\n  sync-email — queue data for email sync\n  version — app version`,
      };

    case "list":
      if (features.length === 0) return { success: true, message: "No features registered." };
      const featureList = features
        .map(f => `  [${f.enabled ? "ON " : "OFF"}] ${f.id} — ${f.name} (${f.category})`)
        .join("\n");
      return { success: true, message: `Features (${features.length}):\n${featureList}` };

    case "enable": {
      const id = args[0];
      if (!id) return { success: false, message: "Usage: enable <feature-id>" };
      const f = features.find(x => x.id === id || x.name.toLowerCase() === args.join(" ").toLowerCase());
      if (!f) return { success: false, message: `Feature not found: ${id}` };
      if (f.enabled) return { success: true, message: `${f.name} is already enabled.` };
      actions.toggleFeature(f.id);
      return { success: true, message: `Enabled: ${f.name}` };
    }

    case "disable": {
      const id = args[0];
      if (!id) return { success: false, message: "Usage: disable <feature-id>" };
      const f = features.find(x => x.id === id || x.name.toLowerCase() === args.join(" ").toLowerCase());
      if (!f) return { success: false, message: `Feature not found: ${id}` };
      if (!f.enabled) return { success: true, message: `${f.name} is already disabled.` };
      actions.toggleFeature(f.id);
      return { success: true, message: `Disabled: ${f.name}` };
    }

    case "add": {
      const full = args.join(" ");
      const splits = full.split("|").map(s => s.trim());
      if (splits.length < 2) return { success: false, message: "Usage: add <name> | <description> | <category>" };
      const [name, desc, cat = "Custom"] = splits;
      if (!name || !desc) return { success: false, message: "Name and description are required." };
      actions.addFeature(name, desc, cat);
      return { success: true, message: `Feature added: ${name} [${cat}]` };
    }

    case "remove": {
      const id = args[0];
      if (!id) return { success: false, message: "Usage: remove <feature-id>" };
      const f = features.find(x => x.id === id);
      if (!f) return { success: false, message: `Feature not found: ${id}` };
      actions.removeFeature(f.id);
      return { success: true, message: `Removed: ${f.name}` };
    }

    case "status": {
      const enabled = features.filter(f => f.enabled).length;
      return {
        success: true,
        message: `System Status:\n  Features: ${enabled}/${features.length} active\n  Email: ${actions.emailAddress || "not configured"}\n  Platform: ${Platform.OS}\n  Version: 1.0.0`,
      };
    }

    case "clear-logs":
      actions.clearCommandLogs();
      return { success: true, message: "Command logs cleared." };

    case "clear-gps":
      actions.clearGPSLogs();
      return { success: true, message: "GPS logs cleared." };

    case "sync-email": {
      if (!actions.emailAddress) return { success: false, message: "No email configured. Set it in Settings first." };
      actions.addEmailQueue(
        "Rubel Engine Data Sync",
        `Sync request at ${new Date().toLocaleString()}\nFeatures: ${features.filter(f => f.enabled).map(f => f.name).join(", ")}`
      );
      return { success: true, message: `Email queued for: ${actions.emailAddress}` };
    }

    case "version":
      return { success: true, message: "Rubel Engine v1.0.0\nBuilt with Expo React Native\n100% offline-capable" };

    case "":
      return { success: false, message: "No command entered. Type 'help' for options." };

    default:
      return { success: false, message: `Unknown command: '${cmd}'. Type 'help' for available commands.` };
  }
}

interface LogEntryProps {
  item: {
    id: string;
    command: string;
    result: string;
    type: "success" | "error" | "info";
    timestamp: string;
  };
}

function LogEntry({ item }: LogEntryProps) {
  const color = item.type === "success" ? Colors.success : item.type === "error" ? Colors.danger : Colors.textSecondary;
  const ts = new Date(item.timestamp).toLocaleTimeString();

  return (
    <View style={styles.logEntry}>
      <View style={styles.logCommand}>
        <Text style={styles.logPrompt}>{">"}</Text>
        <Text style={styles.logCommandText}>{item.command}</Text>
        <Text style={styles.logTime}>{ts}</Text>
      </View>
      <Text style={[styles.logResult, { color }]}>{item.result}</Text>
    </View>
  );
}

const SUGGESTIONS = ["help", "list", "status", "enable ", "disable ", "add  |  | Custom", "sync-email", "clear-logs"];

export default function CommandScreen() {
  const insets = useSafeAreaInsets();
  const { features, commandLogs, toggleFeature, addFeature, removeFeature, clearCommandLogs, clearGPSLogs, addEmailQueue, addCommandLog, emailAddress } = useApp();
  const [input, setInput] = useState("");
  const inputRef = useRef<TextInput>(null);
  const shakeX = useSharedValue(0);

  const headerPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  const runCommand = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = processCommand(trimmed, features, {
      toggleFeature, addFeature, removeFeature, clearCommandLogs, clearGPSLogs, addEmailQueue, emailAddress
    });
    addCommandLog(trimmed, result.message, result.success ? "success" : "error");
    if (!result.success) {
      shakeX.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withTiming(8, { duration: 60 }),
        withTiming(-4, { duration: 60 }),
        withTiming(0, { duration: 60 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setInput("");
  };

  const applySuggestion = (s: string) => {
    setInput(s);
    inputRef.current?.focus();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: headerPad }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>RUBEL ENGINE</Text>
          <Text style={styles.headerTitle}>COMMAND CENTER</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: Colors.accent + "20" }]}>
          <Text style={[styles.badgeText, { color: Colors.accent }]}>{commandLogs.length} logs</Text>
        </View>
      </View>

      {/* Suggestions */}
      <FlatList
        horizontal
        data={SUGGESTIONS}
        keyExtractor={(s, i) => i.toString()}
        showsHorizontalScrollIndicator={false}
        style={styles.suggestionList}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => applySuggestion(item)} style={styles.suggChip}>
            <Text style={styles.suggText}>{item}</Text>
          </Pressable>
        )}
      />

      {/* Log List */}
      <FlatList
        data={commandLogs}
        keyExtractor={item => item.id}
        inverted
        scrollEnabled={!!commandLogs.length}
        style={styles.logList}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <View style={styles.emptyLog}>
            <Ionicons name="terminal-outline" size={40} color={Colors.textDim} />
            <Text style={styles.emptyLogText}>Type a command below</Text>
            <Text style={styles.emptyLogSub}>Try 'help' to get started</Text>
          </View>
        }
        renderItem={({ item }) => <LogEntry item={item} />}
      />

      {/* Input */}
      <Animated.View style={[styles.inputBar, shakeStyle, { paddingBottom: bottomPad + 16 }]}>
        <View style={styles.inputRow}>
          <Text style={styles.prompt}>{">"}</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={runCommand}
            placeholder="enter command..."
            placeholderTextColor={Colors.textDim}
            returnKeyType="send"
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
          <Pressable
            onPress={runCommand}
            style={({ pressed }) => [styles.sendBtn, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="arrow-forward-circle" size={32} color={Colors.accent} />
          </Pressable>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
  },
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
  badge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  suggestionList: {
    maxHeight: 40,
    marginBottom: 4,
  },
  suggChip: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  suggText: {
    fontFamily: "Rajdhani_500Medium",
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  logList: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    marginHorizontal: 0,
  },
  logEntry: {
    marginBottom: 4,
    gap: 4,
  },
  logCommand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logPrompt: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 14,
    color: Colors.accent,
  },
  logCommandText: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
    letterSpacing: 0.3,
  },
  logTime: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 11,
    color: Colors.textDim,
  },
  logResult: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 16,
  },
  emptyLog: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyLogText: {
    fontFamily: "Rajdhani_600SemiBold",
    fontSize: 16,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  emptyLogSub: {
    fontFamily: "Rajdhani_400Regular",
    fontSize: 13,
    color: Colors.textDim,
  },
  inputBar: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.bgBorder,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.bgElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.bgBorder,
  },
  prompt: {
    fontFamily: "Rajdhani_700Bold",
    fontSize: 18,
    color: Colors.accent,
  },
  input: {
    flex: 1,
    fontFamily: "Rajdhani_500Medium",
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 12,
    letterSpacing: 0.3,
  },
  sendBtn: {
    padding: 4,
  },
});
