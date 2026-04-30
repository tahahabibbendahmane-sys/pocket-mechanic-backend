import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="tire-pressure" />
      <Stack.Screen name="history" />
      <Stack.Screen name="diagnostics" />
      <Stack.Screen name="oil-specs" />
    </Stack>
  );
}
