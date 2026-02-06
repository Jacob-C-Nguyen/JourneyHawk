import { Text, View, Button } from "react-native";
import MapView, { Marker } from "react-native-maps"
import * as Location from 'expo-location';
import { useEffect, useState } from "react";
// package links
// user location https://docs.expo.dev/versions/latest/sdk/location/
// map https://docs.expo.dev/versions/latest/sdk/map-view/

export default function map() {
    // DO NOT USE expo-maps
    // use react-native-maps for map gui
    // use expo-location to get user location -> must ask for permission in app
        // getting location consumes battery so need to optimize with delays and not continuous
        // will need a lot of functions
    
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    
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

    let userLocation = 'Waiting...';
    if (errorMsg) {
        userLocation = errorMsg;
    } else if (location) {
        userLocation = JSON.stringify(location);
    }

    return (
        <View style={{flex: 1}}>
            <Text>{userLocation}</Text>

            <MapView
            style={{width: "100%", height: "100%"}}
            initialRegion={{
                // we will get lat and long values from user location + buffer
                latitude: 37.78825,
                longitude: -122.4324,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }}>

                <Marker
                coordinate={{ latitude: 37.78825, longitude: -122.4324 }}
                title="Hello"
                />
            </MapView>

        </View>
    )
}