import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRIVE_DETECTION_TASK = 'DRIVE_DETECTION_TASK';
const DRIVE_COOLDOWN_KEY = 'last_drive_notification';

export type DriveMileageUpdatePayload = {
  type: 'drive_mileage_update';
};

// Define the background task (must be at module scope)
TaskManager.defineTask(DRIVE_DETECTION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[DriveDetection] Error:', error);
    return;
  }

  if (!data) return;

  const { locations } = data as { locations?: Location.LocationObject[] };
  if (!locations || locations.length === 0) return;

  try {

    // Cooldown: don't send more than one notification per 30 minutes
    const lastNotifRaw = await AsyncStorage.getItem(DRIVE_COOLDOWN_KEY);
    const now = Date.now();

    if (lastNotifRaw) {
      const lastNotif = Number.parseInt(lastNotifRaw, 10);
      if (!Number.isNaN(lastNotif) && now - lastNotif < 30 * 60 * 1000) {
        return;
      }
    }

    // Schedule a notification after a short delay (user likely parked)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Just finished a drive?',
        body: 'Tap to update your mileage and keep your maintenance on track.',
        data: { type: 'drive_mileage_update' } satisfies DriveMileageUpdatePayload,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 300,
      },
    });

    await AsyncStorage.setItem(DRIVE_COOLDOWN_KEY, now.toString());
  } catch (e) {
    console.error('[DriveDetection] Failed scheduling notification:', e);
  }
});

export async function startDriveDetection(): Promise<boolean> {
  try {
    const { status: foreground } = await Location.requestForegroundPermissionsAsync();
    if (foreground !== 'granted') return false;

    const { status: background } = await Location.requestBackgroundPermissionsAsync();
    if (background !== 'granted') return false;

    const isRegistered = await TaskManager.isTaskRegisteredAsync(DRIVE_DETECTION_TASK);
    if (isRegistered) return true;

    // Battery friendly: fires on significant movement (not continuous GPS)
    await Location.startLocationUpdatesAsync(DRIVE_DETECTION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 500, // meters
      deferredUpdatesInterval: 60_000,
      activityType: Location.ActivityType.AutomotiveNavigation,
      pausesUpdatesAutomatically: true, // iOS pauses when stationary
      showsBackgroundLocationIndicator: false,
    });

    return true;
  } catch (e) {
    console.error('[DriveDetection] Failed to start:', e);
    return false;
  }
}

export async function stopDriveDetection(): Promise<void> {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(DRIVE_DETECTION_TASK);
    if (isRegistered) {
      await Location.stopLocationUpdatesAsync(DRIVE_DETECTION_TASK);
    }
  } catch (e) {
    console.error('[DriveDetection] Failed to stop:', e);
  }
}

export async function isDriveDetectionActive(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(DRIVE_DETECTION_TASK);
  } catch {
    return false;
  }
}

