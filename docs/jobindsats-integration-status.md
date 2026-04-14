# Jobindsats Integration Status

## Formål

Denne note beskriver den første discovery-integration mod Jobindsats API v2, den aktuelle tekniske blokering og næste anbefalede skridt.

## Hvad der er implementeret

- `JOBINDSATS_API_TOKEN` er dokumenteret i `.env.example`
- server-only klient er oprettet i `lib/server/jobindsats.ts`
- internt discovery-endpoint er oprettet i `app/api/jobindsats/discovery/route.ts`
- endpointet understøtter:
  - `mode=subjects`
  - `mode=tables`
  - `mode=table`
  - `mode=relevant`

## Dokumentationskonklusioner

Ud fra den uploadede Jobindsats-dokumentation gælder:

- base URL er `https://api.jobindsats.dk/v2/`
- auth sendes som rå token i headeren `Authorization`
- `Bearer` er ikke dokumenteret og skal ikke bruges
- centrale discovery-kald er:
  - `/v2/subjects`
  - `/v2/tables`
  - `/v2/tables/<tableId>`
  - `/v2/data/<tableId>`

## Aktuel observeret adfærd

Status under lokal test:

- `subjects` har i enkelte forsøg virket via appens discovery-endpoint
- `tables` har konsekvent været ustabil eller returneret `403 Forbidden`
- direkte kald fra Node/Next runtime er blevet afvist med:
  - `You do not have permission to view this directory or page.`

Det gør integrationen utilstrækkelig til reel produktbrug endnu, fordi vi ikke kan gennemføre discovery af relevante målinger stabilt.

## Vurdering

Dette ligner ikke længere en almindelig lokal kodefejl. Det ligner en upstream adgangs-, policy- eller endpoint-konfigurationsfejl hos Jobindsats.

Derfor bør vi ikke endnu:

- bygge den egentlige datamapping til appens kommunemodel
- erstatte StatBank-sporet
- binde UI til Jobindsats-tabeller

## Næste anbefalede skridt

1. Afklar med Jobindsats support hvorfor tokenet giver `403` på discovery/data-kald.
2. Bed dem bekræfte præcis request-form for:
   - `/v2/subjects/`
   - `/v2/tables/`
   - `/v2/tables/<tableId>/`
   - `/v2/data/<tableId>/`
3. Når discovery virker stabilt, identificeres de tabeller der matcher:
   - kommune-niveau
   - branche/opdeling
   - målingsvariable med reel produktværdi
4. Først derefter implementeres adapteren til appens canonical model.

## Produktmæssig anbefaling

Jobindsats bør i første omgang behandles som et discovery- og statistikspor.

Hvis Jobindsats ikke leverer konkrete jobopslag med adresse/placering, skal det ikke presses ind som endelig erstatning for et senere STAR-jobfeed. I så fald bør:

- Jobindsats bruges til aggregerede indikatorer
- STAR eller anden konkret jobkilde bruges til faktiske jobkort og præcise lokationer
