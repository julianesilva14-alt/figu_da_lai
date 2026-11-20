import { Directory, File, Paths } from 'expo-file-system';
import { useSyncExternalStore } from 'react';
import { renderTray } from './render';

/**
 * Os pacotes ficam em <documentos>/packs/packs.json e as imagens em
 * <documentos>/packs/<id>/. O módulo nativo do Android lê essa mesma pasta
 * para entregar os pacotes ao WhatsApp — então o formato precisa bater com
 * modules/whatsapp-stickers/.../StickerContentProvider.kt.
 */
export type Sticker = { file: string; emojis: string[] };
export type Pack = {
  id: string;
  name: string;
  publisher: string;
  tray: string;
  /** Muda a cada alteração para o WhatsApp recarregar o pacote. */
  version: number;
  stickers: Sticker[];
};

export const MIN_STICKERS = 3;
export const MAX_STICKERS = 30;
const PUBLISHER = 'Figu da Lai';
const TRAY_FILE = 'tray.png';

const root = () => ensureDir(new Directory(Paths.document, 'packs'));
const indexFile = () => new File(root(), 'packs.json');
const packDir = (id: string) => ensureDir(new Directory(root(), id));

function ensureDir(dir: Directory) {
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

export function stickerUri(packId: string, file: string) {
  return new File(packDir(packId), file).uri;
}

// ---- Armazenamento + "store" reativo -------------------------------------

let cache: Pack[] | null = null;
const listeners = new Set<() => void>();

function readDisk(): Pack[] {
  const f = indexFile();
  if (f.exists) return JSON.parse(f.textSync()).packs as Pack[];
  return migrateLooseStickers();
}

function getPacks(): Pack[] {
  if (!cache) cache = readDisk();
  return cache;
}

function writeDisk(packs: Pack[]) {
  const f = indexFile();
  if (!f.exists) f.create();
  f.writeSync(JSON.stringify({ packs }));
}

function commit(next: Pack[]) {
  cache = next;
  writeDisk(next);
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePacks(): Pack[] {
  return useSyncExternalStore(subscribe, getPacks);
}

export function usePack(id: string | undefined): Pack | undefined {
  return usePacks().find((p) => p.id === id);
}

function updatePack(id: string, fn: (p: Pack) => Pack) {
  commit(getPacks().map((p) => (p.id === id ? fn(p) : p)));
}

// ---- Ações -----------------------------------------------------------------

export function createPack(name: string): Pack {
  const pack: Pack = {
    id: `pack_${Date.now()}`,
    name: name.trim().slice(0, 128) || 'Meu pacote',
    publisher: PUBLISHER,
    tray: TRAY_FILE,
    version: 1,
    stickers: [],
  };
  packDir(pack.id);
  commit([pack, ...getPacks()]);
  return pack;
}

export function renamePack(id: string, name: string) {
  const clean = name.trim().slice(0, 128);
  if (!clean) return;
  updatePack(id, (p) => ({ ...p, name: clean, version: p.version + 1 }));
}

export function deletePack(id: string) {
  const dir = new Directory(root(), id);
  if (dir.exists) dir.delete();
  commit(getPacks().filter((p) => p.id !== id));
}

/** Refaz o ícone do pacote a partir da primeira figurinha. */
function refreshTray(packId: string, stickers: Sticker[]) {
  const tray = new File(packDir(packId), TRAY_FILE);
  if (!stickers.length) {
    if (tray.exists) tray.delete();
    return;
  }
  const base64 = renderTray(new File(packDir(packId), stickers[0].file));
  if (!tray.exists) tray.create();
  tray.writeSync(base64, { encoding: 'base64' });
}

export function addSticker(packId: string, webpBase64: string, emoji: string) {
  const name = `${Date.now()}.webp`;
  const file = new File(packDir(packId), name);
  file.create();
  file.writeSync(webpBase64, { encoding: 'base64' });
  updatePack(packId, (p) => {
    const stickers = [...p.stickers, { file: name, emojis: [emoji] }];
    if (stickers.length === 1) refreshTray(packId, stickers);
    return { ...p, stickers, version: p.version + 1 };
  });
}

export function removeSticker(packId: string, fileName: string) {
  updatePack(packId, (p) => {
    const wasFirst = p.stickers[0]?.file === fileName;
    const stickers = p.stickers.filter((s) => s.file !== fileName);
    const f = new File(packDir(packId), fileName);
    if (f.exists) f.delete();
    if (wasFirst) refreshTray(packId, stickers);
    return { ...p, stickers, version: p.version + 1 };
  });
}

// ---- Migração da primeira versão (figurinhas soltas) ----------------------

function migrateLooseStickers(): Pack[] {
  const old = new Directory(Paths.document, 'figurinhas');
  if (!old.exists) return [];
  const files = old.list().filter((f): f is File => f instanceof File && f.name.endsWith('.webp'));
  if (!files.length) return [];

  const id = `pack_${Date.now()}`;
  const stickers: Sticker[] = files.map((f) => {
    const dest = new File(packDir(id), f.name);
    dest.create();
    dest.writeSync(f.base64Sync(), { encoding: 'base64' });
    return { file: f.name, emojis: ['😀'] };
  });
  old.delete();
  refreshTray(id, stickers);
  const packs: Pack[] = [
    { id, name: 'Minhas figurinhas', publisher: PUBLISHER, tray: TRAY_FILE, version: 1, stickers },
  ];
  writeDisk(packs); // sem notificar: isto roda durante a primeira leitura
  return packs;
}
