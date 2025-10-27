import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useCounterStore } from '../stores/counter';

export default function TestCounter() {
  const { count, increment, decrement } = useCounterStore();

  return (
    <View className="flex-1 justify-center items-center bg-gray-100">
      <Text className="text-2xl font-bold text-blue-600 mb-4">Counter: {count}</Text>
      <View className="flex-row">
        <TouchableOpacity
          onPress={decrement}
          className="bg-red-500 px-4 py-2 rounded mr-2"
        >
          <Text className="text-white font-semibold">Decrement</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={increment}
          className="bg-green-500 px-4 py-2 rounded"
        >
          <Text className="text-white font-semibold">Increment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
