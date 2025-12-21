import { MaterialIcons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { useTheme } from "@/components/providers/theme-provider";
import type { MindMapNode } from "@/features/mindmap";

interface AddNodeModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    id: string;
    label: string;
    parentId?: string;
    position: { x: number; y: number };
  }) => void;
  parentNode?: MindMapNode | null;
  suggestedPosition?: { x: number; y: number };
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
};

const AddNodeModal = ({
  visible,
  onClose,
  onSubmit,
  parentNode = null,
  suggestedPosition = { x: 0, y: 0 },
}: AddNodeModalProps) => {
  const { colors, isDark } = useTheme();
  const [label, setLabel] = useState("");
  const inputRef = useRef<TextInput>(null);

  const translateY = useSharedValue(300);
  const backdropOpacity = useSharedValue(0);

  // Animate in/out
  React.useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRING_CONFIG);
      backdropOpacity.value = withTiming(1, { duration: 200 });
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      translateY.value = withSpring(300, SPRING_CONFIG);
      backdropOpacity.value = withTiming(0, { duration: 150 });
      setLabel("");
    }
  }, [visible, translateY, backdropOpacity]);

  const handleSubmit = useCallback(() => {
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      Alert.alert("Error", "Please enter a label for the node.");
      return;
    }

    Keyboard.dismiss();
    onSubmit({
      id: Crypto.randomUUID(),
      label: trimmedLabel,
      parentId: parentNode?.id,
      position: suggestedPosition,
    });
    onClose();
  }, [label, parentNode, suggestedPosition, onSubmit, onClose]);

  const handleClose = useCallback(() => {
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* Modal */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.modal,
            modalStyle,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>
              Add Node
            </Text>
            <Pressable
              onPress={handleClose}
              style={[
                styles.closeButton,
                { backgroundColor: colors.secondary },
              ]}
            >
              <MaterialIcons
                name="close"
                size={18}
                color={colors.secondaryForeground}
              />
            </Pressable>
          </View>

          {/* Parent info */}
          {parentNode && (
            <View
              style={[
                styles.parentInfo,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <MaterialIcons
                name="account-tree"
                size={16}
                color={colors.primary}
              />
              <Text style={[styles.parentText, { color: colors.primary }]}>
                Child of: {parentNode.label}
              </Text>
            </View>
          )}

          {/* Input */}
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <MaterialIcons
              name="label-outline"
              size={20}
              color={colors.mutedForeground}
            />
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Enter node label..."
              placeholderTextColor={colors.mutedForeground}
              value={label}
              onChangeText={setLabel}
              onSubmitEditing={handleSubmit}
              returnKeyType="done"
              autoFocus
            />
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              style={[
                styles.button,
                styles.cancelButton,
                { backgroundColor: colors.secondary },
              ]}
            >
              <Text
                style={[
                  styles.buttonText,
                  { color: colors.secondaryForeground },
                ]}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              style={[
                styles.button,
                styles.submitButton,
                { backgroundColor: colors.primary },
              ]}
            >
              <MaterialIcons name="add" size={18} color="#ffffff" />
              <Text style={[styles.buttonText, { color: "#ffffff" }]}>
                Add Node
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modal: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  parentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  parentText: {
    fontSize: 13,
    fontWeight: "500",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  cancelButton: {},
  submitButton: {},
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});

export default AddNodeModal;
