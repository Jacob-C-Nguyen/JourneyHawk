// bleService.js
// Handles all BLE scanning

import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';

let manager = null;
try {
  manager = new BleManager();
} catch (_) {};

const seenPackets = new Map();
const EXPIRATION_MS = 10000;

let cleanupInterval = null;

function isDuplicate(nodeId, seq) {
  const key = `${nodeId}_${seq}`;

  if (seenPackets.has(key)) return true;

  seenPackets.set(key, Date.now());
  return false;
}

function cleanupSeen() {
  const now = Date.now();

  for (const [key, timestamp] of seenPackets.entries()) {
    if (now - timestamp > EXPIRATION_MS) {
      seenPackets.delete(key);
    }
  }
}

export const scan = (onData, ROOM_ID) => {
  if (!manager) return;

  if (!cleanupInterval) {
    cleanupInterval = setInterval(cleanupSeen, 5000);
  }

  manager.startDeviceScan(
    null,
    { allowDuplicates: true },
    (error, device) => {
      if (error) {
        console.log("BLE ERROR:", error);
        return;
      }

      if (!device.manufacturerData) return;

      try {
        const raw = Buffer.from(device.manufacturerData, 'base64');

        if (raw.length !== 24) return;

        // header check
        if (raw[0] !== 0xAB || raw[1] !== 0xCD) return;

        // Packet structure: !BBIIIiiBB
        const userId = raw.readUInt32BE(2);
        const nodeId = raw.readUInt32BE(6);
        const roomId = raw.readUInt32BE(10);
        const latRaw = raw.readInt32BE(14);
        const lonRaw = raw.readInt32BE(18);
        const ttl = raw.readUInt8(22);
        const seq = raw.readUInt8(23);

        if (isDuplicate(nodeId, seq)) {
          //console.log("DROPPED DUPLICATE:", nodeId, seq);
          return;
        }

        const lat = latRaw / 1e6;
        const lon = lonRaw / 1e6;

        const PHONE_ROOM_ID_INT = parseInt(ROOM_ID, 16);

        if (roomId !== PHONE_ROOM_ID_INT) {
          console.log("ROOM MISMATCH:", roomId, "expected:", ROOM_ID);
          return;
        }

        onData({
          userId,
          nodeId,
          latitude: lat,
          longitude: lon,
          ttl,
          seq,
        });

      } catch (e) {
        console.log("DECODE ERROR:", e);
      }
    }
  );
};

export const stop = () => {
  if (!manager) return;
  manager.stopDeviceScan();
};

export default {
  scan,
  stop,
};
