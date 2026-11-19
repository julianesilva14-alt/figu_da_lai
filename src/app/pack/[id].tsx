import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { addStickerPack, isWhatsAppInstalled, whatsappAvailable } from '../../../modules/whatsapp-stickers';
import { Button, NameModal, Txt } from '../../components/ui';
import {
  deletePack,
  MAX_STICKERS,
  MIN_STICKERS,
  removeSticker,
  renamePack,
  stickerUri,
  usePack,
} from '../../lib/packs';
import { colors, shadow } from '../../theme';

const ADD = '__add__';

export default function PackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const pack = usePack(id);
  const insets = useSafeAreaInsets();
  const [renaming, setRenaming] = useState(false);
  const [sending, setSending] = useState(false);

  if (!pack) return null;
  const count = pack.stickers.length;
  const missing = MIN_STICKERS - count;
  const full = count >= MAX_STICKERS;

  const pick = async (fromCamera: boolean) => {
    let result: ImagePicker.ImagePickerResult;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return Alert.alert('Ops', 'Precisamos da câmera para tirar a foto.');
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    }
    if (result.canceled) return;
    router.push({ pathname: '/editor', params: { packId: pack.id, uri: result.assets[0].uri } });
  };

  const chooseSource = () =>
    Alert.alert('Nova figurinha', 'De onde vem a foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: '📷 Câmera', onPress: () => pick(true) },
      { text: '🖼️ Galeria', onPress: () => pick(false) },
    ]);

  const confirmRemove = (file: string) =>
    Alert.alert('Apagar figurinha?', 'Ela sai deste pacote.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => removeSticker(pack.id, file) },
    ]);

  const confirmDeletePack = () =>
    Alert.alert('Apagar pacote?', `"${pack.name}" e todas as figurinhas dele serão apagados.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          router.back();
          deletePack(pack.id);
        },
      },
    ]);

  const sendToWhatsApp = async () => {
    if (!whatsappAvailable) {
      return Alert.alert(
        'Quase lá!',
        'Enviar para o WhatsApp só funciona no app instalado (APK). No Expo Go dá para criar e recortar.',
      );
    }
    if (!isWhatsAppInstalled()) return Alert.alert('Ops', 'Não achei o WhatsApp neste celular.');
    setSending(true);
    try {
      const r = await addStickerPack(pack.id, pack.name);
      if (!r.ok && r.error) Alert.alert('O WhatsApp recusou o pacote', r.error);
    } catch (e) {
      Alert.alert('Ops', String(e));
    } finally {
      setSending(false);
    }
  };

  const data = full ? pack.stickers.map((s) => s.file) : [ADD, ...pack.stickers.map((s) => s.file)];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={10}>
          <Txt weight="semibold" style={styles.iconTxt}>
            ‹
          </Txt>
        </Pressable>
        <Pressable onPress={confirmDeletePack} style={styles.iconBtn} hitSlop={10}>
          <Txt style={{ fontSize: 20 }}>🗑️</Txt>
        </Pressable>
      </View>

      <Pressable onPress={() => setRenaming(true)} style={styles.titleWrap}>
        <Txt weight="bold" style={styles.title} numberOfLines={2}>
          {pack.name} <Txt style={styles.pencil}>✎</Txt>
        </Txt>
        <Txt style={styles.counter}>
          {count}/{MAX_STICKERS} figurinhas · segure uma para apagar
        </Txt>
      </Pressable>

      <FlatList
        data={data}
        keyExtractor={(k) => k}
        numColumns={3}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 120 }]}
        renderItem={({ item }) =>
          item === ADD ? (
            <Pressable
              onPress={chooseSource}
              style={({ pressed }) => [styles.cell, styles.addCell, pressed && { backgroundColor: colors.primarySoft }]}
            >
              <Txt weight="bold" style={styles.addPlus}>
                ＋
              </Txt>
              <Txt weight="medium" style={styles.addLabel}>
                nova
              </Txt>
            </Pressable>
          ) : (
            <Pressable
              onLongPress={() => confirmRemove(item)}
              style={({ pressed }) => [styles.cell, styles.stickerCell, pressed && { opacity: 0.7 }]}
            >
              <Image source={{ uri: stickerUri(pack.id, item) }} style={styles.sticker} />
            </Pressable>
          )
        }
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        {missing > 0 ? (
          <Txt weight="medium" style={styles.hint}>
            Falta{missing > 1 ? 'm' : ''} {missing} figurinha{missing > 1 ? 's' : ''} — o WhatsApp pede no
            mínimo {MIN_STICKERS} por pacote
          </Txt>
        ) : null}
        <Button
          title="Adicionar ao WhatsApp"
          variant="whatsapp"
          big
          disabled={missing > 0}
          loading={sending}
          onPress={sendToWhatsApp}
        />
      </View>

      <NameModal
        visible={renaming}
        title="Renomear pacote"
        initial={pack.name}
        onCancel={() => setRenaming(false)}
        onConfirm={(name) => {
          renamePack(pack.id, name);
          setRenaming(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  iconTxt: { fontSize: 32, color: colors.primary, marginTop: -4 },
  titleWrap: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 10 },
  title: { fontSize: 30, lineHeight: 36 },
  pencil: { fontSize: 20, color: colors.muted },
  counter: { color: colors.muted, fontSize: 14 },
  grid: { paddingHorizontal: 16, gap: 10, paddingTop: 6 },
  cell: { flex: 1 / 3, aspectRatio: 1, borderRadius: 20 },
  // Fundo clarinho para dar para ver que a figurinha vai até a borda.
  stickerCell: { backgroundColor: colors.surface, overflow: 'hidden', ...shadow, shadowOpacity: 0.06 },
  sticker: { width: '100%', height: '100%' },
  addCell: {
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPlus: { fontSize: 32, color: colors.primary, lineHeight: 36 },
  addLabel: { color: colors.primary, fontSize: 14 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 14,
    gap: 8,
    backgroundColor: 'rgba(255,245,238,0.96)',
  },
  hint: { textAlign: 'center', color: colors.primaryDark, fontSize: 14 },
});
