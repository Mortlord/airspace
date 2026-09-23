# AirSpace Live

Ein Flugradar für den Browser, das die Flugzeuge rund um den eigenen Standort zeigt, gestaltet nach dem Vorbild eines Flugsicherungsbildschirms. Teil des Projekts [adsb-radar.de](https://adsb-radar.de). Läuft als Web-App und lässt sich auf dem Smartphone wie eine App auf den Startbildschirm legen.

## Funktionen

- **Radar mit Hintergrundkarte:** Norden oben, fünf Entfernungsringe, maßstabsgetreue Karte (Esri Dark Gray) mit Ortsnamen, per Schalter abschaltbar.
- **Flugzeuge wie auf dem Lotsenschirm:** Zielsymbol, Historienpunkte der letzten Positionen, Vektor bis zur Position in einer Minute, Helligkeit nach Flughöhe. Optional Datenblock mit Callsign, Flugfläche und Geschwindigkeit.
- **Flüssige Bewegung:** Zwischen zwei Positionsmeldungen rechnet die App Kurs und Geschwindigkeit weiter und zeichnet zweimal pro Sekunde neu.
- **Suche** nach Callsign oder Hex-Kennung (Teiltreffer genügen); Nicht-Treffer werden gedimmt.
- **Umkreis** 5, 10, 25, 50 oder 100 NM.
- **Detailansicht** beim Antippen eines Flugzeugs: Satellitenbild (Esri World Imagery), das dem Flugzeug folgt, Foto von Planespotters mit Nennung der Fotografin oder des Fotografen, Route, Muster, Kennzeichen, Höhe, Geschwindigkeit, Entfernung und Richtung.
- **Robuste Datenabfrage:** Bei Netzaussetzern bleiben die letzten gültigen Daten stehen; erst nach drei Fehlern in Folge zeigt die Statuszeile „Keine Verbindung“.
- **Deutschsprachig**, inklusive Hilfe- sowie Impressums- und Datenschutzseite.

## Dateien

```
index.html             App (Leaflet, Icons und Manifest sind eingebettet)
airspace-help.html     Hilfe
airspace-legal.html    Impressum und Datenschutz
fonts/                 Barlow Semi Condensed 400/600/700 (SIL OFL, siehe fonts/OFL.txt)
```

Es gibt keinen Build-Schritt. Schriften und Kartenbibliothek werden selbst ausgeliefert, damit beim Laden der Seite keine Drittanbieter angefragt werden.

## Einrichtung

1. Alle Dateien samt Ordner `fonts/` in den Root dieses Repos legen.
2. Unter **Settings → Pages**: *Deploy from a branch*, dann `main` und `/ (root)` wählen.
3. Aufruf unter `https://<user>.github.io/<repo>/` bzw. der eigenen Domain.

### Als App auf dem Smartphone

- **iPhone und iPad:** URL in Safari öffnen, Teilen, dann „Zum Home-Bildschirm“.
- **Android:** In Chrome Menü, dann „App installieren“ oder „Zum Startbildschirm hinzufügen“.

> **Die Standortabfrage braucht HTTPS.** Über GitHub Pages funktioniert sie, beim Öffnen der Datei direkt vom Rechner (`file://`) nicht. Zum lokalen Testen genügt ein kleiner Webserver, z. B. `python3 -m http.server`, und der Aufruf über `http://localhost:8000`.

## Konfiguration

Die Backend-Adresse steht am Anfang des Skripts in `index.html`:

```js
const BASE = "https://api.adsb-radar.de";
```

Im `localStorage` des Browsers (Präfix `asl_`) liegen nur Umkreis sowie die Schalter für Beschriftung und Hintergrundkarte.

## Genutzte Backend-Endpoints

| Endpoint | Zweck |
|----------|-------|
| `GET /aircraft?lat=&lon=&radius=` | Flugzeuge im Umkreis des Standorts, Abruf alle 2 Sekunden |
| `GET /route?callsign=` | Abflug- und Zielflughafen, serverseitig zwischengespeichert |

Der Server bezieht die Positionen von adsb.fi, ersatzweise von adsb.lol, und die Routen von adsbdb bzw. AeroDataBox. Entfernung und Richtung berechnet die App immer selbst per Haversine vom Standort aus; ein mitgeliefertes `dst`-Feld wird ignoriert.

## Technik

- Vanilla JS, HTML und Canvas, kein Framework
- [Leaflet](https://leafletjs.com/) 1.9.4, eingebettet (BSD-2-Clause)
- Esri Dark Gray Canvas (Grundkarte und Ortsnamen) für das Radar, Esri World Imagery für die Detailansicht, jeweils ohne API-Key
- [Planespotters API](https://www.planespotters.net/) für Fotos

**Bekannte Einschränkung:** Der Service Worker wird über eine Blob-URL registriert, was Browser ablehnen. Die App ist deshalb derzeit nicht offline-fähig.

## Datenquellen und Hinweise

Flugdaten über [adsb.fi](https://adsb.fi) und [adsb.lol](https://adsb.lol); Karten © Esri, HERE, Garmin, OpenStreetMap-Mitwirkende sowie Esri, Maxar, Earthstar Geographics; Fotos © jeweilige Planespotters-Fotografinnen und -Fotografen. Privates Hobbyprojekt ohne Gewähr für Richtigkeit oder Verfügbarkeit der Daten. Nicht für Navigation oder andere sicherheitskritische Zwecke geeignet.
