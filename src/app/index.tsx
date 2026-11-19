import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, NameModal, Txt } from '../components/ui';
import { createPack, MIN_STICKERS, Pack, stickerUri, usePacks } from '../lib/packs';
import { colors, shadow } from '../theme';

export default function Home() {
  const packs = usePacks();
  const insets = useSafeAreaInsets();
  const [creating, setCreating] = useState(false);

  const onCreate = (name: string) => {
    setCreating(false);
    const pack = createPack(name);
    router.push({ pathname: '/pack/[id]', params: { id: pack.id } });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <View style={styles.header}>
        <Txt weight="bold" style={styles.title}>
          Figu da Lai <Txt style={styles.sparkle}>✨</Txt>
        </Txt>
        <Txt style={styles.subtitle}>figurinhas grandonas, sem borda branca</Txt>
      </View>

      <FlatList
        data={packs}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 110 }]}
        ListEmptyComponent={<Empty onCreate={() => setCreating(true)} />}
        renderItem={({ item }) => <PackCard pack={item} />}
      />

      {packs.length > 0 && (
        <View style={[styles.fabWrap, { bottom: insets.bottom + 20 }]}>
          <Button title="Novo pacote" icon="＋" big onPress={() => setCreating(true)} />
        </View>
      )}

      <NameModal
        visible={creating}
        title="Nome do pacote"
        confirmLabel="Criar"
        onCancel={() => setCreating(false)}
        onConfirm={onCreate}
      />
    </View>
  );
}

function PackCard({ pack }: { pack: Pack }) {
  const count = pack.stickers.length;
  const ready = count >= MIN_STICKERS;
  const preview = pack.stickers.slice(0, 4);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/pack/[id]', params: { id: pack.id } })}
      style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1, gap: 6 }}>
          <Txt weight="semibold" style={styles.cardTitle} numberOfLines={1}>
            {pack.name}
          </Txt>
          {ready ? (
            <Chip color={colors.whatsappDark} bg="#DFF7E8">
              {count} figurinhas · pronto pro Zap
            </Chip>
          ) : (
            <Chip color={colors.primaryDark} bg={colors.primarySoft}>
              {count === 0 ? 'vazio' : `${count} de ${MIN_STICKERS} pra liberar`}
            </Chip>
          )}
        </View>
        <Txt style={styles.chevron}>›</Txt>
      </View>

      <View style={styles.previewRow}>
        {preview.map((s) => (
          <View key={s.file} style={styles.previewCell}>
            <Image source={{ uri: stickerUri(pack.id, s.file) }} style={styles.previewImg} />
          </View>
        ))}
        {Array.from({ length: 4 - preview.length }).map((_, i) => (
          <View key={i} style={[styles.previewCell, styles.previewEmpty]} />
        ))}
      </View>
    </Pressable>
  );
}

function Empty({ onCreate }: { onCreate: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyBlob}>
        <Txt style={{ fontSize: 64 }}>🤳</Txt>
      </View>
      <Txt weight="bold" style={styles.emptyTitle}>
        Bora fazer figurinha?
      </Txt>
      <Txt style={styles.emptyText}>
        Crie um pacote, escolha as fotos e recorte do jeitinho que quiser. Elas ficam grandes, ocupando o
        quadro todo — nada daquela borda branca.
      </Txt>
      <Button title="Criar meu primeiro pacote" big onPress={onCreate} style={{ marginTop: 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 22, paddingBottom: 12 },
  title: { fontSize: 36, color: colors.primary, letterSpacing: -0.5 },
  sparkle: { fontSize: 28 },
  subtitle: { fontSize: 16, color: colors.muted, marginTop: -2 },
  list: { paddingHorizontal: 16, gap: 14, paddingTop: 6 },
  card: { backgroundColor: colors.surface, borderRadius: 26, padding: 16, gap: 14, ...shadow },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 21 },
  chevron: { fontSize: 34, color: colors.line, marginTop: -6 },
  previewRow: { flexDirection: 'row', gap: 8 },
  previewCell: { flex: 1, aspectRatio: 1, borderRadius: 16, backgroundColor: colors.bg, overflow: 'hidden' },
  previewImg: { width: '100%', height: '100%' },
  previewEmpty: { borderWidth: 2, borderStyle: 'dashed', borderColor: colors.line, backgroundColor: 'transparent' },
  fabWrap: { position: 'absolute', alignSelf: 'center' },
  empty: { alignItems: 'center', paddingHorizontal: 18, paddingTop: 40, gap: 12 },
  emptyBlob: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 26, textAlign: 'center' },
  emptyText: { fontSize: 16, color: colors.muted, textAlign: 'center', lineHeight: 23 },
});
