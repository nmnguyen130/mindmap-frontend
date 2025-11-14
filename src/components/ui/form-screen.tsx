import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";

interface FormScreenProps {
  children: React.ReactNode;
}

const FormScreen = ({ children }: FormScreenProps) => {
  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1">{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default FormScreen;
