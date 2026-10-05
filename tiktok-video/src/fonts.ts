import { continueRender, delayRender, staticFile } from 'remotion';

const FACES: [string, string, string][] = [
  ['Inter', '500', 'inter-latin-500-normal.woff2'],
  ['Inter', '700', 'inter-latin-700-normal.woff2'],
  ['Inter', '800', 'inter-latin-800-normal.woff2'],
  ['Inter', '900', 'inter-latin-900-normal.woff2'],
  ['Roboto', '400', 'roboto-latin-400-normal.woff2'],
  ['Roboto', '500', 'roboto-latin-500-normal.woff2'],
  ['Roboto', '700', 'roboto-latin-700-normal.woff2'],
];

let promise: Promise<void> | null = null;

/** Charge les polices locales une seule fois ; bloque le rendu tant qu'elles ne sont pas prêtes. */
export function loadFonts(): Promise<void> {
  if (promise) return promise;
  const handle = delayRender('Chargement des polices');
  promise = Promise.all(
    FACES.map(async ([family, weight, file]) => {
      const face = new FontFace(family, `url(${staticFile(`fonts/${file}`)}) format('woff2')`, { weight });
      await face.load();
      document.fonts.add(face);
    }),
  ).then(() => continueRender(handle));
  return promise;
}
