# AirSpace Live

Ein Flugradar für den Browser, das die Flugzeuge rund um den eigenen Standort zeigt, gestaltet nach dem Vorbild eines Flugsicherungsbildschirms. Teil des Projekts [adsb-radar.de](https://adsb-radar.de). Läuft als Web-App und lässt sich auf dem Smartphone wie eine App auf den Startbildschirm legen.

## Funktionen

- **Radar mit Hintergrundkarte:** Norden oben, fünf Entfernungsringe, maßstabsgetreue Karte (Esri Dark Gray), per Schalter abschaltbar. Ortsnamen ab 10.000 Einwohnern zeichnet das Radar selbst, scharf und ohne Überlappungen.
- **Flugzeuge wie auf dem Lotsenschirm:** Zielsymbol, Historienpunkte der letzten Positionen, Vektor bis zur Position in einer Minute, Helligkeit nach Flughöhe. Optional Datenblock mit Callsign, Flugfläche und Geschwindigkeit.
- **Flüssige Bewegung:** Zwischen zwei Positionsmeldungen rechnet die App Kurs und Geschwindigkeit weiter und zeichnet zweimal pro Sekunde neu.
- **Suche** nach Callsign oder Hex-Kennung (Teiltreffer genügen); Nicht-Treffer werden gedimmt.
- **Weltweite Verfolgung:** Liegt ein vollständiges Callsign oder eine Flugnummer (VN10 wird zu HVN10) nicht im Umkreis, springt das Radar zum Flugzeug, zeigt nur dieses und folgt ihm; ein Button führt zurück zum eigenen Standort.
- **Umkreis** 5, 10, 25, 50 oder 100 NM.
- **Detailansicht** beim Antippen eines Flugzeugs: Satellitenbild (Esri World Imagery), das dem Flugzeug folgt, mit eigenem Symbol je ADS-B-Emitterkategorie (Jet, Großraum, Kleinflugzeug, Hubschrauber, Segler, Militärjet, Ballon, Drohne), Foto von Planespotters mit Nennung der Fotografin oder des Fotografen, Route, Muster, Kennzeichen, Höhe, Geschwindigkeit, Entfernung und Richtung.
- **Robuste Datenabfrage:** Bei Netzaussetzern bleiben die letzten gültigen Daten stehen; erst nach drei Fehlern in Folge zeigt die Statuszeile „Keine Verbindung“.
- **Deutschsprachig**, inklusive Hilfe- sowie Impressums- und Datenschutzseite.

## Dateien

```
index.html             App (Leaflet, Icons und Manifest sind eingebettet)
help.html              Hilfe
legal.html             Impressum und Datenschutz
sw.js                  Abschalt-Service-Worker für Altbesucher der bisherigen öffentlichen App
places.tsv             Ortsnamen ab 10.000 Einwohnern (GeoNames, CC BY 4.0), wird nur bei aktiver Karte geladen
fonts/                 Barlow Semi Condensed 400/600/700 (SIL OFL, siehe fonts/OFL.txt)
```

Es gibt keinen Build-Schritt. Schriften, Ortsnamen und Kartenbibliothek werden selbst ausgeliefert, damit beim Laden der Seite keine Drittanbieter angefragt werden.

## Einrichtung

1. Alle Dateien samt `places.tsv` und Ordner `fonts/` in den Root dieses Repos legen.
2. Unter **Settings → Pages**: *Deploy from a branch*, dann `main` und `/ (root)` wählen.
3. Aufruf unter `https://<user>.github.io/<repo>/` bzw. der eigenen Domain; derzeit vorübergehend unter [adsb-radar.de](https://adsb-radar.de), bis die öffentliche App zurückkehrt.

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
| `GET /callsign?cs=` | Weltweite Suche und Verfolgung eines Callsigns oder einer IATA-Flugnummer (Zuordnung aus den VRS-Stammdaten), nur exakte Treffer mit Position |
| `GET /route?callsign=` | Abflug- und Zielflughafen, serverseitig zwischengespeichert |
| `GET /airlines`, `GET /aircrafttypes` | Namen für Airline-Kürzel und Mustercodes in der Detailansicht |

Der Server bezieht die Positionen von adsb.fi, ersatzweise von adsb.lol (bei der Callsign-Suche wird adsb.lol zusätzlich gefragt, wenn adsb.fi nichts findet), und die Routen von adsbdb bzw. AeroDataBox. Entfernung und Richtung berechnet die App immer selbst per Haversine vom Standort aus; ein mitgeliefertes `dst`-Feld wird ignoriert.

## Technik

- Vanilla JS, HTML und Canvas, kein Framework
- [Leaflet](https://leafletjs.com/) 1.9.4, eingebettet (BSD-2-Clause)
- Esri Dark Gray Canvas als Grundkarte für das Radar, Esri World Imagery für die Detailansicht, jeweils ohne API-Key
- [Planespotters API](https://www.planespotters.net/) für Fotos

**Bekannte Einschränkung:** Der Service Worker wird über eine Blob-URL registriert, was Browser ablehnen. Die App ist deshalb derzeit nicht offline-fähig.

## Datenquellen und Hinweise

Flugdaten über [adsb.fi](https://adsb.fi) und [adsb.lol](https://adsb.lol); Karten © Esri, HERE, Garmin, OpenStreetMap-Mitwirkende sowie Esri, Maxar, Earthstar Geographics; Ortsnamen © [GeoNames](https://www.geonames.org) (CC BY 4.0); Fotos © jeweilige Planespotters-Fotografinnen und -Fotografen. Privates Hobbyprojekt ohne Gewähr für Richtigkeit oder Verfügbarkeit der Daten. Nicht für Navigation oder andere sicherheitskritische Zwecke geeignet.
