import { Canvas, Image as SkiaImage, SkImage } from '@shopify/react-native-skia';
import { useLayoutEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crop } from '../lib/render';
import { colors } from '../theme';
import { Button, Txt } from './ui';

type Props = {
  image: SkImage;
  saving?: boolean;
  onCancel: () => void;
  onConfirm: (crop: Crop, emoji: string) => void;
};

type Mode = 'move' | 'tl' | 'tr' | 'bl' | 'br' | null;

const HANDLE_TOUCH = 44; // área de toque dos cantos, em pixels da tela
const MIN_SIZE = 32; // tamanho mínimo do recorte, em pixels da imagem
const EMOJIS = ['😂', '😍', '🥹', '😭', '😡', '😎', '🙄', '🤔', '👍', '❤️', '🔥', '💅', '🎉', '😴'];

function centeredSquare(iw: number, ih: number): Crop {
  const s = Math.min(iw, ih);
  return { x: (iw - s) / 2, y: (ih - s) / 2, w: s, h: s };
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

export default function CropEditor({ image, saving, onCancel, onConfirm }: Props) {
  const insets = useSafeAreaInsets();
  const iw = image.width();
  const ih = image.height();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<Crop>(() => centeredSquare(iw, ih));
  const [square, setSquare] = useState(true);
  const [emoji, setEmoji] = useState(EMOJIS[0]);

  // Como a imagem aparece na tela (encaixada no espaço disponível).
  const scale = box.w ? Math.min(box.w / iw, box.h / ih) : 1;
  const ox = (box.w - iw * scale) / 2;
  const oy = (box.h - ih * scale) / 2;

  // Refs para o PanResponder sempre ler os valores atuais.
  const live = useRef({ crop, scale, ox, oy, square });
  useLayoutEffect(() => {
    live.current = { crop, scale, ox, oy, square };
  });
  const gesture = useRef<{ mode: Mode; start: Crop }>({ mode: null, start: crop });

  // As refs só são lidas dentro dos handlers de toque (fora do render).
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const { crop: c, scale: s, ox: x0, oy: y0 } = live.current;
        const tx = e.nativeEvent.locationX;
        const ty = e.nativeEvent.locationY;
        const left = x0 + c.x * s;
        const top = y0 + c.y * s;
        const right = left + c.w * s;
        const bottom = top + c.h * s;
        const corners: [Mode, number, number][] = [
          ['tl', left, top],
          ['tr', right, top],
          ['bl', left, bottom],
          ['br', right, bottom],
        ];
        let mode: Mode = null;
        let best = HANDLE_TOUCH;
        for (const [m, cx, cy] of corners) {
          const d = Math.hypot(tx - cx, ty - cy);
          if (d < best) {
            best = d;
            mode = m;
          }
        }
        if (!mode && tx > left && tx < right && ty > top && ty < bottom) mode = 'move';
        gesture.current = { mode, start: c };
      },
      onPanResponderMove: (_, g) => {
        const { mode, start } = gesture.current;
        if (!mode) return;
        const { scale: s, square: sq } = live.current;
        const dx = g.dx / s;
        const dy = g.dy / s;

        if (mode === 'move') {
          setCrop({
            ...start,
            x: clamp(start.x + dx, 0, iw - start.w),
            y: clamp(start.y + dy, 0, ih - start.h),
          });
          return;
        }

        // Redimensiona pelo canto, mantendo o canto oposto fixo.
        const sx = mode === 'tr' || mode === 'br' ? 1 : -1;
        const sy = mode === 'bl' || mode === 'br' ? 1 : -1;
        const ax = sx > 0 ? start.x : start.x + start.w;
        const ay = sy > 0 ? start.y : start.y + start.h;
        const maxW = sx > 0 ? iw - ax : ax;
        const maxH = sy > 0 ? ih - ay : ay;

        let w: number;
        let h: number;
        if (sq) {
          const size = clamp(start.w + (sx * dx + sy * dy) / 2, MIN_SIZE, Math.min(maxW, maxH));
          w = h = size;
        } else {
          w = clamp(start.w + sx * dx, MIN_SIZE, maxW);
          h = clamp(start.h + sy * dy, MIN_SIZE, maxH);
        }
        setCrop({ x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - h, w, h });
      },
      onPanResponderRelease: () => {
        gesture.current.mode = null;
      },
    }),
  );

  const setShape = (sq: boolean) => {
    if (sq && !square) {
      // Vira quadrado: pega o maior quadrado dentro do recorte atual.
      const s = Math.min(crop.w, crop.h);
      setCrop({ x: crop.x + (crop.w - s) / 2, y: crop.y + (crop.h - s) / 2, w: s, h: s });
    }
    setSquare(sq);
  };

  const onLayout = (e: LayoutChangeEvent) =>
    setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  const r = {
    left: ox + crop.x * scale,
    top: oy + crop.y * scale,
    width: crop.w * scale,
    height: crop.h * scale,
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={styles.header}>
        <Txt weight="semibold" style={styles.headerTitle}>
          Recortar
        </Txt>
        <View style={styles.segment}>
          {[true, false].map((sq) => (
            <Pressable
              key={String(sq)}
              onPress={() => setShape(sq)}
              style={[styles.segBtn, square === sq && styles.segBtnOn]}
            >
              <Txt weight="medium" style={[styles.segTxt, square === sq && styles.segTxtOn]}>
                {sq ? '◼ Quadrado' : '▬ Livre'}
              </Txt>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.stage} onLayout={onLayout} {...responder.panHandlers}>
        {box.w > 0 && (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Canvas style={StyleSheet.absoluteFill}>
              <SkiaImage image={image} x={ox} y={oy} width={iw * scale} height={ih * scale} fit="fill" />
            </Canvas>
            {/* Escurece o que fica fora do recorte */}
            <View style={[styles.shade, { left: 0, top: 0, right: 0, height: r.top }]} />
            <View style={[styles.shade, { left: 0, top: r.top + r.height, right: 0, bottom: 0 }]} />
            <View style={[styles.shade, { left: 0, top: r.top, width: r.left, height: r.height }]} />
            <View style={[styles.shade, { left: r.left + r.width, top: r.top, right: 0, height: r.height }]} />
            <View style={[styles.frame, r]}>
              {/* Linhas de terço, para ajudar a centralizar */}
              <View style={[styles.gridV, { left: '33.33%' }]} />
              <View style={[styles.gridV, { left: '66.66%' }]} />
              <View style={[styles.gridH, { top: '33.33%' }]} />
              <View style={[styles.gridH, { top: '66.66%' }]} />
              <View style={[styles.handle, { left: -11, top: -11 }]} />
              <View style={[styles.handle, { right: -11, top: -11 }]} />
              <View style={[styles.handle, { left: -11, bottom: -11 }]} />
              <View style={[styles.handle, { right: -11, bottom: -11 }]} />
            </View>
          </View>
        )}
      </View>

      <Txt style={styles.hint}>
        {square
          ? 'Arraste os cantos ou o meio. Quadrado ocupa o quadro inteiro 💯'
          : 'Livre: o lado maior encosta na borda, o resto fica transparente'}
      </Txt>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.emojiRow}
        style={{ flexGrow: 0 }}
      >
        {EMOJIS.map((e) => (
          <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emojiBtn, emoji === e && styles.emojiOn]}>
            <Txt style={{ fontSize: 24 }}>{e}</Txt>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.bar}>
        <Button title="Cancelar" variant="ghost" onPress={onCancel} style={{ flex: 1 }} />
        <Button
          title="Salvar figurinha"
          onPress={() => onConfirm(crop, emoji)}
          loading={saving}
          style={{ flex: 1.6 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.editorBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 6,
  },
  headerTitle: { color: '#fff', fontSize: 22 },
  segment: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, padding: 4 },
  segBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  segBtnOn: { backgroundColor: colors.primary },
  segTxt: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  segTxtOn: { color: '#fff' },
  stage: { flex: 1, margin: 18 },
  shade: { position: 'absolute', backgroundColor: 'rgba(20,10,25,0.68)' },
  frame: { position: 'absolute', borderWidth: 2, borderColor: '#fff' },
  gridV: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.35)' },
  gridH: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.35)' },
  handle: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
  },
  hint: { color: 'rgba(255,255,255,0.65)', textAlign: 'center', paddingHorizontal: 24, fontSize: 14 },
  emojiRow: { gap: 8, paddingHorizontal: 18, paddingVertical: 12 },
  emojiBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  emojiOn: { backgroundColor: colors.primary, transform: [{ scale: 1.08 }] },
  bar: { flexDirection: 'row', gap: 10, paddingHorizontal: 18 },
});
