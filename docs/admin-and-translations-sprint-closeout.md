# Admin And Translations Sprint Closeout

Date: 2026-04-18
Status: `done`

## Summary

Sprinten gjorde admin-området brugbart som et driftsværktøj og flyttede systemtekster fra ren filafhængighed til et kontrolleret runtime-override-lag.

Det vigtigste resultat er, at admin nu er opdelt efter opgave:

- overblik
- kortstyring
- sikkerhed
- frontend-systemtekster
- Jobindsats-titeloversættelser

Samtidig er systemtekst-editoren gjort sikker nok til drift:

- kun godkendte frontend-grupper kan redigeres
- placeholders valideres
- reset går tilbage til filværdi
- ændringer audit-logges

## Delivered

- admin dashboard på `/{locale}/admin`
- separat `admin/security`
- forenklet `admin/home-map`
- `regionTag` fjernet fra aktiv admin-workflow
- `AppTextTranslation` som DB-model for runtime systemtekster
- runtime dictionary merge med file fallback
- systemtekst-editor i `admin/app-texts`
- audit logging for update og reset
- dokumentation af systemtekst-workflow

## Not delivered in this sprint

- fuld migration af alle app-strenge
- publicering/approval-flow for tekstændringer
- separat versionshistorik pr. tekstnøgle
- generel content management uden for tekst

## QA Result

Sprinten blev lukket på baggrund af:

- grøn `npx tsc --noEmit`
- grøn `npm run lint`
- manuel verifikation af admin-navigation
- manuel verifikation af systemtekst-editor med runtime-effekt
- manuel verifikation af reset, placeholder-guardrails og rollebeskyttet adgang

## Recommended next step

Næste oplagte spor er at fortsætte med `P1-23` og `P1-24` fra go-live-backloggen, så de resterende autentificerede pilot- og sikkerhedschecks bliver lukket i deployed miljø.
