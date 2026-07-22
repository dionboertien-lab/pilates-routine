# BACKLOG — Pilates Routine

## 📌 Status per 23 Juli 2026

Alle 28 kwetsbaarheden en verbeterpunten uit de **4e diepgaande audit-review** zijn in de code opgelost, gevalideerd met ESLint & Vitest, en gecommiteerd.

---

## 🟢 Afgerond in de 4e Audit-ronde (Gerealiseerd)

- [x] **Niveau 1-8 Progressie**: `getWeekProgression()` vermenigvuldigt `levelMultiplier` (0.75-1.40) × `weekMultiplier` (1.00-1.25). Niveau 8 is nu feitelijk zwaarder dan niveau 1.
- [x] **Firestore Score-begrenzing**: `/communities/{id}/members/{uid}` update-regels eisen `score <= resource.data.score + 1` tegen manipulatie.
- [x] **Strikte Firestore Veldvalidatie**: `validUserData()` toegevoegd voor `/users/{userId}` en type/lengtevalidatie op `/chats/{chatId}`.
- [x] **Atomische Cloud Reset**: `resetCloudProgress()` verwijdert in één `writeBatch` zowel het gebruikersdocument als alle community-lidmaatschappen.
- [x] **Atomische Progressie Push**: `pushUserProgress()` schrijft in één `writeBatch` naar `/users` en `/communities/members`.
- [x] **Invite Centralisatie**: Community-uitnodigingen worden uitsluitend via `subscribeToAuth` in `main.js` verwerkt.
- [x] **MIME-Type Behoud**: `extractImagePayload()` behoudt het exacte MIME-type (`image/png`, `image/webp`, `image/jpeg`).
- [x] **Robuuste Video Seek**: `seekVideo()` met 8s timeout, error handling, `Number.isFinite(duration)` en afmetingsvalidatie.
- [x] **Tijdzone-veilige Datumparsing**: `parseLocalISODate(dateString)` voorkomt UTC-dagverschuivingen.
- [x] **Async Workout Completion**: `nextStep()` in `workoutScreen.js` is `async` en `await` de `pushUserProgress` call met foutkoppeling.
- [x] **Heart-Rate Validatie**: BLE-parser filtert onrealistische hartslagen buiten 30–240 BPM.
- [x] **Profiel Normalisatie**: `normalizeProfile()` valideert en corrigeert corrupte LocalStorage-invoer.
- [x] **Dialog Toegankelijkheid**: `activateDialogAccessibility()` met focus trap, `Escape`-toets listener, `role="dialog"` en `aria-modal="true"`.
- [x] **Geheel Gender-vrij**: Gender is 100% uit de hele app, data, onboarding en instellingen gestript.
- [x] **ESLint 0 Errors**: `"npm run lint"` sluit af met **0 errors**.
- [x] **Vitest Unit Tests**: **5/5 tests passed**.

---

## 🔮 Toekomstige Uitbreidingen (Optioneel voor latere releases)

- [ ] **Cloud Functions Score Engine (Optioneel)**: Indien het product in de toekomst 100% server-side scorevalidatie vereist zonder client-side writes.
- [ ] **E2E Testsuite**: Cypress of Playwright tests voor automatische UI-flow verificatie op emulators.
