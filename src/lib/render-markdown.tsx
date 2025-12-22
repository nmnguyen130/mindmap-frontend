import React from "react";
import { Platform, Text, TextStyle } from "react-native";

interface MarkdownColors {
  background: string;
}

/**
 * Simple inline markdown parser for chat messages.
 * Renders text with formatting as React Native Text elements.
 *
 * @param text - The markdown text to parse
 * @param baseStyle - Base text style to apply
 * @param colors - Colors for code background
 * @returns React nodes with formatted text
 *
 * Supports:
 * - `**bold**` → bold text
 * - `*italic*` → italic text
 * - `` `code` `` → inline code with monospace font
 */
export const renderMarkdown = (
  text: string,
  baseStyle: TextStyle,
  colors: MarkdownColors
): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(
        <Text key={key++} style={baseStyle}>
          {text.slice(lastIndex, match.index)}
        </Text>
      );
    }

    // Bold **text**
    if (match[2]) {
      parts.push(
        <Text key={key++} style={[baseStyle, { fontWeight: "700" }]}>
          {match[2]}
        </Text>
      );
    }
    // Italic *text*
    else if (match[3]) {
      parts.push(
        <Text key={key++} style={[baseStyle, { fontStyle: "italic" }]}>
          {match[3]}
        </Text>
      );
    }
    // Code `text`
    else if (match[4]) {
      parts.push(
        <Text
          key={key++}
          style={[
            baseStyle,
            {
              fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
              backgroundColor: colors.background,
              paddingHorizontal: 4,
              borderRadius: 3,
            },
          ]}
        >
          {match[4]}
        </Text>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(
      <Text key={key++} style={baseStyle}>
        {text.slice(lastIndex)}
      </Text>
    );
  }

  return parts.length > 0 ? parts : <Text style={baseStyle}>{text}</Text>;
};
