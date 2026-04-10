import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  useFonts, 
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold 
} from '@expo-google-fonts/plus-jakarta-sans';
import { Navbar } from '../src/components/Navbar';
import { Theme } from '../src/theme/theme';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: Theme.colors.backgroundDeep }}>
      <LinearGradient
        colors={['#020617', '#0f172a', '#020617'] as const}
        style={StyleSheet.absoluteFill}
      />
      <Navbar />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="scramble/index" />
        <Stack.Screen name="challenge/[id]" />
        <Stack.Screen name="scramble/[id]" />
      </Stack>
      <StatusBar style="light" />
    </View>
  );
}
