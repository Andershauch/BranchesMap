# JOBVEJ

Mobil-first beta for et interaktivt kort over SjÃ¦llands kommuner, brancher og jobestimater.

## Status

- full-screen kortoplevelse optimeret til mobil
- bottom sheet for kommune-preview og expanded state
- PWA-baseline med manifest, app-ikoner og service worker
- installerbar pÃ¥ Android
- follow-spor med fÃ¸rste version af change detection og in-app status
- kiosk-mode kan aktiveres eksplicit med `?kiosk=1` for reception-touchskÃ¦rme
- kiosk-mode viser QR-handoff og attract-mode uden at pÃ¥virke normal mobilbrug
- roadmap og sprintstatus vedligeholdes i `roadmap.md`

## Runtime-overblik

Appen kÃ¸rer som en `Next.js` App Router-lÃ¸sning med tre primÃ¦re lag:

- `app/` leverer ruter, layouts og server-renderede entrypoints
- `components/` leverer den interaktive klientoplevelse, herunder kort, sheets og kiosk-adfÃ¦rd
- `lib/server/` samler auth, origin checks, sikkerhedsheaders, persistence, rate limiting og integrationslogik
- `prisma/` definerer persistence-modellen for brugere, follows, saved searches, audit og rate-limit buckets
- `scripts/` hÃ¥ndterer import, dataklargÃ¸ring og operationelle hjÃ¦lpekommandoer uden for runtime-pathen

V1-arkitekturen kan lÃ¦ses som fem konkrete spor:

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

Det er bevidst, sÃ¥ kiosk-specifik adfÃ¦rd ikke pÃ¥virker normal mobil- eller desktopbrug.

## MiljÃ¸variabler

V1 krÃ¦ver, at runtime-konfigurationen er eksplicit og ens pÃ¥ tvÃ¦rs af drift og QA.

Kritiske produktionsvariabler:

- `DATABASE_URL` for Postgres
- `APP_BASE_URL` som canonical origin for redirects, auth og QR-relaterede links
- `AUTH_SECRET` til signerede sessioner
- `ADMIN_USER_EMAILS` som allowlist for navngivne admin-konti
- `FOLLOW_CHECK_SECRET` til operationel adgang til follow-check endpointet
- `JOBINDSATS_API_TOKEN` til import af Jobindsats-data

Se ogsÃ¥ `.env.example` og driftsnoterne i `docs/` for miljÃ¸specifikke krav.

## Lokalt

KÃ¸r udviklingsserver:

```bash
npm run dev
```

Hvis `next dev` pÃ¥ din maskine vokser voldsomt i memory eller crasher med `JavaScript heap out of memory`, sÃ¥ brug webpack-baseret dev i stedet:

```bash
npm run dev:webpack
```

Det pÃ¥virker ikke production-builden. Det er kun en lokal fallback til mere stabil udvikling, hvis Next 16/Turbopack opfÃ¸rer sig dÃ¥rligt pÃ¥ din maskine.

KÃ¸r pÃ¥ lokalnet til telefon-test:

```bash
npm run dev -- --hostname 0.0.0.0
```

KÃ¸r production-build lokalt:

```bash
npm run build
npm run start
```

KÃ¸r og test kiosk-entry lokalt:

```text
http://localhost:3000/da?kiosk=1
```

## PWA-noter

PWA-sporet er bevidst konservativt lige nu:

- `sw.js` hentes uden cache for at gÃ¸re opdateringer mere forudsigelige
- navigation gÃ¥r netvÃ¦rk-fÃ¸rst med offline-fallback
- statiske PWA-assets caches eksplicit
- appen viser in-app besked ved offline-tilstand og nÃ¥r en ny version er klar

### Hvad der virker offline i Ã¸jeblikket

- offline fallback-side
- manifest og app-ikoner
- installeret app-shell kan stadig Ã¥bne fallback, hvis netvÃ¦rket mangler

### Hvad der ikke er endeligt afklaret endnu

- om selve kortskallen skal kunne Ã¥bne offline i betaen
- endelig iPhone standalone-QA
- fuld dokumentation af opdateringsflow mellem builds

## Kiosk-mode

Kiosk-mode er lavet til reception-touchskÃ¦rme og er kun aktiv, nÃ¥r siden Ã¥bnes med `?kiosk=1`.

Det betyder:

- QR-handoff-card vises kun i kiosk-mode
- attract-mode og idle reset kÃ¸rer kun i kiosk-mode
- almindelig mobilversion fÃ¥r ikke automatisk idle reset eller QR-overlay
- QR peger pÃ¥ den normale locale-rute, sÃ¥ borgeren fortsÃ¦tter pÃ¥ mobil uden kiosk-flag

Aktuel V1-adfÃ¦rd i kiosk-mode:

- efter cirka `75` sekunders inaktivitet gÃ¥r forsiden i attract-mode
- attract-mode looper mellem op til `5` kommuner
- hver kommune vises i cirka `10` sekunder med skuffen Ã¥ben
- fÃ¸rste touch vÃ¦kker skÃ¦rmen og nulstiller tilbage til normal starttilstand

Det nÃ¦ste vigtige QA-punkt er stadig at verificere det faktiske kiosk-til-mobil-flow pÃ¥ en rigtig telefon.

## Admin-vÃ¦rktÃ¸jer

Admin er nu opdelt i selvstÃ¦ndige arbejdssider:

- `/{locale}/admin` for overblik og hurtige indgange
- `/{locale}/admin/home-map` for kortstyring og attract-mode-kommuner
- `/{locale}/admin/security` for sikkerhedshÃ¦ndelser
- `/{locale}/admin/app-texts` for frontend-systemtekster
- `/{locale}/admin/jobindsats-titles` for Jobindsats-titeloversÃ¦ttelser

### Systemtekster

Frontend-systemtekster kan redigeres direkte i databasen via `admin/app-texts`.

Det vigtige designprincip er:

- filbaserede dictionaries er stadig baseline
- databasen fungerer som runtime-override for godkendte frontend-grupper
- admin kan ikke redigere vilkÃ¥rlige systemtekster, som kode afhÃ¦nger af
- placeholders som `{municipality}` og `{industries}` valideres ved gem
- Ã¦ndringer og reset bliver audit-logget

Se [docs/admin-system-text-workflow.md](docs/admin-system-text-workflow.md) for den fulde arbejdsgang.

## Follow checks

Fase 4A bruger et server-side snapshot af kommuneindholdet til at afgÃ¸re om en fulgt kommune har Ã¦ndret sig.

### V1-felter der tÃ¦ller som Ã¦ndring

- kommune-teaser/profiltekst
- `totalJobs`
- topbrancher og deres rÃ¦kkefÃ¸lge/jobtal
- jobkort under kommunen fordelt pÃ¥ branche

Snapshotlaget er bevidst gjort generisk, sÃ¥ DST kan drive estimatdelen nu, og STAR senere kan drive jobdelen uden at Ã¦ndre follow-modellen.

### Endpoint

`POST /api/follows/check`

Bruges til:

- at checke Ã©t konkret follow
- at checke alle aktive follows i batch
- at drive et senere cron-job

### Autorisation

I production krÃ¦ver endpointet enten:

- headeren `x-follows-check-secret` som matcher `FOLLOW_CHECK_SECRET`
- eller en aktiv admin-session

I lokal udvikling pÃ¥ `localhost` og `127.0.0.1` er endpointet Ã¥bent for at gÃ¸re QA nemmere.

### Eksempler

Batch-check af alle aktive follows lokalt:

```bash
curl -X POST http://localhost:3000/api/follows/check
```

Batch-check med limit:

```bash
curl -X POST "http://localhost:3000/api/follows/check?limit=5"
```

Check af Ã©t follow:

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

### Forventet adfÃ¦rd

- fÃ¸rste kÃ¸rsel initialiserer baseline og sÃ¦tter `lastResultHash`
- nÃ¦ste kÃ¸rsel uden Ã¦ndringer opdaterer kun `lastCheckedAt`
- en Ã¦ndring sÃ¦tter ny hash og markerer followet som ulÃ¦st via `lastNotifiedAt`
- Ã¥bning af kommuneprofil eller `MarkÃ©r som set` nulstiller ulÃ¦st status i v1

## QA-flow for Fase 4A

### 1. Baseline

1. Log ind.
2. FÃ¸lg en kommune.
3. KÃ¸r `POST /api/follows/check`.
4. GÃ¥ til `/da/follows`.

Forventet resultat:

- `Sidst tjekket` vises
- ingen `Ny opdatering` endnu

### 2. Ingen Ã¦ndring

1. KÃ¸r `POST /api/follows/check` igen uden at Ã¦ndre data.
2. GÃ¥ til `/da/follows`.

Forventet resultat:

- `Sidst tjekket` opdateres
- stadig ingen `Ny opdatering`

### 3. Ã†ndret snapshot

Lav en kontrolleret Ã¦ndring i en kommune, fx:

- Ã¦ndr teaser
- Ã¦ndr jobCount i en topbranche
- Ã¦ndr rÃ¦kkefÃ¸lge i top-3 brancher

KÃ¸r derefter `POST /api/follows/check` igen.

Forventet resultat:

- `/da/follows` viser `Ny opdatering`
- Ã¥bning af kommuneprofil nulstiller status
- `MarkÃ©r som set` nulstiller ogsÃ¥ status

## Kvalitetschecks

```bash
npm run check:encoding
npm run lint
npx tsc --noEmit
npm run build
```

