import React, { useState } from "react";
import { Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

import { MindMapNode, useMindMapStore } from "@/stores/mindmaps";

const StoreManagerScreen = () => {
  const { createMap, loadMaps, maps, isLoading, error, deleteMap } = useMindMapStore();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addLog = (message: string) => {
    console.log("STORE:", message);
    setTestResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const createTestMindMap = async () => {
    try {
      addLog("Creating test mind map...");

      const timestamp = Date.now();
      const testNodes: MindMapNode[] = [
        {
          id: `node1-${timestamp}`,
          text: "Main Topic",
          position: { x: 100, y: 100 },
          connections: [`node2-${timestamp}`, `node3-${timestamp}`],
        },
        {
          id: `node2-${timestamp}`,
          text: "Sub Topic 1",
          position: { x: 200, y: 50 },
          connections: [`node4-${timestamp}`],
        },
        {
          id: `node3-${timestamp}`,
          text: "Sub Topic 2",
          position: { x: 200, y: 150 },
          connections: [],
        },
        {
          id: `node4-${timestamp}`,
          text: "Detail Topic",
          position: { x: 300, y: 50 },
          connections: [],
        },
      ];

      const newMap = await createMap({
        title: "Test Mind Map",
        nodes: testNodes,
      });

      // Verify the data was saved - createMap already adds to local state
      // Just check that the returned map has the expected data
      if (newMap.nodes.length === 4) {
        const totalConnections = newMap.nodes.reduce(
          (acc, node) => acc + node.connections.length,
          0
        );
        addLog(
          `Created: ${newMap.nodes.length} nodes, ${totalConnections} connections`
        );

        // Also test database persistence by reloading after a delay
        setTimeout(() => {
          loadMaps()
            .then(() => {
              // Get the current state from Zustand directly (not from React hook)
              const currentState = useMindMapStore.getState();
              const persistedMap = currentState.maps.find(
                (m) => m.id === newMap.id
              );
              if (persistedMap && persistedMap.nodes.length === 4) {
                addLog("Database persistence verified");
              } else {
                addLog("Database persistence failed");
                addLog(`Found ${currentState.maps.length} maps in state`);
                currentState.maps.forEach((m) =>
                  addLog(`Map: ${m.nodes.length} nodes`)
                );
              }
            })
            .catch((error) => {
              addLog(
                `Persistence check error: ${error instanceof Error ? error.message : String(error)}`
              );
            });
        }, 1000); // Wait 1 second for database operations to complete
      } else {
        addLog("Creation verification failed");
      }
    } catch (error) {
      addLog(
        `Create failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const updateTestMindMap = async () => {
    if (maps.length === 0) {
      addLog("No mind maps found to update");
      return;
    }

    try {
      addLog("Updating first mind map...");
      const mapToUpdate = maps[0];

      // Add a new node and modify connections to test the diff algorithm
      const timestamp = Date.now();
      const updatedNodes = [...mapToUpdate.nodes];
      updatedNodes.push({
        id: `node5-${timestamp}`,
        text: "New Node Added via Update",
        position: { x: 150, y: 200 },
        connections: [`${updatedNodes[0]?.id}`], // Connect to main topic
      });

      // Modify existing connections - remove one, add another
      if (updatedNodes[0]) {
        // Main topic
        const mainNode = updatedNodes[0];
        // Remove connection to second node, add connection to new node
        const secondNodeId = updatedNodes[1]?.id;
        const newNodeId = `node5-${timestamp}`;

        const currentConnections = mainNode.connections || [];
        mainNode.connections = currentConnections
          .filter((id) => id !== secondNodeId) // Remove connection to second node
          .concat(newNodeId); // Add connection to new node
      }

      const { updateMap } = useMindMapStore.getState();
      await updateMap(mapToUpdate.id, {
        ...mapToUpdate,
        nodes: updatedNodes,
      });

      addLog("Update completed");
    } catch (error) {
      addLog(
        `Error updating mind map: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const clearLogs = () => {
    setTestResults([]);
  };

  const handleViewDatabaseData = async () => {
    try {
      await loadMaps();

      addLog(`Database contains ${maps.length} mind maps:`);

      maps.forEach((map, index) => {
        const totalConnections = map.nodes.reduce(
          (acc, node) => acc + node.connections.length,
          0
        );
        addLog(`  ${index + 1}. "${map.title}" (ID: ${map.id})`);
        addLog(
          `     ${map.nodes.length} nodes, ${totalConnections} connections`
        );

        map.nodes.forEach((node) => {
          addLog(`       - ${node.id}: "${node.text}"`);
          if (node.connections.length > 0) {
            addLog(`         Connected to: ${node.connections.join(", ")}`);
          }
        });
        addLog(""); // Empty line between maps
      });

      if (maps.length === 0) {
        addLog("Database is empty");
      }
    } catch (error) {
      addLog(
        `Failed to load: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  };

  const handleDeleteMindMap = async () => {
    if (maps.length === 0) {
      addLog("No mind maps to delete");
      return;
    }

    // Ensure async context for Alert to work properly
    await Promise.resolve();

    // Show alert with mind map options
    const options = maps.map(
      (map) => `${map.title} (${map.nodes.length} nodes)`
    );
    options.push("Cancel");

    Alert.alert(
      "Delete Mind Map",
      "Select a mind map to delete:",
      options.map((option, index) => ({
        text: option,
        style: option === "Cancel" ? "cancel" : "destructive",
        onPress: async () => {
          if (option === "Cancel") return;

          try {
            const mapToDelete = maps[index];
            addLog(`Deleting mind map: ${mapToDelete.title}`);
            await deleteMap(mapToDelete.id);
            addLog("Mind map deleted successfully");
            await loadMaps(); // Refresh the list
          } catch (error) {
            addLog(
              `Delete failed: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        },
      }))
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-gray-900">
      <View className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Text className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Mind Map Store Manager
        </Text>
        <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage mind maps in SQLite database
        </Text>
      </View>

      <View className="p-4">
        {/* First row: 3 buttons */}
        <View className="flex-row justify-between mb-3">
          <TouchableOpacity
            className="bg-blue-600 p-3 rounded-lg flex-1 mr-2"
            onPress={() => void createTestMindMap()}
            disabled={isLoading}
          >
            <Text className="text-white text-center font-semibold text-sm">
              Create Test Mind Map
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-green-600 p-3 rounded-lg flex-1 mr-2"
            onPress={() => void updateTestMindMap()}
            disabled={isLoading || maps.length === 0}
          >
            <Text className="text-white text-center font-semibold text-sm">
              Update First Mind Map
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-indigo-600 p-3 rounded-lg flex-1"
            onPress={() => void handleViewDatabaseData()}
            disabled={isLoading}
          >
            <Text className="text-white text-center font-semibold text-sm">
              View Database Data
            </Text>
          </TouchableOpacity>
        </View>

        {/* Second row: 2 buttons */}
        <View className="flex-row justify-between">
          <TouchableOpacity
            className="bg-red-600 p-3 rounded-lg flex-1 mr-2"
            onPress={() => void handleDeleteMindMap()}
            disabled={isLoading || maps.length === 0}
          >
            <Text className="text-white text-center font-semibold text-sm">
              Delete Mind Map
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-gray-600 p-3 rounded-lg flex-1"
            onPress={() => clearLogs()}
          >
            <Text className="text-white text-center font-semibold text-sm">
              Clear Logs
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View className="bg-red-100 dark:bg-red-900 p-3 rounded-lg">
            <Text className="text-red-800 dark:text-red-200">
              Error: {error}
            </Text>
          </View>
        )}
      </View>

      <ScrollView className="flex-1 p-2">
        <Text className="text-base font-semibold mb-2 text-gray-900 dark:text-gray-100">
          Manager Logs ({testResults.length})
        </Text>
        {testResults.map((result, index) => (
          <Text
            key={index}
            className="text-xs font-mono mb-1 text-gray-700 dark:text-gray-300 leading-tight"
          >
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

export default StoreManagerScreen;
