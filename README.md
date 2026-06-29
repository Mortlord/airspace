# AirSpace Live

Ein eigenständiges Flugradar-Frontend im Phosphor-Grün-Look — Teil des [adsb-radar.de](https://adsb-radar.de)-Projekts. Single-File-PWA, installierbar auf dem iPhone-Homescreen.

![Mode: GPS / Feeder](https://img.shields.io/badge/mode-GPS%20%7C%20Feeder-5ef2a0?style=flat-square&labelColor=040806)
![PWA](https://img.shields.io/badge/PWA-installable-5ef2a0?style=flat-square&labelColor=040806)

## Was es kann

- **Phosphor-Radar** auf Canvas: Range-Ringe, rotierender Sweep, Himmelsrichtungen, Geschwindigkeitsvektoren, tappbare Kontakte
- **Zwei Modi per Umschalter:**
  - **📍 GPS** — Zentrum ist die Live-Position des Browsers (Default)
  - **📡 Feeder** — Zentrum ist der eigene Pi-Feeder (owner-token-geschützt)
- **Callsign-Suche** + Range-Auswahl (5 / 10 / 25 / 50 / 100 NM)
- **Detail-Sheet** beim Antippen eines Flugzeugs:
  - **Satellite Feed** (Esri World Imagery) — Flugzeug fix in der Mitte, Karte gleitet flüssig nach (Interpolation zwischen den Updates), Symbol dreht in Flugrichtung
  - **Foto** des Flugzeugs (Planespotters) als Inset
  - **Telemetrie** (Höhe, Speed, Distanz, Bearing) und **Flugroute** (Start → Ziel)
- **Toggles:** Military Highlight, All Labels
- **Stabile Datenabfrage:** letzte gültige Daten bleiben bei einer Netz-Delle oder kurzem Server-Aussetzer erhalten (kein Sprung auf 0); Abbruch-Timeout pro Abruf, dezenter Stale-Indikator erst bei längerem Kontaktverlust
- **PWA:** Manifest, Apple-Touch-Icon und Service-Worker inline eingebettet — eine einzige Datei

## Installation

Die App ist eine einzelne `index.html` ohne Build-Schritt.

1. `index.html` in den Root dieses Repos legen
2. Unter **Settings → Pages**: *Deploy from a branch* → `main` → `/ (root)`
3. Aufruf unter `https://<user>.github.io/<repo>/`

### Auf dem iPhone als App

1. URL in **Safari** öffnen (nur Safari kann auf iOS zum Homescreen hinzufügen)
2. Teilen → **Zum Home-Bildschirm**
3. Startet im Vollbild mit eigenem Radar-Icon

> **GPS braucht HTTPS.** Über GitHub Pages (`https://…`) funktioniert die Standortabfrage; beim Öffnen der lokalen Datei (`file://`) nicht.

## Konfiguration

Die Backend-URL ist im Kopf der Datei gesetzt:

```js
const BASE = "https://web-production-a6fc8.up.railway.app";
```

Einstellungen (Modus, Radius, Owner-Token, Toggles) werden im `localStorage` des Browsers gespeichert.

### Feeder-Modus

Beim ersten Wechsel auf **📡 Feeder** fragt die App nach dem **Owner-Token** und legt es lokal ab. Das Token wird nicht im Code gespeichert — dieses Repo kann daher öffentlich sein. Der Feeder-Standort kommt serverseitig aus den Railway-Variablen `FEEDER_LAT` / `FEEDER_LON`.

## Backend-Endpoints

| Endpoint | Zweck |
|----------|-------|
| `GET /aircraft?lat=&lon=&radius=` | Flugzeuge im Umkreis (GPS-Modus) |
| `GET /feeder?token=` | Flugzeuge vom eigenen Pi (Feeder-Modus, owner-only) |
| `GET /route?callsign=` | Flugroute (Start/Ziel), serverseitig gecacht |
| `GET /airlines` | Airline-Namen-Mapping |
| `GET /geocode?lat=&lon=` | Reverse-Geocoding mit Server-Cache |

Distanz und Bearing werden **immer per Haversine** vom aktiven Zentrum berechnet — das `dst`-Feld von airplanes.live wird ignoriert.

## Technik

- Vanilla JS / HTML / Canvas — kein Framework, kein Build
- [Leaflet](https://leafletjs.com/) + Esri World Imagery für den Satellite Feed (kein API-Key)
- [Planespotters API](https://www.planespotters.net/) für Fotos
- PWA-Assets (Icon, Manifest, Service Worker) als Data-URIs inline

## Datenquellen & Lizenz

Flugdaten via [airplanes.live](https://airplanes.live), Kartenmaterial © Esri, Fotos © jeweilige Planespotters-Fotografen. Privates Hobby-Projekt — keine Gewähr für Richtigkeit oder Verfügbarkeit der Daten.
