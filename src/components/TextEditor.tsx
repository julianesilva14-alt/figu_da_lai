import {
  Canvas,
  createPicture,
  Group,
  PaintStyle,
  Picture,
  Skia,
  SkImage,
  StrokeCap,
} from '@shopify/react-native-skia';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crop, drawCropFilled, STICKER_SIZE } from '../lib/render';
import { drawTextLayer, FONTS, TextLayer, textBounds, Typefaces } from '../lib/text';
import { colors, fonts } from '../theme';
import { Button, Txt } from './ui';

type Props = {
  image: SkImage;
  crop: Crop;
  typefaces: Typefaces;
  saving?: boolean;
  onBack: () => void;
  onConfirm: (layers: TextLayer[], emoji: string) => void;
};

const SWATCHES = ['#FFFFFF', '#000000', '#FF4F81', '#FFC83D', '#25D366', '#3DA5FF', '#7B5CFF', '#FF7A2F'];
const EMOJIS = ['😂', '😍', '🥹', '😭', '😡', '😎', '🙄', '🤔', '👍', '❤️', '🔥', '💅', '🎉', '😴'];
const MIN_SIZE = 20;
const MAX_SIZE = 320;
const TOUCH_PAD = 24; // folga ao tocar num texto, em pixels da figurinha
const HANDLE_R = 26; // raio da alça de redimensionar, em pixels da figurinha
const HANDLE_TOUCH = 56;
const VISIBLE_MIN = 40; // quanto do texto precisa continuar dentro do quadro
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Moldura de seleção (um pouco maior que o texto) e a posição da alça no canto. */
function frameOf(layer: TextLayer, typefaces: Typefaces) {
  const b = textBounds(layer, typefaces);
  const f = { x: b.x - 12, y: b.y - 8, w: b.w + 24, h: b.h + 16 };
  return { ...f, hx: f.x + f.w, hy: f.y + f.h };
}

/** Deixa o texto ir até fora da borda, mas sempre com um pedaço visível. */
function clampCenter(layer: TextLayer, x: number, y: number, typefaces: Typefaces) {
  const b = textBounds(layer, typefaces);
  return {
    x: clamp(x, VISIBLE_MIN - b.w / 2, STICKER_SIZE - VISIBLE_MIN + b.w / 2),
    y: clamp(y, VISIBLE_MIN - b.h / 2, STICKER_SIZE - VISIBLE_MIN + b.h / 2),
  };
}

type Gesture =
  | { kind: 'move'; index: number; ox: number; oy: number; tapToDeselect: boolean }
  | { kind: 'handle'; index: number; startSize: number; startDist: number; px: number; py: number }
  | { kind: 'pinch'; index: number; startSize: number; startDist: number }
  | null;

const DEFAULT_LAYER: TextLayer = {
  text: '',
  font: 'anton',
  color: '#FFFFFF',
  outline: '#000000',
  size: 72,
  x: STICKER_SIZE / 2,
  y: STICKER_SIZE * 0.84,
};

export default function TextEditor({ image, crop, typefaces, saving, onBack, onConfirm }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const preview = Math.min(width - 36, height * 0.4, 340);
  const k = preview / STICKER_SIZE;

  const [layers, setLayers] = useState<TextLayer[]>([DEFAULT_LAYER]);
  const [selected, setSelected] = useState<number | null>(0);
  const [target, setTarget] = useState<'fill' | 'outline'>('fill');
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const current = selected !== null ? layers[selected] : null;
  const update = (patch: Partial<TextLayer>) =>
    setLayers((ls) => ls.map((l, i) => (i === selected ? { ...l, ...patch } : l)));

  const addLayer = () => {
    // O novo texto herda o estilo do atual e aparece no meio.
    const base = current ?? DEFAULT_LAYER;
    const next = { ...base, text: '', x: STICKER_SIZE / 2, y: STICKER_SIZE / 2 };
    setLayers((ls) => [...ls, next]);
    setSelected(layers.length);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const removeLayer = () => {
    if (selected === null) return;
    setLayers((ls) => ls.filter((_, i) => i !== selected));
    setSelected(null);
  };

  // A prévia usa exatamente o mesmo desenho da figurinha final + a moldura de seleção.
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
        layers.forEach((l) => drawTextLayer(c, l, typefaces));

        if (selected !== null && layers[selected]) {
          const f = frameOf(layers[selected], typefaces);
          const frame = Skia.Paint();
          frame.setAntiAlias(true);
          frame.setStyle(PaintStyle.Stroke);
          frame.setStrokeWidth(4);
          frame.setColor(Skia.Color(colors.primary));
          frame.setPathEffect(Skia.PathEffect.MakeDash([16, 10], 0));
          c.drawRRect(Skia.RRectXY(Skia.XYWHRect(f.x, f.y, f.w, f.h), 14, 14), frame);

          // Alça de redimensionar (bolinha com setinha ↘)
          const fill = Skia.Paint();
          fill.setAntiAlias(true);
          fill.setColor(Skia.Color(colors.primary));
          c.drawCircle(f.hx, f.hy, HANDLE_R, fill);
          const ring = Skia.Paint();
          ring.setAntiAlias(true);
          ring.setStyle(PaintStyle.Stroke);
          ring.setStrokeWidth(5);
          ring.setColor(Skia.Color('#FFFFFF'));
          c.drawCircle(f.hx, f.hy, HANDLE_R, ring);
          const a = HANDLE_R * 0.45;
          ring.setStrokeWidth(4);
          ring.setStrokeCap(StrokeCap.Round);
          c.drawLine(f.hx - a, f.hy - a, f.hx + a, f.hy + a, ring);
          c.drawLine(f.hx + a, f.hy, f.hx + a, f.hy + a, ring);
          c.drawLine(f.hx, f.hy + a, f.hx + a, f.hy + a, ring);
        }
      }, Skia.XYWHRect(0, 0, STICKER_SIZE, STICKER_SIZE)),
    [image, crop, layers, selected, typefaces],
  );

  /*
   * Gestos na prévia:
   * - tocar num texto seleciona e arrasta ele;
   * - com um texto selecionado, arrastar em QUALQUER lugar da prévia move esse texto;
   * - arrastar a bolinha do canto aumenta/diminui;
   * - pinça com dois dedos aumenta/diminui;
   * - um toque rápido fora dos textos tira a seleção.
   */
  const live = useRef({ layers, k, typefaces, selected });
  useLayoutEffect(() => {
    live.current = { layers, k, typefaces, selected };
  });
  const gesture = useRef<Gesture>(null);
  // Posição do dedo (na tela) quando o gesto começou. Usamos a posição absoluta em vez do
  // dx/dy do PanResponder, que no Android estava zerando no meio do arraste.
  const origin = useRef({ x: 0, y: 0 });

  const setLayer = (index: number, fn: (l: TextLayer) => Partial<TextLayer>) =>
    setLayers((ls) => ls.map((l, i) => (i === index ? { ...l, ...fn(l) } : l)));

  // As refs só são lidas dentro dos handlers de toque (fora do render).
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (e) => {
        const { layers: ls, k: s, typefaces: tf, selected: sel } = live.current;
        const px = e.nativeEvent.locationX / s;
        const py = e.nativeEvent.locationY / s;
        origin.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };

        // 1) Alça do texto selecionado
        if (sel !== null && ls[sel]) {
          const f = frameOf(ls[sel], tf);
          if (Math.hypot(px - f.hx, py - f.hy) < HANDLE_TOUCH) {
            const startDist = Math.max(20, Math.hypot(px - ls[sel].x, py - ls[sel].y));
            gesture.current = { kind: 'handle', index: sel, startSize: ls[sel].size, startDist, px, py };
            return;
          }
        }
        // 2) Algum texto embaixo do dedo (o de cima primeiro)
        for (let i = ls.length - 1; i >= 0; i--) {
          const b = textBounds(ls[i], tf);
          if (
            px >= b.x - TOUCH_PAD &&
            px <= b.x + b.w + TOUCH_PAD &&
            py >= b.y - TOUCH_PAD &&
            py <= b.y + b.h + TOUCH_PAD
          ) {
            gesture.current = { kind: 'move', index: i, ox: ls[i].x, oy: ls[i].y, tapToDeselect: false };
            setSelected(i);
            return;
          }
        }
        // 3) Fora dos textos: move o selecionado (se houver)
        gesture.current =
          sel !== null && ls[sel]
            ? { kind: 'move', index: sel, ox: ls[sel].x, oy: ls[sel].y, tapToDeselect: true }
            : null;
      },
      onPanResponderMove: (e) => {
        const { layers: ls, k: s, typefaces: tf, selected: sel } = live.current;
        const touches = e.nativeEvent.touches;
        const finger = touches[0] ?? e.nativeEvent;
        const dx = finger.pageX - origin.current.x;
        const dy = finger.pageY - origin.current.y;
        const cur = gesture.current;
        const index = cur?.index ?? sel;
        if (index === null || index === undefined || !ls[index]) return;

        // Dois dedos: pinça para redimensionar
        if (touches.length >= 2) {
          const dist = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
          if (cur?.kind !== 'pinch') {
            gesture.current = { kind: 'pinch', index, startSize: ls[index].size, startDist: Math.max(dist, 1) };
          } else {
            setLayer(index, () => ({ size: clamp((cur.startSize * dist) / cur.startDist, MIN_SIZE, MAX_SIZE) }));
          }
          return;
        }

        if (!cur) return;
        if (cur.kind === 'pinch') {
          // Voltou para um dedo: continua movendo a partir daqui, sem dar pulo.
          origin.current = { x: finger.pageX, y: finger.pageY };
          gesture.current = { kind: 'move', index, ox: ls[index].x, oy: ls[index].y, tapToDeselect: false };
          return;
        }
        if (cur.kind === 'handle') {
          const l = ls[index];
          const d = Math.hypot(cur.px + dx / s - l.x, cur.py + dy / s - l.y);
          setLayer(index, () => ({ size: clamp((cur.startSize * d) / cur.startDist, MIN_SIZE, MAX_SIZE) }));
          return;
        }
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) cur.tapToDeselect = false;
        setLayer(index, (l) => clampCenter(l, cur.ox + dx / s, cur.oy + dy / s, tf));
      },
      onPanResponderRelease: () => {
        const cur = gesture.current;
        if (cur?.kind === 'move' && cur.tapToDeselect) setSelected(null);
        gesture.current = null;
      },
      onPanResponderTerminate: () => {
        gesture.current = null;
      },
    }),
  );

  const activeColor = current ? (target === 'fill' ? current.color : current.outline) : null;
  const filled = layers.filter((l) => l.text.trim());

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <Txt weight="semibold" style={styles.headerTitle}>
          Texto
        </Txt>
        <Txt style={styles.headerHint}>opcional</Txt>
      </View>

      {/* Prévia fixa (fora da rolagem, para o arrastar não brigar com o scroll) */}
      <View style={[styles.previewWrap, { width: preview, height: preview }]} {...responder.panHandlers}>
        <Canvas style={{ width: preview, height: preview }} pointerEvents="none">
          <Group transform={[{ scale: k }]}>
            <Picture picture={picture} />
          </Group>
        </Canvas>
      </View>
      <Txt style={styles.dragHint}>Arraste para mover · pinça ou bolinha para mudar o tamanho</Txt>

      <View style={styles.layerBar}>
        <Button title="Novo texto" icon="＋" variant="soft" onPress={addLayer} style={styles.smallBtn} />
        {current && (
          <Button title="Apagar texto" variant="danger" onPress={removeLayer} style={styles.smallBtn} />
        )}
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        {current ? (
          <>
            <TextInput
              ref={inputRef}
              value={current.text}
              onChangeText={(text) => update({ text })}
              placeholder="Escreva algo…"
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
                  style={[styles.fontBtn, current.font === f.key && styles.on]}
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
                  style={[styles.swatch, styles.noneSwatch, current.outline === null && styles.swatchOn]}
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
                onPress={() => update({ size: clamp(current.size - 10, MIN_SIZE, MAX_SIZE) })}
                style={styles.sizeBtn}
              >
                <Txt weight="bold" style={styles.sizeTxt}>
                  A−
                </Txt>
              </Pressable>
              <Pressable
                onPress={() => update({ size: clamp(current.size + 10, MIN_SIZE, MAX_SIZE) })}
                style={styles.sizeBtn}
              >
                <Txt weight="bold" style={[styles.sizeTxt, { fontSize: 22 }]}>
                  A+
                </Txt>
              </Pressable>
            </View>
          </>
        ) : (
          <Txt style={styles.noSelection}>
            {layers.length
              ? 'Toque num texto da imagem para editar, ou crie um novo.'
              : 'Sem texto. Toque em “Novo texto” se quiser escrever algo.'}
          </Txt>
        )}

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
          onPress={() => onConfirm(filled, emoji)}
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.chipRow}
      >
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
  previewWrap: { alignSelf: 'center', borderRadius: 18, overflow: 'hidden' },
  dragHint: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 13, marginTop: 6 },
  layerBar: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 10 },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  scroll: { paddingHorizontal: 18, gap: 12, paddingBottom: 12 },
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
  noSelection: { color: 'rgba(255,255,255,0.6)', textAlign: 'center', paddingVertical: 12, fontSize: 15 },
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
