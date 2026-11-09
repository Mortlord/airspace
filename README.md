# AirSpace Live

Ein Flugradar für den Browser, das die Flugzeuge rund um den eigenen Standort zeigt. Teil des Projekts [adsb-radar.de](https://adsb-radar.de). Läuft als Web-App und lässt sich auf dem Smartphone wie eine App auf den Startbildschirm legen.

Aktuelle Version: **2.7** (steht unten rechts in der App).

## Funktionen

- **Über dir:** Eine Karte oben zeigt, welches Flugzeug in den nächsten drei Minuten am nächsten an dir vorbeikommt: Countdown, Callsign, Fluglinie und Route, dazu Himmelsrichtung und Höhenwinkel, unter dem du es findest. Im Radar führt eine gestrichelte Linie zum Punkt der größten Annäherung.
- **Radar und Liste:** Umschaltbar oben. Das Radar zeigt Pfeile in Flugrichtung, die Helligkeit gibt die Höhe in vier Stufen an, Flugzeuge am Boden sind braungrau. Vier Entfernungsringe, Norden oben, maßstabsgetreue Hintergrundkarte (Esri Dark Gray). Die Liste zeigt alle Flugzeuge im Umkreis, das nächste zuoberst, mit Flug, Fluglinie, Route, Höhe, Entfernung und Geschwindigkeit.
- **Ruhige Beschriftung:** Callsigns weichen einander, den Ringzahlen und den Himmelsrichtungen aus und behalten ihre Seite, solange dort Platz ist. Ortsnamen ab 10.000 Einwohnern zeichnet das Radar selbst; sie stehen fest und werden nur kurz ausgeblendet, wenn ein Flugzeug darüber fliegt.
- **Flüssige Bewegung:** Zwischen zwei Positionsmeldungen rechnet die App Kurs, Geschwindigkeit, Kurven sowie Steig- und Sinkflug weiter.
- **Suche** nach Callsign oder Hex-Kennung (Teiltreffer genügen); Nicht-Treffer werden gedimmt.
- **Weltweite Verfolgung:** Liegt ein vollständiges Callsign oder eine Flugnummer (VN10 wird zu HVN10) nicht im Umkreis, springt das Radar zum Flugzeug und folgt ihm; ein Button führt zurück zum eigenen Standort.
- **Umkreis** 10, 20, 40, 80 oder 160 NM, wählbar in der Werkzeugleiste unter dem Radar.
- **Detailansicht** beim Antippen: Satellitenbild (Esri World Imagery), das dem Flugzeug folgt, mit eigenem Symbol je ADS-B-Emitterkategorie, Foto von Planespotters mit Nennung der Fotografin oder des Fotografen, Route, Muster, Kennzeichen, Höhe, Geschwindigkeit, Flugrichtung und Richtung von dir aus als Himmelsrichtung mit Gradzahl.
- **Flughafenwetter (METAR):** Flughäfen mit aktueller Wettermeldung als Punkte im Radar, mit deutscher und englischer Übersetzung der Meldung.
- **Einstellungen** hinter dem Zahnrad: Hintergrundkarte, Flughafenwetter, Beschriftung aller Flugzeuge.
- **Robuste Datenabfrage:** Bei Netzaussetzern bleiben die letzten gültigen Daten stehen; fehlgeschlagene Kartenkacheln werden einmal neu angefordert.
- **Deutsch und Englisch**, automatisch nach Browsersprache, inklusive Hilfe sowie Impressum und Datenschutz.

## Owner-Bereich

Zusatzfunktionen nur für den Betreiber, in `owner.js`. Die Datei wird nur geladen, wenn im Browser ein Owner-Code liegt; Gäste bekommen sie nie. Anmeldung: fünfmal schnell auf die Uhrzeit oben rechts tippen (funktioniert auch in der installierten App) oder `adsb-radar.de/#owner` aufrufen. Jeder Owner-Endpunkt prüft den Code zusätzlich auf dem Server.

- **Datenquelle** oben neben dem Namen: Standort (GPS), Heim-Pi (eigener Empfänger) oder Fixpunkt. Im Heim-Pi- und Fixpunkt-Modus markiert ein Kreuz die Mitte, der blaue Punkt bleibt der eigene Standort.
- **Favoriten** mit Telegram-Alarm im Umkreis von 20 NM um den eigenen Standort: per Stern im Detailblatt oder als Präfix in den Einstellungen. Favoriten tragen im Radar einen orangen Ring, der Alarmradius ist ein orange gestrichelter Kreis um den Standort. Die Liste wird vor jedem Speichern frisch vom Server geholt, damit nichts überschrieben wird.
- **Werkzeugleiste:** 3D-Ansicht, Regenradar des DWD (in jeder Datenquelle und in der Flughafenansicht), Flughafenansicht Stuttgart (EDDS) mit Vorfeld, Rollwegen und Pisten; dort empfängt adsb.fi auch den Bodenverkehr gut. Bodenfahrzeuge erscheinen als kleine Quadrate und werden getrennt gezählt; im Radar und in der Liste fehlen sie, weil sie keine Flugzeuge sind.
- **Einstellungen:** Kompass (iPhone, Standort-Modus; Radar und Karte drehen mit der Blickrichtung), Link zur 3D-Empfangsreichweite des Heim-Pi (`coverage.html`), Abmelden.

## Dateien

```
index.html             App (Leaflet, Icons und Manifest sind eingebettet)
owner.js               Owner-Bereich, nur mit Owner-Code geladen
coverage.html          3D-Empfangsreichweite des Heim-Pi (Owner)
three.min.js           three.js r128 für 3D-Ansicht und Empfangsreichweite (MIT)
airport-edds.json      Flughafen Stuttgart aus OpenStreetMap (ODbL) für die Flughafenansicht
help.html, help-en.html     Hilfe
legal.html, legal-en.html   Impressum und Datenschutz (die deutsche Fassung ist verbindlich)
sw.js                  Abschalt-Service-Worker für Altbesucher der früheren öffentlichen App
places.tsv             Ortsnamen ab 10.000 Einwohnern (GeoNames, CC BY 4.0), nur bei aktiver Karte geladen
fonts/                 Barlow Semi Condensed 400/600/700 und IBM Plex Mono 400/600 (SIL OFL)
```

Es gibt keinen Build-Schritt. Schriften, Ortsnamen, Kartenbibliothek und three.js werden selbst ausgeliefert, damit beim Laden der Seite keine Drittanbieter angefragt werden.

## Einrichtung

1. Alle Dateien samt `places.tsv` und Ordner `fonts/` in den Root dieses Repos legen.
2. Unter **Settings → Pages**: *Deploy from a branch*, dann `main` und `/ (root)` wählen.
3. Aufruf unter der eigenen Domain [adsb-radar.de](https://adsb-radar.de).

Nach dem Hochladen kann GitHub Pages bis zu zehn Minuten die alte Fassung ausliefern. Ob die neue angekommen ist, zeigt die Versionsnummer unten rechts; die installierte App auf dem iPhone muss dafür einmal ganz geschlossen und neu geöffnet werden.

### Als App auf dem Smartphone

- **iPhone und iPad:** URL in Safari öffnen, Teilen, dann „Zum Home-Bildschirm“.
- **Android:** In Chrome Menü, dann „App installieren“ oder „Zum Startbildschirm hinzufügen“.

> **Die Standortabfrage braucht HTTPS.** Über GitHub Pages funktioniert sie, beim Öffnen der Datei direkt vom Rechner (`file://`) nicht. Zum lokalen Testen genügt ein kleiner Webserver, z. B. `python3 -m http.server`, und der Aufruf über `http://localhost:8000`.

### Flughafendaten erzeugen

Die Datei `airport-edds.json` entsteht in [Overpass Turbo](https://overpass-turbo.eu) mit dieser Abfrage und *Export → GeoJSON → herunterladen*:

```
[out:json][timeout:60];
nwr["aeroway"="aerodrome"]["icao"="EDDS"];
map_to_area->.ap;
(
  way["aeroway"](area.ap);
  node["aeroway"="gate"](area.ap);
  way["building"](area.ap);
);
out geom;
```

Für einen anderen Flughafen den ICAO-Code in der Abfrage und das Objekt `AP` am Anfang der Flughafenansicht in `owner.js` anpassen.

## Konfiguration

Am Anfang des Skripts in `index.html`:

```js
const APP_VERSION = "2.7";                    // bei jeder Auslieferung erhöhen
const BASE = "https://api.adsb-radar.de";     // Backend
```

Im `localStorage` des Browsers (Präfix `asl_`) liegen Umkreis, Ansicht (Radar oder Liste) und die Schalter für Beschriftung, Hintergrundkarte und Flughafenwetter. Im Owner-Bereich zusätzlich der Owner-Code, die gewählte Datenquelle sowie die Schalter für 3D und Regenradar.

## Genutzte Backend-Endpoints

| Endpoint | Zweck |
|----------|-------|
| `GET /aircraft?lat=&lon=&radius=` | Flugzeuge im Umkreis, Abruf alle 2 Sekunden |
| `GET /callsign?cs=` | Weltweite Suche und Verfolgung eines Callsigns oder einer IATA-Flugnummer (Zuordnung aus den VRS-Stammdaten), nur exakte Treffer mit Position |
| `GET /route?callsign=&lat=&lon=&alt=&trk=&vr=` | Abflug- und Zielflughafen, serverseitig 14 Tage zwischengespeichert. Mit Position, Höhe, Kurs und Steigrate prüft der Server, ob die Route plausibel ist (Flughafenkoordinaten aus OurAirports): seitlicher Abstand zum Großkreis, Lage entlang der Strecke, Flugrichtung im Reiseflug sowie Höhe und Richtung nahe Start und Ziel. Bei unplausiblen Routen holt er eine Zweitmeinung von AeroDataBox (Tagesbudget per `ADB_CHECK_DAILY_MAX`, Standard 40); sonst zeigt die App „Route unklar“ |
| `GET /metar?lat=&lon=&radius=` | Wettermeldungen der Flughäfen im Umkreis (Aviation Weather Center), Position auf etwa 1 km gerundet |
| `GET /airlines`, `GET /aircrafttypes` | Namen für Airline-Kürzel und Mustercodes |
| `GET /feeder`, `GET /fixpoint` | Owner: Daten vom Heim-Pi bzw. um den Fixpunkt (mit Owner-Code) |
| `GET /favorites`, `POST /update` | Owner: Favoriten lesen und speichern, Standort für die Alarme melden |
| `GET /coverage` | Owner: Empfangsreichweite des Heim-Pi |

Der Server bezieht die Positionen von adsb.fi, ersatzweise von adsb.lol, und die Routen von adsbdb bzw. AeroDataBox. Entfernung und Richtung berechnet die App immer selbst vom Standort aus.

## Technik

- Vanilla JS, HTML und Canvas, kein Framework
- [Leaflet](https://leafletjs.com/) 1.9.4, eingebettet (BSD-2-Clause)
- [three.js](https://threejs.org/) r128, selbst gehostet (MIT)
- Esri Dark Gray Canvas als Grundkarte, Esri World Imagery für die Detailansicht, jeweils ohne API-Key
- [Planespotters API](https://www.planespotters.net/) für Fotos
- Owner: DWD-Niederschlagsradar (WMS)

**Bekannte Einschränkung:** Die App ist nicht offline-fähig; ohne Netz zeigt sie keine Flugzeuge.

## Datenquellen und Hinweise

Flugdaten über [adsb.fi](https://adsb.fi) und [adsb.lol](https://adsb.lol); Karten © Esri, HERE, Garmin, OpenStreetMap-Mitwirkende sowie Esri, Maxar, Earthstar Geographics; Ortsnamen © [GeoNames](https://www.geonames.org) (CC BY 4.0); Flughafenpläne © OpenStreetMap-Mitwirkende (ODbL); Wetter: Aviation Weather Center (NOAA), Regenradar: Deutscher Wetterdienst; Fotos © jeweilige Planespotters-Fotografinnen und -Fotografen. Privates Hobbyprojekt ohne Gewähr für Richtigkeit oder Verfügbarkeit der Daten. Nicht für Navigation oder andere sicherheitskritische Zwecke geeignet.
