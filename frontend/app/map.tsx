import { useEffect, useState } from "react";
import { View } from "react-native";
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

export default function Map() {
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

    let locationText = 'Waiting...';
    let userLatitude = 0
    let userLongitude = 0
    if (errorMsg) {
        locationText = errorMsg;
    } else if (location) {
        userLatitude = location!.coords.latitude
        userLongitude = location!.coords.longitude
    }

    return (
        <View style={{flex: 1}}>

            <MapView
            style={{width: "100%", height: "100%"}}
            initialRegion={{
                latitude: userLatitude,
                longitude: userLongitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            }}>

                <Marker
                coordinate={{ latitude: userLatitude, longitude: userLongitude }}
                title="User" // change to name or account type?
                />
            </MapView>

        </View>
    )
}