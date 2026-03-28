import { BleManager } from 'react-native-ble-plx';
import { Platform, PermissionsAndroid } from 'react-native';
import { Buffer } from 'buffer';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig.extra.apiUrl;

const manager = new BleManager();

const SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const TX_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

class BLEService {
  device = null;
  isScanning = false;
  scanTimeout = null;

  async requestPermissions() {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
    }
  }

  scanAndConnect(onData) {
    if (this.isScanning) {
      console.log("⚠️ Already scanning");
      return;
    }

    console.log("🔍 Starting BLE scan...");
    this.isScanning = true;

    manager.startDeviceScan(null, null, async (error, device) => {
      if (error) {
        console.log("❌ Scan error:", error);
        this.stopScan();
        return;
      }

      // 🔥 Show ALL devices (for debugging)
      console.log("👀 Found device:", device?.name);

      // ✅ Looser match (VERY important)
      if (device?.name && device.name.toLowerCase().includes("pico")) {
        console.log("✅ Found Pico:", device.name);

        this.stopScan();

        try {
          this.device = await device.connect();
          await this.device.discoverAllServicesAndCharacteristics();

          console.log("🔗 Connected to Pico");

          this.device.monitorCharacteristicForService(
            SERVICE_UUID,
            TX_UUID,
            (error, characteristic) => {
              if (error) {
                console.log("❌ Monitor error:", error);
                return;
              }

              if (characteristic?.value) {
                const decoded = Buffer.from(
                  characteristic.value,
                  'base64'
                ).toString('utf-8');

                console.log("📡 Received:", decoded);

                if (onData) onData(decoded);
              }
            }
          );

        } catch (err) {
          console.log("❌ Connection error:", err);
        }
      }
    });

    // 🧊 STOP SCAN AFTER 5 SECONDS (prevents overheating)
    this.scanTimeout = setTimeout(() => {
      console.log("⏹️ Scan timeout");
      this.stopScan();
    }, 5000);
  }

  stopScan() {
    if (this.isScanning) {
      console.log("🛑 Stopping scan");
      manager.stopDeviceScan();
      this.isScanning = false;
    }

    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }
  }

  disconnect() {
    console.log("🔌 Disconnecting BLE");

    this.stopScan();

    if (this.device) {
      this.device.cancelConnection();
      this.device = null;
    }
  }
}

export default new BLEService();