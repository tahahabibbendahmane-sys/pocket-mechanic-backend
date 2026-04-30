import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const wrenchyMessages = {
  oil_warning: (vehicleName: string) => [
    {
      title: 'Heads up, ' + vehicleName + ' 🔧',
      body:
        "You're getting close to your oil change. Don't wait too long — dirty oil is just liquid regret.",
    },
    {
      title: 'Oil change coming up',
      body: `Your ${vehicleName} is almost due for an oil change. Wrenchy's watching out for you.`,
    },
  ],
  oil_overdue: (vehicleName: string) => [
    {
      title: 'Uh oh. Oil change overdue ⚠️',
      body: `Your ${vehicleName} needs an oil change now. Every km you drive is wearing your engine faster.`,
    },
    {
      title: 'Seriously though — oil change time',
      body: `${vehicleName} is past due. Wrenchy's not trying to nag, but your engine is.`,
    },
  ],
  tire_warning: (vehicleName: string) => [
    {
      title: 'Tire rotation coming up 🔄',
      body: `${vehicleName} is due for a tire rotation soon. Uneven wear sneaks up on you.`,
    },
  ],
  tire_overdue: (vehicleName: string) => [
    {
      title: 'Tire rotation overdue',
      body: `Your ${vehicleName} hasn't had a tire rotation in a while. Rotating now saves you from buying new tires early.`,
    },
  ],
  brake_check: (vehicleName: string) => [
    {
      title: 'Brake inspection due 🛑',
      body: `${vehicleName} is due for a brake check. Brakes are the one thing you really don't want to gamble on.`,
    },
  ],
  high_mileage_milestone: (vehicleName: string, mileage: number) => [
    {
      title: `${mileage.toLocaleString()} km on the ${vehicleName}`,
      body: "Nice milestone. Now's a good time to check in on your maintenance schedule.",
    },
  ],
};

const getRandom = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

// Configure how notifications appear when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Request permissions
export const requestNotificationPermissions = async () => {
  if (!Device.isDevice) return false;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  return finalStatus === 'granted';
};

// Schedule a reminder notification
export const scheduleReminderNotification = async ({
  id,
  serviceName,
  dueMiles,
  dueDate,
  vehicleName,
}: {
  id: string;
  serviceName: string;
  dueMiles?: number;
  dueDate?: string;
  vehicleName: string;
}) => {
  // Cancel existing notification for this reminder
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});

  // Schedule for due date if available, otherwise 7 days from now
  const triggerDate = dueDate
    ? new Date(dueDate)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // Don't schedule if date is in the past
  if (triggerDate <= new Date()) {
    // Schedule immediately as an overdue alert
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title: `Time for your ${serviceName} 🔧`,
        body: `Wrenchy reminder: your ${vehicleName} is due for a ${serviceName}. Tap to log it.`,
        data: { reminderId: id, screen: 'service' },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      },
    });
    return;
  }

  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: {
      title: `Time for your ${serviceName} 🔧`,
      body: `Wrenchy reminder: your ${vehicleName} is due for a ${serviceName}. Tap to log it.`,
      data: { reminderId: id, screen: 'service' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
};

export const scheduleWrenchyMileageAlerts = async (
  vehicle: {
    id: string;
    make: string;
    model: string;
    year: number;
    mileage: number;
  },
  lastServiceMileages: {
    oil: number;
    tire: number;
    brake: number;
  }
) => {
  const vehicleName = [vehicle.year, vehicle.make?.trim(), vehicle.model?.trim()]
    .filter(Boolean)
    .join(' ');
  const mileage = vehicle.mileage;

  const alerts: { identifier: string; title: string; body: string }[] = [];

  // Oil change — warn at 6000km, overdue at 8000km
  const kmSinceOil = mileage - lastServiceMileages.oil;
  if (kmSinceOil >= 8000) {
    const msg = getRandom(wrenchyMessages.oil_overdue(vehicleName));
    alerts.push({ identifier: `oil_overdue_${vehicle.id}`, ...msg });
  } else if (kmSinceOil >= 6000) {
    const msg = getRandom(wrenchyMessages.oil_warning(vehicleName));
    alerts.push({ identifier: `oil_warning_${vehicle.id}`, ...msg });
  }

  // Tire rotation — warn at 10000km, overdue at 12000km
  const kmSinceTire = mileage - lastServiceMileages.tire;
  if (kmSinceTire >= 12000) {
    const msg = getRandom(wrenchyMessages.tire_overdue(vehicleName));
    alerts.push({ identifier: `tire_overdue_${vehicle.id}`, ...msg });
  } else if (kmSinceTire >= 10000) {
    const msg = getRandom(wrenchyMessages.tire_warning(vehicleName));
    alerts.push({ identifier: `tire_warning_${vehicle.id}`, ...msg });
  }

  // Brake check — overdue at 50000km
  const kmSinceBrake = mileage - lastServiceMileages.brake;
  if (kmSinceBrake >= 50000) {
    const msg = getRandom(wrenchyMessages.brake_check(vehicleName));
    alerts.push({ identifier: `brake_check_${vehicle.id}`, ...msg });
  }

  // Mileage milestone (every 25000km)
  if (mileage > 0 && mileage % 25000 < 500) {
    const milestone = Math.floor(mileage / 25000) * 25000;
    const msg = getRandom(
      wrenchyMessages.high_mileage_milestone(vehicleName, milestone)
    );
    alerts.push({
      identifier: `milestone_${vehicle.id}_${milestone}`,
      ...msg,
    });
  }

  // Fire each alert as an immediate local notification
  for (const alert of alerts) {
    await Notifications.scheduleNotificationAsync({
      identifier: alert.identifier,
      content: {
        title: alert.title,
        body: alert.body,
        sound: true,
      },
      trigger: null,
    });
  }
};

// Cancel a reminder notification
export const cancelReminderNotification = async (id: string) => {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
};

// Cancel all notifications
export const cancelAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
};
