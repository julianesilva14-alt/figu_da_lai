import { SkImage } from '@shopify/react-native-skia';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import CropEditor from '../components/CropEditor';
import TextEditor from '../components/TextEditor';
import { addSticker } from '../lib/packs';
import { Crop, loadImageFromUri, renderSticker } from '../lib/render';
import { TextLayer, useStickerTypefaces } from '../lib/text';
import { colors } from '../theme';

/** Dois passos: 1) recortar  2) texto + emoji, e salvar. */
export default function Editor() {
  const { packId, uri } = useLocalSearchParams<{ packId: string; uri: string }>();
  const typefaces = useStickerTypefaces();
  const [image, setImage] = useState<SkImage | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [step, setStep] = useState<'crop' | 'text'>('crop');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadImageFromUri(uri)
      .then(setImage)
      .catch((e) => {
        Alert.alert('Ops', String(e));
        router.back();
      });
  }, [uri]);

  const save = (layer: TextLayer | null, emoji: string) => {
    if (!image || !crop || !typefaces) return;
    setSaving(true);
    // Deixa o indicador aparecer antes do processamento (que é síncrono).
    setTimeout(() => {
      try {
        addSticker(packId, renderSticker(image, crop, layer && { layer, typefaces }), emoji);
        router.back();
      } catch (e) {
        setSaving(false);
        Alert.alert('Erro ao salvar', String(e));
      }
    }, 30);
  };

  let content;
  if (!image || !typefaces) {
    content = (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  } else if (step === 'text' && crop) {
    content = (
      <TextEditor
        image={image}
        crop={crop}
        typefaces={typefaces}
        saving={saving}
        onBack={() => setStep('crop')}
        onConfirm={save}
      />
    );
  } else {
    content = (
      <CropEditor
        image={image}
        initialCrop={crop ?? undefined}
        onCancel={() => router.back()}
        onConfirm={(c) => {
          setCrop(c);
          setStep('text');
        }}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.editorBg }}>
      <StatusBar style="light" />
      {content}
    </View>
  );
}
