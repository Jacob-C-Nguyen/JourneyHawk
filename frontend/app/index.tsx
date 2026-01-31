import { Text, View, Button } from "react-native";
import { router } from "expo-router"

export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Edit app/index.tsx to edit this screen.</Text>

      {/* temp routing */}
      <Button
        title="Go to Map page"
        onPress={() => router.push("/map")}
      />
    </View>
  );
}
