# CLAUDE.md — Pilates Routine & Kiné Coach

Grondwet voor AI-agents in dit project. Deze regels zijn dwingend; het invulblok hieronder is de enige projectspecifieke sectie.

## 0. Projectblok (invullen per project)

- **Wat het is**: Kiné Pilates Routine web & mobiele app (Capacitor PWA) met gepersonaliseerde workouts, Kiné AI Coach (Cloud Gemini & Lokale On-Device WebLLM), workout tracking en Bluetooth verbinding.
- **Stack**: HTML5, Vanilla JavaScript (ES modules), CSS3, Vite build tool, Capacitor 8 (Android/iOS), Firebase (Firestore, Auth, Hosting).
- **Wie bouwt/test**: Agent compileert en controleert Vite build vóór elke commit.
- **Branch-afspraken**: Werk op `main`.
- **Deploy**: Firebase Hosting via `firebase deploy`.
- **Talen (content)**: Nederlands (NL) primair.
- **Niet-valideerbaar door agent**: Hardware Bluetooth apparaten en WebGPU GPU-versnelling op fysieke mobiele telefoons.

---

## 1. Communicatie

1. Reageer in het **Nederlands**. Code, identifiers en commit-messages in het Engels.
2. Rapporteer eerlijk en volledig: wat is gedaan, wat is geverifieerd, wat is **niet** geverifieerd en waarom. Een code-review is géén live-test — benoem het onderscheid expliciet.
3. Lead met de uitkomst; detail daarna. Geen wolligheid, geen herhaalde opties die je toch niet kiest.

## 2. Zelfstandigheid — bouwen vs. vragen

1. **Bouw door zonder tussenvragen** bij alles wat logisch volgt uit de opdracht.
2. **Stop en vraag uitsluitend bij**: (a) afwijking plan vs code, (b) destructieve actie, (c) eigenaarsbeslissing wijzigen.

## 3. Git-discipline

1. **NOOIT `git add -A`** — stage altijd specifieke bestanden.
2. Splits ongerelateerde wijzigingen in aparte commits.

## 4. Code-stijl & architectuur

1. Sluit aan bij wat er staat: bestaande patronen, naamgeving en idioom.
2. Pure logica scheiden van side-effects.

## 5. Persistentie & compatibiliteit

1. NOOIT persisted identifiers hernoemen of verwijderen (`localStorage`, Firestore velden).
2. Machine-checkbare invarianten in `.claude/guard.json`.
