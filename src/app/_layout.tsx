import {
  Fredoka_400Regular,
  Fredoka_500Medium,
  Fredoka_600SemiBold,
  useFonts,
} from '@expo-google-fonts/fredoka';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { RN_FONTS } from '../lib/text';
import { colors } from '../theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    Fredoka_400Regular,
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    ...RN_FONTS, // inclui a Fredoka_700Bold e as fontes do texto das figurinhas
  });

  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="editor"
          options={{ animation: 'slide_from_bottom', contentStyle: { backgroundColor: colors.editorBg } }}
        />
      </Stack>
    </>
  );
}
