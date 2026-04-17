# JOBVEJ V1 Checklist

## 1. Indhold og oversættelser

- [ ] Alle Jobindsats-titeloversættelser er gennemgået og godkendt i admin-editoren
- [ ] Alle 8 sprog har fuld dækning for Jobindsats-titler i databasen
- [ ] Alle centrale UI-tekster er gennemgået for fallback-engelsk og blandet sprog
- [ ] Godkendt DB-tilstand er eksporteret til en versionsstyret backupfil

## 2. UI og produktoplevelse

- [ ] Topbar, menu og kommunevisninger er gennemgået på mobil og desktop
- [ ] RTL-visninger er kontrolleret for arabisk, farsi og urdu
- [ ] Jobnet-links og branchepills er konsistente og uden misvisende jobtal
- [ ] Admin-flader er brugbare og læsbare

## 3. Data og produktlogik

- [ ] Branche-ranking og repræsentative titler er låst til V1
- [ ] Importeret Jobindsats-data opdateres stabilt via dagligt flow
- [ ] UI kommunikerer tydeligt forskellen mellem importerede tal og relaterede Jobnet-søgninger

## 4. QA og release

- [ ] Anonym bruger, almindelig bruger og admin er testet end-to-end
- [ ] Login, register, follows, saved searches og admin er testet
- [ ] Alle sprog er testet i centrale flows
- [ ] PWA-installation og opdateringsflow er testet

## 5. Drift og ansvar

- [ ] Sikkerhed/hardening v1 er verificeret mod seneste kode
- [ ] Privacy/compliance-basis er dokumenteret
- [ ] Deployment- og rollback-rutine er kendt
- [ ] Driftstjekliste før release er samlet
