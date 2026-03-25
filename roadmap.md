# Sjællandskort App Roadmap

## Første fundamentkrav - danske tegn og UTF-8

Hele projektet skal fra dag 1 kunne håndtere danske tegn korrekt, inklusive `æ`, `ø`, `å`, `Æ`, `Ø`, `Å` og andre almindelige Unicode-tegn.

### Regler vi følger

- Alle tekstfiler i repoet gemmes som UTF-8.
- Markdown, TypeScript, JSON, SQL, Prisma, GeoJSON og seed-data skal kunne indeholde danske tegn direkte.
- API-svar og importerede data skal behandles som UTF-8.
- Postgres/Neon skal verificeres til Unicode-kompatibel tekstlagring.
- UI-fonte skal understøtte danske tegn uden fallback-fejl.
- Vi bruger rigtige danske tegn i indhold og oversættelser, ikke `ae`, `oe`, `aa`, medmindre et eksternt system kræver det.
- Vi laver tidligt en lille testpakke med eksempeltekster som `Rødovre`, `Køge`, `Næstved`, `Ærø`, `Smørrebrød` og `Blåbærgrød`.

### Konsekvens for projektet

Dette er ikke bare en tekstregel. Det påvirker:

- filkodning
- databasevalg
- import pipelines
- søgning og sortering
- fonts og rendering
- flersprog og AI-oversættelser

## Formål

Vi bygger en mobilvenlig app, som også kan bruges som webapp på en URL, men som føles som en native app, når den åbnes på telefonen.

POC'en skal kunne:

- vise et kort over Sjælland med kommuner
- vise 3 topbrancher som ikoner oven på hver kommune
- åbne en kommune-side med brancheoversigt og jobs
- køre med mock-data, indtil de rigtige datakilder er klar
- være bygget på en sikker base, så login og gemte søgninger kan tilføjes uden stor omskrivning

## Produktprincipper

1. POC først, men uden at male os ind i et hjørne.
2. Sikkerhed fra dag 1, også selvom login ikke er fuldt lanceret i fase 1.
3. En kodebase til både mobil web og installerbar app-oplevelse.
4. Data og geografi holdes adskilt, så vi senere kan udskifte datakilder uden at tegne kortet om.
5. Flersprog bygges strukturelt ind fra starten, men AI må ikke være eneste sandhedskilde for UI-tekster.
6. Dansk tegnsæt og korrekt Unicode-behandling er et fast kvalitetskrav.

## Anbefalet tech stack

- Frontend og backend: Next.js App Router på Vercel
- App-oplevelse: PWA med `manifest`, service worker og installérbar mobiloplevelse
- Database: Neon Postgres
- ORM: Prisma
- Auth senere: Auth.js eller tilsvarende gennemprøvet auth-lag
- Kort: Leaflet eller MapLibre med GeoJSON-kommunegænser
- Styling: et enkelt og vedligeholdeligt design system med fokus på mobil først
- Internationale tekster: locale-baserede oversættelsesfiler, ikke runtime-AI til basis-UI

## Strategiske beslutninger

### 1. Vi starter som PWA, ikke som App Store app

Det er den sikreste og hurtigste vej til en POC med native-lignende oplevelse. Brugere kan åbne appen via URL og installere den på hjemmeskærmen. Senere kan vi, hvis det bliver nødvendigt, pakke samme webapp ind som native shell med Capacitor.

### 2. Vi bruger mock-data i et kontrolleret format

POC'en skal bevise oplevelsen, ikke dataintegrationen. Derfor laver vi et internt demo-datasystem med:

- kommune
- branche
- job
- top-3 brancher per kommune
- antal jobs per branche

Senere mapper vi rigtige kilder ind bag samme model.

### 3. Flersprog skal være regelbaseret først

Appens faste tekster skal ligge i oversættelsesfiler per sprog. AI kan senere bruges til:

- forslag til nye oversættelser
- oversættelse af importerede jobtekster
- opsummering eller normalisering af jobdata

Men AI må ikke direkte styre kritiske UI-tekster uden review.

### 4. Sikkerhed er ikke et ekstra spor

Selv i POC skal vi fra start have:

- server-side dataadgang
- ingen hemmeligheder i klienten
- input-validering
- simple roller
- audit-log tankegang på brugerhandlinger
- forberedelse til privat brugerdata

## Målarkitektur

### Klient

- mobiloptimeret Next.js app
- kortside som hovedoplevelse
- kommune-side med brancher og jobs
- sprogvælger
- installationsvenlig PWA-oplevelse

### Server

- Next.js route handlers og server actions kun hvor det giver mening
- Data Access Layer til al databaseadgang
- DTO'er så klienten kun får de felter, den skal bruge
- cache/revalidate strategi for langsomt skiftende data

### Data

- `Municipality`
- `Industry`
- `MunicipalityIndustryStat`
- `Job`
- `SavedSearch` senere
- `User` senere
- `AuditEvent` senere eller tidligt i let version

### Geo-lag

- kommunegeometri i GeoJSON
- kommunenavne, kode og centerpunkt separat fra jobdata
- branchestatistik og jobs bindes på kommunen via kode/id

## Faser og roadmap

## Fase 0 - Fundament og afgrænsning

**Mål:** Beslut produktets snitflade, dataform og sikkerhedsramme, så POC kan bygges uden omskrivning bagefter.

### Leverancer

- endelig POC-scope på 1 side
- valgt kortbibliotek
- valgt dataformat for mock-data
- valgt kommune-id strategi
- sikkerhedsbaseline
- UTF-8 og dansk-tegn baseline
- liste over hvad der bevidst ikke er med i POC v1

### Konkrete opgaver

- afgræns Sjælland-prioritering: hvilke kommuner skal med i POC
- vælg om Bornholm er ude af scope i v1
- beslutte om kortet skal være:
  - klikbart fladkort med polygoner
  - eller zoom/pan map med rigtig baggrundskort
- fastlæg hvad "top 3 brancher" betyder i POC
- definer mock-data schema i Prisma og JSON
- beslutte sprog for v1: anbefaling `da` og `en`
- fastlæg UTF-8-regler for repo, database og importer
- definér tests med danske eksempelstrenge

### Sikkerhedskrav

- ingen persondata i POC-data
- ingen skrive-endpoints uden validering
- miljøvariabler kun server-side
- plan for CSP og security headers

### Exit-kriterium

Vi har en klar product brief, datamodel og arkitekturbeslutning, som et lille team kan bygge efter uden tvivl.

## Fase 1 - POC UX og datamodel

**Mål:** Byg en klikbar og visuel demo med fake data, så oplevelsen kan testes.

### Leverancer

- forside med Sjællandskort
- alle kommuner i scope vist på kort
- 3 brancheikoner per kommune
- kommune-detaljeside
- brancheliste og eksempeljobs
- mobiloptimeret layout

### Konkrete opgaver

- opret Next.js projekt med App Router, TypeScript og deployment til Vercel
- opret Prisma schema for demo-data
- importer eller indlæs kommunegeometri som statisk fil
- lav seed-script for brancher og jobs
- byg kortkomponent med klik på kommune
- byg ikonlogik for top 3 brancher
- byg detaljeside per kommune
- tilføj loading, empty states og fejlhåndtering

### Designkrav

- touch-venligt UI
- store klikflader
- tydelig kontrast
- simpel navigation tilbage til kort
- hurtig oplevelse på almindelige telefoner

### Sikkerhedskrav

- alt data hentes via server-side moduler eller sikre API-ruter
- schema-validering på alle inputs
- ingen direkte databasekald fra klientkomponenter
- fejlbeskeder må ikke lække intern struktur

### Exit-kriterium

En bruger kan åbne appen på mobil, trykke på en kommune og se brancher og jobs uden at kende systemet på forhånd.

## Fase 1A - Kort-UX og admin-styring

**Mål:** Gør hovedkortet stabilt, læsbart og styrbart, så POC'en faktisk kan bruges på mobil og senere redigeres af admin uden kodeændringer.

### Leverancer

- stabil mobile-first kortoplevelse med zoom, pan og touch
- tydelig to-trins interaktion: fokusér kommune, vis derefter data
- mere robust label- og ikonlayout på tværs af små og store kommuner
- admin-styret visning af kommuner på hovedkortet
- forberedelse til databasebaseret adminstyring i stedet for browser-state

### Konkrete opgaver - Kort-UX

- fastlæg endelig interaktionsmodel for kortet:
  - første tryk klik fokuserer kommune
  - andet tryk klik på samme kommune viser data
  - tryk på anden kommune skifter fokus uden nulstilling
- stabilisér zoom og pan på mobil og desktop
- fastlæg portrait-first kortformat til forsidevisningen
- gør labels mere kartografiske og mindre støjende
- gør ikonplacering mere jævn inde i kommunen
- indfør klare regler for hvornår navn og ikoner vises ved forskellige zoomniveauer
- test særligt små og tætte kommuner i hovedstadsområdet
- definér fallback-adfærd for kommuner med for lidt plads til 3 ikoner

### Konkrete opgaver - Admin-styring

- udvid datamodellen med feltkoncept for hovedkortvisning, fx:
  - `isVisibleOnHomeMap`
  - `displayPriority`
  - `labelMode`
- flyt visningsvalg ud af `localStorage` og ind i database eller seedbar konfiguration
- opret sikre server-side funktioner til at læse hovedkortkonfiguration
- definer hvilke kommuner der som standard skal fremhæves på hovedkortet
- forbered simpelt admin-flow til at:
  - skjule vise kommuner på hovedkortet
  - ændre prioritet
  - styre hvordan labels vises
- afgræns adminfunktionalitet som intern feature, indtil rigtig auth er på plads

### Design- og produktregler

- hovedkortet må aldrig starte i en tvungen zoomet kommune
- kortet skal være brugbart med én hånd på mobil
- kommunenavn skal fylde mest muligt inden for kommunen med luft omkring sig
- ikoner må aldrig gøre kommunenavnet ulæseligt
- informationspanel og kortnavigation skal være tydeligt adskilt
- små kommuner må gerne have færre synlige elementer end store kommuner

### Sikkerhedskrav

- adminkonfiguration må kun kunne ændres server-side
- ingen skjulte adminflag kun i klienten som fremtidig permanent løsning
- validering på alle adminfelter og prioriteringer
- ingen offentlig mutation uden auth, når adminsporet flyttes til database
- tydelig adskillelse mellem offentlige kortdata og fremtidige private adminfunktioner

### Implementeringstrin - anbefalet rækkefølge

1. Lås kortets interaktionskontrakt
   - bekræft og dokumentér den endelige adfærd for zoom, pan, første klik, andet klik og nulstilling
   - fjern eller omskriv interaktioner som overlapper hinanden eller giver skjult adfærd
2. Stabiliser mobilkortet visuelt
   - test portrait-layout på typiske mobilstørrelser
   - fastlæg minimums- og maksimumzoom
   - verificér pinch, pan og klik uden konflikter
3. Ryd labelmotoren op
   - definér faste regler for navn, ikonantal og skalering pr. zoomniveau
   - lav særregler for små kommuner og tætte områder
   - dokumentér fallback-regler når der ikke er plads
4. Indfør kort-UX smoke tests
   - manuel testtjekliste for mobil og desktop
   - senere e2e-tests for fokusér kommune, skift kommune og vis data
5. Flyt hovedkortkonfiguration ind i datamodellen
   - tilføj felter til styring af synlighed, prioritet og labelmode
   - beslut hvad der skal ligge i Prisma, seed og DTO'er
6. Byg server-side læselag for hovedkortvisning
   - fjern afhængighed af `localStorage` som sandhedskilde
   - læs featured kommuner fra server-side konfiguration
7. Byg intern admin-mutation
   - opret sikker server-side mutation til at opdatere hovedkortkonfiguration
   - beskyt den som intern funktion indtil auth er på plads
8. Lav enkel intern admin-UI
   - vis liste over kommuner med synlighed, prioritet og labelmode
   - gør ændringer reversible og lette at teste
9. Seed og dokumentér standardopsætning
   - definér standardudvalg af kommuner til hovedkortet
   - dokumentér hvorfor netop de kommuner er valgt
10. Verificér hele Fase 1A som release-kandidat
   - test mobil og desktop ende-til-ende
   - test at adminændringer slår igennem uden kodeændring eller redeploy af datafil

### Definition of Done - Fase 1A

- kortet starter på hele Sjælland og ikke i en tvungen kommune
- zoom, pan og touch fungerer stabilt på mobil og desktop
- første klik fokuserer kommune, andet klik på samme kommune viser data
- skift til anden kommune virker uden nulstilling
- kommunenavne og ikoner er læsbare i default-view og ved zoom
- hovedkortets kommunevalg styres af server-side konfiguration, ikke kun browser-state
- intern adminfunktion kan ændre hvilke kommuner der vises på hovedkortet
- ændringer i hovedkortopsætning kræver ikke kodeændring i komponenter

### Exit-kriterium

Kortet fungerer stabilt på mobil og desktop, hovedkortets kommunevisning kan styres struktureret, og vi har fjernet behovet for kodeændringer hver gang udvalget af kommuner skal justeres.
## Fase 2 - PWA og app-oplevelse

**Mål:** Gør webappen installérbar og mere native i følelsen.

### Leverancer

- web app manifest
- app-ikoner og splash assets
- standalone launch mode
- service worker
- offline fallback for basisvisning

### Konkrete opgaver

- konfigurer `app/manifest.ts`
- lav ikonsæt i relevante størrelser
- implementer service worker med enkel cache-strategi
- definér hvad der skal virke offline i POC:
  - senest sete kommune
  - statiske sider
  - ikke live-søgning
- test installation på iPhone og Android

### Sikkerhedskrav

- kun HTTPS
- service worker må kun cache sikre, offentlige ressourcer
- ingen cache af fremtidige brugerdata uden klar strategi

### Exit-kriterium

Appen kan installeres på mobil og åbnes i standalone app-lignende visning.

## Fase 3 - Flersprog og lokaliseringsmotor

**Mål:** Giv appen en robust flersproget struktur, som kan vokse.

### Leverancer

- locale-routing eller tilsvarende sprogstruktur
- oversættelsesfiler for `da` og `en`
- sprogvælger
- fallback-regler

### Konkrete opgaver

- opret tekstnøgler for alt fast UI
- flyt alle hårdkodede tekster ud i locale-filer
- vælg standard-locale og fallback-locale
- oversæt kommune-view og navigationslag
- planlæg senere AI-flow for datatekster og jobtekster

### AI-strategi

Anbefalet model:

- v1: manuelle locale-filer
- v2: AI-genererede forslag til oversættelser i internt review-flow
- v3: eventuel on-demand oversættelse af jobdata, men altid med cache og kvalitetskontrol

### Sikkerhedskrav

- ingen prompts med hemmelige nøgler i klienten
- hvis AI bruges senere, kaldes den kun fra server-side
- log og begræns omkostningstunge AI-kald

### Exit-kriterium

Appen kan skifte sprog uden layoutbrud eller tekstkaos.

## Fase 4 - Bruger, login og gemte søgninger

**Mål:** Introducer private brugerfunktioner på en sikker måde.

### Leverancer

- brugeroprettelse eller social login
- session management
- gemte søgninger
- simpel profilside

### Konkrete opgaver

- vælg auth-provider
- implementer sessions og beskyttede ruter
- opret `User`, `Session`, `SavedSearch`
- byg gem-søgning flow
- opret DAL-funktioner med autorisationscheck
- tilføj simpel audit-log for login og gemte handlinger

### Sikkerhedskrav

- brug gennemprøvet auth-lag, ikke hjemmebygget auth
- password-flow kun hvis nødvendigt
- HTTP-only cookies
- CSRF/XSS-beskyttelse
- authorization på serveren, ikke kun i UI
- dataminimering i responses

### Exit-kriterium

En bruger kan logge ind sikkert og gemme private søgninger uden at se andres data.

## Fase 5 - Rigtige datakilder

**Mål:** Skift fra mock-data til driftsegnede kilder uden at ændre UX-fundamentet.

### Leverancer

- import-pipeline
- datakildekortlægning
- normalisering af brancher
- kvalitetstjek af jobs og kommune-tilknytning

### Konkrete opgaver

- identificer officielle og kommercielle datakilder
- fastlæg opdateringsfrekvens
- opret staging-tabeller
- byg ETL/ingestion job
- match jobs til kommune og branche
- lav datakvalitetsregler og fejllogs

### Sikkerhedskrav

- eksterne nøgler opbevares sikkert i Vercel env vars
- rate limiting på import-endpoints
- validering og sanitering af ekstern data
- revisionsspor på importer

### Exit-kriterium

Vi kan opdatere appen med nye data uden manuelle hårdkodede rettelser i frontend.

## Fase 6 - Drift, kvalitet og skalering

**Mål:** Gør løsningen stabil, målbar og klar til rigtig brug.

### Leverancer

- logging
- monitoring
- analytics
- fejlhåndtering
- performance optimering
- backup og driftsprocedurer

### Konkrete opgaver

- tilføj error monitoring
- tilføj web vitals og performance-opfølgning
- skriv smoke tests for kritiske flows
- skriv e2e tests for kort -> kommune -> jobliste
- planlæg backup, restore og incident-rutiner

### Sikkerhedskrav

- security headers i prod
- adgangskontrol til adminfunktioner
- revisionslog for vigtige handlinger
- principle of least privilege på integrationer

### Exit-kriterium

Appen kan drives med synlighed på fejl, performance og sikkerhed.

## Anbefalet leveranceorden

1. Fase 0
2. Fase 1
3. Fase 1A
4. Fase 2
5. Fase 3
6. Fase 4
7. Fase 5
8. Fase 6

## Hvad der bevidst ikke skal med i POC v1

- avanceret brugerprofil
- push notifications
- App Store / Google Play release
- live dataimport
- personlig anbefalingsmotor
- adminpanel
- betaling

## Minimum datamodel til POC

### Prisma-modeller vi sandsynligvis skal have

- `Municipality`
- `Industry`
- `MunicipalityIndustryStat`
- `Job`

### Felter vi mindst skal tænke ind

- kommune: id, kode, navn, slug, centroid, geojsonRef
- branche: id, kode, navn
- relation/stat: municipalityId, industryId, rank, jobCount
- job: id, municipalityId, industryId, title, employerName, locationLabel, applyUrl, language, isMock

## Sikkerhedscheckliste fra dag 1

- brug `server-only` moduler til dataadgang
- lav en Data Access Layer
- returner kun sikre DTO'er til klienten
- brug schema-validering på input
- brug security headers og CSP
- hold hemmeligheder ude af browseren
- log sikkerhedsrelevante fejl
- forbered rate limiting på mutations-endpoints
- undgå at cache private data offentligt
- verificér UTF-8 gennem hele datakæden

## Risici og hvordan vi reducerer dem

### Risiko 1: Kortdelen bliver for tung på mobil

Løsning:

- start med forenklet kommunegeometri
- lazy load kortbibliotek
- test på rigtige telefoner tidligt

### Risiko 2: Datakilder passer ikke til UX'en

Løsning:

- fastlæg internt canonical schema nu
- brug adaptere mellem kilder og appens egne modeller

### Risiko 3: Flersprog bliver dyrt og rodet

Løsning:

- oversættelsesnøgler fra start
- AI kun som assistent, ikke som ukontrolleret runtime-lag

### Risiko 4: Login kommer sent og tvinger omskrivning

Løsning:

- design DAL, auth-checks og bruger-id relationer tidligt
- undgå offentlig klientlogik som senere skal gøres privat

### Risiko 5: Danske tegn går i stykker i import eller søgning

Løsning:

- standardisér på UTF-8 i alle filer og payloads
- test med danske kommunenavne og specialtegn
- verificér database, seed og frontend rendering tidligt

## Konkret anbefaling til første build

Hvis vi skulle starte i dag, ville jeg gøre dette i præcis denne rækkefølge:

1. Opret `.editorconfig` med UTF-8 som standard.
2. Opret Next.js app i projektmappen.
3. Opret Prisma + Neon forbindelse.
4. Verificér UTF-8 i database, seed og testdata.
5. Definér POC schema og seed mock-data.
6. Hent eller klargør kommune-GeoJSON.
7. Byg kortforside med klikbare kommuner.
8. Byg kommune-detaljeside.
9. Gør appen installérbar som PWA.
10. Flyt alle UI-tekster til locale-filer.
11. Forbered auth-modeller og saved searches.
12. Først derefter tilslut rigtige datakilder.

## Definition of Done for POC

POC'en er færdig, når:

- appen er deployet på Vercel
- den virker godt på mobilbrowser
- den kan installeres som PWA
- mindst 1 sprog virker fuldt, helst 2
- alle kommuner i scope kan åbnes
- hver kommune viser topbrancher og eksempeljobs
- data kommer fra seed/mock setup, ikke hårdkodet i komponenterne
- danske tegn vises korrekt i UI, data og søgning
- koden er lagt op, så login og gemte søgninger kan tilføjes uden stor refaktor

## Næste konkrete skridt

Næste praktiske milepæl er at bygge **Fase 0 og Fase 1** sammen: projektopsætning, mock-datamodel, kommunegeometri og det første klikbare kort.
