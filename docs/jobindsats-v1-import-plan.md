# Jobindsats V1 Import Plan

## Formaal

Denne plan beskriver den foerste driftsegnede integration mod Jobindsats API'et som et dagligt importspor. Maalet er at erstatte dele af det nuvaerende estimatlag med officielle Jobindsats-tal paa kommuneniveau uden at binde UI eller app-runtime direkte til upstream API'et.

## Konklusion

V1 boer bygges som et dagligt importjob, ikke som live-opslag i brugerens request-flow.

Begrundelse:

- PowerShell-klienten virker stabilt lokalt mod Jobindsats
- Node/Next-runtime er stadig ustabil med `403` i flere forsog
- data opdateres ikke minut for minut, saa et dagligt batchjob er et bedre og mere robust fit
- appen faar et enklere og sikrere datalag, hvis Jobindsats importeres til vores egen database foerst

## Anbefalede tabeller til V1

### 1. `Y25i07` - Antal ledige stillinger paa Jobnet

Dette er den vigtigste V1-tabel.

Den giver:

- `Area` inkl. kommuner
- `Period`
- `_esco_uri` for stillingsbetegnelse
- maalinger for:
  - antal stillinger
  - dagligt gennemsnitligt antal stillinger
  - antal nyopslagede stillinger

Hvorfor den er vigtig:

- vi kan hente officielle jobtal pr. kommune
- vi kan hente fordeling pr. stillingsbetegnelse
- den ligger taettest paa det produktet faktisk viser

### 2. `Y25i13_esco` - Lediges jobmaal (Arbejdskraftreserven ESCO-STAR)

Denne tabel er en god sekundar indikator.

Den giver:

- `Area`
- `Period`
- `_esco_uri`
- ydelsesgrupper
- a-kasse

Hvorfor den er nyttig:

- kan senere bruges til at vise mismatch eller potentiel rekrutteringsspaending
- giver et ekstra signal om hvilke jobmaal der er relevante i et omraade

Den boer ikke vaere den primaere V1-kilde til kommune-jobtal, men den er relevant som senere udvidelse.

### 3. `Y25i13` - Arbejdskraftreserven

Denne tabel er en fallback- og konteksttabel.

Den giver:

- `Area`
- `Period`
- ydelsesgrupper
- a-kasse

Den er nyttig til arbejdsmarkedskontekst, men ikke lige saa direkte produktrelevant som `Y25i07`.

## Tabeller vi ikke boer starte med

### `Y25i10` - jobomsaetning

Har branchedimension og kommune, men beskriver jobskifte/start i nyt job. Den er interessant analytisk, men ikke det samme som ledige stillinger og boer derfor ikke vaere V1-kilden til jobkort eller kommune-jobtal.

### `maal01`

Relevant til maalgrupper og job/uddannelsesmaal, men ikke den rigtige primaere tabel til jobs paa kortet.

## V1 datamodel i appen

V1-importen boer foere data ind i vores egen canonical model i stedet for at UI'et laeser Jobindsats-format direkte.

Foerste outputmodel boer mindst indeholde:

- `municipalityCode`
- `municipalityName`
- `period`
- `totalOpenPositions`
- `dailyAverageOpenPositions`
- `newlyPostedPositions`
- `topJobTitles[]`
- `source = "jobindsats"`
- `sourceTable = "Y25i07"`
- `fetchedAt`

For `topJobTitles[]` boer hvert element mindst indeholde:

- `titleKey` eller normaliseret titel-id
- `titleLabel`
- `openPositions`

## Mapping til nuvaerende UI

V1 boer mappes saadan:

- `totalJobs` i kommunevisningen kan komme fra `totalOpenPositions`
- top-3 chips kan afledes af top jobtitler eller af en senere intern gruppering
- follow/change detection skal koere oven paa vores canonical snapshot, ikke oven paa rae Jobindsats-rows

Vigtig afgraensning:

Jobindsats `Y25i07` giver stillingsbetegnelser, ikke vores nuvaerende produktbrancher som `Logistik`, `Teknologi` og `Byggeri`.

Derfor har vi to realistiske V1-veje:

1. behold nuvaerende branchechips som estimeret/grupperet lag, men lad total jobtal komme fra Jobindsats
2. indfoer en intern mapping fra ESCO-stillingsbetegnelser til vores produktkategorier

Min anbefaling er:

- V1.0: brug Jobindsats til samlede kommunetal
- V1.1: map relevante ESCO-stillingsbetegnelser til produktkategorier

Det reducerer risiko og holder UX stabil.

## Dagligt importjob

Anbefalet drift:

- koer en gang i doegnet, fx tidlig morgen
- hent seneste relevante periode fra `Y25i07`
- importer for alle kommuner i scope
- gem baade totaltal og top stillingsbetegnelser
- skriv til staging eller snapshot-tabeller foerst
- publicer derefter til de tabeller appen laeser fra

Importflow:

1. hent metadata for `Y25i07`
2. afklar seneste relevante periode
3. hent data for alle kommuner
4. normaliser kommunenavne og match til vores kommune-id'er
5. gem raa import med revisionsspor
6. beregn canonical kommune-snapshot
7. opdater appens laeselag
8. trig eventuelt `POST /api/follows/check` bagefter

## Konkrete driftsartefakter

Det er nu lagt ind i repoet:

- batchscript: `scripts/run-jobindsats-daily.ts`
- importscript: `scripts/import-jobindsats-y25i07.ts`
- GitHub Actions workflow: `.github/workflows/jobindsats-daily.yml`

Batchscriptet koerer:

1. `Y25i07` import
2. valgfrit follow-check via HTTP mod den deployede `/api/follows/check` route

Hvis `APP_BASE_URL` og `FOLLOW_CHECK_SECRET` er sat, koeres follow-check automatisk bagefter. Hvis de mangler, koeres kun importen.

## Anbefalet scheduler for V1

Foerste anbefaling er GitHub Actions med Windows-runner, fordi:

- Jobindsats-klientsporet er dokumenteret til PowerShell
- vores fetch-wrapper er allerede bygget oven paa PowerShell
- vi kan koere med repoets eksisterende kode uden ekstra serverinfrastruktur

Workflowet er sat til:

- `workflow_dispatch` for manuel koersel
- daglig cron `0 4 * * *` i GitHub Actions

Det svarer til `05:00` dansk vintertid eller `06:00` dansk sommertid, afhængigt af DST.

## Secrets til drift

Workflowet kraever foelgende GitHub secrets:

- `DATABASE_URL`
- `JOBINDSATS_API_TOKEN`

Hvis vi vil koere follow-check bagefter i samme batch, skal vi ogsaa bruge:

- `APP_BASE_URL`
- `FOLLOW_CHECK_SECRET`

## Hvorfor batch foer live

- upstream risiko flyttes vaek fra brugerens request
- bedre fejlhaandtering og retries
- lettere at validere og sammenligne importer over tid
- follow-systemet passer naturligt oven paa snapshots
- senere STAR-integration kan komme ind i samme pipeline

## Naeste konkrete sprint

1. Implementer staging-model for Jobindsats-import.
2. Byg importscript/job for `Y25i07`.
3. Match kommunenavne fra Jobindsats til vores kommune-id'er.
4. Gem totaltal og top stillingsbetegnelser pr. kommune.
5. Beslut om V1 kun skal vise totaltal fra Jobindsats eller ogsaa foerste ESCO-til-kategori mapping.
6. Kobl imported snapshot ind i follow/change detection.

## Aaben beslutning

Den vigtigste aabne beslutning er ikke teknologi, men produkt:

Skal V1 stadig vise de nuvaerende brede branchechips paa baggrund af vores interne kategorier, eller skal vi begynde at vise mere direkte Jobindsats-stillingsbetegnelser?

Min anbefaling:

- behold de brede chips i V1
- opgrader datagrundlaget under motorhjelmen foerst
- skift ikke informationsarkitektur samtidig med foerste datakildeskifte
