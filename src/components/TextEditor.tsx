import { Canvas, createPicture, Group, Picture, Skia, SkImage } from '@shopify/react-native-skia';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crop, drawCropFilled, STICKER_SIZE } from '../lib/render';
import { drawTextLayer, FONTS, TextLayer, Typefaces } from '../lib/text';
import { colors, fonts } from '../theme';
import { Button, Txt } from './ui';

type Props = {
  image: SkImage;
  crop: Crop;
  typefaces: Typefaces;
  saving?: boolean;
  onBack: () => void;
  onConfirm: (layer: TextLayer | null, emoji: string) => void;
};

const SWATCHES = ['#FFFFFF', '#000000', '#FF4F81', '#FFC83D', '#25D366', '#3DA5FF', '#7B5CFF', '#FF7A2F'];
const EMOJIS = ['😂', '😍', '🥹', '😭', '😡', '😎', '🙄', '🤔', '👍', '❤️', '🔥', '💅', '🎉', '😴'];
const MIN_SIZE = 28;
const MAX_SIZE = 200;
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export default function TextEditor({ image, crop, typefaces, saving, onBack, onConfirm }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const preview = Math.min(width - 36, 320);
  const k = preview / STICKER_SIZE;

  const [layer, setLayer] = useState<TextLayer>({
    text: '',
    font: 'anton',
    color: '#FFFFFF',
    outline: '#000000',
    size: 72,
    x: STICKER_SIZE / 2,
    y: STICKER_SIZE * 0.84,
  });
  const [target, setTarget] = useState<'fill' | 'outline'>('fill');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [dragging, setDragging] = useState(false);
  const update = (patch: Partial<TextLayer>) => setLayer((l) => ({ ...l, ...patch }));

  // A prévia usa exatamente o mesmo desenho da figurinha final.
  const picture = useMemo(
    () =>
      createPicture((c) => {
        // Xadrez = áreas transparentes
        const p = Skia.Paint();
        const sq = 32;
        for (let y = 0; y < STICKER_SIZE; y += sq)
          for (let x = 0; x < STICKER_SIZE; x += sq) {
            p.setColor(Skia.Color(((x + y) / sq) % 2 ? '#EDE4EA' : '#FFFFFF'));
            c.drawRect(Skia.XYWHRect(x, y, sq, sq), p);
          }
        drawCropFilled(c, image, crop, STICKER_SIZE);
        drawTextLayer(c, layer, typefaces);
      }, Skia.XYWHRect(0, 0, STICKER_SIZE, STICKER_SIZE)),
    [image, crop, layer, typefaces],
  );

  // Arrastar o texto pela prévia
  const live = useRef({ layer, k });
  useLayoutEffect(() => {
    live.current = { layer, k };
  });
  const start = useRef({ x: 0, y: 0 });
  // As refs só são lidas dentro dos handlers de toque (fora do render).
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        start.current = { x: live.current.layer.x, y: live.current.layer.y };
        setDragging(true);
      },
      onPanResponderMove: (_, g) => {
        const s = live.current.k;
        setLayer((l) => ({
          ...l,
          x: clamp(start.current.x + g.dx / s, 0, STICKER_SIZE),
          y: clamp(start.current.y + g.dy / s, 0, STICKER_SIZE),
        }));
      },
      onPanResponderRelease: () => setDragging(false),
      onPanResponderTerminate: () => setDragging(false),
    }),
  );

  const hasText = layer.text.trim().length > 0;
  const activeColor = target === 'fill' ? layer.color : layer.outline;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <Txt weight="semibold" style={styles.headerTitle}>
          Texto
        </Txt>
        <Txt style={styles.headerHint}>opcional</Txt>
      </View>

      <ScrollView
        scrollEnabled={!dragging}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <View style={[styles.previewWrap, { width: preview, height: preview }]} {...responder.panHandlers}>
          <Canvas style={{ width: preview, height: preview }}>
            <Group transform={[{ scale: k }]}>
              <Picture picture={picture} />
            </Group>
          </Canvas>
        </View>
        <Txt style={styles.dragHint}>{hasText ? 'Arraste na imagem para mover o texto' : ' '}</Txt>

        <TextInput
          value={layer.text}
          onChangeText={(text) => update({ text })}
          placeholder="Escreva algo… (ou deixe em branco)"
          placeholderTextColor="rgba(255,255,255,0.4)"
          multiline
          maxLength={60}
          style={styles.input}
        />

        <Section title="Fonte">
          {FONTS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => update({ font: f.key })}
              style={[styles.fontBtn, layer.font === f.key && styles.on]}
            >
              <Txt style={{ fontFamily: f.rn, color: '#fff', fontSize: 18 }}>{f.label}</Txt>
            </Pressable>
          ))}
        </Section>

        <View style={styles.segment}>
          {(['fill', 'outline'] as const).map((t) => (
            <Pressable key={t} onPress={() => setTarget(t)} style={[styles.segBtn, target === t && styles.on]}>
              <Txt weight="medium" style={styles.segTxt}>
                {t === 'fill' ? 'Cor da letra' : 'Contorno'}
              </Txt>
            </Pressable>
          ))}
        </View>
        <Section>
          {target === 'outline' && (
            <Pressable
              onPress={() => update({ outline: null })}
              style={[styles.swatch, styles.noneSwatch, layer.outline === null && styles.swatchOn]}
            >
              <Txt style={{ color: '#fff', fontSize: 16 }}>⌀</Txt>
            </Pressable>
          )}
          {SWATCHES.map((c) => (
            <Pressable
              key={c}
              onPress={() => update(target === 'fill' ? { color: c } : { outline: c })}
              style={[styles.swatch, { backgroundColor: c }, activeColor === c && styles.swatchOn]}
            />
          ))}
        </Section>

        <View style={styles.sizeRow}>
          <Txt weight="medium" style={styles.label}>
            Tamanho
          </Txt>
          <Pressable
            onPress={() => update({ size: clamp(layer.size - 10, MIN_SIZE, MAX_SIZE) })}
            style={styles.sizeBtn}
          >
            <Txt weight="bold" style={styles.sizeTxt}>
              A−
            </Txt>
          </Pressable>
          <Pressable
            onPress={() => update({ size: clamp(layer.size + 10, MIN_SIZE, MAX_SIZE) })}
            style={styles.sizeBtn}
          >
            <Txt weight="bold" style={[styles.sizeTxt, { fontSize: 22 }]}>
              A+
            </Txt>
          </Pressable>
        </View>

        <Txt weight="medium" style={[styles.label, { marginTop: 8 }]}>
          Emoji pra achar no WhatsApp
        </Txt>
        <Txt style={styles.emojiHelp}>
          O WhatsApp usa esse emoji para buscar e sugerir a figurinha. Ele não aparece no desenho.
        </Txt>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
          {EMOJIS.map((e) => (
            <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emojiBtn, emoji === e && styles.on]}>
              <Txt style={{ fontSize: 24 }}>{e}</Txt>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>

      <View style={styles.bar}>
        <Button title="‹ Recorte" variant="ghost" onPress={onBack} style={{ flex: 1 }} />
        <Button
          title="Salvar figurinha"
          loading={saving}
          onPress={() => onConfirm(hasText ? layer : null, emoji)}
          style={{ flex: 1.6 }}
        />
      </View>
    </View>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      {title && (
        <Txt weight="medium" style={styles.label}>
          {title}
        </Txt>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.editorBg },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: 18, paddingBottom: 8 },
  headerTitle: { color: '#fff', fontSize: 22 },
  headerHint: { color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  scroll: { paddingHorizontal: 18, gap: 12, paddingBottom: 12 },
  previewWrap: { alignSelf: 'center', borderRadius: 18, overflow: 'hidden' },
  dragHint: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 13, marginTop: -4 },
  input: {
    fontFamily: fonts.medium,
    fontSize: 18,
    color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 50,
    maxHeight: 100,
  },
  label: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  chipRow: { gap: 8, alignItems: 'center' },
  fontBtn: {
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  on: { backgroundColor: colors.primary },
  segment: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    padding: 4,
    alignSelf: 'flex-start',
  },
  segBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  segTxt: { color: '#fff', fontSize: 14 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  swatchOn: { borderColor: colors.primary, borderWidth: 4, transform: [{ scale: 1.1 }] },
  noneSwatch: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  sizeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sizeBtn: {
    width: 52,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeTxt: { color: '#fff', fontSize: 16 },
  emojiHelp: { color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: -6 },
  emojiRow: { gap: 8 },
  emojiBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 18, paddingTop: 8 },
});
