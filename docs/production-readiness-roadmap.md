# Plan for produktionsmodning

Dato: 2026-09-30
Udgangspunkt: [produktionsreviewet](production-readiness-review-2026-09-30.md)

Planen er opdelt i faser, så vi kan levere og godkende én risikogruppe ad gangen. Estimaterne er arbejdsdage for én udvikler og forudsætter adgang til staging, database og deployment. Ingen fase går videre, før dens acceptkriterier er opfyldt.

## Status efter fase 0

- **Fase 0 er gennemført:** Brugeren er ansvarlig og har adgang til Vercel Preview (staging).
- Det lokale Vercel-link peger på projektet `branches-map`.
- Git-branchen `staging` er pushed. Seneste commit `93057d9` har en READY Vercel Preview-deployment på [staging-URL'en](https://branches-map-git-staging-andershauchs-projects.vercel.app). Anders har bekræftet, at login fungerer i Preview.
- Vercel Preview er projektets stagingmiljø. Preview bruger nu sin egen krypterede `DATABASE_URL`, rettet mod Neon-branch `staging`; Production beholder sin eksisterende `DATABASE_URL`. Preview har også separate `AUTH_SECRET` og `FOLLOW_CHECK_SECRET`. `APP_BASE_URL` er fortsat fælles, men appen bruger Vercels branch-URL automatisk for Preview. De resterende fælles miljøvariabler skal vurderes før staging åbnes for flere brugere.
- Vercel target-listen viser Production (`main`), Preview (alle ikke-main-branches) og Development. Custom environments er ikke tilgængelige på planen, men Preview fungerer som staging. Vercel CLI er autoriseret; Neon CLI er installeret og autentificeret.
- Neon-branch `staging` er oprettet schema-only fra projektets production-branch; ingen produktionsrækker blev kopieret. Den indeholder nu referenceseed, testkonti og JOBINDSATS-import. Neon MCP-forbindelsen er fortsat unscoped; Neon CLI-adgangen virker.
- Fase 2: 22 databasefri unit/API-kontrakttests, databaseintegrationstests for konto- og invitationsflows, CI-workflow og lokalt pre-push-hook er på plads. Hooket er aktiveret i denne lokale clone. GitHub Actions-run `36909567560` bestod med 23 tests og 0 spring over. Database- og rolleflows er også manuelt kontrolleret mod staging; browserbaserede E2E-tests mangler fortsat.
- GitHub-workflowen validerer Prisma, typer, lint, unit- og integrationstests samt production build mod en isoleret PostgreSQL-service. Den daglige import bruger repository-level secrets og er derfor nu begrænset til `main`; staging skal have særskilte GitHub Environment-secrets, før workflowet kan køres dér.
- Jobindsats v3-importen er kørt to gange mod staging for alle 43 aktive kommuner for 2026M08. Begge runs (`cmuoh0i2f0000lg61dfc84cyx`, `cmuohkivr0000vg61qi72cgi9`) er `completed`; genkørsel efterlod fortsat 43 snapshots, 293 branchekategorier og 2.009 titler. Live API-svar og staging stemmer nu for alle tre mål i fem kommuner (Kalundborg, Køge, Næstved, Slagelse og Sorø). Referenceseed indeholder 43 kommuner, 129 branche-relationer og 387 demo-jobs.
- Login-/rolleflowet er HTTP-testet med den byggede app koblet til staging: superadmin får adgang til brugeradministration; admin og almindelig bruger afvises dér; admin får adgang til almindelig admin; bruger afvises fra admin. Invitation acceptance oprettede en admin, og genbrug af token blev afvist. Anders har bekræftet Preview-login i browseren 2026-10-01. Resend-maillevering er ikke testet, fordi Preview ikke har `RESEND_API_KEY` eller en godkendt testmodtager.
- Reviewmiljøets lokale Postgres-forbindelse blev oprindeligt afvist (`EACCES`); Neon CLI-adgangen er nu brugt til stagingkontrollerne.
- `npm audit` viste fire high findings i Prisma-afhængighedsgrafen. Den automatiske løsning foreslog en major-versionstilbagegang og blev ikke anvendt.

## Næste arbejdsskridt

1. Observer den normale planlagte import i GitHub Actions, og bekræft fejlalarm og håndtering af forældede data.
2. Bekræft invitation via en Preview-specifik Resend-konfiguration og en godkendt testmodtager.
3. Tilføj browserbaserede E2E-tests for login, invitationer, admin og kioskflow.
4. Gennemgå de resterende fælles Preview-miljøvariabler og luk åbne konto-/recovery-krav før flere brugere får adgang.

## Fase 0 — Gør release-miljøet klar

**Omfang:** Bekræft staging, adgang til Postgres, miljøvariabler, deployment- og rollback-adgang. Udpeg ansvarlige for drift, database, importfejl og sikkerhedshændelser. Bekræft backup-retention og planlæg restore-drill.

**Leverancer:** Navngivne ejere, verificeret staging-URL og database, miljøvariabeloversigt uden hemmeligheder, rollback-vej og tidspunkt for restore-test.

**Accept:** Teamet kan deploye staging, læse logs, gendanne en backup til et separat miljø og rulle en release tilbage.

**Estimat:** 0.5–1 dag, afhængigt af platformadgang.

## Fase 1 — Få dataændringerne sikkert i drift

**Omfang:** Deploy StatBank LSK13-skiftet til staging. Kør den normale Jobindsats v3-import mod stagingdatabasen. Kontrollér derefter appens faktiske læsning af de importerede snapshots.

**Kontroller:**

- LSK13 returnerer seneste periode og Region Sjællands total.
- Branchefordelingen bruger DB25-koder; kommuneværdier bliver tydeligt kaldt estimater.
- Jobindsats-importen dækker alle forventede kommuner og mål, logger import-run-id og håndterer genkørsel uden dubletter.
- Sammenlign repræsentative værdier med de officielle API-svar, og bekræft at forsinkede eller manglende kilder bliver synlige.

**Accept:** Staging viser forventede perioder og tal, importen er idempotent, og ingen produktionstabel bliver ændret utilsigtet.

**Estimat:** 0.5–1.5 dage.

## Fase 2 — Byg testfundament og GitHub-gates

Dette er den første kodefase. Testene skal bygges sammen med hver funktion, ikke samles til sidst.

### Testlag

1. **Unit tests (Node test runner + tsx):** første batch dækker inputvalidering, kommune-/periodekoder, DB25-titelmapping, StatBank-requestregler, password hashing, Jobindsats v3-auth og same-origin-regler. Estimator-fixtures, import-parser og flere authorization flows mangler fortsat.
2. **API-kontraktstests:** første kontrakttests bekræfter Jobindsats v3-endpoint, Bearer-header og at upstream-fejlbody ikke lækkes. Redigerede StatBank/Jobindsats svarfixtures, timeout-scenarier og edge cases for manglende felter mangler fortsat.
3. **Database-integrationstests:** GitHub Actions starter en isoleret PostgreSQL 16-service og anvender Prisma-schemaet. Tests af import-upserts, transaktioner, roller, rate limits, audit events og bruger-/invite-flow mangler fortsat.
4. **End-to-end tests (Playwright):** ikke implementeret endnu. Planlæg testapp med testdatabase og dæk offentlig kortvisning, login/logout, invitation, adgangskontrol, admin samt kiosk/mobil-overgang.

### GitHub og lokale kontroller

- Tilføjet workflow for alle pushes og pull requests: `npm ci`, PostgreSQL 16 testservice, Prisma schema push/validate, lint, typecheck, unit tests og production build. Separate database-integrationstests mangler fortsat.
- Kør E2E i separat job mod testdatabase. Gem traces/screenshots kun ved fejl; brug aldrig produktionshemmeligheder eller produktionsdata.
- Tilføjet lokalt `pre-push`-hook, der kører hele `npm run verify:ci` før push i denne clone. Hooket er feedback til udvikleren, ikke en fjern sikkerhedsgrænse.
- Beskyt `main`: kræv at GitHub-checks er grønne før merge, og slå direkte pushes til `main` fra. CI på push finder fejl efter push; kun det lokale hook kan stoppe push før den sendes.
- Hold live API-smoke-tests og dependency audit som særskilte checks, så eksterne udfald ikke gør almindelige unit tests ustabile. Håndtér de fire kendte Prisma findings eksplicit; markér dem ikke som løst uden en understøttet opgradering eller dokumenteret risikovurdering.

**Accept:** En pull request kan ikke merges med fejl i lint, typer, unit-/integrationstest eller build. Fejl i E2E blokerer merge for ændringer i de dækkede brugerflows. `npm run verify` kører den lokale, hemmelighedsfri minimumspakke.

**Estimat:** 2–4 dage for fundamentet; derefter tests som del af hver feature.

## Fase 3 — Login, konti og adgang

**Omfang:** Beslut først om borgerkonti er offentlige eller invitation-only. For offentlig registrering: verificeret e-mail før konto kan bruges. Implementér engangs-password-reset med hash af token, udløb, rate limit og generisk svar, så e-mailadresser ikke kan enumereres. Kræv invitation for medarbejdere. Indfør MFA eller organisatorisk SSO for administratorer. Automatisér sletning og retention efter den vedtagne politik.

**Testkrav:** E2E for registrering, verifikation, login, reset, udløbet/genbrugt token, rollegrænser, invitation og sletning. Test at inaktive eller nedgraderede brugere mister adgang straks.

**Accept:** Hver rolle har dokumenteret adgangsmatrix; ingen privilegeret konto kan oprettes via offentlig registrering; recovery og deletion er gennemført i staging.

**Estimat:** 3–6 dage, afhængigt af valgt e-mail/MFA-løsning.

## Fase 4 — Sikkerhed og driftsberedskab

**Omfang:** Luk eller dokumentér Prisma-afhængighedsfund, gennemgå secrets og miljøkonfiguration, bekræft sikkerhedshoveder/cookies, rate limits, audit-logning, fejlalarmer, backup og restore. Gennemfør staging-review af adgangsroller og kontroller efter deployment.

**Accept:** Ingen ubehandlede kritiske/high findings uden skriftlig ejer, afhjælpning eller udløbsdato for accepteret risiko. Restore-drill bestået. Import- og loginfejl alarmerer den navngivne ejer. Rollback er prøvet.

**Estimat:** 1–3 dage plus ventetid på leverandørrettelse.

## Fase 5 — Performance, pilot og go-live

**Omfang:** Mål Lighthouse/Web Vitals på repræsentativ mobil og kiosk. Mål p50/p95 for `/api/jobs`, kortvisning, login og databaseforespørgsler. Kør realistisk belastning mod staging, optimer ud fra målinger, og gentag efter ændringer. Start med kontrolleret pilot og definer stop/rollback-tærskler.

**Accept:** Mål og tærskler aftalt før belastningstest; ingen kritiske fejl under forventet spidsbelastning; datakildernes periode og estimater fremgår tydeligt; ansvarlige følger dashboards og har prøvet rollback.

**Estimat:** 1–3 dage plus pilotens observationsperiode.

## Foreslået rækkefølge

1. Fase 0: staging/database/adgang og ejerskab — gennemført.
2. Fase 2 (trukket frem): test-suite og påkrævede GitHub-gates før næste push.
3. Vercel Preview (staging) med den separate Neon staging-database; opret den vedvarende Git-branch efter CI-gates.
4. Fase 1: deploy og verificér API-/importændringer på staging.
5. Fase 3: vælg og implementér kontopolitik.
6. Fase 4: sikkerhed og driftskontroller.
7. Fase 5: performancebaseret pilot og go-live-beslutning.

En fase kan godt opdeles i små pull requests. Vi bør ikke aktivere brugerkonti bredt eller kalde løsningen produktionsklar, før faserne 1–4 er godkendt, og fase 5 har en dokumenteret go/no-go.
