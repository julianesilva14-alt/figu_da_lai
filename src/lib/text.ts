import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Bangers_400Regular } from '@expo-google-fonts/bangers';
import { Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Pacifico_400Regular } from '@expo-google-fonts/pacifico';
import { PermanentMarker_400Regular } from '@expo-google-fonts/permanent-marker';
import { PaintStyle, Skia, SkCanvas, SkTypeface, StrokeJoin, useTypeface } from '@shopify/react-native-skia';

export type FontKey = 'anton' | 'fredoka' | 'bangers' | 'marker' | 'pacifico';

/** `rn` é o nome da fonte carregada no app (para mostrar os botões no estilo da fonte). */
export const FONTS: { key: FontKey; label: string; rn: string }[] = [
  { key: 'anton', label: 'Meme', rn: 'Anton_400Regular' },
  { key: 'fredoka', label: 'Fofa', rn: 'Fredoka_700Bold' },
  { key: 'bangers', label: 'Gibi', rn: 'Bangers_400Regular' },
  { key: 'marker', label: 'Caneta', rn: 'PermanentMarker_400Regular' },
  { key: 'pacifico', label: 'Chique', rn: 'Pacifico_400Regular' },
];

/** Fontes para carregar no app (expo-font). */
export const RN_FONTS = {
  Anton_400Regular,
  Fredoka_700Bold,
  Bangers_400Regular,
  PermanentMarker_400Regular,
  Pacifico_400Regular,
};

export type TextLayer = {
  text: string;
  font: FontKey;
  color: string;
  /** Cor do contorno; null = sem contorno. */
  outline: string | null;
  /** Tamanho da letra, em pixels da figurinha (o quadro tem 512). */
  size: number;
  /** Centro do texto, em pixels da figurinha. */
  x: number;
  y: number;
};

export type Typefaces = Record<FontKey, SkTypeface>;

/** Carrega as fontes para o Skia desenhar. Retorna null enquanto carrega. */
export function useStickerTypefaces(): Typefaces | null {
  const anton = useTypeface(Anton_400Regular);
  const fredoka = useTypeface(Fredoka_700Bold);
  const bangers = useTypeface(Bangers_400Regular);
  const marker = useTypeface(PermanentMarker_400Regular);
  const pacifico = useTypeface(Pacifico_400Regular);
  if (!anton || !fredoka || !bangers || !marker || !pacifico) return null;
  return { anton, fredoka, bangers, marker, pacifico };
}

/** Desenha o texto (com contorno opcional) centralizado em (x, y). Aceita várias linhas. */
export function drawTextLayer(canvas: SkCanvas, layer: TextLayer, typefaces: Typefaces) {
  const lines = layer.text.split('\n');
  if (!layer.text.trim()) return;
  const font = Skia.Font(typefaces[layer.font], layer.size);
  const m = font.getMetrics();
  const lineH = m.descent - m.ascent;
  let baseline = layer.y - (lineH * lines.length) / 2 - m.ascent;

  const fill = Skia.Paint();
  fill.setAntiAlias(true);
  fill.setColor(Skia.Color(layer.color));

  const stroke = Skia.Paint();
  stroke.setAntiAlias(true);
  stroke.setStyle(PaintStyle.Stroke);
  stroke.setStrokeJoin(StrokeJoin.Round);
  stroke.setStrokeWidth(Math.max(3, layer.size * 0.18));
  stroke.setColor(Skia.Color(layer.outline ?? 'transparent'));

  for (const line of lines) {
    const w = font.measureText(line).width;
    const x = layer.x - w / 2;
    if (layer.outline) canvas.drawText(line, x, baseline, stroke, font);
    canvas.drawText(line, x, baseline, fill, font);
    baseline += lineH;
  }
}
