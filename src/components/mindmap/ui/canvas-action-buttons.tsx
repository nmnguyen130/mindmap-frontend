import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';

import { MindMapNode } from '@/stores/mindmaps';

interface CanvasActionButtonsProps {
  selectedNode: MindMapNode | null;
  onDeselect: () => void;
}

const CanvasActionButtons = ({
  selectedNode,
  onDeselect
}: CanvasActionButtonsProps) => {
  return (
    <View className="absolute bottom-5 left-5 right-5 flex-row justify-center">
      <TouchableOpacity
        className="bg-blue-600 px-4 py-2 rounded-lg min-w-20 items-center"
        onPress={onDeselect}
      >
        <Text className="text-white text-xs font-bold">Deselect</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CanvasActionButtons;
