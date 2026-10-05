// Utilitaires partagés par les scripts de rendu.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveConfig, voiceLinesDir } from '../src/resolveConfig.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** --metier=plombier --ville="Besançon" --out=... --frames=0-90 */
export function parseArgs(argv = process.argv.slice(2)) {
  const args = {};
  for (const a of argv) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) args[m[1]] = m[2] ?? true;
  }
  return args;
}

export function loadConfig() {
  return JSON.parse(fs.readFileSync(path.join(root, 'config.json'), 'utf8'));
}

/** Props finales de la composition (config + surcharges CLI + voix off détectée). */
export function buildProps(config, args) {
  const base = resolveConfig(config, { metier: args.metier, ville: args.ville });
  let mode = null;
  if (!args['sans-voix']) {
    // Un voiceover.mp3 unique ne vaut que pour le métier/ville du config.json.
    const sameTarget = base.slug === resolveConfig(config).slug;
    if (sameTarget && fs.existsSync(path.join(root, 'public', config.voixOff.fichier))) mode = 'fichier';
    else if (fs.existsSync(path.join(root, 'public', voiceLinesDir(base.slug), 'line-1.mp3'))) mode = 'lignes';
  }
  return { ...base, voixOff: { ...base.voixOff, mode } };
}

/** Options navigateur : WebGL logiciel (SwiftShader) sous Linux sans GPU, ANGLE ailleurs. */
export function browserOptions(args) {
  const gl = args.gl || process.env.REMOTION_GL || (process.platform === 'linux' ? 'swangle' : 'angle');
  const browserExecutable = args.browser || process.env.REMOTION_BROWSER_EXECUTABLE || null;
  return { chromiumOptions: { gl }, browserExecutable };
}

export function defaultConcurrency(args) {
  if (args.concurrency) return Number(args.concurrency);
  return Math.max(1, Math.min(8, Math.floor(os.cpus().length / 2)));
}

/** Prépare polices + sound design si absents (premier lancement). */
export async function ensureAssets() {
  const { execFileSync } = await import('node:child_process');
  if (!fs.existsSync(path.join(root, 'public', 'fonts', 'geist-mono-500.typeface.json'))) {
    execFileSync(process.execPath, [path.join(root, 'scripts', 'prepare-fonts.mjs')], { stdio: 'inherit' });
  }
  if (!fs.existsSync(path.join(root, 'public', 'audio', 'sfx', 'drone.wav'))) {
    execFileSync(process.execPath, [path.join(root, 'scripts', 'generate-sfx.mjs')], { stdio: 'inherit' });
  }
}

/** Identifiant de composition selon le style choisi (config.rendu.style ou --style=). */
export function compositionId(config, args) {
  const style = args.style || config.rendu.style || 'minimal';
  if (style === 'montage') return 'MontageFacecam';
  return style === 'illustre' ? 'SitePulseMaps' : 'SitePulseMinimal';
}

export async function bundleProject() {
  const { bundle } = await import('@remotion/bundler');
  return bundle({ entryPoint: path.join(root, 'src', 'index.ts'), publicDir: path.join(root, 'public') });
}
