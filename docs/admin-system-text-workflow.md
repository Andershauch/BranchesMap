# Admin System Text Workflow

Denne app har nu to forskellige oversættelsesspor i admin:

- `/{locale}/admin/app-texts` for brugerrettede systemtekster i frontend
- `/{locale}/admin/jobindsats-titles` for Jobindsats-titeloversættelser

Dokumentet her beskriver kun frontend-systemteksterne.

## Formål

Systemtekst-editoren gør det muligt at rette og oversætte brugerrettet UI-copy uden at lave små tekstændringer direkte i de versionsstyrede locale-filer.

Editoren er lavet som et runtime-override-lag oven på de eksisterende dictionaries, ikke som en fri CMS-erstatning for alle tekster i kodebasen.

## Kildehierarki

Systemtekster læses i denne rækkefølge:

1. filbaserede locale-dictionaries i `lib/i18n/dictionaries/*.ts`
2. base-aggregat i `lib/i18n/base-dictionaries.ts`
3. database-overrides i `AppTextTranslation`
4. runtime-merge i `lib/server/app-text-translations.ts`
5. serveradgang via `lib/i18n/runtime-dictionaries.ts`

Det betyder:

- filerne er stadig baseline og fallback
- databasen kan override en godkendt tekstnøgle pr. sprog
- reset i admin går tilbage til filværdien for den valgte locale

## Hvad kan redigeres

Editoren er bevidst begrænset til frontend-grupper, som bruges i brugeroplevelsen:

- `home`
- `municipality`
- `municipalityPage`
- `labels`
- `industries`
- `menu`
- `authStatus`
- `mapControls`
- `pwa`
- `sheet`
- `travel`
- `followsPage`
- `loginPage`
- `registerPage`
- `savedSearchesPage`

Alle andre nøgler er låst ude af editoren og bliver heller ikke brugt som runtime-overrides, selv hvis nogen manuelt skriver dem ind i databasen.

Det er en bevidst sikkerheds- og driftsbeslutning:

- admin må kunne rette frontend-copy
- admin må ikke kunne ændre tekniske eller systeminterne tekster, som kode afhænger af

## Validering

Når en tekst gemmes i admin, sker der to vigtige checks:

1. nøglen skal være på allowlisten for redigerbare frontend-grupper
2. placeholders skal matche base-teksten præcist

Placeholders er tokens som fx:

- `{municipality}`
- `{industries}`
- `{count}`

Hvis en admin ændrer eller sletter en placeholder, bliver gemningen afvist.

## Status i editoren

Hver tekst vises med en status:

- `Matcher fil`: databaseværdien svarer til locale-filen
- `Afviger`: databasen overstyrer filen
- `Mangler værdi`: den valgte locale har en tom runtime-værdi

Editoren understøtter også:

- søgning på nøgle eller tekst
- filter for `alle`, `mangler værdi`, `afviger fra fil`
- gruppefilter
- reset til filværdi pr. nøgle

## Audit

Ændringer i systemtekst-editoren bliver audit-logget.

Opdatering logger:

- action: `admin.app_text_translation_updated`
- bruger
- nøgle
- gruppe
- locale
- før-værdi
- efter-værdi

Reset logger:

- action: `admin.app_text_translation_reset`
- bruger
- nøgle
- gruppe
- locale
- før-værdi
- efter-værdi

## Drift

Når en tekst gemmes eller nulstilles:

- `app-text-translations` tag revalideres
- relevante offentlige sider revalideres
- admin-editoren revalideres

Det betyder, at små tekstrettelser normalt slår igennem uden ny deploy.

## Arbejdsgang

Den anbefalede arbejdsgang er:

1. brug `admin/app-texts` til små copy- og oversættelsesrettelser
2. brug status/filter til at gennemgå manglende eller afvigende tekster
3. brug reset, hvis en lokal runtime-ændring skal tilbage til baseline
4. lav større strukturelle tekstændringer i de versionsstyrede dictionary-filer

## Ikke i scope

Editoren er ikke lavet til:

- fri redigering af alle admin-tekster
- ændring af kodeafhængige systemstrenge
- ændring af datamodeller eller nøglenavne
- redigering af Jobindsats-titeloversættelser

Det sidste har sit eget admin-værktøj og sin egen datamodel.
