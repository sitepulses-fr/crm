// Transforme config.json en props complètes pour la composition.
// Fichier JS pur (ESM) : partagé entre Remotion (navigateur) et les scripts Node.

/** Générateur pseudo-aléatoire déterministe (même métier + ville = même vidéo). */
export function seededRandom(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let s = h >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const normalize = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const slugify = (s) => normalize(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Nom d'activité utilisé pour composer des raisons sociales crédibles.
const ACTIVITES = {
  couvreur: ['Couverture', 'Toitures', 'Charpente & Couverture'],
  'couvreur zingueur': ['Couverture Zinguerie', 'Toitures', 'Zinguerie'],
  charpentier: ['Charpente', 'Bois & Charpente', 'Ossature Bois'],
  plombier: ['Plomberie', 'Plomberie Sanitaire', 'Dépannage Plomberie'],
  chauffagiste: ['Chauffage', 'Thermique', 'Chauffage & Clim'],
  electricien: ['Électricité', 'Élec Services', 'Électricité Générale'],
  menuisier: ['Menuiserie', 'Menuiserie Bois & Alu', 'Fenêtres & Portes'],
  peintre: ['Peinture', 'Peinture & Déco', 'Revêtements'],
  macon: ['Maçonnerie', 'Bâtiment', 'Gros Œuvre'],
  carreleur: ['Carrelage', 'Sols & Carrelage', 'Faïence & Carrelage'],
  serrurier: ['Serrurerie', 'Serrurerie Dépannage', 'Métallerie'],
  paysagiste: ['Paysage', 'Jardins & Paysages', 'Espaces Verts'],
  plaquiste: ['Plâtrerie', 'Isolation & Plâtrerie', 'Placo'],
  vitrier: ['Miroiterie', 'Vitrerie', 'Verre & Vitrage'],
  ramoneur: ['Ramonage', 'Ramonage & Fumisterie', 'Conduits'],
  terrassier: ['Terrassement', 'TP', 'Travaux Publics'],
  facadier: ['Façades', 'Ravalement', 'Enduits & Façades'],
  cuisiniste: ['Cuisines', 'Cuisines & Bains', 'Agencement'],
};

const NOMS = [
  'Martin', 'Bernard', 'Moreau', 'Girard', 'Roux', 'Fournier', 'Lambert', 'Bonnet',
  'Faure', 'Mercier', 'Blanc', 'Guérin', 'Muller', 'Perrin', 'Chevalier', 'Garnier',
  'Rousseau', 'Vincent', 'Lefèvre', 'Masson', 'Boyer', 'Gauthier', 'Picard', 'Renaud',
];

const RUES = [
  'Rue de la République', 'Avenue de Lahr', 'Rue des Arènes', 'Rue Pasteur',
  'Avenue Jean Jaurès', 'Rue du Collège', 'Boulevard Wilson', 'Rue de Besançon',
  'Rue des Tanneurs', 'Chemin des Vignes', 'Rue Victor Hugo', 'Route de Dijon',
];

const MOTIFS = [
  (n, a) => `${a} ${n}`,
  (n, a, v) => `${a} ${v}`,
  (n) => `${n} & Fils`,
  (n, a) => `${n} ${a}`,
  (n) => `Atelier ${n}`,
  (n, a, v) => `${v} ${a} Services`,
  (n) => `Ets ${n}`,
  (n) => `${n} Rénovation`,
  (n, a) => `${a} ${n} & Associés`,
];

function shuffle(arr, rand) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 8 fiches type Google Maps : les 3 premières ont les meilleures notes. */
export function generateBusinesses(metier, ville, customNames = []) {
  const rand = seededRandom(`${normalize(metier)}|${normalize(ville)}`);
  const activites = ACTIVITES[normalize(metier)] ?? [capitalize(metier)];
  const noms = shuffle(NOMS, rand);
  const motifs = shuffle(MOTIFS, rand);
  const rues = shuffle(RUES, rand);
  const count = Math.max(8, customNames.length);

  const names = [];
  for (let i = 0; names.length < count; i++) {
    if (customNames[i]) { names.push(customNames[i]); continue; }
    const motif = motifs[i % motifs.length];
    const candidate = motif(noms[i % noms.length], activites[i % activites.length], ville);
    if (!names.includes(candidate)) names.push(candidate);
  }

  return names.map((nom, i) => {
    const top = i < 3;
    const note = top
      ? [4.9, 4.8, 4.8][i]
      : Math.round((3.6 + rand() * 0.9) * 10) / 10;
    const avis = top
      ? [214, 167, 139][i] - Math.floor(rand() * 30)
      : 2 + Math.floor(rand() * 27);
    const ferme = ['18:00', '18:30', '19:00', '17:30'][Math.floor(rand() * 4)];
    const ouvert = top || rand() > 0.35;
    return {
      nom,
      note,
      avis,
      categorie: capitalize(metier),
      adresse: `${1 + Math.floor(rand() * 48)} ${rues[i % rues.length]}`,
      statut: ouvert ? 'Ouvert' : 'Fermé',
      horaire: ouvert ? `Ferme à ${ferme}` : 'Ouvre à 08:00',
      distance: `${(0.4 + rand() * 6).toFixed(1).replace('.', ',')} km`,
    };
  });
}

export function fillTemplate(text, vars) {
  return String(text).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

/**
 * @param {any} config contenu de config.json
 * @param {{metier?: string, ville?: string, voixOffMode?: 'fichier'|'lignes'|null}} overrides
 */
export function resolveConfig(config, overrides = {}) {
  const metier = (overrides.metier ?? config.metier).trim();
  const ville = (overrides.ville ?? config.ville).trim();
  const t = config.textes;
  const vars = {
    metier,
    Metier: capitalize(metier),
    ville,
    article: config.article ?? 'un',
    preposition: config.prepositionVille ?? 'à',
    motCle: t.motCle,
  };
  const fill = (s) => fillTemplate(s, vars);
  const sameVille = normalize(ville) === normalize(config.ville);
  const sameMetier = normalize(metier) === normalize(config.metier);
  // Des noms personnalisés n'ont de sens que pour le couple métier/ville du fichier.
  const customNames = sameVille && sameMetier ? config.entreprises ?? [] : [];

  return {
    metier,
    ville,
    slug: `${slugify(metier)}-${slugify(ville)}`,
    hook: fill(t.hook),
    recherche: fill(t.recherche).toLowerCase(),
    legendes: t.legendes.map((l) => ({ ...l, texte: fill(l.texte) })),
    punchline: t.punchline.map(fill),
    punchlineAccent: t.punchlineAccent,
    cta: fill(t.cta),
    ctaSuite: fill(t.ctaSuite),
    motCle: t.motCle,
    entreprises: generateBusinesses(metier, ville, customNames),
    marque: config.marque,
    audio: config.audio,
    voixOff: {
      mode: overrides.voixOffMode ?? null,
      fichier: config.voixOff.fichier,
      volume: config.voixOff.volume ?? 1,
      lignes: config.voixOff.lignes.map((l) => ({ ...l, texte: fill(l.texte) })),
    },
    qualite3D: config.rendu.qualite3D ?? 'haute',
    afficherZonesSures: Boolean(config.rendu.afficherZonesSures),
  };
}

/** Dossier des pistes de voix off générées phrase par phrase. */
export const voiceLinesDir = (slug) => `audio/vo/${slug}`;
