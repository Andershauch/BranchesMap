# BranchesMap

Mobil-first POC for et interaktivt kort over Sjællands kommuner, brancher og jobestimater.

## Status

- full-screen kortoplevelse optimeret til mobil
- bottom sheet for kommune-preview og expanded state
- PWA-baseline med manifest, app-ikoner og service worker
- installerbar på Android
- follow-spor med første version af change detection og in-app status
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

## Follow checks

Fase 4A bruger et server-side snapshot af kommuneindholdet til at afgøre om en fulgt kommune har ændret sig.

### V1-felter der tæller som ændring

- kommune-teaser/profiltekst
- `totalJobs`
- topbrancher og deres rækkefølge/jobtal
- jobkort under kommunen fordelt på branche

Snapshotlaget er bevidst gjort generisk, så DST kan drive estimatdelen nu, og STAR senere kan drive jobdelen uden at ændre follow-modellen.

### Endpoint

`POST /api/follows/check`

Bruges til:

- at checke ét konkret follow
- at checke alle aktive follows i batch
- at drive et senere cron-job

### Autorisation

I production kræver endpointet enten:

- headeren `x-follows-check-secret` som matcher `FOLLOW_CHECK_SECRET`
- eller en aktiv admin-session

I lokal udvikling på `localhost` og `127.0.0.1` er endpointet åbent for at gøre QA nemmere.

### Eksempler

Batch-check af alle aktive follows lokalt:

```bash
curl -X POST http://localhost:3000/api/follows/check
```

Batch-check med limit:

```bash
curl -X POST "http://localhost:3000/api/follows/check?limit=5"
```

Check af ét follow:

```bash
curl -X POST http://localhost:3000/api/follows/check \
  -H "Content-Type: application/json" \
  -d "{\"followId\":\"<follow-id>\"}"
```

Production-eksempel med secret:

```bash
curl -X POST https://your-domain.example/api/follows/check \
  -H "x-follows-check-secret: $FOLLOW_CHECK_SECRET"
```

### Forventet adfærd

- første kørsel initialiserer baseline og sætter `lastResultHash`
- næste kørsel uden ændringer opdaterer kun `lastCheckedAt`
- en ændring sætter ny hash og markerer followet som ulæst via `lastNotifiedAt`
- åbning af kommuneprofil eller `Markér som set` nulstiller ulæst status i v1

## QA-flow for Fase 4A

### 1. Baseline

1. Log ind.
2. Følg en kommune.
3. Kør `POST /api/follows/check`.
4. Gå til `/da/follows`.

Forventet resultat:

- `Sidst tjekket` vises
- ingen `Ny opdatering` endnu

### 2. Ingen ændring

1. Kør `POST /api/follows/check` igen uden at ændre data.
2. Gå til `/da/follows`.

Forventet resultat:

- `Sidst tjekket` opdateres
- stadig ingen `Ny opdatering`

### 3. Ændret snapshot

Lav en kontrolleret ændring i en kommune, fx:

- ændr teaser
- ændr jobCount i en topbranche
- ændr rækkefølge i top-3 brancher

Kør derefter `POST /api/follows/check` igen.

Forventet resultat:

- `/da/follows` viser `Ny opdatering`
- åbning af kommuneprofil nulstiller status
- `Markér som set` nulstiller også status

## Kvalitetschecks

```bash
npm run check:encoding
npm run lint
npm run build
```
