import { FilterMode, ImageFormat, MipmapMode, Skia, SkCanvas, SkImage } from '@shopify/react-native-skia';
import { File } from 'expo-file-system';
import { drawTextLayer, TextLayer, Typefaces } from './text';

/** Regras do WhatsApp. */
export const STICKER_SIZE = 512; // figurinha: 512x512 WebP, até 100 KB
const STICKER_MAX_BYTES = 100 * 1024;
export const TRAY_SIZE = 96; // ícone do pacote: 96x96 PNG, até 50 KB

export type Crop = { x: number; y: number; w: number; h: number };

export async function loadImageFromUri(uri: string): Promise<SkImage> {
  const img = Skia.Image.MakeImageFromEncoded(await Skia.Data.fromURI(uri));
  if (!img) throw new Error('Não foi possível abrir a imagem');
  return img;
}

function loadImageFromFile(file: File): SkImage {
  const img = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBase64(file.base64Sync()));
  if (!img) throw new Error('Não foi possível abrir a figurinha');
  return img;
}

/** Desenha `crop` da imagem encostando nas bordas de um quadro `size`x`size`. */
export function drawCropFilled(canvas: SkCanvas, image: SkImage, crop: Crop, size: number) {
  const scale = size / Math.max(crop.w, crop.h);
  const dw = crop.w * scale;
  const dh = crop.h * scale;
  canvas.drawImageRectOptions(
    image,
    Skia.XYWHRect(crop.x, crop.y, crop.w, crop.h),
    Skia.XYWHRect((size - dw) / 2, (size - dh) / 2, dw, dh),
    FilterMode.Linear,
    MipmapMode.Linear,
  );
}

function drawFilled(image: SkImage, crop: Crop, size: number, extra?: (c: SkCanvas) => void) {
  const surface = Skia.Surface.Make(size, size);
  if (!surface) throw new Error('Falha ao criar a imagem');
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color('transparent'));
  drawCropFilled(canvas, image, crop, size);
  extra?.(canvas);
  surface.flush();
  return surface.makeImageSnapshot();
}

/**
 * Gera a figurinha SEM margem e SEM contorno branco: o recorte é ampliado até
 * encostar na borda do quadro. O texto (se houver) é desenhado por cima. Quadrado → ocupa 100%. Retângulo → o lado maior
 * encosta na borda e o que sobra fica transparente.
 * Retorna o WebP em base64, já abaixo do limite de 100 KB.
 */
export function renderSticker(
  image: SkImage,
  crop: Crop,
  text?: { layer: TextLayer; typefaces: Typefaces } | null,
): string {
  const snapshot = drawFilled(image, crop, STICKER_SIZE, (c) => {
    if (text) drawTextLayer(c, text.layer, text.typefaces);
  });
  let base64 = '';
  for (const quality of [95, 90, 85, 80, 70, 60, 50, 40, 30]) {
    base64 = snapshot.encodeToBase64(ImageFormat.WEBP, quality);
    if (base64.length * 0.75 <= STICKER_MAX_BYTES) break;
  }
  return base64;
}

/** Ícone do pacote (PNG 96x96) feito a partir de uma figurinha. */
export function renderTray(stickerFile: File): string {
  const img = loadImageFromFile(stickerFile);
  const snapshot = drawFilled(img, { x: 0, y: 0, w: img.width(), h: img.height() }, TRAY_SIZE);
  return snapshot.encodeToBase64(ImageFormat.PNG, 100);
}
