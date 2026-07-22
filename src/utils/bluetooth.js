import { BleClient } from '@capacitor-community/bluetooth-le';

const HEART_RATE_SERVICE = '0000180d-0000-1000-8000-00805f9b34fb';
const HEART_RATE_MEASUREMENT = '00002a37-0000-1000-8000-00805f9b34fb';

export function isPlausibleHeartRate(value) {
  return Number.isInteger(value) && value >= 30 && value <= 240;
}

/**
 * Connects to a Bluetooth Low Energy Heart Rate Monitor.
 * Requests the user to select a device broadcasting the Heart Rate Service.
 * @param {Function} onHeartRateUpdate Callback fired when a new BPM is received.
 * @param {Function} onDisconnect Callback fired when the device disconnects.
 * @returns {Promise<string>} The device ID of the connected monitor.
 */
export async function connectHeartRateMonitor(onHeartRateUpdate, onDisconnect) {
  try {
    // Initialize the BLE client (requests necessary permissions on Android/iOS)
    await BleClient.initialize();

    // Request device that broadcasts the HR service
    const device = await BleClient.requestDevice({
      services: [HEART_RATE_SERVICE],
    });

    // Connect to the device
    await BleClient.connect(device.deviceId, (disconnectedDeviceId) => {
      console.log(`Smartwatch disconnected: ${disconnectedDeviceId}`);
      if (onDisconnect) onDisconnect();
    });

    // Start receiving notifications
    await BleClient.startNotifications(
      device.deviceId,
      HEART_RATE_SERVICE,
      HEART_RATE_MEASUREMENT,
      (value) => {
        // Parse the characteristic value according to GATT specifications
        // Value is a DataView. The first byte contains flags.
        const flags = value.getUint8(0);
        // If the 0th bit is 0, heart rate format is 8-bit (UINT8)
        // If 1, format is 16-bit (UINT16)
        const is16BitFormat = flags & 0x01;
        
        let heartRate;
        if (is16BitFormat) {
          heartRate = value.getUint16(1, true); // true for little-endian
        } else {
          heartRate = value.getUint8(1);
        }
        
        if (isPlausibleHeartRate(heartRate)) {
          onHeartRateUpdate(heartRate);
        } else {
          console.warn('Ignoring implausible BPM:', heartRate);
        }
      }
    );
    
    return device.deviceId;
  } catch (error) {
    console.error("Bluetooth connection failed:", error);
    throw error;
  }
}

/**
 * Disconnects from the connected Heart Rate Monitor.
 * @param {string} deviceId The device ID to disconnect from.
 */
export async function disconnectHeartRateMonitor(deviceId) {
  if (!deviceId) return;
  try {
    await BleClient.disconnect(deviceId);
    console.log(`Disconnected from ${deviceId}`);
  } catch (error) {
    console.error("Failed to disconnect:", error);
  }
}
