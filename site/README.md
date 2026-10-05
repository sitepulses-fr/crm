# SITE PULSE — site vitrine immersif « Le Signal »

Expérience scroll-narrative : une seule ligne de pouls traverse tout le site.
Le concept complet (direction artistique, storytelling, scénario motion, mobile, technique) est dans [`CONCEPT.md`](CONCEPT.md).

## Lancer

```bash
npx serve site            # ou : python3 -m http.server -d site 8000
```

Aucun build : HTML/CSS/JS statiques. GSAP, ScrollTrigger et Lenis sont embarqués dans `vendor/`.

## À personnaliser

- E-mail de contact : `SP.CONTACT_EMAIL` en tête de `js/core.js`.
- Le cas « Atelier Morel » et les chiffres de la section 04 sont **illustratifs** : à remplacer par de vrais cas clients.
