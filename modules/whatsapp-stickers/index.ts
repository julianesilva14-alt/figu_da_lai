import { Platform, requireOptionalNativeModule, type EventSubscription } from 'expo';

type AddResult = { ok: boolean; error: string | null };

type NativeModule = {
  isWhatsAppInstalled(): boolean;
  addStickerPack(packId: string, packName: string): Promise<void>;
  addListener(event: 'onAddResult', cb: (r: AddResult) => void): EventSubscription;
};

// Opcional: no Expo Go (ou no iPhone) o módulo nativo não existe.
const native = requireOptionalNativeModule<NativeModule>('WhatsappStickers');

export const whatsappAvailable = Platform.OS === 'android' && native != null;

export function isWhatsAppInstalled(): boolean {
  return native?.isWhatsAppInstalled() ?? false;
}

/** Abre o WhatsApp pedindo para adicionar o pacote e espera a resposta. */
export function addStickerPack(packId: string, packName: string): Promise<AddResult> {
  if (!native) {
    return Promise.reject(new Error('Disponível só no app instalado (APK), não no Expo Go.'));
  }
  return new Promise((resolve, reject) => {
    const sub = native.addListener('onAddResult', (r) => {
      sub.remove();
      resolve(r);
    });
    native.addStickerPack(packId, packName).catch((e) => {
      sub.remove();
      reject(e);
    });
  });
}
