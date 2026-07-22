# AFGEROND — Pilates Routine

## 2026-07-22

- **XR.12 — CSS Variabelen voor Rangschikking Kleuren.** `--gold`, `--silver`, `--bronze` gedefinieerd in `style.css` en toegepast in `communityScreen.js`.
- **XR.13 — Meertaligheid `sideLabel`.** Vertalingen `side.been` ('been'/'leg') en `side.kant` ('kant'/'side') toegevoegd aan `i18n.js` en gekoppeld in `workoutScreen.js`.
- **XR.14 — Dode code opruimen.** Onbereikbare routing-conditie `'auth-screen'` opgeruimd uit `main.js`.
- **XR.15 — Workout Skip-drempel.** Skip-drempel in `workoutScreen.js` bijgewerkt zodat het skippen van meer dan 50% van de *kern-oefeningen* (excl. warmup/stretch) een waarschuwing geeft en de workout niet als voltooid registreert.
- **XR.16 — Coach UI Touch-targets & Layout.** Knoppen in Kiné Coach vergroot naar 44px (touch-target toegankelijkheid), `aria-label`s toegevoegd en chat bottom-padding vergroot.
- **XR.17 — Storage `schemaVersion`.** `schemaVersion: 1` toegevoegd aan `DEFAULT_PROFILE` in `storage.js`.
- **XR.18 — Geen Onnodige Writes in `completeScreen.js`.** Firestore-push logica gecontroleerd en uitsluitend bij eenmalige afronding in `workoutScreen.js` behouden.
- **XR.6 — Onbeschermde `JSON.parse` kan de app bricken.** Try/catch blokken met veilige fallbacks toegevoegd in `storage.js` rond `getProfile()`, `getCompletedDays()`, `saveProfile()` en `markTodayComplete()`.
- **XR.7 — Datumgrens/tijdzone-bug rond startdatum.** `getMissedWorkouts()` in `storage.js` bijgewerkt om `getProgramStartDate()` als lokale datum te ontleden in plaats van UTC-middernacht parsing.
- **XR.8 — `pushUserProgress` kan leaderboard-totalen verlagen.** `social.js` en `firestore.rules` garanderen dat `Math.max(remoteTotal, localTotal)` afgedwongen wordt en totalen nooit omlaag geschreven kunnen worden.
- **XR.10 — Scheduler-doellogica inconsistent.** `getActiveGoals(profile)` in `scheduler.js` afgestemd op de combinatie van expliciete `profile.goals` en `baseLevels`.
- **XR.11 — Progressiecurve-inconsistenties.** Multipliers in `exercises.js` versoepeld voor Niveaus 1 t/m 8 (`0.7` t/m `2.5`) met een gezonde cap op `holdDuration` (max 30 sec).
- **XR.1 — Stored XSS via leaderboard- en groepsnamen.** `escapeHTML` consequent toegepast op alle gerenderde gebruikersnamen, groepsnamen en inputs in `communityScreen.js`, `settingsScreen.js`, `homeScreen.js` en `workoutScreen.js`. Invoersanitatie via `sanitizeText` toegevoegd aan `social.js`.
- **XR.2 — Firestore-rules valideren geen velden.** `firestore.rules` uitgebreid met strikte eigenaarscontrole (`request.auth.uid == userId`) en veldtype-/lengtevalidaties voor gebruikersnamen en groepsnamen (volgens `migration-protocol`).
- **XR.3 — Invite-/community-join-flow is niet aangesloten.** `?invite=CODE` URL parsering toegevoegd aan `main.js`. De invite-code wordt opgeslagen en de gebruiker treedt na inloggen direct automatisch toe tot de betreffende community via `joinCommunity(code)` met een bevestigingstoast.
- **XR.5 — Zes oefeningen verwijzen naar niet-bestaande afbeeldingen.** Gecontroleerd dat alle 25 WebP bestanden aanwezig zijn in `public/images/`. In `workoutScreen.js` een `onerror` fallback met een elegante SVG-illustratie toegevoegd.
- **XR.9 — Kiné AI Coach & Lokale LLM (Gemma/Llama 3.2) + Video Form Check.** Geïmplementeerd met modulaire WebLLM (On-Device GPU) en Gemini Multimodal Cloud API met video keyframe extraction.
