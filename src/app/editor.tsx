import { SkImage } from '@shopify/react-native-skia';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import CropEditor from '../components/CropEditor';
import { addSticker } from '../lib/packs';
import { Crop, loadImageFromUri, renderSticker } from '../lib/render';
import { colors } from '../theme';

export default function Editor() {
  const { packId, uri } = useLocalSearchParams<{ packId: string; uri: string }>();
  const [image, setImage] = useState<SkImage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadImageFromUri(uri)
      .then(setImage)
      .catch((e) => {
        Alert.alert('Ops', String(e));
        router.back();
      });
  }, [uri]);

  const save = (crop: Crop, emoji: string) => {
    if (!image) return;
    setSaving(true);
    // Deixa o indicador aparecer antes do processamento (que é síncrono).
    setTimeout(() => {
      try {
        addSticker(packId, renderSticker(image, crop), emoji);
        router.back();
      } catch (e) {
        setSaving(false);
        Alert.alert('Erro ao salvar', String(e));
      }
    }, 30);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.editorBg }}>
      <StatusBar style="light" />
      {image ? (
        <CropEditor image={image} saving={saving} onCancel={() => router.back()} onConfirm={save} />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}
    </View>
  );
}
