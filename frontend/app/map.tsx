import { Platform, View, Text } from "react-native";

export default function Map() {

  // Web fallback
  if (Platform.OS === "web") {
    return (
      <View style={{ flex:1, justifyContent:"center", alignItems:"center" }}>
        <Text>Map only works on mobile.</Text>
      </View>
    );
  }

  // Only load NativeMap on mobile
  const NativeMap = require("../components/NativeMap").default;

  return <NativeMap />;
}