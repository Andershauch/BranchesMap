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

## Fase 1B - Mobilapp-shell og overlay-kort-UI

**Mål:** Gør forsiden til en ægte mobiloplevelse, hvor kortet er hele interfacet, navigationen ligger ovenpå kortet, og kommune-information vises i et lækkert, hurtigt og funktionelt overlay i stedet for som en traditionel kort-modal midt på skærmen.

### Designretning

- forsiden skal opleves som et full-screen kort, ikke som en side med et kort i et kort
- menu, status og handlinger skal være lette overlays oven på kortet
- kommune-information skal åbne som et app-lignende bottom sheet med klare snap states
- interfacet skal kunne bruges med én hånd på en iPhone i portrait
- al visuel støj uden for kortoplevelsen skal fjernes eller nedtones kraftigt

### Anbefalet UI-koncept

- hovedskærmen bliver ét kort-canvas fra top til bund
- topbaren bliver en flydende overlay-bar med menu-knap, appnavn og evt. aktiv fokus-chip
- zoom-kontroller og reset bliver små flydende map-controls i kanten af kortet
- den valgte kommune åbner ikke som centreret kort, men som et bottom sheet fra bunden
- bottom sheet har mindst tre tilstande:
  - lukket
  - preview med navn, jobtal og topbrancher
  - udvidet med handlinger og mere indhold
- primary CTA skal være tydelig og tommelfingervenlig
- secondary CTA og link til fuld kommuneprofil skal ligge i samme sheet, ikke konkurrere med kortet

### Leverancer

- full-screen mobilforside hvor kortet fylder hele viewporten
- overlay-navigation tilpasset mobil
- nyt municipality bottom-sheet system
- tydelig informationsarkitektur for focus, preview og expanded state
- motion- og gesture-regler for sheet, map og menu

### Konkrete opgaver - Mobil shell

- fjern page-card layoutet omkring kortet på mobil
- gør headeren til et overlay i stedet for en traditionel topsektion
- definér safe-area håndtering for iPhone top og bund
- placér menu, fokus-status og map-kontroller som flydende overlays
- sikr at kortet stadig er læsbart under overlays

### Konkrete opgaver - Kommune-sheet

- erstat den nuværende centrerede kommune-card med et bottom sheet
- design mindst tre sheet-states: preview, half, full
- byg sheet-header med grab handle, kommunenavn og hurtig status
- vis topbrancher som kompakte chips eller horisontal liste
- prioriter handlinger i rækkefølgen: følg, åbn kommune, luk
- definér swipe-op, swipe-ned og tap-udenfor adfærd
- sikre at sheet og kort ikke kæmper om samme gestures

### Konkrete opgaver - Visuel retning

- brug tydelig dybde mellem kortlag og overlay-lag
- gør overlay-paneler lettere og mere premium med færre hårde bokse
- brug mere app-agtig spacing, større radius og tydeligere hierarki
- hold typografi og labels korte nok til små mobiler
- gør brancher, jobtal og CTA’er hurtige at afkode på under 2 sekunder

### Design- og produktregler

- kortet skal være synligt hele tiden, også når en kommune er valgt
- menuen må aldrig skubbe kortet ned i layoutet
- kommune-sheet skal føles som en del af kortoplevelsen, ikke som en ekstern modal
- preview-state skal kunne aflæses uden at dække for meget af kortet
- alle primære handlinger skal kunne nås med tommelfingeren
- lukning og tilbagegang skal føles naturlig med swipe og tap

### Forslag til kommune-overlay som både lækkert og funktionelt

**Anbefalet løsning:** et bundforankret sheet med glasagtig top, solid læsbar indholdsflade og klare snap-points.

Indhold i preview-state:

- kommunenavn
- estimeret jobtal
- 3 branchechips med ikon og count
- én stærk CTA: `Følg`

Indhold i expanded-state:

- større resume af kommunen
- `Følg` og `Åbn kommune`
- evt. lille statuslinje som “sidst opdateret” eller “live estimat”
- mulighed for senere at udvide med gemt søgning eller notifikation

Hvorfor denne løsning er bedre end den nuværende:

- den bevarer mere af kortet synligt
- den føles langt mere mobil-native
- den giver tydelig hierarki mellem preview og fordybelse
- den er nemmere at bruge med én hånd

### Implementeringstrin - anbefalet rækkefølge

1. Lås mobil-layoutkontrakten
   - definér at forsiden på mobil er full-screen map first
   - beslut hvilke overlays der må være synlige i default state
2. Byg app-shell oven på kortet
   - gør header/menu til overlay-lag
   - placér zoom, reset og status som flydende controls
3. Indfør bottom-sheet systemet
   - erstat eksisterende municipality card
   - implementér preview, half og full state
4. Lås gesture-regler
   - adskil map-pan, map-zoom og sheet-drag
   - test særligt konflikter mellem swipe og tap
5. Polish visuel retning
   - justér spacing, elevation, blur, radius og animationer
   - trim copy, labels og chip-størrelser til mobil
6. Verificér med mobil-smoke tests
   - iPhone portrait først
   - derefter små Android-skærme og større mobiler

### Teknisk nedbrydning - foreslået filopdeling

**1. Side-shell og viewport**

Ansvarlige filer:

- `app/[locale]/page.tsx`
- `app/[locale]/layout.tsx`
- `app/globals.css`

Opgaver:

- fjern side-layout som giver følelsen af et kort inde i en side
- gør hovedsiden til en ren mobilviewport med kortet som første lag
- flyt header-logik fra traditionel topbar til overlay-host
- indfør safe-area spacing for top og bund på iPhone
- definer globale overlay-tokens for blur, elevation, radius og spacing

**2. Home screen shell**

Ansvarlige filer:

- `components/home/home-map-explorer.tsx`

Opgaver:

- gør komponenten til screen-controller i stedet for card-layout wrapper
- flyt overskrift, metadata og status over i flydende overlays
- håndtér UI-state for:
  - ingen valgt kommune
  - fokuseret kommune
  - åbent sheet i preview
  - åbent sheet i expanded state
- beslut hvilke chips der altid vises øverst, og hvilke der kun vises ved fokus

**3. Menu og navigation**

Ansvarlige filer:

- `components/layout/app-menu.tsx`
- evt. `components/layout/auth-status.tsx`

Opgaver:

- gør menu-knappen til en flydende mobilknap med lav visuel vægt
- trim drawer-indhold til mobilkritiske destinationer først
- gør menu-overlayet mere app-agtigt med blur og mørk backdrop
- sikr at åbning af menu ikke skubber eller reflow’er kortet

**4. Kortlag og controls**

Ansvarlige filer:

- `components/maps/sjaelland-municipality-map.tsx`

Opgaver:

- flyt zoom og reset til mere kompakte corner-controls
- sikre at controls ikke kolliderer med top overlay eller bottom sheet
- finjustér standard framing til portrait-first iPhone-visning
- tydeliggør valgt kommune med mere premium highlight og mindre visuel støj
- forbered kortet til at arbejde sammen med sheet-snap states

**5. Nyt municipality bottom sheet**

Ansvarlige filer:

- ny komponent, anbefalet: `components/home/municipality-sheet.tsx`
- integration i `components/home/home-map-explorer.tsx`

Opgaver:

- udtræk nuværende municipality overlay fra kortkomponenten
- byg sheet med tre tilstande:
  - preview
  - half
  - full
- definér snap-points og animationer
- byg header med grab-handle, navn og kort statuslinje
- byg kompakt branchevisning med læsbare chips
- placer `Følg` som primary CTA og `Åbn kommune` som secondary CTA
- håndtér swipe, tap udenfor og close action konsekvent

**6. Gesture-kontrakt**

Ansvarlige filer:

- `components/maps/sjaelland-municipality-map.tsx`
- `components/home/municipality-sheet.tsx`
- `components/home/home-map-explorer.tsx`

Opgaver:

- fastlås hvilke bevægelser der tilhører kortet, og hvilke der tilhører sheetet
- undgå konflikt mellem vertikal sheet-drag og kort-pan
- definér hvornår tap vælger kommune, og hvornår tap åbner preview
- test særligt i overgangene mellem focus, preview og expanded state

**7. Visuel polish og mobil QA**

Ansvarlige filer:

- `app/globals.css`
- berørte UI-komponenter i home/layout/maps

Opgaver:

- justér typografi, spacing og chips til små skærme
- tilføj få men tydelige overgangsanimationer
- test på iPhone portrait som primær reference
- lav manuel smoke-testliste for:
  - default view
  - vælg kommune
  - åbn/luk sheet
  - åbn menu
  - skift kommune mens sheet er åbent

### Foreslået eksekvering i små overskuelige tasks

**Task A - Full-screen map shell**

- opdatér `app/[locale]/page.tsx`
- opdatér `app/[locale]/layout.tsx`
- opdatér `components/home/home-map-explorer.tsx`
- mål: kortet fylder hele mobilviewporten, og headeren er overlay

**Task B - Overlay menu og map controls**

- opdatér `components/layout/app-menu.tsx`
- opdatér `components/maps/sjaelland-municipality-map.tsx`
- mål: menu og controls er flydende og kolliderer ikke med kortoplevelsen

**Task C - Municipality bottom sheet v1**

- opret `components/home/municipality-sheet.tsx`
- integrér i `components/home/home-map-explorer.tsx`
- forenkle overlay-logik i `components/maps/sjaelland-municipality-map.tsx`
- mål: den nuværende centrerede kort-modal er væk og erstattet af preview/expanded sheet

**Task D - Gestures og polish**

- finjustér samspil mellem sheet og kort
- opdatér `app/globals.css`
- mål: oplevelsen føles mobil-native og stabil på iPhone portrait

### Definition of Done - Fase 1B

- forsiden fungerer som full-screen mobilkort uden card-wrapper
- menu og topnavigation ligger som overlay oven på kortet
- kommune-information åbner som et bottom sheet, ikke som en centreret modal
- preview-state er hurtig at aflæse og dækker ikke unødigt for kortet
- expanded-state giver klare handlinger uden at virke tung
- gesture-konflikter mellem kort og sheet er løst på mobil
- UI føles bevidst designet til mobil først, ikke desktop nedskaleret

### Exit-kriterium

På en iPhone føles forsiden som en moderne mobilapp, hvor kortet er selve produktet, navigationen flyder ovenpå, og kommune-overlayet er hurtigt, lækkert og funktionelt.

### Status nu - Fase 1B

Fase 1B er i praksis gennemført som UI-sprint.

Det, der er leveret:

- forsiden er gjort til et ægte full-screen kort i stedet for en side med kort-wrapper
- headeren er lavet om til en let app-shell i topbaren
- menuen ligger som overlay og opfører sig som mobil navigation
- den gamle centrerede kommune-modal er erstattet af et bundforankret bottom sheet
- preview og expanded state er designet og implementeret som separate mobiltilstande
- topbrancher vises som faste chips, og preview-state prioriterer brancher før CTA
- `Følg` ligger som stabil bundhandling i expanded state
- map-kontroller er flyttet op i topbaren som en samlet pill med `-`, `+` og `Nulstil`
- gestures mellem kort og sheet er stabiliseret nok til brug på rigtig telefon
- oplevelsen er testet og itereret på Pixel i installeret app-visning

Det, der bevidst er accepteret som “godt nok” i denne fase:

- expanded state kan stadig finpoleres yderligere, men er ikke længere strukturelt forkert
- nogle typografiske og spacing-mæssige mikrojusteringer kan stadig laves senere
- iPhone-specifik finjustering bør tages igen efter næste større produktiteration

Konklusion:

Fase 1B er klar til at blive lukket som design- og UI-sprint, og næste arbejde bør flytte fokus til PWA-stabilitet og derefter produktfunktioner.
## Fase 2 - PWA og app-oplevelse

**Mål:** Gør webappen installérbar og mere native i følelsen, så den kan åbnes som en rigtig appoplevelse uden browserchrome som primær ramme.

### Leverancer

- web app manifest
- app-ikoner og splash assets
- standalone launch mode
- service worker
- offline fallback for basisvisning
- fullscreen-nær mobiloplevelse via PWA-installation
- installérbar app-shell testet på Android og iPhone

### Konkrete opgaver

- konfigurer `app/manifest.ts`
- lav ikonsæt i relevante størrelser
- implementer service worker med enkel cache-strategi
- definér `display`, `theme_color`, `background_color` og appnavn for installeret oplevelse
- tilføj viewport- og metadataopsætning som understøtter edge-to-edge app-shell
- afklar hvilke skærme der skal fungere godt i `standalone` som første prioritet
- definér hvad der skal virke offline i POC:
  - senest sete kommune
  - statiske sider
  - ikke live-søgning
- test installation på iPhone og Android

### Konkrete opgaver - Fullscreen og installation

- dokumentér at ægte fullscreen ikke kan tvinges ved almindelig browser-load
- brug PWA-installation som primær vej til fullscreen-lignende oplevelse
- vælg `display: standalone` som anbefalet v1 og vurder `fullscreen` kun hvis navigationen stadig fungerer godt
- test hvordan topbar, bottom sheet og safe areas opfører sig som installeret app
- verificér at launch fra hjemmeskærm giver en ren appoplevelse uden uønsket browser-UI
- design installationsflow og mikrocopy, så brugeren forstår forskellen mellem browser og installeret app

### Sprintplan - PWA og fullscreen-spor

1. Manifest og app-identitet  
   Opret manifest med navn, short name, ikoner, farver og `display`-strategi, så appen kan installeres og åbne i standalone.
2. Fullscreen app-shell  
   Justér viewport, safe areas og shell-opførsel, så home-screen, topbar og bottom sheet føles rigtige som installeret app.
3. Offline baseline  
   Tilføj en enkel service worker og definér en sikker cache-strategi for offentlige og stabile ressourcer.
4. Installationsoplevelse  
   Test og dokumentér installation på Android og iPhone samt afklar hvordan vi guider brugeren til “Add to Home Screen”.
5. Stabilisering og QA  
   Verificér launch, refresh, offline fallback og genåbning i standalone uden UI-brud eller cachefejl.

### Foreslået eksekvering i små overskuelige tasks

**Task E - Manifest og ikoner**

- opret `app/manifest.ts`
- tilføj appikoner i nødvendige størrelser
- mål: appen kan genkendes og installeres korrekt på Android og iPhone

**Task F - Standalone app-shell**

- opdatér global metadata og viewport
- verificér safe-area og top/bund-opførsel i installeret visning
- mål: home-screen åbner rent som app-shell uden forkert spacing eller browserfølelse

**Task G - Service worker og offline baseline**

- implementér enkel cache af sikre offentlige assets
- definér fallback for offline eller svag forbindelse
- mål: installeret app føles robust og bryder ikke ved genåbning uden net

**Task H - Installationsflow og QA**

- test “Add to Home Screen” på Pixel og iPhone
- dokumentér forskel på browser-mode og installeret mode
- mål: PWA-sporet kan demonstreres og bruges konsekvent på rigtige devices

### Status nu - Fase 2

Fase 2 er påbegyndt og delvist gennemført.

Færdigt:

- `app/manifest.ts` er oprettet
- app-metadata og viewport er opdateret til PWA/standalone
- app-ikoner er genereret og lagt i `public/icons`
- `apple-touch-icon` er på plads
- service worker-registration er implementeret i production
- en første konservativ offline-baseline er oprettet
- appen er installeret og verificeret i praksis på Android
- standalone shell er begyndt at få egne spacing- og layoutjusteringer

Delvist færdigt:

- standalone shell er forbedret, men bør stadig verificeres bredere på iPhone og ved flere refresh/update-scenarier
- cache/update-adfærd fungerer, men bør stadig gøres mere robust og mindre afhængig af manuelle refreshes under test
- installationsflow er fungerende, men ikke endnu dokumenteret eller guidet tydeligt i produktet

Ikke færdigt endnu:

- endelig QA for iPhone “Add to Home Screen”
- mere robust opdateringsstrategi for installeret app
- endelig beslutning om hvor meget offline der skal virke i praksis
- eventuel in-app installationsvejledning eller onboarding

Konklusion:

Task E er gennemført.  
Task F er i gang og funktionel.  
Task G er påbegyndt med en basal service worker.  
Task H mangler egentlig afslutning og dokumenteret device-QA.

### Sikkerhedskrav

- kun HTTPS
- service worker må kun cache sikre, offentlige ressourcer
- ingen cache af fremtidige brugerdata uden klar strategi
- offline-cache må ikke gøre auth- eller privat data offentligt tilgængeligt
- launch-oplevelsen må ikke afhænge af klienthemmeligheder eller usikre runtime-flags

### Definition of Done

- appen har et gyldigt manifest og installérbare ikoner
- Android kan installere appen og åbne den i `standalone`
- iPhone kan gemme appen på hjemmeskærmen med korrekt shell-opførsel
- home-screen fungerer visuelt i installeret tilstand med korrekt safe-area håndtering
- service worker cacher kun sikre offentlige ressourcer
- mindst én meningsfuld offline fallback virker uden at bryde UI
- `lint` og `build` er grønne efter implementering

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

## Fase 4A - Følg kommune og in-app notifikationer

**Mål:** Gør "Følg kommune" til et reelt overvågningsflow, hvor brugeren kan se, når en fulgt kommune har ændret sig siden sidst.

### Leverancer

- change detection for fulgte kommuner
- snapshot- og hash-baseret sammenligning af kommune-data
- server-side check flow for aktive follows
- in-app notifikationsstatus på follows-siden
- simpelt flow til at markere opdateringer som set

### Konkrete opgaver

- definér hvad der tæller som en opdatering i v1
- fastlæg et stabilt snapshot-format for kommune-data
- byg server-side funktion til at oprette snapshot og hash
- sammenlign nyt snapshot med `SearchFollow.lastResultHash`
- opdatér `lastCheckedAt`, `lastResultHash` og `lastNotifiedAt`
- byg service til at checke et enkelt follow
- byg service til at checke alle aktive follows
- opret et manuelt og cron-kompatibelt entry point til checks
- vis "Ny opdatering", "sidst tjekket" og relevant status i follows-UI
- afklar read-state når brugeren åbner kommuneprofilen eller markerer opdateringen som set
- test første kørsel, ingen ændring, ny ændring og fejl i live datakilde

### Sprintplan for dette step

1. Scope og regler
   Definér hvilke felter der skal udløse en opdatering i v1. Anbefalet start er total jobestimat, top-3 brancher og jobtal pr. topbranche.
2. Compare-lag
   Implementér snapshot-builder, normalisering og hashing, så vi kan afgøre om en follow har ændret sig siden sidste check.
3. Execution-lag
   Implementér server-side check af et follow og batch-check af alle aktive follows samt et entry point, der senere kan kobles på cron.
4. UI og read-state
   Udvid follows-siden med badge, status og datoer, og beslut hvordan en notifikation markeres som set i v1.
5. Stabilisering
   Tilføj tests, audit hvor relevant og robust fallback-adfærd, hvis live data ikke kan hentes.

### Status nu - Fase 4A

Fase 4A er nu påbegyndt og har fået sin første vertikale slice.

Færdigt:

- kommuneindhold kan nu omsættes til et stabilt follow-snapshot med hash
- snapshotlaget er gjort generisk nok til både DST nu og STAR senere
- server-side check af ét follow er implementeret
- batch-check af aktive follows er implementeret
- manuelt og cron-kompatibelt check-endpoint er oprettet
- follows-siden kan nu vise "Ny opdatering" og "Sidst tjekket"
- brugeren kan markere en opdatering som set
- åbning af en kommuneprofil kan nulstille ulæst status i v1
- baseline-flow, "ingen ændring" og "ændret snapshot" er verificeret lokalt

Mangler stadig:

- egentlig device- og data-QA på tværs af første baseline, ingen ændring og ny ændring
- afklaring af præcist hvilke felter der skal tælle som ændring i v1 versus senere STAR-udvidelser
- mere eksplicit dokumentation af hvordan check-endpointet skal køres i drift

### V1-regler for ændringsdetektion

Det, der aktuelt tæller som ændring i v1, er:

- teaser/profiltekst for kommunen
- `totalJobs`
- topbrancher, deres rækkefølge og jobtal
- jobkortene under kommunen fordelt på branche

Det er et bevidst valg, så follow-laget reagerer på det samlede kommuneindhold og ikke kun på Danmarks Statistik. Dermed kan STAR senere kobles på jobdelen uden at ændre selve follow-modellen.

### Drift og QA

`POST /api/follows/check` er nu den forventede entry route for både manuel QA og senere cron-kørsel.

Forventet brug:

- batch-check af alle aktive follows
- optionalt limit under test
- single-follow check ved målrettet fejlsøgning

Autorisation:

- production: `x-follows-check-secret` eller admin-session
- lokal udvikling på `localhost`: åben for at gøre QA nemmere

### Sikkerhedskrav

- alle checks kører server-side
- klienten må ikke være sandhedskilde for notifikationsstatus
- endpoints til checks skal kunne afgrænses og beskyttes
- follow-data må kun vises og opdateres for den rette bruger
- fejl i datakilden må ikke lække intern struktur eller bryde brugerflowet

### Definition of Done

- en aktiv follow kan tjekkes server-side
- systemet kan opdage reelle ændringer i kommune-data
- `lastCheckedAt`, `lastResultHash` og `lastNotifiedAt` bruges konsekvent
- brugeren kan se i UI, at en fulgt kommune har en ny opdatering
- flowet er robust ved fejl i live datakilden
- `lint` og `build` er grønne efter implementering

### Exit-kriterium

En bruger kan følge en kommune og senere se i appen, at der er sket en opdatering siden sidst.

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

### Statusopdatering - Jobindsats som første officielle importspor

Fase 5 er nu konkret påbegyndt som discovery- og importforberedelse mod Jobindsats API'et.

Det, der er afklaret:

- vi har et gyldigt Jobindsats-token og kan kalde API'et via den dokumenterede PowerShell-klientvej
- appens Node/Next-runtime er stadig ustabil mod upstream og har i flere forsøg returneret `403`
- PowerShell-discovery fungerer stabilt nok til at kortlægge tabeller og bygge en importstrategi
- hele tabelkataloget er hentet lokalt

Første konkrete fund:

- `Y25i07` er identificeret som den vigtigste V1-tabel
- tabellen giver kommune-niveau, periode, stillingsbetegnelse og tre direkte jobmålinger:
  - antal stillinger
  - dagligt gennemsnitligt antal stillinger
  - antal nyopslåede stillinger

Det betyder, at den rigtige V1-strategi ikke er live-opslag i frontend eller server request-flow, men et dagligt importjob til vores eget datalag.

### Anbefalet V1-implementering under Fase 5

**Mål:** Erstat dele af det nuværende estimatlag med officielle Jobindsats-tal, men behold appens canonical model og UI-stabilitet.

#### V1-beslutning

- Jobindsats hentes via batch/import, ikke live i brugerens request
- importen køres én gang i døgnet
- `Y25i07` bruges som primær V1-kilde
- follow/change detection fortsætter oven på vores egne snapshots, ikke direkte på upstream-rows

#### Hvad V1 realistisk kan levere

- officielle jobtal pr. kommune
- periodebaseret udvikling
- top stillingsbetegnelser pr. kommune

#### Hvad V1 ikke bør love endnu

- konkrete jobkort med adresse og koordinater
- ægte live-opdatering i realtid
- fuld erstatning af senere STAR-jobdata

### Foreslået sprint - Daglig Jobindsats-import

1. Datamodel og staging
   Opret staging- og snapshotstruktur til Jobindsats-import, så vi kan gemme rå payloads og normaliserede kommune-data adskilt.
2. Importjob for `Y25i07`
   Byg et job, der henter seneste relevante periode, importerer alle kommuner i scope og gemmer totaltal samt top stillingsbetegnelser.
3. Kommunematch og kvalitet
   Match Jobindsats-kommunenavne til vores egne kommune-id'er og log mismatch eller manglende mapping.
4. Canonical mapping
   Oversæt importen til den model appen allerede læser fra, så UI'et ikke kender Jobindsats-formatet.
5. Follow-integration
   Kør follow/change detection oven på de importerede kommune-snapshots efter hver succesfuld import.
6. Drift og cron
   Kør importen én gang i døgnet og dokumentér retry-, fejl- og rollback-adfærd.

### Status nu - første importfundament

Følgende er nu implementeret og verificeret lokalt:

- Prisma-model til Jobindsats-importkørsler
- Prisma-model til kommune-snapshots fra Jobindsats
- lokalt importscript for `Y25i07`
- PowerShell-baseret fetch-spor som stabil adgangsvej til Jobindsats
- læselags-integration, så `totalJobs` kan komme fra importeret Jobindsats-data i stedet for kun estimatlag

Første lokale datakørsel er gennemført med:

- `43` kommuner importeret
- tabel `Y25i07`
- periode `2026M03`

Det næste arbejde i Fase 5 er derfor ikke længere discovery, men:

1. kvalitetssikring af kommune-match og top stillingsbetegnelser
2. beslutning om første ESCO-til-produktkategori mapping
3. valg af faktisk driftsmekanisme for den daglige import

### Driftsspor valgt til V1

Den foreløbige V1-driftsmekanisme er nu valgt og klargjort:

- dagligt batchjob
- Windows/PowerShell-baseret fetch-spor
- import efterfulgt af direkte follow-check i samme batch
- GitHub Actions workflow som første scheduler-kandidat

Det betyder, at næste skridt i Fase 5 ikke er at opfinde scheduler-arkitektur, men at:

1. lægge de nødvendige secrets ind i GitHub
2. køre første manuelle workflow-kørsel
3. verificere at follow-opdateringer stadig markeres korrekt efter import i drift

### Produktanbefaling for V1

Den sikreste vej er at lade Jobindsats forbedre datafundamentet først og holde den nuværende UI-struktur stabil.

Det betyder:

- brug Jobindsats til kommune-totaler først
- behold de brede produktchips i V1
- udsæt ESCO-til-brancher mapping til næste iteration

På den måde ændrer vi ikke datakilde, kategorimodel og UI-hierarki på én gang.

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
4. Fase 1B
5. Fase 2
6. Fase 3
7. Fase 4
8. Fase 4A
9. Fase 5
10. Fase 6

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

## Aktuel næste milepæl

Projektets næste praktiske milepæl er stadig **Fase 2**, men nu som et stabiliseringsspor: gøre den installerede PWA mere robust, mere forudsigelig ved opdateringer og færdigvalideret på rigtige devices.

## Release-checkpoint - Første app-version

**Checkpoint:** `v0.1.0-app`

Dette checkpoint markerer den første version, hvor projektet reelt opfører sig som en mobilapp og ikke kun som en mobiltilpasset webside.

Det er konkret opnået i denne version:

- forsiden er nu et full-screen kort med kortet som primært interface
- topbar, menu og kortkontroller er samlet i en app-lignende shell
- kommuneoplevelsen er bygget som et bottom sheet med preview og expanded state
- mobilinteraktion på rigtig Android-enhed er verificeret
- appen kan installeres som PWA på Android
- roadmap og projektstatus er opdateret til at afspejle overgangen til første app-version

Det næste arbejde efter dette checkpoint er at gøre PWA-opdateringer og standalone-adfærd mere robuste, så app-versionen også bliver stabil som installeret produkt.

### Statusopdatering - PWA stabilisering

Fase 2 er nu rykket fra "installérbar baseline" til "robust app-adfærd".

Det, der er leveret i dette stabiliseringspass:

- service worker er gjort smallere og mere bevidst, så den ikke længere forsøger at cache hele appen bredt
- navigationsrequests går nu netværks-først med offline-fallback i stedet for aggressiv runtime-cache
- statiske PWA-assets som manifest, offline-side og app-ikoner caches fortsat eksplicit
- klienten checker nu løbende efter nye service worker-versioner ved fokus, visibility og interval
- appen viser nu en tydelig in-app besked, når en ny version er klar til opdatering
- appen viser nu en enkel offline-besked, når device mister forbindelse

Det, der stadig er næste arbejde i Fase 2:

- verificere update-flow på rigtig Android-enhed fra én build til den næste
- teste standalone-adfærd bredere på iPhone
- beslutte om POC'en kun skal have offline-side eller om selve kortskallen også skal kunne åbne offline
- dokumentere forventet brugeroplevelse ved opdatering og offline-brug

### Fokus i næste sprint

1. Stabiliser opdateringsflow for installeret app og service worker.
2. Afslut standalone shell QA på Android og iPhone.
3. Beslut endelig offline-scope for POC.
4. Dokumentér installation og forventet adfærd i browser vs. installeret app.
5. Luk Fase 2 som teknisk fundament, så fokus kan flyttes tilbage til produktfunktioner.

## Feature-spor - Cirka rejsetid fra brugerens placering

**Mål:** Give brugeren et hurtigt, opt-in estimat af hvor lang tid det cirka tager at komme fra nuværende lokation til den valgte kommune.

### V1-beslutning

Første version er bevidst et cirka-estimat:

- brugeren trykker selv på `Beregn fra mig`
- browserens Geolocation API henter lokation lokalt i klienten
- præcis GPS-position gemmes ikke i databasen
- destinationen er kommunens geografiske center udledt fra GeoJSON
- estimatet er et simpelt bil-estimat baseret på afstand, rute-bias og gennemsnitshastighed
- UI markerer tydeligt at det er et v1-estimat til kommuneområde

### Hvorfor denne løsning

Det giver hurtig produktværdi uden at binde os til en routing-leverandør for tidligt. Det er ikke præcist nok til endelig pendlerbeslutning, men godt nok til at hjælpe brugeren med at vurdere relevans på kommuneniveau.

### Næste version

Når STAR/jobdata senere giver konkrete jobplaceringer, skal samme UI-komponent kunne bruge jobdestinationer i stedet for kommune-center:

- `municipality-center-v1` bruges nu
- `job-location` er reserveret som næste destinationstype
- senere kan vi koble routing/matrix-API på for mere præcis bil, cykel eller offentlig transport
- ved mange jobs bør beregning ske som matrix/batch, ikke ét kald per job

### Tekniske noter

- På mobil kræver GPS i browseren normalt HTTPS eller installeret/sikker kontekst. Lokal LAN-test via `http://192.168.x.x` kan derfor vise at GPS ikke understøttes, selvom funktionen virker i korrekt sikker kontekst.
- V1 må ikke sende brugerens GPS til serveren.
- V1 må ikke cache præcis brugerposition permanent.

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

Næste praktiske milepæl er at afslutte **Fase 2**: service worker-stabilisering, standalone-QA og en mere robust opdateringsoplevelse for den installerede app.
