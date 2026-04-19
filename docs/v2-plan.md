# V2-plan: Hele Danmark og produktisering

Denne plan beskriver, hvad der skal til for at løfte JOBVEJ fra en V1 med Sjælland-scope til en V2 med national dækning og et mere egentligt produktgrundlag.

V2 har to parallelle mål:

- udvide løsningen fra Sjælland til hele Danmark
- gøre løsningen mere produktklar, så flere organisationer realistisk kan være med til at finansiere og bruge den

## 1. Udgangspunkt

V1 er i praksis stadig bygget som en begrænset pilot:

- geodata er bundet til Sjælland
- flere data- og mocklag antager et tidligere snævert scope
- kiosk-flow, auth og follows er bygget til en kontrolleret første version
- admin og drift er brugbare til V1, men ikke endnu på niveau med en bred national eller multi-kunde løsning

Det betyder, at V2 ikke kun er "mere data". V2 kræver, at flere fundamentale antagelser i kodebasen gøres generiske.

## 2. Hvad der konkret skal til for hele Danmark

### 2.1 Geodata og kortlag

Det nuværende geolag er direkte bundet til Sjælland:

- `lib/geo/sjaelland.ts`
- `scripts/prepare-geojson.ts`
- `data/geo/sjaelland-*`

V2 kræver:

- et nationalt kommunedatasæt for alle 98 kommuner
- en generisk geodata-pipeline i stedet for `sjaelland`-navngivne filer og typer
- simplificering og normalisering af geometri med fokus på mobil og kiosk-performance
- pre-beregnede centerpunkter og metadata for alle kommuner
- beslutning om ét nationalt output eller flere opdelte outputs, fx pr. region eller som level-of-detail-varianter

### 2.2 Kommunekatalog og datamodel

Kommuner skal behandles som et fuldt nationalt katalog, ikke som et snævert pilotsæt.

V2 kræver:

- canonical kommuneliste med kode, navn, slug, region og status
- ens regler for slugging, import og opslag på tværs af hele landet
- mulighed for at markere kommuner som aktive, skjulte eller kundeprioriterede uden kodeændringer
- validering af at alle referencer i dataimport, UI og admin peger på samme kommuneidentitet

### 2.3 Data og import

Det nuværende datalag har stadig tydelige spor af demo, mock og pilotlogik.

V2 kræver:

- én tydelig produktbeslutning om hvilke datakilder der er autoritative
- en robust importpipeline for alle kommuner i scope
- klar markering af hvad der er officielt, estimeret og fallback
- bedre datakvalitetschecks før import publiceres
- monitorering af manglende eller forældede kommunedata
- driftbar håndtering af fejl i import for enkelte kommuner uden at hele produktet bliver ustabilt

### 2.4 Kortoplevelse og brugerflow

Et Danmarkskort ændrer interaktionsmønstret væsentligt.

V2 kræver:

- bedre zoom- og pan-logik end ved kun Sjælland
- tydelig søgning efter kommune
- region- eller landsdelsfiltrering
- hurtig vej ind til "min kommune"
- performanceoptimering af kortet på svage tablets og ældre telefoner
- UX-beslutning om, hvor meget national oversigt versus lokal nærhed der skal fylde

### 2.5 Kiosk og mobil continuation

Kiosk-sporet kan fortsætte i V2, men nationalt scope stiller højere krav.

V2 kræver:

- tydelig kiosk-konfiguration for forskellige fysiske opsætninger
- bedre test af fullscreen, handoff og idle-adfærd på flere enheder
- klar separation mellem national standardoplevelse og lokal kioskopsætning

### 2.6 Admin og drift

Admin-værktøjerne skal kunne håndtere et større scope.

V2 kræver:

- bedre lister, filtre og søgning i admin for 98 kommuner
- synlighed på stale imports og importfejl
- mere moden rollemodel for hvem der må ændre hvad
- bedre drifts- og supportrutiner

## 3. De største tekniske ændringer i kodebasen

Følgende områder vil sandsynligvis kræve egentlig refaktorering:

- geo-laget skal ændres fra `sjaelland`-specifikt til nationalt og generisk
- kommune- og datastrukturer i `lib/data/municipalities.ts` skal løftes fra pilotkomposition til mere stabil produktlogik
- estimatlaget i `lib/server/statbank-jobs.ts` skal gennemgås med fokus på national robusthed og datatroværdighed
- admin- og home-map-konfiguration skal fungere på et større kommunesæt uden manuel friktion
- mock- og seed-data skal holdes tydeligt adskilt fra produktionsnære datakilder

## 4. Foreslået leveranceplan

### Fase 1: Fundament

Mål:

- gøre koden nationalt skalerbar uden at ændre hele produktet på én gang

Leverancer:

- nationalt kommune-datasæt i databasen
- generisk geostruktur
- gennemgang af performancegrænser på kortet
- klar datamodel for kommuneidentitet, status og import

Definition of done:

- alle 98 kommuner kan indlæses og identificeres korrekt i systemet
- geodata buildes uden Sjælland-specifik hardcoding

### Fase 2: Danmark MVP

Mål:

- gøre hele Danmark tilgængeligt i det borgerrettede produkt

Leverancer:

- nationalt kort
- søgning og filtrering
- stabile kommuneprofiler
- national QA på kiosk og mobil

Definition of done:

- alle kommuner i scope kan findes, åbnes og forstås
- performance er acceptabel på mobil og kiosk
- follow- og auth-flows virker på nationalt datasæt

### Fase 3: Driftbar platform

Mål:

- gøre løsningen stabil nok til bredere brug end en enkelt pilot

Leverancer:

- monitorering af import og fejl
- bedre admin- og supportværktøjer
- datakvalitetsrapporter
- release- og driftschecklister

Definition of done:

- driftsfejl kan håndteres uden ad hoc debugging
- stale data og importfejl opdages tidligt

### Fase 4: Produktisering

Mål:

- gøre løsningen salgbar og konfigurerbar for flere betalende parter

Leverancer:

- kunde-konfiguration
- brandinglag
- rolle- og adgangsmodel
- onboardingmateriale
- kommercielle pakker og afgrænsninger

Definition of done:

- én ny kunde kan onboardes uden kodefork
- kerneoplevelsen er den samme på tværs af kunder
- kundespecifikke forskelle håndteres via konfiguration, ikke specialkode

## 5. Hvad der skal til for at gøre det til et egentligt produkt

V1 er én konkret løsning i én konkret kontekst. V2 som produkt skal være en platform eller en standardiseret løsning, som kan bruges flere steder uden at blive et konsulentprojekt per kunde.

Det kræver mindst følgende:

### 5.1 Konfiguration frem for specialkode

I skal kunne konfigurere uden kodeændringer:

- logo, farver og branding
- tekstindhold og lokale links
- kiosk-adfærd
- prioriterede kommuner eller visninger

### 5.2 Roller og adgang

Der skal være tydelige roller, fx:

- platform-admin
- kundeadmin
- redaktør
- support
- læseadgang og rapportadgang

### 5.3 Compliance og drift

Der skal være:

- auditspor
- databehandler- og retention-overblik
- incident-håndtering
- support- og ændringsproces

### 5.4 Onboarding og drift

Et produkt kræver, at nye kunder kan komme i gang uden at udviklingsteamet håndholder alt manuelt.

Der skal være:

- opsætningsguide
- kunde-onboarding
- kiosk-opsætningsmodel
- release- og ændringsmodel

## 6. Hvem der realistisk kan være med til at betale

Der er flere mulige købergrupper, men produktet bliver bedre, hvis I vælger én primær målgruppe tidligt.

Mulige betalende parter:

- kommuner
- jobcentre og beskæftigelsesforvaltninger
- tværkommunale samarbejder
- regioner eller fællesoffentlige programmer
- erhvervshuse eller beslægtede offentlige og halvoffentlige aktører

## 7. Hvad de reelt betaler for

De vil sjældent betale for "et kort" alene. Det betalbare er typisk:

- let forståelig borgeroplevelse
- national dækning
- lokale tilpasninger
- kiosk og mobil continuation
- drift, support og dokumenteret datatroværdighed

Hvis produktet skal være finansierbart, skal værdien beskrives som en service og en driftsklar løsning, ikke kun som et UI.

## 8. Foreslåede produktmodeller

### Model 1: Direkte kommuneleverance

En kommune betaler for egen løsning og lokal tilpasning.

Fordele:

- enkel at forstå
- kort vej til første betaling

Ulemper:

- risiko for mange kundespecifikke ønsker

### Model 2: Fælles platform med abonnement

Flere kunder bruger samme platform og betaler abonnement eller serviceaftale.

Fordele:

- bedre skalerbarhed
- stærkere produktretning

Ulemper:

- kræver stærkere standardisering og mindre specialtilpasning

### Model 3: Samfinansieret roadmap

Et mindre antal kunder finansierer i fællesskab roadmap og får adgang til platformen.

Fordele:

- realistisk i en offentlig kontekst
- kan passe godt til et tværkommunalt samarbejde

Ulemper:

- kræver klar governance for hvad der er fælles og hvad der er lokalt

## 9. De største risici i V2

- datakvalitet bliver ujævn på tværs af kommuner
- kortet bliver for tungt på svage enheder
- målgruppen bliver uklar, og dermed bliver produktretningen også uklar
- for meget kundespecifik logik gør platformen dyr at vedligeholde

## 10. Anbefalet rækkefølge

Følgende rækkefølge anbefales:

1. vælg primær målgruppe og produktposition
2. generalisér geo- og kommunelaget til hele Danmark
3. beslut og dokumentér national datamodel og importstrategi
4. byg Danmark MVP med søgning, performance og nationale kommuneprofiler
5. løft drift, observability og admin
6. tilføj kunde-konfiguration, branding og rollemodel
7. definér kommerciel model og onboarding

## 11. Konkrete næste skridt

De næste konkrete arbejdspakker bør være:

### Næste 2-3 beslutninger

- beslut primær købergruppe for V2
- beslut om V2 skal være én national standardløsning eller kunde-konfigurerbar fra start
- beslut hvilke datakilder der er autoritative i V2

### Næste tekniske sprint

- erstat Sjælland-specifik geostruktur med generisk Danmark-struktur
- opbyg national kommuneliste og tilhørende metadata
- kortlæg alle steder i kodebasen hvor gamle scope-antagelser findes

### Næste produktspor

- definér kerneværdi for betalende kunder
- definér hvad der er standardprodukt versus kundespecifik konfiguration
- beskriv onboarding- og supportmodellen

## 12. Arbejdsregel for V2

Hvis en ændring kun hjælper én konkret kunde eller kommune, bør den som udgangspunkt ikke bygges som speciallogik i V2-kernen.

Den bør enten:

- løses som generisk produktfunktion
- lægges i kundekonfiguration
- eller holdes uden for kerneplatformen

Det er afgørende, hvis løsningen skal kunne blive et finansierbart produkt i stedet for et voksende specialprojekt.
