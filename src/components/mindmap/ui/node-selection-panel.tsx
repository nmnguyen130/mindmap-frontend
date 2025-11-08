import React from 'react';
import { View, Text } from 'react-native';

import { MindMapNode } from '@/stores/mindmaps';
import { getNodeBox } from '@/utils/node-utils';

interface NodeSelectionPanelProps {
  selectedNode: MindMapNode | null;
}

const InfoText = ({ label, value, children }: { label?: string; value?: string; children?: React.ReactNode }) => (
  <Text className="text-gray-300 text-xs font-mono mb-0.5">
    {label ? `${label}: ` : ''}
    {value ?? children}
  </Text>
);

const NodeSelectionPanel  = ({ selectedNode }: NodeSelectionPanelProps) => {
  if (!selectedNode) return null;

  const box = getNodeBox(selectedNode);

  return (
    <View className="absolute top-2 right-2 bg-black/80 p-3 rounded-lg min-w-48">
      <Text className="text-white text-xs font-bold mb-1">Selected Node Info:</Text>
      <InfoText label="Text" value={selectedNode.text} />
      <InfoText label="Position" value={`(${selectedNode.position.x}, ${selectedNode.position.y})`} />
      <InfoText label="Connections" value={selectedNode.connections.length.toString()} />

      <Text className="text-white text-xs font-bold mb-1">Bounding Box:</Text>
      <InfoText label="Left" value={box.left.toFixed(1)} />
      <InfoText label="Right" value={box.right.toFixed(1)} />
      <InfoText label="Top" value={box.top.toFixed(1)} />
      <InfoText label="Bottom" value={box.bottom.toFixed(1)} />
      <InfoText label="Width" value={(box.right - box.left).toFixed(1)} />
      <InfoText label="Height" value={(box.bottom - box.top).toFixed(1)} />
    </View>
  );
};

export default NodeSelectionPanel;
