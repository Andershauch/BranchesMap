# JOBVEJ

Mobil-first POC for et interaktivt kort over Sjællands kommuner, brancher og jobestimater.

## Status

- full-screen kortoplevelse optimeret til mobil
- bottom sheet for kommune-preview og expanded state
- PWA-baseline med manifest, app-ikoner og service worker
- installerbar på Android
- follow-spor med første version af change detection og in-app status
- kiosk-mode kan aktiveres eksplicit med `?kiosk=1` for reception-touchskærme
- kiosk-mode viser QR-handoff og attract-mode uden at påvirke normal mobilbrug
- roadmap og sprintstatus vedligeholdes i `roadmap.md`

## Runtime-overblik

Appen kører som en `Next.js` App Router-løsning med tre primære lag:

- `app/` leverer ruter, layouts og server-renderede entrypoints
- `components/` leverer den interaktive klientoplevelse, herunder kort, sheets og kiosk-adfærd
- `lib/server/` samler auth, origin checks, sikkerhedsheaders, persistence, rate limiting og integrationslogik
- `prisma/` definerer persistence-modellen for brugere, follows, saved searches, audit og rate-limit buckets
- `scripts/` håndterer import, dataklargøring og operationelle hjælpekommandoer uden for runtime-pathen

V1-arkitekturen kan læses som fem konkrete spor:

- route-lag: locale-ruter, API-ruter og server-renderede entrypoints
- klient-lag: kort, sheets, kiosk/QR-flow og anden brugerinteraktion
- server-lag: auth, validation, redirects, origin guards, rate limiting og sikkerhedsheaders
- persistence-lag: Postgres via Prisma
- job/ops-lag: GeoJSON-prep, Jobindsats-import, follow-checks og supportkommandoer

Det offentlige standard-entrypoint er locale-ruten, fx `/da`.
Reception/kiosk-entrypoint er den samme rute med eksplicit kiosk-flag:

```text
/da?kiosk=1
```

Det er bevidst, så kiosk-specifik adfærd ikke påvirker normal mobil- eller desktopbrug.

## Miljøvariabler

V1 kræver, at runtime-konfigurationen er eksplicit og ens på tværs af drift og QA.

Kritiske produktionsvariabler:

- `DATABASE_URL` for Postgres
- `APP_BASE_URL` som canonical origin for redirects, auth og QR-relaterede links
- `AUTH_SECRET` til signerede sessioner
- `ADMIN_USER_EMAILS` som allowlist for navngivne admin-konti
- `FOLLOW_CHECK_SECRET` til operationel adgang til follow-check endpointet
- `JOBINDSATS_API_TOKEN` til import af Jobindsats-data

Se også `.env.example` og driftsnoterne i `docs/` for miljøspecifikke krav.

## Lokalt

Kør udviklingsserver:

```bash
npm run dev
```

Hvis `next dev` på din maskine vokser voldsomt i memory eller crasher med `JavaScript heap out of memory`, så brug webpack-baseret dev i stedet:

```bash
npm run dev:webpack
```

Det påvirker ikke production-builden. Det er kun en lokal fallback til mere stabil udvikling, hvis Next 16/Turbopack opfører sig dårligt på din maskine.

Kør på lokalnet til telefon-test:

```bash
npm run dev -- --hostname 0.0.0.0
```

Kør production-build lokalt:

```bash
npm run build
npm run start
```

Kør og test kiosk-entry lokalt:

```text
http://localhost:3000/da?kiosk=1
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

## Kiosk-mode

Kiosk-mode er lavet til reception-touchskærme og er kun aktiv, når siden åbnes med `?kiosk=1`.

Det betyder:

- QR-handoff-card vises kun i kiosk-mode
- attract-mode og idle reset kører kun i kiosk-mode
- almindelig mobilversion får ikke automatisk idle reset eller QR-overlay
- QR peger på den normale locale-rute, så borgeren fortsætter på mobil uden kiosk-flag

Aktuel V1-adfærd i kiosk-mode:

- efter cirka `75` sekunders inaktivitet går forsiden i attract-mode
- attract-mode looper mellem op til `5` kommuner
- hver kommune vises i cirka `10` sekunder med skuffen åben
- første touch vækker skærmen og nulstiller tilbage til normal starttilstand

Det næste vigtige QA-punkt er stadig at verificere det faktiske kiosk-til-mobil-flow på en rigtig telefon.

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
npx tsc --noEmit
npm run build
```
