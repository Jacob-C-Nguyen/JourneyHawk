import { Text, View, Button } from "react-native";
import MapView, { Marker } from "react-native-maps"

export default function map() {
    // DO NOT USE expo-maps
    // use react-native-maps for map gui
    // use expo-location to get user location -> must ask for permission in app
        // getting location consumes battery so need to optimize with delays and not continuous
        // will need a lot of functions

    return (
        <View style={{flex: 1}}>

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