# AI Instructions - Pilates Routine App

**Aan toekomstige AI's / Agentic Assistants:**
Dit document bevat cruciale context over de codebase, architectuur en werkwijze van de "Pilates Routine" app. Lees dit document door voordat je wijzigingen aanbrengt.

## 1. Project Overzicht
- **Type App:** Single Page Application (SPA) web-app, verpakt als native Android & iOS app.
- **Tech Stack:** Vanilla JavaScript, HTML, CSS. Gebouwd en gebundeld met **Vite**.
- **Aesthetic:** Vrouwelijk, zacht, modern. Kleuren: Sage Green (`#A8C09A`), Rose Pink (`#D4A0A0`), crèmes. Geen standaard, harde kleuren gebruiken; alles moet 'premium' aanvoelen.

## 2. Platform & Hosting
- **Web / Hosting:** Firebase Hosting. Gekoppeld aan project `pilates-22dcd`. Je kunt de webversie bouwen en updaten via:
  `npx vite build` -> `firebase deploy`
- **Native (Android & iOS):** We gebruiken **Capacitor** (`@capacitor/core`).
  - **App ID:** `com.pilatestrainer.app`
  - **Let op (Lokale Build):** De gebruiker compileert de Android `.aab` / `.apk` bundels zelf lokaal via **Android Studio** op een Windows-machine. 
  - **iOS:** Bouwen voor iOS kan de gebruiker lokaal (nog) niet doen wegens Windows OS. Verander geen zware native configuraties zonder overleg.
  - **Workflow bij web-wijzigingen:** Als je aanpassingen doet aan de `.js`, `.css` of `.html` bestanden, draai je `npm run build` gevolgd door `npx cap sync` om de wijzigingen door te duwen naar de native Android/iOS mappen.
  - **Assets:** App iconen en splash screens worden beheerd via `@capacitor/assets` (gegenereerd in de `assets/` map in de root).

## 3. Belangrijke Logica (Functionaliteit)
- **State Management:** Alles wordt client-side opgeslagen in `localStorage` via `src/utils/storage.js`. Er is (buiten Firebase hosting) geen complexe backend of cloud-database in gebruik voor de profielen.
- **Progressie Systeem:** De app gebruikt een 8-niveaus progressiesysteem (1 = Beginner, 8 = Expert). Dit wordt **per spiergroep** bijgehouden (Core, Benen & Billen, Rug & Houding).
  - De logica hiervoor bevindt zich in `src/data/exercises.js` (`applyProgression` en `getWeekProgression`).
  - Niveaus sturen een vermenigvuldiger (multiplier) aan. Niveau 1 = `0.5x`, Niveau 8 = `4.0x`. Een basis-plank van 30s wordt dus 15s op Niveau 1 en 120s op Niveau 8.
- **Onboarding & Instellingen:** Dit gebeurt allemaal in `src/main.js`. De gebruiker kan daar het startniveau per spiergroep bepalen en de startdatum instellen (welke niet in het verleden gezet kan worden).

## 4. Gouden Regels
1. **Behoud het design:** Voeg geen ongestylde knoppen of standaard waarschuwingsvensters toe. Maak gebruik van de bestaande CSS classes (`.btn`, `.card`, enz.) in `index.css`.
2. **Capacitor Sync:** Vergeet niet `npx cap sync` te draaien nadat je Vite hebt gebouwd, anders komen je wijzigingen niet terecht in de Android/iOS app van de gebruiker.
3. **Versiebeheer:** Als je instructies geeft om naar de Play Store te gaan, wijs de gebruiker dan op het updaten van de `versionCode` en `versionName` in `android/app/build.gradle` voordat ze in Android Studio compileren.

---
*Laatst bijgewerkt: juli 2026*
