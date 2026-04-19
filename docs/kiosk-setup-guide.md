# Kiosk Setup Guide

Denne guide beskriver den praktiske opsætning af JOBVEJ som receptionskiosk.

## Mål

Kiosk-opsætningen skal:

- åbne direkte på kiosk-ruten `/{locale}?kiosk=1`
- føles som en app frem for en almindelig browserfane
- gøre det svært for borgere at navigere væk fra appen
- gøre det let for personale at gendanne den korrekte starttilstand

## Hvad der er implementeret i appen

Kiosk-ruten bruger nu et særskilt web app manifest:

- normal app: `/manifest.webmanifest`
- kiosk-manifest: `/manifest-kiosk.webmanifest`

Når forsiden åbnes med `?kiosk=1`, peger siden på kiosk-manifestet, som bruger:

- `display: "fullscreen"`
- `start_url: "/da?kiosk=1"`

Det betyder, at en installeret kiosk-variant kan starte direkte i fullscreen-lignende app-tilstand uden at ændre den normale installerede mobiloplevelse.

## Vigtig begrænsning

En webapp kan ikke selv garantere ægte låst kiosk-tilstand.

For rigtig kiosk-drift skal I kombinere tre lag:

1. JOBVEJ-kiosk-ruten
2. installeret PWA
3. enhedens kiosk mode eller låste browser-mode

PWA-manifestet giver app-følelsen. Enhedens kiosk mode giver den faktiske låsning.

## Anbefalet start-URL

Brug denne URL som kiosk-entry:

```text
https://branches-map.vercel.app/da?kiosk=1
```

Erstat domænet hvis produktion ligger et andet sted.

## Anbefalet opsætning

### Android tablet eller Android touchskærm

Anbefalet model:

1. Åbn kiosk-URL'en i Chrome.
2. Installér appen til hjemmeskærmen.
3. Åbn den installerede app og bekræft, at den starter på `/da?kiosk=1`.
4. Aktivér Android kiosk mode eller screen pinning på enheden.
5. Slå systemfunktioner fra, som gør det let at forlade appen, hvis device management tillader det.

Det mest robuste setup er Android Enterprise / MDM-styret kiosk mode, hvor én app er tilladt.

### Windows touchskærm

Anbefalet model:

1. Brug Edge eller Chrome til at åbne kiosk-URL'en.
2. Installér JOBVEJ som app.
3. Start den installerede app og bekræft fullscreen-adfærd.
4. Aktivér Windows Assigned Access eller tilsvarende kiosk-opsætning.
5. Sæt JOBVEJ-appen eller den valgte browser-app som eneste tilladte kiosk-app.

Hvis I ikke har OS-niveau kiosk mode, så brug mindst browserens kiosk-startparameter ved opstart.

Eksempel for Edge:

```text
msedge.exe --kiosk https://branches-map.vercel.app/da?kiosk=1 --edge-kiosk-type=fullscreen
```

Eksempel for Chrome:

```text
chrome.exe --kiosk https://branches-map.vercel.app/da?kiosk=1
```

OS-styret kiosk mode er stadig bedre end kun browser-flag.

### iPad / iPhone

iOS kan være fin til app-lignende visning, men er normalt mindre fleksibel som hårdt låst offentlig kiosk end Android/Windows.

Anbefalet model:

1. Åbn kiosk-URL'en i Safari.
2. Brug "Føj til hjemmeskærm".
3. Start den installerede webapp.
4. Brug Guided Access for at låse enheden til appen.

På iOS er Guided Access det vigtigste kiosk-lag.

## Driftscheckliste

Efter opsætning skal I verificere:

- kiosk-enheden åbner direkte på `/da?kiosk=1`
- QR-kortet vises
- attract-mode aktiveres efter inaktivitet
- første touch vækker oplevelsen og nulstiller korrekt
- normal mobilrute uden `?kiosk=1` viser ikke kiosk-UI
- den installerede kiosk-variant åbner uden almindelig browser-chrome
- personale kan gendanne enheden til startskærmen uden udviklerhjælp

## Fallback hvis fuld kiosk-lås ikke er mulig

Hvis I ikke kan få MDM eller OS-kiosk mode på plads, så brug denne minimumsmodel:

1. installer JOBVEJ som PWA
2. brug kiosk-URL'en som fast startpunkt
3. skjul browserens normale navigation så vidt muligt
4. placer en enkel lokal driftsvejledning ved receptionen
5. instruér personale i at gendanne til `/da?kiosk=1`

Det er ikke lige så stærkt, men det er stadig markant bedre end en almindelig browserfane.
