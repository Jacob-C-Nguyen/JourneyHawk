import { router } from "expo-router";
import { Button, Text, View } from "react-native";
import { useEffect, useState } from "react";
import { checkHealth } from "../services/api";

export default function Index() {

  const [healthMessage, setHealthMessage] = useState("Checking backend...");

  useEffect(() => {
    async function testBackend() {
      try {
        const data = await checkHealth();
        setHealthMessage(data.message);
      } catch (err) {
        setHealthMessage("❌ Cannot reach backend");
      }
    }

    testBackend();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>

      <Text style={{ marginTop: 20 }}>
        Backend status: {healthMessage}
      </Text>

      <Button
        title="Map Page"
        onPress={() => router.push("/map")}
      />
    </View>
  );
}