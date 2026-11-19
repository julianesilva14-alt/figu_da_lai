# Figu da Lai ✨

App Android para criar figurinhas de WhatsApp **grandes, sem a borda branca** — o recorte é ampliado até encostar na borda do quadro de 512×512.

## O que faz

- Pacotes de figurinhas (3 a 30 por pacote, regra do WhatsApp)
- Foto da galeria ou da câmera
- Recorte com retângulo ajustável: **Quadrado** (ocupa o quadro todo) ou **Livre** (sobra transparente, nunca branca)
- Emoji por figurinha (usado na busca do WhatsApp)
- Botão **Adicionar ao WhatsApp**

## Estrutura

| Caminho | O quê |
|---|---|
| `src/app/` | Telas (Expo Router): início, pacote, editor |
| `src/components/CropEditor.tsx` | Tela de recorte |
| `src/lib/render.ts` | Gera a figurinha (WebP 512×512 ≤ 100 KB) e o ícone do pacote (PNG 96×96) |
| `src/lib/packs.ts` | Salva os pacotes em `<documentos>/packs/` |
| `modules/whatsapp-stickers/` | Módulo nativo Android: `ContentProvider` que o WhatsApp lê + intent para adicionar o pacote |

## Rodando

```bash
npm install
npx expo start          # abre no app de desenvolvimento instalado no celular
```

O envio ao WhatsApp só funciona num build próprio (não no Expo Go):

```bash
npx eas-cli@latest build --profile development --platform android   # APK de teste
npx eas-cli@latest build --profile preview --platform android       # APK final para instalar
```
