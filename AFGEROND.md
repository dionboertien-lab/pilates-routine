# AFGEROND — Pilates Routine

## 2026-07-23 (v1.2.6 Bugfixes)

- **Onboarding Hersteld**: Fix voor `TypeError: Cannot read properties of undefined (reading 'core')` in stap 1 door `baseLevels` toe te voegen aan de fallback state in `src/state.js`.
- **Leaderboard Crash & Verbinding Hersteld**: Firestore regels gecorrigeerd; `.keys().hasOnly(...)` verving naar `.affectedKeys().hasOnly(...)` om te voorkomen dat bestaande velden (zoals legacy `gender`) cloud-updates (zoals `pushUserProgress`) blokkeerden met een `PERMISSION DENIED` crash. De `score <= resource.data.score + 1` beperking is ook verwijderd omdat dit offline bulk-uploads weigerde.
- **Sync Oude vs Nieuwe Data**: `pushUserProgress()` gebruikt nu net als login `Math.max()` tussen server-data en lokale data, waardoor cloud-scores veilig blijven na een app reset.
- **Web Login Hang**: `signInWithPopup` vervangen door `signInWithRedirect` voor het web/Capacitor-fallback inlogproces om het langdurig "witte scherm" issue op mobiele browsers (cross-site isolatie) te verhelpen.

## 2026-07-23 (5e Audit-ronde v1.2.4)

- **Coach Screen Scope Fix**: Event-listeners, `chatRef` en `sendMessage` logica hersteld binnen de correcte scope van `renderCoach()`.
- **Lege Workout Guard**: `startWorkout()` bevat een expliciete guard wanneer er geen oefeningen beschikbaar zijn.
- **Niveau 0 Behoud (`??`)**: `|| 1` vervangen door `?? 1` in `exercises.js` en `workoutScreen.js`; uitgeschakelde onderdelen (niveau 0) worden niet meer geforceerd omgezet naar niveau 1.
- **Firestore Security Rules Hardening**: Strikte `keys().hasOnly()` restricties op `/users`, score-begrenzing (max score 500 bij create/update) op `/communities/members`, en immutable ownerId op `/communities`.
- **AI Foutafhandeling**: Netwerk/API foutberichten worden lokaal via toasts getoond en niet meer permanent als modelberichten opgeslagen in de Firestore chatgeschiedenis.
- **Onboarding Step Alignment**: Stap-indexen in `saveStepData()` afgestemd op de 4 onboarding schermen.
- **PROJECT_SOURCE_CODE.md Clean Export**: Codeblock formatting gecorrigeerd met volwaardige Markdown syntax-fencing.

## 2026-07-23 (4e Audit-ronde)

- **Niveau 1-8 Progressie**: `getWeekProgression()` vermenigvuldigt `levelMultiplier` (0.75-1.40) × `weekMultiplier` (1.00-1.25). Niveau 8 is nu feitelijk zwaarder dan niveau 1.
- **Firestore Score-begrenzing**: `/communities/{id}/members/{uid}` update-regels eisen `score <= resource.data.score + 1` tegen manipulatie.
- **Strikte Firestore Veldvalidatie**: `validUserData()` toegevoegd voor `/users/{userId}` en type/lengtevalidatie op `/chats/{chatId}`.
- **Atomische Cloud Reset**: `resetCloudProgress()` verwijdert in één `writeBatch` zowel het gebruikersdocument als alle community-lidmaatschappen.
- **Atomische Progressie Push**: `pushUserProgress()` schrijft in één `writeBatch` naar `/users` en `/communities/members`.
- **Invite Centralisatie**: Community-uitnodigingen worden uitsluitend via `subscribeToAuth` in `main.js` verwerkt.
- **MIME-Type Behoud**: `extractImagePayload()` behoudt het exacte MIME-type (`image/png`, `image/webp`, `image/jpeg`).
- **Robuuste Video Seek**: `seekVideo()` met 8s timeout, error handling, `Number.isFinite(duration)` en afmetingsvalidatie.
- **Tijdzone-veilige Datumparsing**: `parseLocalISODate(dateString)` voorkomt UTC-dagverschuivingen.
- **Async Workout Completion**: `nextStep()` in `workoutScreen.js` is `async` en `await` de `pushUserProgress` call met foutkoppeling.
- **Heart-Rate Validatie**: BLE-parser filtert onrealistische hartslagen buiten 30–240 BPM.
- **Profiel Normalisatie**: `normalizeProfile()` valideert en corrigeert corrupte LocalStorage-invoer.
- **Dialog Toegankelijkheid**: `activateDialogAccessibility()` met focus trap, `Escape`-toets listener, `role="dialog"` en `aria-modal="true"`.
- **Geheel Gender-vrij**: Gender is 100% uit de hele app, data, onboarding en instellingen gestript.
- **ESLint 0 Errors**: Static quality en syntax checks uitgevoerd.
- **Vitest Unit Tests**: **6/6 tests passed**.

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
