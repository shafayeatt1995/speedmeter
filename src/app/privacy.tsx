import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTopActions } from '@/components/screen-top-actions';
import { Text } from '@/components/ui/text';

const SECTIONS = [
  {
    title: 'Overview',
    body:
      'Aniker Speedometer is a GPS speedometer and trip tracker. This policy explains what data the app uses and how it is handled.',
  },
  {
    title: 'Location data',
    body:
      'With your permission, the app reads your device location to show current speed, distance, altitude, and trip route points. While a trip is recording, location may continue in the background so your route stays accurate when the phone is locked.',
  },
  {
    title: 'Trip history',
    body:
      'Saved trips and route points are stored locally on your device using on-device storage. Trip data is not uploaded to our servers.',
  },
  {
    title: 'Map replay',
    body:
      'Trip replay loads map tiles from OpenStreetMap over the internet. Only map tile requests are sent; your saved trip data stays on your device.',
  },
  {
    title: 'Data sharing',
    body:
      'We do not sell your data. We do not use third-party analytics or advertising SDKs. No account is required.',
  },
  {
    title: 'Your choices',
    body:
      'You can deny location permission, pause tracking, delete trips from history, or uninstall the app at any time to remove locally stored data.',
  },
  {
    title: 'Contact',
    body:
      'For privacy questions about Aniker Speedometer, contact the developer through the support email listed on the app store listing.',
  },
] as const;

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-row items-center justify-between px-5 pt-2">
        <Pressable
          accessibilityRole="button"
          className="active:opacity-80"
          onPress={() => router.back()}
        >
          <Text className="font-semibold text-primary">Back</Text>
        </Pressable>
        <ScreenTopActions />
      </View>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-2"
        showsVerticalScrollIndicator={false}
      >

        <Text variant="h2">Privacy Policy</Text>
        <Text variant="muted" className="mt-2">
          Last updated: June 5, 2026
        </Text>

        <View className="mt-6 gap-5">
          {SECTIONS.map((section) => (
            <View key={section.title}>
              <Text className="text-lg font-semibold">{section.title}</Text>
              <Text variant="muted" className="mt-2 leading-6">
                {section.body}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
