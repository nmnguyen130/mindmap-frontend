import { Platform } from "react-native";
import { matchFont } from "@shopify/react-native-skia";

const MIN_WIDTH = 80;
const MIN_HEIGHT = 32;
const PADDING = 12;
const FONT_SIZE = 12;

const fontStyle = {
  fontFamily: Platform.OS === "ios" ? "Helvetica" : "sans-serif",
  fontSize: FONT_SIZE,
};

const font = matchFont(fontStyle);

export interface NodeDimensions {
  width: number;
  height: number;
  textWidth: number;
  textHeight: number;
}

export interface NodeBox {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Calculate node dimensions based on text content
 */
export function calculateNodeDimensions(text: string): NodeDimensions {
  if (!text) {
    return {
      width: MIN_WIDTH,
      height: MIN_HEIGHT,
      textWidth: 0,
      textHeight: FONT_SIZE,
    };
  }

  const textMetrics = font.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = FONT_SIZE; // Approximate line height

  const nodeWidth = Math.max(MIN_WIDTH, textWidth + PADDING * 2);
  const nodeHeight = Math.max(MIN_HEIGHT, textHeight + PADDING * 2);

  return {
    width: nodeWidth,
    height: nodeHeight,
    textWidth,
    textHeight,
  };
}

/**
 * Calculate node bounding box based on position and dimensions
 */
export function calculateNodeBox(
  position: { x: number; y: number },
  dimensions: NodeDimensions
): NodeBox {
  const { width, height } = dimensions;
  const { x, y } = position;

  return {
    left: x - width / 2,
    right: x + width / 2,
    top: y - height / 2,
    bottom: y + height / 2,
  };
}

/**
 * Calculate complete node box from node data
 */
export function getNodeBox(node: { text: string; position: { x: number; y: number } }): NodeBox {
  return calculateNodeBoxFromText(node.text, node.position);
}

/**
 * Calculate complete node box from text and position
 */
export function calculateNodeBoxFromText(
  text: string,
  position: { x: number; y: number }
): NodeBox {
  const dimensions = calculateNodeDimensions(text);
  return calculateNodeBox(position, dimensions);
}
