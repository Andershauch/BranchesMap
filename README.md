# BranchesMap

Mobil-first POC for et interaktivt kort over Sjællands kommuner, brancher og jobestimater.

## Status

- full-screen kortoplevelse optimeret til mobil
- bottom sheet for kommune-preview og expanded state
- PWA-baseline med manifest, app-ikoner og service worker
- installerbar på Android
- roadmap og sprintstatus vedligeholdes i `roadmap.md`

## Lokalt

Kør udviklingsserver:

```bash
npm run dev
```

Kør på lokalnet til telefon-test:

```bash
npm run dev -- --hostname 0.0.0.0
```

Kør production-build lokalt:

```bash
npm run build
npm run start
```

## PWA-noter

PWA-sporet er bevidst konservativt lige nu:

- `sw.js` hentes uden cache for at gøre opdateringer mere forudsigelige
- navigation går netværk-først med offline-fallback
- statiske PWA-assets caches eksplicit
- appen viser in-app besked ved offline-tilstand og når en ny version er klar

### Hvad der virker offline i øjeblikket

- offline fallback-side
- manifest og app-ikoner
- installeret app-shell kan stadig åbne fallback, hvis netværket mangler

### Hvad der ikke er endeligt afklaret endnu

- om selve kortskallen skal kunne åbne offline i POC'en
- endelig iPhone standalone-QA
- fuld dokumentation af opdateringsflow mellem builds

## Kvalitetschecks

```bash
npm run check:encoding
npm run lint
npm run build
```
