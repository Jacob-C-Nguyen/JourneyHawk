import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Text, Pressable, Platform } from "react-native";
import * as Location from "expo-location";

let MapView: any;
let Marker: any;

if (Platform.OS !== "web") {
  const maps = require("react-native-maps");
  MapView = maps.default;
  Marker = maps.Marker;
}

export default function Map() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    }

    getCurrentLocation();
  }, []);

  async function updateLocation() {
    const loc = await Location.getCurrentPositionAsync({});
    setLocation(loc);

    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    }
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.page}>
        <Text>Maps are only available on mobile.</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.page}>
        <Text>{errorMsg}</Text>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={styles.page}>
        <Text>Waiting...</Text>
      </View>
    );
  }

  const { latitude, longitude } = location.coords;

  return (
    <View style={styles.page}>
      
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{ latitude, longitude }}
            title="User"
          />
        </MapView>
      </View>

      <Pressable
        onPress={updateLocation}
        style={({ pressed }) => [
          styles.btn,
          pressed && styles.btnPressed,
        ]}
      >
        <Text style={styles.btnText}>Update Location</Text>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },

  mapContainer: {
    flex: 1,
  },

  map: {
    flex: 1,
  },

  btn: {
    paddingVertical: 20,
    backgroundColor: "grey",
    alignItems: "center",
    justifyContent: "center",
  },

  btnText: {
    fontSize: 16,
    color: "white",
  },

  btnPressed: {
    opacity: 0.6,
  },
});