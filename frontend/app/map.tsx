import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

export default function Map() {
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const mapRef = useRef<MapView | null>(null);
    
    useEffect(() => {
        async function getCurrentLocation() {
        
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            setErrorMsg('Permission to access location was denied');
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

            <MapView
            style={styles.map}
            initialRegion={{
                latitude: latitude,
                longitude: longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }}>

                <Marker
                coordinate={{ latitude: latitude, longitude: longitude }}
                title="User" // change to name or account type?
                />
            </MapView>

            <Pressable
            onPress={updateLocation}
            style={({ pressed }) => [
                styles.btn,
                pressed && styles.btnPressed,
            ]}>
                <Text style={{textAlign: 'center'}}>Update Location</Text>
            </Pressable>

        </View>
    )
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        paddingHorizontal: 15,
    },
    map: {
        width: "100%",
        height: "75%",
        paddingVertical: 15,
    },
    btn: {
        paddingVertical: 25,
        backgroundColor: 'grey',
    },
    btnPressed: {
        opacity: 0.5
    }
})