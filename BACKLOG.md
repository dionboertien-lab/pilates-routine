# BACKLOG — Pilates Routine

## Review-ronde XR (swarm-review 2026-07-12, volledige app incl. ongecommitte wijzigingen)

### Hoog

- **XR.1 — Stored XSS via leaderboard- en groepsnamen.** `communityScreen.js:134` rendert `${user.name}` en `:113` rendert `${c.name}` ongeescaped in `innerHTML`. Beide waarden zijn door (andere) gebruikers vrij te kiezen (`social.js` pushUserProgress/createCommunity, geen validatie in rules). Een naam als `<img src=x onerror=...>` draait script bij iedereen die het leaderboard/de groeptabs ziet. Fix: `escapeHTML(...)` (bestaat al in `core.js:28`). Latent verwant: invite-code in `communityScreen.js:33` via `t('auth.sub2', code)` is ook ongeescaped.
- **XR.2 — Firestore-rules valideren geen velden.** `firestore.rules:8`: eigen `users`-doc mag vrij geschreven worden → leaderboard-stats vervalsbaar én iedereen kan willekeurige community-codes in zijn `communities`-array zetten (ongenode toetreding tot elke groep, aanvalspad voor XR.1). `firestore.rules:13`: `communities` create eist niet `request.resource.data.ownerId == request.auth.uid` en geen naam-validatie. **Let op: rules-wijziging = migration-protocol draaien.**
- **XR.3 — Invite-/community-join-flow is niet aangesloten.** De invite-knop genereert `/?invite=CODE` (`communityScreen.js:167`), maar nergens wordt `?invite=` geparsed of `pilates_pending_invite` gezet; `initializeSocialUser()` en `joinCommunity()` (`social.js:13,175`) worden nergens aangeroepen. Gevolg ook: `pushUserProgress` zet nooit het `communities`-veld, dus nieuwe gebruikers matchen de `array-contains`-query niet en verschijnen niet in het leaderboard (`social.js:73-137`).
- **XR.4 — Timer-interval lekt bij Android hardware-back tijdens workout.** `main.js:92-95` zet `state.screen='home'` zonder `clearTimerInterval()`; het interval blijft aftellen, piept en her-rendert het home-scherm elke seconde. De quit-knop doet het wél goed (`workoutScreen.js` handleQuit).
- **XR.5 — Zes oefeningen verwijzen naar niet-bestaande afbeeldingen.** `exercises.js`: `lunges`, `squats`, `calf-raises`, `push-ups`, `commando-planks` (alle male-focus) en `superman-hold` (targetGender 'all') hebben geen `.webp` in `public/images/`. Fallback-SVG voorkomt crash, maar instructiebeeld ontbreekt; mannelijke gebruikers missen vrijwel al hun been/core-beelden.

### Middel

- **XR.6 — Onbeschermde `JSON.parse` kan de app bricken.** `storage.js:43,122` parsen localStorage zonder try/catch; één corrupt record → exception tijdens boot (`main.js:29`) → witte pagina zonder herstelpad. Fix: try/catch met fallback naar defaults.
- **XR.7 — Datumgrens/tijdzone-bug rond startdatum.** `storage.js:95`: `new Date('YYYY-MM-DD')` parseert als UTC-middernacht, terwijl voltooiing lokaal gedateerd wordt (`markTodayComplete`). In negatieve UTC-offset verschuiven week, rotatie en kalender-highlights een dag.
- **XR.8 — `pushUserProgress` kan leaderboard-totalen verlagen.** `social.js:81-87` schrijft de lokale `totalWorkouts` hard, terwijl `initializeSocialUser:49` `Math.max(local, remote)` gebruikt. Na lokale reset of op een tweede device gaat het Firestore-totaal omlaag.
- **XR.9 — coachScreen is een niet-functionele Engelse mockup.** Nieuw `coachScreen.js`: wél in router/nav bedraad (`core.js:8,21`, `navigation.js:16`), maar upload-knop, input en send-knop hebben geen listeners; alle teksten hardcoded Engels buiten i18n (geen `coach.*`-keys); toont verzonnen biometrische feedback ("HRV was optimal today") die de app niet meet. Beslissen: afmaken, achter feature-flag, of niet shippen.
- **XR.10 — Scheduler-doellogica inconsistent.** `scheduler.js:29-39`: `profile.goals` wordt volledig genegeerd (alleen `baseLevels>0` telt); alle spiergroepen op 0 zetten geeft juist de vólledige routine op niveau 1; rotatie loopt op kalenderdagen i.p.v. voltooide workouts, waardoor bij vaste trainingsdagen structureel dezelfde groep overgeslagen kan worden.
- **XR.11 — Progressiecurve-inconsistenties.** `exercises.js:55-64`: multiplier-sprong L4→L5 is +50% (1.2→1.8; blessurerisico t.o.v. de vlakke onderkant); `maxDuration` (regel 84) laat timers vanaf ~L5 plateau'en terwijl de UI "Expert" toont; `holdDuration` (regel 87) heeft juist géén cap.

### Laag (gebundeld)

- **XR.12** — `communityScreen.js:129` goud/zilver/brons als harde hexcodes en `homeScreen.js:150` hardcoded palet in JS (eigenaarsregel: geen harde kleuren buiten CSS-variabelen).
- **XR.13** — `workoutScreen.js:55`: `sideLabel` is een platte NL-string, verschijnt ook in de Engelse UI als "been"/"kant".
- **XR.14** — Dode code: `'auth-screen'`-conditie (`main.js:19`) onbereikbaar; `figure-4-stretch.webp`/`hamstring-stretch.webp` ongebruikt.
- **XR.15** — `workoutScreen.js:399`: skip-drempel telt warmup/stretch/side-stappen mee; alle krachtoefeningen skippen kan toch als "voltooid" tellen.
- **XR.16** — Coach-scherm a11y/layout: send-knop 40px (<44px touch-target), geen aria-labels, laatste chatbericht kan achter de vaste input-balk vallen (`style.css:1978` vs `2086-2119`).
- **XR.17** — `sw.js:1`: cache-naam handmatig bumpen per deploy (alleen offline-gebruikers geraakt; network-first vangt de rest); `storage.js` mist een `schemaVersion` voor toekomstige niet-additieve migraties.
- **XR.18** — `completeScreen.js:15-25`: Firestore-push bij elke render (onnodige writes); `getMissedWorkouts` (`storage.js:182`) is heuristisch en voedt een leaderboard-veld.
