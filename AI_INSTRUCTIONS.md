# AI Instructions - Pilates Routine App

**Aan toekomstige AI's / Agentic Assistants:**
Dit document bevat actuele context over de codebase, architectuur en werkwijze van de "Pilates Routine" app. Lees dit document aandachtig door voordat je wijzigingen aanbrengt.

## 1. Project Overzicht
- **Type App:** Single Page Application (SPA) web-app, verpakt als native Android & iOS app.
- **Tech Stack:** Vanilla JavaScript, HTML, CSS. Gebouwd en gebundeld met **Vite**.
- **Aesthetic:** Vrouwelijk, zacht, modern. Kleuren: Sage Green (`#A8C09A`), Rose Pink (`#D4A0A0`), crèmes. Geen standaard, harde kleuren gebruiken; alles moet 'premium' aanvoelen. CSS bevindt zich in `src/style.css`.
- **Afbeeldingen:** Oefeningen gebruiken `.webp` afbeeldingen in de `public/images/` map.

## 2. Platform & Hosting
- **Versiebeheer:** Git is geïnitialiseerd. De main repository staat op GitHub: `dionboertien-lab/pilates-routine`.
- **Web / Hosting:** Firebase Hosting. Gekoppeld aan project `pilates-22dcd`. Je kunt de webversie bouwen en updaten via:
  `npx vite build` -> `firebase deploy`
- **Native (Android & iOS):** We gebruiken **Capacitor** (`@capacitor/core`).
  - **App ID:** `com.pilatestrainer.app`
  - **Workflow bij web-wijzigingen:** Als je aanpassingen doet aan de `.js`, `.css` of `.html` bestanden, draai je `npx vite build` (of `npm run build`) gevolgd door `npx cap sync` om de wijzigingen door te duwen naar de native Android/iOS mappen.
  - **Let op:** De Android bundel wordt door de gebruiker lokaal in Android Studio gecompileerd. Verander geen native configuraties (`build.gradle`, etc.) zonder overleg.

## 3. Belangrijke Logica (Functionaliteit)
- **State Management:** Lokale profielen en progressie worden client-side opgeslagen in `localStorage` via `src/utils/storage.js`. Er is een globaal stateregister in `src/state.js`.
- **UI Structuur:** De app werkt met modulaire schermen in `src/ui/screens/` (zoals `homeScreen.js`, `workoutScreen.js`, `communityScreen.js`). De rendering loop wordt aangestuurd via `src/ui/core.js`.
- **Firebase Backend (Social & Leaderboards):** 
  - Naast lokale opslag, maakt de app gebruik van **Firebase Auth** (Google & Email) en **Firestore**.
  - Logica hiervoor zit in `src/utils/auth.js`, `src/utils/firebase.js` en `src/utils/social.js`.
  - Bij het afronden van workouts (of openen van de community page) pusht de app de progressie naar Firestore zodat het leaderboard update.
- **Progressie Systeem:** De app gebruikt een 8-niveaus progressiesysteem (1 = Beginner, 8 = Expert). Dit wordt **per spiergroep** bijgehouden (Core, Benen & Billen, Rug & Houding).
  - De logica hiervoor bevindt zich in `src/data/exercises.js`. Niveaus sturen een vermenigvuldiger (multiplier) aan.

## 4. Gouden Regels
1. **Behoud het design:** Voeg geen ongestylde knoppen of standaard alert/waarschuwingsvensters toe. Maak gebruik van de modale dialoogvensters en de CSS in `src/style.css`.
2. **Capacitor Sync:** Vergeet niet `npx cap sync` te draaien nadat je Vite hebt gebouwd.
3. **Versiebeheer:** Gebruik `git add .`, `git commit` en `git push` als je gevraagd wordt wijzigingen op te slaan. Check altijd eerst de `git status`.
4. **Validatie backend flows:** Bij aanpassingen aan Firestore reads/writes, denk aan het updaten van de security rules in `firestore.rules` als er datastructuurwijzigingen zijn.

---
*Laatst bijgewerkt: juli 2026*
