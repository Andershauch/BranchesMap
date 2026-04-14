# Jobindsats Integration Status

## Formaal

Denne note beskriver discovery-integrationen mod Jobindsats API v2, den aktuelle tekniske status og de naeste anbefalede skridt.

## Hvad der er implementeret

- `JOBINDSATS_API_TOKEN` er dokumenteret i `.env.example`
- server-only klient er oprettet i `lib/server/jobindsats.ts`
- internt discovery-endpoint er oprettet i `app/api/jobindsats/discovery/route.ts`
- endpointet understotter:
  - `mode=subjects`
  - `mode=tables`
  - `mode=table`
  - `mode=relevant`
- lokalt PowerShell discovery-script er oprettet i `scripts/jobindsats-discovery.ps1`

## Dokumentationskonklusioner

Ud fra Jobindsats-dokumentationen gaelder:

- base URL er `https://api.jobindsats.dk/v2/`
- auth sendes som raa token i headeren `Authorization`
- `Bearer` er ikke dokumenteret og skal ikke bruges
- centrale discovery-kald er:
  - `/v2/subjects`
  - `/v2/tables`
  - `/v2/tables/<tableId>`
  - `/v2/data/<tableId>`
- PowerShell `Invoke-RestMethod` er en eksplicit dokumenteret klientvej

## Aktuel observeret adfaerd

Status under lokal test:

- appens Node/Next-discovery er stadig ustabil mod Jobindsats
- direkte kald fra Node/Next runtime har fortsat i flere forsog givet `403 Forbidden`
- den dokumenterede PowerShell-vej virker nu stabilt via et lokalt discovery-script

Det betyder, at vi nu kan gennemfoere discovery og tabelvalg, selvom live server-to-server integration i app-runtime endnu ikke er robust nok.

## PowerShell fallback

Det lokale discovery-script:

- laeser `JOBINDSATS_API_TOKEN` fra lokal `.env`
- bruger Jobindsats' dokumenterede `Authorization`-header
- fjerner BOM-stoej fra svarene
- gemmer resultater som UTF-8 uden BOM i `_tmp_jobindsats`
- understotter:
  - `-Mode subjects`
  - `-Mode tables`
  - `-Mode table -TableId <id>`
  - `-Mode data -TableId <id>`

Eksempel:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/jobindsats-discovery.ps1 -Mode tables
```

## Discovery-resultat

Med PowerShell-fallbacken kan vi nu hente hele tabelkataloget:

- `165` tabeller fundet i `tables`

En konkret relevant tabel er identificeret:

- `Y25i07`: `Antal ledige stillinger paa Jobnet`

Foreloebig vurdering af `Y25i07`:

- tabellen har `Area`, som inkluderer kommuner som `Naestved`, `Soroe` og `Slagelse`
- tabellen har `Period`
- tabellen har dimensionen `_esco_uri`, dvs. stillingsbetegnelse (ESCO/STAR)

Det peger paa, at Jobindsats kan levere et foerste V1-dataspor, som ligger taettere paa faktiske stillinger end vores nuvaerende estimatlag.

## Implementeret V1-importfundament

Det er nu implementeret:

- Prisma-tabeller til importkoersler og kommune-snapshots
- lokalt importscript for `Y25i07`
- PowerShell-wrapper, som kan hente metadata og data stabilt
- laeselags-integration, saa appen foretraekker importeret `totalJobs`, naar et Jobindsats-snapshot findes

Lokal verifikation:

- schema er pushet til den lokale Neon-database
- `Y25i07` er importeret for `43` kommuner
- senest importerede periode under test var `2026M03`

## Vurdering

Dette ligner ikke laengere en almindelig lokal kodefejl. Det ligner fortsat en upstream adgangs-, policy- eller endpoint-konfigurationsfejl hos Jobindsats for Node/Next-runtime, men ikke noedvendigvis for PowerShell-klientsporet.

Derfor boer vi ikke endnu:

- bygge den endelige live datamapping direkte fra app-runtime
- erstatte StatBank-sporet i produktion
- binde UI direkte til Jobindsats-tabeller uden et stabilt importlag

## Naeste anbefalede skridt

1. Brug PowerShell discovery-sporet til at identificere de 2-5 vigtigste tabeller for kommuneniveau og jobsignal.
2. Undersoeg data-kald paa `Y25i07` for at afklare, hvilke parametre der bedst giver kommune- og stillingsnivaeu.
3. Afklar med Jobindsats support hvorfor Node/Next-runtime stadig giver `403`, naar PowerShell virker.
4. Vaelg integrationsform:
   - live server-side adapter, hvis Node-adgang aabnes
   - eller batch/importjob, hvis PowerShell forbliver den stabile adgangsvej
5. Foerst derefter implementeres adapteren til appens canonical model.

## Produktmaessig anbefaling

Jobindsats boer nu behandles som et reelt dataspor til V1, men stadig bag et adapter- eller importlag.

Hvis Jobindsats ikke leverer konkrete jobopslag med adresse og placering, skal det ikke presses ind som endelig erstatning for et senere STAR-jobfeed. I saa fald boer:

- Jobindsats bruges til stillings- og arbejdsmarkedssignaler
- STAR eller anden konkret jobkilde bruges til faktiske jobkort og praecise lokationer
