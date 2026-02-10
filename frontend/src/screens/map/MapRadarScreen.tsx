import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

export default function MapRadarScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Map</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>GPS Map - TODO</Text>
        <Text style={styles.placeholderSubtext}>Implement location tracking here</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#007AFF',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 24, fontWeight: 'bold', color: '#007AFF' },
  placeholderSubtext: { fontSize: 16, color: '#666', marginTop: 10 },
});
