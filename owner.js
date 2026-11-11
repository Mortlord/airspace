/* owner.js: Zusatzfunktionen von AirSpace nur für den Betreiber.
   index.html lädt diese Datei nur, wenn ein Owner-Code im Browser liegt
   (Anmeldung: fünfmal auf die Uhrzeit tippen oder adsb-radar.de/#owner).
   Alles, was hier passiert, prüft der Server zusätzlich anhand des Codes.

   Eingebaut in die gemeinsame Oberfläche statt angehängt:
   - Kopfzeile: Wähler für die Datenquelle (Standort, Heim-Pi, Fixpunkt)
   - Werkzeugleiste: 3D-Ansicht, Regenradar, Flughafen Stuttgart
   - Detailblatt: Stern für Favoriten
   - Einstellungen: Kompass (iPhone, Standort) und der Block „Nur für dich“
     mit Favoriten, Empfangsreichweite (coverage.html) und Abmelden
   - Radar und Liste: Favoriten orange, Alarmring und Markierung im Alarmradius */
(function(){
  "use strict";
  const AS = window.AS;
  if(!AS) return;
  const token = AS.LS.get("ownerToken", null);
  if(!token) return;

  const BASE = AS.BASE, $ = AS.$, esc = AS.esc;
  const ALERT_NM = 20;          // Alarmradius, fest wie in der bisherigen privaten App
  const SERVER_RADIUS = 40;     // Abfrageradius des Servers für die Alarme (wie bisher)
  const PUSH_EVERY_MS = 60000;  // Standort für die Alarme höchstens einmal pro Minute melden
  const hdr = () => ({ "X-Auth-Token": token });

  /* ============ Texte (Deutsch / Englisch wie der Rest der App) ============ */
  const T = {
    de:{ src:"Datenquelle", live:"Standort", liveSub:"GPS dieses Geräts", feeder:"Heim-Pi", feederSub:"Eigener Empfänger",
         fix:"Fixpunkt", fixSub:"Feste Position", off:"nicht erreichbar", denied:"Der Server hat den Owner-Code abgelehnt. Mit fünfmal Tippen auf die Uhr neu anmelden.",
         mine:"Nur für dich", favs:"Favoriten", favPh:"+ Präfix", favAdd:"Favorit hinzufügen", favNote:`Telegram meldet Favoriten im Umkreis von ${ALERT_NM} NM um deinen Standort.`,
         favLoading:"Wird geladen …", favNone:"Noch keine Favoriten.", favErr:"Favoriten gerade nicht abrufbar.", remove:f=>`${f} entfernen`,
         noGps:"Ohne Standort kann ich die Favoriten nicht speichern.", saveErr:"Favoriten konnten nicht gespeichert werden. Bitte später erneut versuchen.",
         star:"Favorit", starOn:"Favorit entfernen", starOff:"Als Favorit merken", starPrefix:p=>`Favorit über ${p}`,
         coverage:"Empfangsreichweite in 3D", logout:"Abmelden", logoutAsk:"Owner-Bereich auf diesem Gerät abmelden?",
         compass:"Kompass", compassSub:"Radar folgt der Blickrichtung", compassOn:"Radar folgt der Blickrichtung", compassOff:"Ausrichtung: Norden oben",
         compassDenied:"Kompass-Zugriff abgelehnt", compassNA:"Kompass nicht verfügbar",
         t3d:"3D-Ansicht", tRain:"Regenradar", tAirport:"Flughafen Stuttgart",
         rainCredit:t=>`Regenradar: Deutscher Wetterdienst, ${t} Uhr`, v3fail:"Die 3D-Ansicht konnte nicht geladen werden (three.min.js fehlt?).",
         apLoading:"Lade …", apApron:"Vorfeld", apArea:"Umgebung", apClose:"Schließen", apGround:"Boden", apAir:"Luft", apVeh:"Fahrzeuge", apVehicle:"Bodenfahrzeug", apNoData:"Keine Daten",
         apBack:"Zurück zum Radar", apMovements:"Bewegungen", apChipArr:n=>"Anflug", apChipTaxi:n=>n===1?"rollt":"rollen", apChipStand:n=>"am Stand", apChipVeh:n=>n===1?"Fahrzeug":"Fahrzeuge",
         apRwy:r=>`Piste ${r} in Betrieb`, apRwyShort:r=>`Piste ${r}`, apRwyUnknown:"Piste –", apRwyUnknownLong:"Betriebsrichtung noch nicht erkannt",
         apSecArr:"Im Anflug", apSecDep:"Startet", apSecTaxi:"Rollt", apSecStand:"Am Stand",
         apLanding:"Landung", apLandRwy:r=>`Landung, Piste ${r}`, apOnRwy:r=>`auf Piste ${r}`, apRunway:"auf der Piste", apClimbing:"steigt",
         apFrom:c=>`aus ${c}`, apTo:c=>`nach ${c}`, apNow:"jetzt", apStandSum:(a,v)=>`${a} ${a===1?"Flugzeug":"Flugzeuge"}, ${v} ${v===1?"Fahrzeug":"Fahrzeuge"}`,
         apHex:"Kennung", apCat:"Kategorie", apTimeout:"Zeitüberschreitung", apPosAge:s=>`Position vor ${s} s`, apNoIcao:"keine ICAO-Adresse",
         cats:{A1:"leichtes Flugzeug",A2:"kleines Flugzeug",A3:"großes Flugzeug",A4:"Boeing 757",A5:"schweres Flugzeug",A6:"Hochleistungsflugzeug",
               A7:"Hubschrauber",B1:"Segelflugzeug",B2:"Ballon",B3:"Fallschirmspringer",B4:"Ultraleicht",B6:"Drohne",B7:"Raumfahrzeug",
               C1:"Einsatzfahrzeug",C2:"Servicefahrzeug",C3:"Hindernis"},
         apNoMap:"Karte nicht verfügbar", apNoGeo:"Flughafendaten nicht geladen (airport-edds.json fehlt?)", apRoute:"Route …", apRouteNone:"Route unbekannt" },
    en:{ src:"Data source", live:"Location", liveSub:"GPS of this device", feeder:"Home Pi", feederSub:"Own receiver",
         fix:"Fixed point", fixSub:"Fixed position", off:"not reachable", denied:"The server rejected the owner code. Tap the clock five times to sign in again.",
         mine:"Only for you", favs:"Favourites", favPh:"+ prefix", favAdd:"Add favourite", favNote:`Telegram reports favourites within ${ALERT_NM} NM of your location.`,
         favLoading:"Loading …", favNone:"No favourites yet.", favErr:"Favourites currently unavailable.", remove:f=>`Remove ${f}`,
         noGps:"Without your location the favourites cannot be saved.", saveErr:"Favourites could not be saved. Please try again later.",
         star:"Favourite", starOn:"Remove favourite", starOff:"Add to favourites", starPrefix:p=>`Favourite via ${p}`,
         coverage:"Reception range in 3D", logout:"Sign out", logoutAsk:"Sign out of the owner area on this device?",
         compass:"Compass", compassSub:"Radar follows your heading", compassOn:"Radar follows your heading", compassOff:"Orientation: north up",
         compassDenied:"Compass access denied", compassNA:"Compass not available",
         t3d:"3D view", tRain:"Rain radar", tAirport:"Stuttgart airport",
         rainCredit:t=>`Rain radar: Deutscher Wetterdienst, ${t}`, v3fail:"The 3D view could not be loaded (three.min.js missing?).",
         apLoading:"Loading …", apApron:"Apron", apArea:"Area", apClose:"Close", apGround:"Ground", apAir:"Air", apVeh:"Vehicles", apVehicle:"Ground vehicle", apNoData:"No data",
         apBack:"Back to radar", apMovements:"Movements", apChipArr:n=>"arriving", apChipTaxi:n=>"taxiing", apChipStand:n=>"at stand", apChipVeh:n=>n===1?"vehicle":"vehicles",
         apRwy:r=>`Runway ${r} in use`, apRwyShort:r=>`Runway ${r}`, apRwyUnknown:"Runway –", apRwyUnknownLong:"Runway in use not yet detected",
         apSecArr:"Arriving", apSecDep:"Departing", apSecTaxi:"Taxiing", apSecStand:"At stand",
         apLanding:"landing", apLandRwy:r=>`landing, runway ${r}`, apOnRwy:r=>`on runway ${r}`, apRunway:"on the runway", apClimbing:"climbing",
         apFrom:c=>`from ${c}`, apTo:c=>`to ${c}`, apNow:"now", apStandSum:(a,v)=>`${a} aircraft, ${v} ${v===1?"vehicle":"vehicles"}`,
         apHex:"Hex", apCat:"Category", apTimeout:"timeout", apPosAge:s=>`Position ${s} s old`, apNoIcao:"no ICAO address",
         cats:{A1:"light aircraft",A2:"small aircraft",A3:"large aircraft",A4:"Boeing 757",A5:"heavy aircraft",A6:"high performance",
               A7:"helicopter",B1:"glider",B2:"balloon",B3:"parachutist",B4:"ultralight",B6:"drone",B7:"space vehicle",
               C1:"emergency vehicle",C2:"service vehicle",C3:"obstacle"},
         apNoMap:"Map not available", apNoGeo:"Airport data not loaded (airport-edds.json missing?)", apRoute:"Route …", apRouteNone:"Route unknown" }
  }[AS.LANG];

  /* ============ Stile für die Owner-Bausteine ============ */
  const style = document.createElement("style");
  style.textContent = `
    .src-wrap{position:relative}
    .src-chip{display:flex;align-items:center;gap:6px;height:32px;padding:0 10px;background:var(--surface);
      border:1px solid var(--line);border-radius:16px;color:var(--txt);font:12px var(--font-data);letter-spacing:.04em;
      text-transform:uppercase;cursor:pointer}
    .src-chip .dot{width:7px;height:7px;border-radius:50%;background:var(--ok)}
    .src-chip svg{width:12px;height:12px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
    .src-menu{position:absolute;right:0;top:40px;z-index:35;min-width:220px;padding:6px;background:var(--surface);
      border:1px solid #3a4552;border-radius:8px;box-shadow:0 8px 28px rgba(0,0,0,.5)}
    .src-menu[hidden]{display:none}
    .src-menu .pop-lbl{margin:4px 8px 6px}
    .src-opt{display:flex;align-items:center;gap:12px;width:100%;min-height:48px;padding:4px 8px;background:transparent;
      border:0;border-radius:6px;color:var(--txt);text-align:left;cursor:pointer;font-size:17px}
    .src-opt:hover:not(:disabled){background:var(--surface-2)}
    .src-opt:disabled{opacity:.45;cursor:default}
    .src-opt .rad{width:18px;height:18px;border-radius:50%;border:2px solid #3a4552;flex:none;display:flex;align-items:center;justify-content:center}
    .src-opt[aria-checked="true"] .rad{border-color:var(--sel)}
    .src-opt[aria-checked="true"] .rad::after{content:"";width:8px;height:8px;border-radius:50%;background:var(--sel)}
    .src-opt small{display:block;font-size:13px;color:var(--txt-dim)}
    .mine{margin:18px 0 0;padding:12px 14px 6px;background:#161a20;border:1px solid var(--line);border-radius:8px}
    .mine .set-lbl{margin:0 0 8px}
    .mine h3{margin:0 0 8px;font-size:17px;font-weight:400;color:var(--txt)}
    .favs{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
    .favchip{height:34px;display:flex;align-items:center;gap:6px;padding:0 10px;background:#2a2219;border:1px solid #8a5a2b;
      border-radius:17px;color:#e3a462;font:13px var(--font-data);cursor:pointer}
    .favchip.live{background:#3a2a17;border-color:var(--fav)}
    .favchip svg{width:11px;height:11px;stroke:currentColor;fill:none;stroke-width:2.4;stroke-linecap:round}
    .favin{width:96px;height:34px;padding:0 10px;background:var(--bg);border:1px dashed #3a4552;border-radius:17px;
      color:var(--txt-hi);font:13px var(--font-data);outline:none}
    .favin:focus{border-style:solid;border-color:var(--txt-dim)}
    .owner-note{margin:8px 0 0;font-size:13px;color:var(--txt-dim)}
    .mine-links{display:flex;justify-content:space-between;align-items:center;min-height:44px;margin-top:10px;
      border-top:1px solid #222a33;font-size:16px}
    .mine-links a,.mine-links button{color:var(--txt-dim);background:none;border:0;padding:10px 0;font-size:16px;cursor:pointer;text-decoration:underline;text-underline-offset:2px}
    .mine-links a:hover,.mine-links button:hover{color:var(--txt)}
    .starbtn{height:36px;display:flex;align-items:center;gap:6px;padding:0 10px;background:var(--bg);border:1px solid var(--line);
      border-radius:6px;color:var(--txt-dim);font-size:15px;font-weight:600;cursor:pointer}
    .starbtn svg{width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:1.6;stroke-linejoin:round}
    .starbtn[aria-pressed="true"]{background:#2a2219;border-color:var(--fav);color:#e3a462}
    .starbtn[aria-pressed="true"] svg{fill:var(--fav);stroke:var(--fav)}
    .starbtn:disabled{cursor:default}
    .toggle small{display:block;font-size:13px;color:var(--txt-dim)}`;
  document.head.appendChild(style);
  const ICON = {
    chev:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
    x:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    star:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>'
  };
  // Knopf in der Werkzeugleiste unter dem Radar
  function toolButton(label, html){
    const b = document.createElement("button"); b.className = "tool";
    b.innerHTML = html; b.setAttribute("aria-label", label); b.title = label;
    $("ownerTools").appendChild(b); return b;
  }

  /* ============ Datenquelle: Wähler in der Kopfzeile ============ */
  const SOURCES = {
    feeder:   { id:"feeder",   label:T.feeder, center:null,
                url:()=>`${BASE}/feeder`, headers:hdr },
    fixpoint: { id:"fixpoint", label:T.fix,    center:null,
                url:()=>`${BASE}/fixpoint?radius=${AS.fetchRadius()}`, headers:hdr }
  };
  const SRC_IDS = ["live", "feeder", "fixpoint"];
  const srcName = id => id === "feeder" ? T.feeder : id === "fixpoint" ? T.fix : T.live;
  $("srcSlot").innerHTML = `<div class="src-wrap">
      <button class="src-chip" id="srcChip" aria-haspopup="true" aria-expanded="false" aria-controls="srcMenu">
        <span class="dot" aria-hidden="true"></span><span id="srcName">${esc(T.live)}</span>${ICON.chev}</button>
      <div class="src-menu" id="srcMenu" role="menu" aria-label="${esc(T.src)}" hidden>
        <span class="pop-lbl">${esc(T.src)}</span>
        ${SRC_IDS.map(id => `<button class="src-opt" role="menuitemradio" aria-checked="false" data-src="${id}"${id === "live" ? "" : " disabled"}>
          <span class="rad" aria-hidden="true"></span><span>${esc(srcName(id))}<small id="srcSub-${id}">${esc(id === "live" ? T.liveSub : id === "feeder" ? T.feederSub : T.fixSub)}</small></span></button>`).join("")}
      </div></div>`;
  let denied = 0;
  function setSrcMenu(open){ $("srcMenu").hidden = !open; $("srcChip").setAttribute("aria-expanded", String(open)); }
  $("srcChip").addEventListener("click", e => { e.stopPropagation(); setSrcMenu($("srcMenu").hidden); });
  document.addEventListener("click", e => { if(!$("srcMenu").hidden && !e.target.closest(".src-wrap")) setSrcMenu(false); });
  document.addEventListener("keydown", e => { if(e.key === "Escape" && !$("srcMenu").hidden){ setSrcMenu(false); $("srcChip").focus(); } });
  $("srcMenu").addEventListener("click", e => {
    const b = e.target.closest("button[data-src]");
    if(b && !b.disabled){ selectSource(b.dataset.src); setSrcMenu(false); }
  });

  async function check(id){
    try{
      const r = await fetch(`${BASE}/${id}?check=1`, { headers:hdr(), cache:"no-store" });
      if(r.status === 401 || r.status === 403){ denied++; return null; }
      if(!r.ok) return null;
      const j = await r.json();
      if(!j.ok || !Number.isFinite(j.lat) || !Number.isFinite(j.lon)) return null;
      if(id === "feeder" && j.online === false) return null;   // Heim-Pi gerade gestört
      return { lat:j.lat, lon:j.lon };
    }catch(e){ return null; }
  }

  function selectSource(id){
    const src = SOURCES[id];
    if(!src || !src.center) id = "live";
    AS.LS.set("ownerSource", id);
    $("srcName").textContent = srcName(id);
    for(const b of $("srcMenu").querySelectorAll(".src-opt")) b.setAttribute("aria-checked", String(b.dataset.src === id));
    const now = AS.source ? AS.source.id : "live";
    if(now !== id) AS.setSource(id === "live" ? null : SOURCES[id]);
  }

  async function initSources(){
    const [f, x] = await Promise.all([check("feeder"), check("fixpoint")]);
    SOURCES.feeder.center = f; SOURCES.fixpoint.center = x;
    $("covLink").hidden = !f;          // Empfangsreichweite gibt es nur mit erreichbarem Heim-Pi
    for(const [id, ok] of [["feeder", f], ["fixpoint", x]]){
      $("srcMenu").querySelector(`[data-src="${id}"]`).disabled = !ok;
      $("srcSub-" + id).textContent = (id === "feeder" ? T.feederSub : T.fixSub) + (ok ? "" : ", " + T.off);
    }
    if(denied >= 2) AS.setNotice(T.denied, 12000);
    selectSource(AS.LS.get("ownerSource", "live"));
  }

  /* ============ Einstellungen: Block „Nur für dich“ ============ */
  const slot = $("ownerSlot");
  slot.innerHTML = `<div class="mine">
      <span class="set-lbl">${esc(T.mine)}</span>
      <h3 id="favLbl">${esc(T.favs)}</h3>
      <div class="favs" id="favList" aria-labelledby="favLbl"></div>
      <p class="owner-note" id="favNote">${esc(T.favNote)}</p>
      <div class="mine-links">
        <a href="coverage.html" id="covLink" hidden>${esc(T.coverage)}</a>
        <button id="ownerLogout">${esc(T.logout)}</button>
      </div></div>`;
  slot.hidden = false;
  $("ownerLogout").addEventListener("click", () => {
    if(!confirm(T.logoutAsk)) return;
    try{ for(const k of ["ownerToken","ownerSource","ownerView3d","ownerWx","ownerTheme"]) localStorage.removeItem("asl_" + k); }catch(e){}
    location.reload();
  });

  /* ============ Favoriten und Alarme ============ */
  // Der Server ist die Wahrheit. Vor jedem Speichern wird die aktuelle Liste geholt und nur die
  // gewünschte Änderung angewendet; so überschreibt AirSpace nie eine Liste, die anderswo geändert wurde.
  let favs = null;                // null = noch nicht vom Server geladen
  let pushChain = Promise.resolve();
  let lastPush = 0;

  const favHit = cs => {          // passender Eintrag (genau oder Präfix) oder null
    if(!favs || !cs) return null;
    const u = cs.trim().toUpperCase();
    return favs.find(f => { const v = String(f).trim().toUpperCase(); return v && u.startsWith(v); }) || null;
  };
  const favMatch = cs => !!favHit(cs);
  AS.isFav = a => favMatch(a.flight);
  AS.rowMark = a => {
    const g = AS.state.gpsPos;
    return !!(g && a.lat != null && AS.haversineNm(g.lat, g.lon, a.lat, a.lon) <= ALERT_NM);
  };
  AS.rings.push({ nm:ALERT_NM, color:()=>getComputedStyle(document.documentElement).getPropertyValue("--fav").trim() });

  async function fetchFavs(){
    const r = await fetch(`${BASE}/favorites`, { headers:hdr(), cache:"no-store" });
    if(!r.ok) throw new Error("favorites " + r.status);
    const j = await r.json();
    if(!j.ok || !Array.isArray(j.favorites)) throw new Error("favorites malformed");
    return j.favorites.map(String);
  }

  // Server-Zustand schreiben: frische Liste holen, Änderung anwenden, mit GPS-Position senden.
  // Läuft immer nacheinander, nie zwei Schreibvorgänge gleichzeitig.
  function push(change){
    pushChain = pushChain.then(async () => {
      const g = AS.state.gpsPos;
      if(!g){ if(change) AS.setNotice(T.noGps); return false; }
      try{
        let list = await fetchFavs();
        if(change) list = change(list);
        const r = await fetch(`${BASE}/update`, {
          method:"POST",
          headers:{ "Content-Type":"application/json", ...hdr() },
          body: JSON.stringify({
            lat:g.lat, lon:g.lon, radius:SERVER_RADIUS, alert_radius:ALERT_NM, favorites:list,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          })
        });
        if(!r.ok) throw new Error("update " + r.status);
        favs = list; lastPush = Date.now();
        renderFavs(); renderStar(); AS.renderList(); AS.requestDraw();
        return true;
      }catch(e){
        console.warn("Owner push:", e.message);
        if(change) AS.setNotice(T.saveErr);
        return false;
      }
    });
    return pushChain;
  }

  function renderFavs(){
    const box = $("favList");
    const input = `<label style="display:flex"><span style="position:absolute;width:1px;height:1px;overflow:hidden">${esc(T.favAdd)}</span>`+
      `<input class="favin" id="favInput" type="text" placeholder="${esc(T.favPh)}" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done"></label>`;
    if(document.activeElement && document.activeElement.id === "favInput") return;   // nicht beim Tippen neu aufbauen
    if(favs === null){ box.innerHTML = `<span class="owner-note">${esc(T.favLoading)}</span>`; return; }
    const live = AS.state.aircraft.map(a => (a.flight || "").toUpperCase());
    box.innerHTML = (favs.length ? "" : `<span class="owner-note" style="margin:0 6px 0 0">${esc(T.favNone)}</span>`) + favs.map(f => {
      const isLive = live.some(cs => cs.startsWith(String(f).toUpperCase()));
      return `<button class="favchip${isLive ? " live" : ""}" data-fav="${esc(f)}" aria-label="${esc(T.remove(f))}">${esc(f)}${ICON.x}</button>`;
    }).join("") + input;
  }
  function addFav(){
    const inp = $("favInput");
    const v = inp.value.trim().toUpperCase().replace(/\s+/g, "");
    inp.value = "";
    if(!/^[A-Z0-9]{2,8}$/.test(v)) return;
    inp.blur();
    push(list => list.includes(v) ? list : [...list, v]);
  }
  $("favList").addEventListener("keydown", e => { if(e.target.id === "favInput" && e.key === "Enter"){ e.preventDefault(); addFav(); } });
  $("favList").addEventListener("focusout", e => { if(e.target.id === "favInput" && e.target.value.trim()) addFav(); });
  $("favList").addEventListener("click", e => {
    const b = e.target.closest("button[data-fav]");
    if(b) push(list => list.filter(f => f !== b.dataset.fav));
  });

  // Stern im Detailblatt: genau dieses Callsign merken oder entfernen
  let sheetAc = null;
  function renderStar(){
    const box = $("sheetActions");
    const cs = sheetAc && (sheetAc.flight || "").trim().toUpperCase();
    if(!cs || favs === null){ box.innerHTML = ""; return; }
    const hit = favHit(cs), exact = hit && hit.toUpperCase() === cs;
    const label = exact ? T.starOn : hit ? T.starPrefix(hit) : T.starOff;
    box.innerHTML = `<button class="starbtn" id="starBtn" aria-pressed="${hit ? "true" : "false"}" aria-label="${esc(label)}" title="${esc(label)}"${hit && !exact ? " disabled" : ""}>${ICON.star}${esc(T.star)}</button>`;
  }
  AS.onSheet = a => { sheetAc = a; renderStar(); };
  $("sheetActions").addEventListener("click", e => {
    if(!e.target.closest("#starBtn") || !sheetAc) return;
    const cs = (sheetAc.flight || "").trim().toUpperCase();
    const hit = favHit(cs);
    if(hit && hit.toUpperCase() === cs) push(list => list.filter(f => f.toUpperCase() !== cs));
    else if(!hit) push(list => list.includes(cs) ? list : [...list, cs]);
  });

  async function initFavs(){
    renderFavs();
    try{ favs = await fetchFavs(); }catch(e){ favs = null; $("favNote").textContent = T.favErr; }
    renderFavs(); renderStar(); AS.renderList(); AS.requestDraw();
  }

  // Standort für die Telegram-Alarme regelmäßig melden, solange die Seite sichtbar ist
  setInterval(() => {
    if(document.hidden || favs === null) return;
    if(Date.now() - lastPush >= PUSH_EVERY_MS) push(null);
    renderFavs();
  }, 15000);
  document.addEventListener("visibilitychange", () => {
    if(!document.hidden && favs !== null && Date.now() - lastPush >= PUSH_EVERY_MS) push(null);
  });

  /* ============ Stufe 5: 3D-Ansicht ============ */
  // Flugzeuge in ihrer Höhe über einer Bodenscheibe, dreh- und kippbar (wie in der früheren privaten App).
  // three.js liegt im eigenen Repo (three.min.js) und wird erst beim ersten Einschalten geladen.
  const wrap = $("radar").parentElement;
  const v3css = document.createElement("style");
  v3css.textContent = `
    .v3-canvas,.v3-labels{position:absolute;inset:0;width:100%;height:100%;display:none;z-index:3}
    .v3-canvas{touch-action:none;cursor:grab;border-radius:50%}
    .v3-canvas:active{cursor:grabbing}
    .v3-labels{pointer-events:none;overflow:hidden}
    .radar-wrap.is3d .v3-canvas,.radar-wrap.is3d .v3-labels{display:block}
    .radar-wrap.is3d #radar{visibility:hidden}
    .radar-wrap.is3d .bgmap{display:none}
    .v3-lbl{position:absolute;white-space:nowrap;font:10px var(--font-data);color:var(--txt-dim);
      text-shadow:0 0 3px var(--bg),0 0 3px var(--bg);transform:translate(-50%,-50%)}
    .v3-dir{font:600 12px var(--font);color:var(--txt)}
    .v3-alt{transform:translate(6px,-50%)}
    .v3-ac{transform:translate(0,-50%);line-height:1.15;opacity:.9}
    .v3-ac span{display:block;font-size:9px;color:var(--txt-dim)}
    .v3-ac.sel{color:var(--sel)!important;font-weight:600;opacity:1}`;
  document.head.appendChild(v3css);
  const v3cv = document.createElement("canvas"); v3cv.className = "v3-canvas";
  const v3lb = document.createElement("div");    v3lb.className = "v3-labels";
  const v3bt = toolButton(T.t3d, "3D");
  wrap.append(v3cv, v3lb);

  const V3_FT_KM = 0.0003048, V3_NM_KM = 1.852;
  const v3 = { on:false, loading:null, ready:false, renderer:null, scene:null, camera:null, ground:null, planes:null,
               groundKey:null, dataKey:null, Rkm:74, exag:3, orbit:{ theta:0, phi:0.95, dist:0 }, fitted:false,
               labels:[], queued:false, items:[], fixed:[] };
  const cssVar = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  function altColor(a){
    if(a.alt === "ground" || AS.altFt(a) == null) return "#9c8a70";
    const f = AS.altFt(a);
    return f < 5000 ? "#6f7d8c" : f < 15000 ? "#8a97a5" : f < 30000 ? "#a9b4c0" : "#cdd6e0";
  }

  function loadThree(){
    if(window.THREE) return Promise.resolve();
    if(v3.loading) return v3.loading;
    v3.loading = new Promise((res, rej) => {
      const s = document.createElement("script"); s.src = "three.min.js";
      s.onload = () => res(); s.onerror = () => { v3.loading = null; rej(new Error("three.js fehlt")); };
      document.head.appendChild(s);
    });
    return v3.loading;
  }

  function initView3d(){
    if(v3.ready) return;
    v3.renderer = new THREE.WebGLRenderer({ canvas:v3cv, antialias:true });
    v3.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    v3.scene = new THREE.Scene();
    v3.camera = new THREE.PerspectiveCamera(40, 1, 0.5, 5000);
    v3.ground = new THREE.Group(); v3.planes = new THREE.Group();
    v3.scene.add(v3.ground, v3.planes);
    // Drehen und Kippen mit Finger oder Maus, Zoomen mit zwei Fingern oder Rad, Doppeltipp setzt zurück
    const ptrs = new Map(); let pinch0 = 0, dist0 = 0;
    v3cv.addEventListener("pointerdown", e => {
      v3cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x:e.clientX, y:e.clientY });
      if(ptrs.size === 2){ const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x-b.x, a.y-b.y); dist0 = v3.orbit.dist; }
    });
    v3cv.addEventListener("pointermove", e => {
      const p = ptrs.get(e.pointerId); if(!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
      if(ptrs.size === 1){
        v3.orbit.theta -= dx * 0.006;
        v3.orbit.phi = Math.min(1.5, Math.max(0.03, v3.orbit.phi - dy * 0.006));
      } else if(ptrs.size === 2 && pinch0){
        const [a, b] = [...ptrs.values()];
        v3SetDist(dist0 * pinch0 / Math.max(1, Math.hypot(a.x-b.x, a.y-b.y)));
      }
      v3Camera();
    });
    const end = e => { ptrs.delete(e.pointerId); if(ptrs.size < 2) pinch0 = 0; };
    v3cv.addEventListener("pointerup", end); v3cv.addEventListener("pointercancel", end);
    v3cv.addEventListener("wheel", e => { e.preventDefault(); v3SetDist(v3.orbit.dist * Math.exp(e.deltaY * 0.001)); v3Camera(); }, { passive:false });
    v3cv.addEventListener("dblclick", () => { v3.orbit.theta = 0; v3.orbit.phi = 0.95; v3.orbit.dist = v3FitDist(); v3Camera(); });
    v3.ready = true;
  }
  function v3FitDist(){
    const half = Math.tan(v3.camera.fov * Math.PI / 360);
    return v3.Rkm * Math.max(2.6, 1.25 / (half * Math.max(v3.camera.aspect, 0.3)));
  }
  function v3SetDist(d){ v3.orbit.dist = Math.min(v3.Rkm * 8, Math.max(v3.Rkm * 0.3, d)); }
  function v3Camera(){
    const o = v3.orbit, ty = 13.7 * v3.exag * 0.3;
    v3.camera.position.set(o.dist*Math.sin(o.phi)*Math.sin(o.theta), ty + o.dist*Math.cos(o.phi), o.dist*Math.sin(o.phi)*Math.cos(o.theta));
    v3.camera.lookAt(0, ty, 0);
    v3Render();
  }
  function v3Render(){
    if(v3.queued) return; v3.queued = true;
    requestAnimationFrame(() => { v3.queued = false; if(!v3.on) return; v3.renderer.render(v3.scene, v3.camera); v3PlaceLabels(); });
  }
  // x = Ost, z = −Nord (km), y = Höhe (km × Überhöhung)
  function v3Polar(brg, km){ const a = brg * Math.PI / 180; return [km * Math.sin(a), -km * Math.cos(a)]; }
  const lon2px = (lon, z) => (lon + 180) / 360 * 256 * 2 ** z;
  const lat2px = (lat, z) => { const s = Math.sin(lat * Math.PI / 180); return (0.5 - Math.log((1+s)/(1-s)) / (4*Math.PI)) * 256 * 2 ** z; };

  function v3BuildGround(cLat, cLon, radiusNm){
    const st = AS.state;
    const key = [cLat.toFixed(3), cLon.toFixed(3), radiusNm, st.bgmap ? 1 : 0, cssVar("--surface")].join(",");
    if(key === v3.groundKey) return;
    v3.groundKey = key;
    v3.ground.clear();
    const R = v3.Rkm, GR = R * 1.08, kmLat = 111.32, kmLon = 111.32 * Math.cos(cLat * Math.PI / 180);
    const geo = new THREE.CircleGeometry(GR, 96); geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(cssVar("--surface") || "#151a21") });
    v3.ground.add(new THREE.Mesh(geo, mat));
    // Kartenkacheln nur, wenn im Radar die Karte eingeschaltet ist (dieselben Kacheln wie im 2D-Radar)
    if(st.bgmap){
      const n = cLat + GR/kmLat, s = cLat - GR/kmLat, w = cLon - GR/kmLon, e = cLon + GR/kmLon;
      let z = 11;
      while(z > 4 && (Math.floor(lon2px(e,z)/256) - Math.floor(lon2px(w,z)/256) + 1 > 8 ||
                      Math.floor(lat2px(s,z)/256) - Math.floor(lat2px(n,z)/256) + 1 > 8)) z--;
      const tx0 = Math.floor(lon2px(w,z)/256), tx1 = Math.floor(lon2px(e,z)/256);
      const ty0 = Math.floor(lat2px(n,z)/256), ty1 = Math.floor(lat2px(s,z)/256);
      const cw = (tx1-tx0+1)*256, ch = (ty1-ty0+1)*256;
      const pos = geo.attributes.position, uv = geo.attributes.uv;
      for(let i = 0; i < pos.count; i++){
        const lat = cLat + (-pos.getZ(i))/kmLat, lon = cLon + pos.getX(i)/kmLon;
        uv.setXY(i, (lon2px(lon,z) - tx0*256)/cw, 1 - (lat2px(lat,z) - ty0*256)/ch);
      }
      uv.needsUpdate = true;
      const cv = document.createElement("canvas"); cv.width = cw; cv.height = ch;
      const c2 = cv.getContext("2d"), jobs = [];
      for(let x = tx0; x <= tx1; x++) for(let y = ty0; y <= ty1; y++) jobs.push(new Promise(res => {
        const img = new Image(); img.crossOrigin = "anonymous";
        img.onload = () => { c2.drawImage(img, (x-tx0)*256, (y-ty0)*256); res(); }; img.onerror = () => res();
        img.src = `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${y}/${x}`;
      }));
      const myKey = key;
      Promise.all(jobs).then(() => {
        if(v3.groundKey !== myKey) return;
        try{ c2.getImageData(0, 0, 1, 1); }catch(e){ return; }
        mat.map = new THREE.CanvasTexture(cv); mat.color.setRGB(0.4, 0.43, 0.48); mat.needsUpdate = true; v3Render();
      });
    }
    const ring = (km, color, op) => {
      const pts = []; for(let a = 0; a <= 360; a += 3){ const [x, z] = v3Polar(a, km); pts.push(new THREE.Vector3(x, 0.05, z)); }
      return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent:true, opacity:op }));
    };
    [.25, .5, .75, 1].forEach(f => v3.ground.add(ring(R*f, 0x3a4552, f === 1 ? 1 : .7)));
    if(ALERT_NM < radiusNm){
      const pts = [];
      for(let a = 0; a < 360; a += 4){
        const [x1, z1] = v3Polar(a, ALERT_NM*V3_NM_KM), [x2, z2] = v3Polar(a+2, ALERT_NM*V3_NM_KM);
        pts.push(new THREE.Vector3(x1, .06, z1), new THREE.Vector3(x2, .06, z2));
      }
      v3.ground.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color:0xd98a3d, transparent:true, opacity:.55 })));
    }
    // Höhenmaßstab am Rand (Nordwest)
    const [axX, axZ] = v3Polar(300, GR);
    const top = 45000*V3_FT_KM*v3.exag, ax = [new THREE.Vector3(axX,0,axZ), new THREE.Vector3(axX,top,axZ)];
    for(let ft = 10000; ft <= 40000; ft += 10000){ const y = ft*V3_FT_KM*v3.exag, t = R*.02; ax.push(new THREE.Vector3(axX-t,y,axZ), new THREE.Vector3(axX+t,y,axZ)); }
    v3.ground.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ax), new THREE.LineBasicMaterial({ color:0x4a5563 })));
    const me = new THREE.Mesh(new THREE.CircleGeometry(R*.012, 24), new THREE.MeshBasicMaterial({ color:0x4a9fd4 }));
    me.rotation.x = -Math.PI/2; me.position.y = .1; v3.ground.add(me);
    v3.fixed = [];
    [.25, .5, .75].forEach(f => { const [x, z] = v3Polar(135, R*f); v3.fixed.push({ t:`${Math.round(radiusNm*f)}`, v:new THREE.Vector3(x,0,z), c:"v3-ring" }); });
    [["N",0],[AS.LANG === "de" ? "O" : "E",90],["S",180],["W",270]].forEach(([t, a]) => { const [x, z] = v3Polar(a, GR*1.04); v3.fixed.push({ t, v:new THREE.Vector3(x,0,z), c:"v3-dir" }); });
    for(let ft = 10000; ft <= 40000; ft += 10000) v3.fixed.push({ t:`FL${ft/100}`, v:new THREE.Vector3(axX, ft*V3_FT_KM*v3.exag, axZ), c:"v3-alt" });
  }

  function draw3d(force){
    if(!v3.on || !window.THREE) return;
    initView3d();
    const w = v3cv.clientWidth, h = v3cv.clientHeight;
    if(!w || !h) return;
    v3.renderer.setClearColor(new THREE.Color(cssVar("--bg") || "#0c0f14"), 1);
    v3.renderer.setSize(w, h, false);
    v3.camera.aspect = w / h; v3.camera.updateProjectionMatrix();
    const st = AS.state, c = st.center;
    if(!c){ v3Render(); return; }
    const radiusNm = st.radius;
    const dataKey = [st.aircraft, c.lat, c.lon, radiusNm, st.selected && st.selected.hex, st.bgmap].map(String).join("|");
    if(!force && st.aircraft === v3.lastList && dataKey === v3.dataKey) return;
    v3.lastList = st.aircraft; v3.dataKey = dataKey;
    const Rkm = radiusNm * V3_NM_KM;
    if(Rkm !== v3.Rkm || !v3.fitted){
      v3.Rkm = Rkm;
      v3.exag = Math.min(20, Math.max(1, (Rkm*0.5) / (45000*V3_FT_KM)));   // 45.000 ft ≈ halber Radius
      v3.orbit.dist = v3FitDist(); v3.fitted = true; v3.groundKey = null;
    }
    v3BuildGround(c.lat, c.lon, radiusNm);
    v3.planes.clear();
    const drops = [], feet = [], items = [], mats = {};
    const sz = Rkm * 0.022;
    const shape = new THREE.Shape([new THREE.Vector2(sz,0), new THREE.Vector2(-sz*.6,-sz*.5), new THREE.Vector2(-sz*.3,0), new THREE.Vector2(-sz*.6,sz*.5)]);
    const arrowGeo = new THREE.ShapeGeometry(shape); arrowGeo.rotateX(-Math.PI/2);
    const selCol = cssVar("--sel") || "#4a9fd4";
    for(const a of st.aircraft){
      if(a.lat == null || a.lon == null) continue;
      const dst = AS.haversineNm(c.lat, c.lon, a.lat, a.lon);
      if(dst > radiusNm) continue;
      const [x, z] = v3Polar(AS.bearingDeg(c.lat, c.lon, a.lat, a.lon), dst*V3_NM_KM);
      const alt = Math.max(0, AS.altFt(a) || 0);
      const y = alt*V3_FT_KM*v3.exag + 0.15;
      const isSel = !!(st.selected && st.selected.hex === a.hex);
      const color = isSel ? selCol : altColor(a);
      const m = mats[color] || (mats[color] = new THREE.MeshBasicMaterial({ color:new THREE.Color(color), side:THREE.DoubleSide }));
      const mesh = new THREE.Mesh(arrowGeo, m);
      mesh.position.set(x, y, z);
      mesh.rotation.y = -((a.track ?? 0) - 90) * Math.PI / 180;
      if(isSel) mesh.scale.setScalar(1.5);
      v3.planes.add(mesh);
      drops.push(new THREE.Vector3(x,.05,z), new THREE.Vector3(x,y,z));
      feet.push(new THREE.Vector3(x,.08,z));
      const label = (a.flight || a.hex || "").trim();
      if(label) items.push({ label, alt:AS.flText(a), v:new THREE.Vector3(x,y,z), isSel, color, dst });
    }
    if(drops.length){
      v3.planes.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(drops),
        new THREE.LineBasicMaterial({ color:0x6b7682, transparent:true, opacity:.45 })));
      v3.planes.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(feet),
        new THREE.PointsMaterial({ color:0x6b7682, size:3, sizeAttenuation:false })));
    }
    v3.items = items;
    v3Camera();
  }

  // Beschriftungen im Bildschirmraum, bei Gedränge weggelassen statt überlappend
  function v3PlaceLabels(){
    const w = v3cv.clientWidth, h = v3cv.clientHeight, tmp = new THREE.Vector3();
    const proj = v => { tmp.copy(v).project(v3.camera); return (tmp.z < -1 || tmp.z > 1) ? null : { x:(tmp.x+1)/2*w, y:(1-tmp.y)/2*h }; };
    const out = [];
    for(const f of v3.fixed){ const p = proj(f.v); if(p) out.push({ html:esc(f.t), cls:"v3-lbl " + f.c, x:p.x, y:p.y }); }
    const placed = [], jobs = [];
    for(const it of v3.items){ const p = proj(it.v); if(p && p.x > -20 && p.x < w+20 && p.y > -20 && p.y < h+20) jobs.push({ it, p }); }
    jobs.sort((a, b) => (b.it.isSel - a.it.isSel) || (a.it.dst - b.it.dst));
    for(const { it, p } of jobs){
      const lw = it.label.length*6.6 + 4, lh = 24, r = { x:p.x+7, y:p.y-lh/2, w:lw, h:lh };
      if(!it.isSel && placed.some(q => r.x < q.x+q.w && r.x+r.w > q.x && r.y < q.y+q.h && r.y+r.h > q.y)) continue;
      placed.push(r);
      out.push({ html:`${esc(it.label)}<span>${esc(it.alt)}</span>`, cls:"v3-lbl v3-ac" + (it.isSel ? " sel" : ""), x:r.x, y:p.y, color:it.color });
    }
    while(v3.labels.length < out.length){ const d = document.createElement("div"); v3lb.appendChild(d); v3.labels.push(d); }
    v3.labels.forEach((d, i) => {
      const o = out[i];
      if(!o){ d.style.display = "none"; return; }
      d.style.display = ""; d.className = o.cls; d.innerHTML = o.html;
      d.style.left = o.x + "px"; d.style.top = o.y + "px"; d.style.color = o.color || "";
    });
  }

  function setView3d(on){
    v3.on = on;
    AS.LS.set("ownerView3d", on);
    wrap.classList.toggle("is3d", on);
    v3bt.classList.toggle("active", on);
    v3bt.setAttribute("aria-pressed", String(on));
    if(!on){ v3lb.innerHTML = ""; v3.labels = []; AS.requestDraw(); return; }
    loadThree().then(() => { v3.dataKey = null; draw3d(true); })
      .catch(() => { setView3d(false); AS.setNotice(T.v3fail); });
  }
  v3bt.addEventListener("click", () => setView3d(!v3.on));
  // Neue Daten, anderer Umkreis oder andere Auswahl: Szene neu aufbauen (Prüfung jede Sekunde)
  setInterval(() => { if(v3.on && !document.hidden) draw3d(false); }, 1000);
  window.addEventListener("resize", () => { if(v3.on) draw3d(true); });

  /* ============ Stufe 7: Kompass (nur iOS, nur Live-Modus) ============ */
  // Startet immer mit Norden oben und wird nicht gespeichert. Leichte Glättung, neu ausgerichtet erst ab 5°.
  const cmp = { on:false, smooth:null, applied:0 };
  const CMP_THRESHOLD = 5, CMP_ALPHA = 0.15;
  const angleDelta = (a, b) => (b - a + 540) % 360 - 180;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  $("setExtra").insertAdjacentHTML("beforeend",
    `<div class="toggle toggle-next" id="toggleCompass" hidden><span>${esc(T.compass)}<small>${esc(T.compassSub)}</small></span>`+
    `<span class="sw" id="swCompass" role="switch" aria-checked="false" tabindex="0"></span></div>`);
  const cmpRow = $("toggleCompass"), cmpSw = $("swCompass");
  const cmpShow = on => { cmpSw.classList.toggle("on", on); cmpSw.setAttribute("aria-checked", String(on)); };
  AS.heading = () => (cmp.on && !AS.source) ? cmp.applied : 0;
  function onOrientation(e){
    if(typeof e.webkitCompassHeading !== "number" || isNaN(e.webkitCompassHeading)) return;
    if(typeof e.webkitCompassAccuracy === "number" && e.webkitCompassAccuracy < 0) return;   // unkalibriert
    const h = e.webkitCompassHeading;
    cmp.smooth = cmp.smooth == null ? h : (cmp.smooth + CMP_ALPHA * angleDelta(cmp.smooth, h) + 360) % 360;
    if(Math.abs(angleDelta(cmp.applied, cmp.smooth)) >= CMP_THRESHOLD){ cmp.applied = cmp.smooth; AS.requestDraw(); }
  }
  async function toggleCompass(){
    if(cmp.on){
      cmp.on = false; cmp.smooth = null; cmp.applied = 0;
      window.removeEventListener("deviceorientation", onOrientation);
      cmpShow(false); AS.setNotice(T.compassOff, 2500); AS.requestDraw(); return;
    }
    try{
      if(typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function"){
        if(await DeviceOrientationEvent.requestPermission() !== "granted"){ AS.setNotice(T.compassDenied); return; }
      }
    }catch(e){ AS.setNotice(T.compassNA); return; }
    cmp.on = true; cmp.smooth = null; cmp.applied = 0;
    window.addEventListener("deviceorientation", onOrientation);
    cmpShow(true); AS.setNotice(T.compassOn, 2500); AS.requestDraw();
  }
  cmpRow.addEventListener("click", toggleCompass);
  cmpSw.addEventListener("keydown", e => { if(e.key === " " || e.key === "Enter"){ e.preventDefault(); toggleCompass(); } });

  /* ============ Stufe 6: Regenradar (DWD) ============ */
  // Niederschlagsradar des Deutschen Wetterdienstes als Ebene über der Hintergrundkarte, in jeder
  // Datenquelle und in der Flughafenansicht. Das DWD-Bild deckt Deutschland und die Grenzgebiete ab.
  // Das neueste Messbild liegt etwa 5 bis 10 Minuten zurück: jetzt minus 8 Minuten, auf 5 Minuten abgerundet.
  const wx = { on: AS.LS.get("ownerWx", false), layer:null };
  const WX_STEP = 5 * 60000;
  const wxTimeMs = () => Math.floor((Date.now() - 8 * 60000) / WX_STEP) * WX_STEP;
  const wxTime = () => new Date(wxTimeMs()).toISOString().replace(/\.\d+Z$/, ".000Z");
  const wxBt = toolButton(T.tRain,
    `<svg viewBox="0 0 24 24"><path d="M7 15a4 4 0 0 1 .5-8A5 5 0 0 1 17 8a3.5 3.5 0 0 1 0 7z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/></svg>`);
  const wxCredit = document.createElement("p"); wxCredit.className = "map-credit"; wxCredit.hidden = true;
  $("mapCredit").after(wxCredit);
  const wxActive = () => wx.on;
  AS.mapForced = () => wxActive();
  function applyWx(){
    wxBt.classList.toggle("active", wx.on);
    wxBt.setAttribute("aria-pressed", String(wx.on));
    const map = window.L ? AS.bgMap : null;
    if(wxActive() && map){
      if(!wx.layer){
        map.createPane("wx").style.zIndex = 300;
        wx.layer = L.tileLayer.wms("https://maps.dwd.de/geoserver/dwd/wms", {
          layers:"dwd:Niederschlagsradar", format:"image/png", transparent:true,
          version:"1.3.0", pane:"wx", opacity:.75, maxZoom:18, time:wxTime()
        });
      }
      if(!map.hasLayer(wx.layer)) wx.layer.addTo(map);
      if(wx.layer.wmsParams.time !== wxTime()) wx.layer.setParams({ time:wxTime() });
      wxCredit.textContent = T.rainCredit(new Date(wxTimeMs()).toLocaleTimeString(AS.LANG === "de" ? "de-DE" : "en-GB", { hour:"2-digit", minute:"2-digit" }));
      wxCredit.hidden = false;
    } else {
      if(wx.layer && map && map.hasLayer(wx.layer)) map.removeLayer(wx.layer);
      wxCredit.hidden = true;
    }
    AS.applyBgMap();
    if(typeof applyApWx === "function") applyApWx();
  }
  function toggleWx(){ wx.on = !wx.on; AS.LS.set("ownerWx", wx.on); applyWx(); }
  wxBt.addEventListener("click", toggleWx);
  setInterval(() => { if(wxActive()) applyWx(); }, 60000);

  // Kompass nur im Standort-Modus: bei jedem Quellenwechsel neu prüfen
  const origSetSource = AS.setSource;
  AS.setSource = src => { origSetSource(src); afterSourceChange(); };
  function afterSourceChange(){
    cmpRow.hidden = !(isIOS && typeof DeviceOrientationEvent !== "undefined" && !AS.source);
    applyWx();
  }

  /* ============ Stufe 8: Flughafenansicht ============ */
  // Der Flughafen als freigestellter Lageplan aus OpenStreetMap (Datei im Repo, © OpenStreetMap-Mitwirkende,
  // ODbL): Piste hell, Rollwege mittelgrau, Vorfeld abgesetzt, die Straßenkarte darunter stark gedämpft.
  // Flugzeuge über /aircraft um den Flughafen, nach Zustand eingefärbt: am Stand grau, rollend blau,
  // auf der Piste und in der Luft hell. Bodenfahrzeuge als kleine Quadrate.
  // Aus Position, Höhe, Tempo und Kurs leitet die Ansicht ab, wer anfliegt, rollt, startet oder steht,
  // und welche Pistenrichtung in Betrieb ist. Diese Ableitungen sind Schätzungen, keine Lotsendaten.
  // Für einen anderen Flughafen genügt es, AP anzupassen und die passende Datei aus Overpass Turbo abzulegen.
  const AP = { icao:"EDDS", name:"Stuttgart", lat:48.6900, lon:9.2219, dataUrl:"airport-edds.json",
               apron:null };   // Bereich des Vorfelds, wird aus den Flughafendaten bestimmt
  const AP_POLL_MS = 2000, AP_STALE_S = 60, AP_TRAIL_MS = 3 * 60 * 1000, AP_TAXI_WIDTH = 23;
  const AP_SPAN = { A1:12, A2:20, A3:36, A4:40, A5:62, A7:12, B1:15, B4:10 };
  const AP_PLANE = "M0,-48C4,-48 5,-40 5,-30L5,-10L46,8L46,15L5,6L4,30L16,40L16,46L0,42L-16,46L-16,40L-4,30L-5,6L-46,15L-46,8L-5,-10L-5,-30C-5,-40 -4,-48 0,-48Z";
  const AP_COL = { stand:"#6f7883", taxi:"#4a9fd4", rwy:"#f2f5f8", air:"#e6ecf2" };
  const apCss = document.createElement("style");
  apCss.textContent = `
    #ap-view{position:fixed;inset:0;z-index:3000;display:none;flex-direction:column;background:var(--bg);
      padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);font-family:var(--font)}
    #ap-view.open{display:flex}
    #ap-head{display:flex;align-items:center;gap:8px;height:52px;padding:0 12px 0 4px;border-bottom:1px solid var(--line)}
    #ap-head .ap-title{flex:1;min-width:0;display:flex;align-items:baseline;gap:8px;font-weight:700;font-size:20px;color:var(--txt-hi)}
    #ap-head .ap-title span{font:12px var(--font-data);color:var(--txt-dim)}
    #ap-clock{font:12px var(--font-data);color:var(--txt-dim)}
    #ap-clock.stale{color:var(--warn)}
    #ap-chips{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;border-bottom:1px solid var(--line)}
    .ap-chip{display:flex;align-items:center;gap:5px;height:28px;padding:0 10px;background:var(--surface);
      border:1px solid var(--line);border-radius:14px;font:12px var(--font-data);color:var(--txt-dim)}
    .ap-chip b{font-weight:600}
    .ap-err{font:12px var(--font-data);color:var(--warn);align-self:center}
    #ap-wrap{position:relative;flex:1;min-height:0;display:flex}
    #ap-map{flex:1;background:#404042}   /* Grundton der Kacheln: Haarlinien zwischen Kacheln fallen nicht auf */
    #ap-bar{display:flex;align-items:center;gap:6px;padding:8px 12px;border-top:1px solid var(--line);background:var(--bg)}
    #ap-bar .tb-sp{flex:1}
    .ap-rwyuse{display:flex;align-items:center;gap:8px;height:44px;padding:0 12px;background:var(--surface);
      border:1px solid var(--line);border-radius:6px;font:12px var(--font-data);color:var(--txt);white-space:nowrap}
    .ap-rwyuse i{width:8px;height:8px;border-radius:50%;background:var(--ok)}
    .ap-rwyuse.unknown{color:var(--txt-dim)} .ap-rwyuse.unknown i{background:#4a5563}
    #ap-sheet{position:absolute;left:0;right:0;bottom:0;max-height:62%;overflow-y:auto;overscroll-behavior:contain;z-index:1000;
      background:var(--surface);border-top:1px solid var(--line);border-radius:14px 14px 0 0;padding:6px 16px 12px}
    #ap-sheet[hidden]{display:none}
    #ap-sheet .grip{width:40px;height:4px;border-radius:2px;background:#3a4552;margin:0 auto 6px}
    #ap-sheet h3{margin:0;display:flex;justify-content:space-between;align-items:baseline;font-size:20px;font-weight:700;color:var(--txt-hi)}
    #ap-sheet h3 span{font:12px var(--font-data);font-weight:400;color:var(--txt-dim)}
    .ap-sec{display:block;margin:12px 0 2px;font:11px var(--font-data);letter-spacing:.12em;text-transform:uppercase;color:var(--txt-dim)}
    .ap-row{display:grid;grid-template-columns:84px 44px minmax(0,1fr) auto;align-items:center;gap:8px;width:100%;min-height:48px;
      padding:0 2px;background:transparent;border:0;border-bottom:1px solid #222a33;text-align:left;color:var(--txt);cursor:pointer}
    .ap-row .cs{font:600 13px var(--font-data);color:var(--txt-hi)}
    .ap-row.taxi .cs{color:#9fd0f2}
    .ap-row .ty{font:11px var(--font-data);color:var(--txt-dim)}
    .ap-row .wh{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ap-row .tm{font:12px var(--font-data);color:var(--txt-dim)}
    .ap-empty{display:block;padding:8px 2px;font-size:15px;color:var(--txt-dim)}
    #ap-map .leaflet-control-attribution{background:rgba(18,22,28,.8);color:var(--txt-dim);font:10px var(--font)}
    #ap-map .leaflet-control-attribution a{color:inherit}
    .ap-ac{background:none;border:none}
    .ap-ac-wrap{position:absolute;left:0;top:0;pointer-events:auto;cursor:pointer}
    /* Tippfläche mindestens 44 px, auch wenn das Flugzeug bei kleinem Maßstab nur wenige Pixel groß ist */
    .ap-ac-wrap::before{content:"";position:absolute;left:50%;top:50%;width:44px;height:44px;transform:translate(-50%,-50%)}
    .ap-ac-svg{position:absolute;left:0;top:0;overflow:visible}
    .ap-veh{position:absolute;left:0;top:0;width:10px;height:10px;transform:translate(-5px,-5px);border-radius:2px;
      background:#6f8796;border:1.5px solid #0a0d12;box-sizing:border-box}
    /* Namensschild: Callsign und Typ */
    .ap-tag{position:absolute;display:flex;align-items:center;gap:5px;height:20px;padding:0 8px;white-space:nowrap;
      background:rgba(26,31,39,.92);border:1px solid var(--line);border-radius:10px;font:600 11px var(--font-data);
      color:var(--txt-hi);cursor:pointer;pointer-events:auto}
    .ap-tag small{font-weight:400;font-size:10px;color:var(--txt-dim)}
    .ap-tag[hidden]{display:none}
    .ap-tag.taxi{border-color:#2b5a80;color:#9fd0f2}
    .ap-tag.rwy,.ap-tag.air{border-color:#8a96a3}
    .ap-tag.veh{background:none;border:0;padding:0 2px;font-weight:400;color:var(--txt-dim)}
    .ap-txt{background:none;border:none}
    .ap-txt div{transform:translate(-50%,-50%);white-space:nowrap;font-family:var(--font-data);color:var(--txt-dim);
      text-shadow:0 0 3px #0a0d12,0 0 3px #0a0d12;pointer-events:none}
    .ap-rwy div{font-size:15px;font-weight:600;color:#c3ccd6}
    .ap-gate div{font-size:9.5px}
    .ap-bldg div{font-family:var(--font);font-size:12px;font-weight:600;color:#97a2af}
    #ap-map.ap-z-lo .ap-gate,#ap-map.ap-z-lo .ap-bldg{display:none}
    #ap-map.ap-z-lo .ap-tag.stand{display:none}
    #ap-map.ap-z-far .ap-rwy{display:none}
    #ap-map .leaflet-popup-content-wrapper,#ap-map .leaflet-popup-tip{background:var(--surface);color:var(--txt);
      border:1px solid var(--line);box-shadow:0 6px 24px rgba(0,0,0,.5)}
    #ap-map .leaflet-popup-content{margin:10px 12px;font:14px/1.45 var(--font)}
    #ap-map .leaflet-popup-content .cs{font-family:var(--font-data);font-size:16px}
    #ap-map .leaflet-popup-content .mut{color:var(--txt-dim)}
    #ap-map .leaflet-popup-content .rt{font-family:var(--font-data);color:var(--sel);margin-top:4px}
    #ap-map a.leaflet-popup-close-button{color:var(--txt-dim)}`;
  document.head.appendChild(apCss);
  const IC = {
    back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
    list:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7h12M8 12h12M8 17h12M4 7h.01M4 12h.01M4 17h.01"/></svg>',
    apron:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10H4z"/><path d="M8 7v10M12 7v10M16 7v10"/></svg>',
    area:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
    rain:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14a4 4 0 0 1 .5-8A5 5 0 0 1 17 7a3.5 3.5 0 0 1 0 7z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/></svg>'
  };
  const apView = document.createElement("div");
  apView.id = "ap-view"; apView.setAttribute("role", "dialog"); apView.setAttribute("aria-label", T.tAirport);
  apView.innerHTML = `
    <div id="ap-head">
      <button class="tool" data-ap="close" aria-label="${esc(T.apBack)}" style="border:0;background:none">${IC.back}</button>
      <div class="ap-title">${esc(AP.name)}<span>${esc(AP.icao)}</span></div>
      <span id="ap-clock"></span>
    </div>
    <div id="ap-chips"><span class="ap-chip">${esc(T.apLoading)}</span></div>
    <div id="ap-wrap"><div id="ap-map"></div>
      <div id="ap-sheet" hidden role="region" aria-label="${esc(T.apMovements)}"><div class="grip"></div>
        <h3>${esc(T.apMovements)}<span id="ap-sheet-rwy"></span></h3><div id="ap-list"></div></div>
    </div>
    <div id="ap-bar">
      <span class="ap-rwyuse unknown" id="ap-rwyuse"><i></i><span>${esc(T.apRwyUnknown)}</span></span>
      <span class="tb-sp"></span>
      <button class="tool" data-ap="list" aria-label="${esc(T.apMovements)}" aria-pressed="false">${IC.list}</button>
      <button class="tool" data-ap="apron" aria-label="${esc(T.apApron)}">${IC.apron}</button>
      <button class="tool" data-ap="area" aria-label="${esc(T.apArea)}">${IC.area}</button>
      <button class="tool" data-ap="wx" aria-label="${esc(T.tRain)}" aria-pressed="false">${IC.rain}</button>
    </div>`;
  document.body.appendChild(apView);
  const apBt = toolButton(T.tAirport,
    `<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V10h14v11M9 21v-5h6v5M8 10V6h8v4M12 6V3"/></svg>`);
  let apMap = null, apTimer = null, apAnim = null, apFetching = false, apOpen = false, apLastOk = 0;
  const apScaled = [], apAc = {}, apRunways = [];
  let apRwyUse = null;   // {ref, at}: zuletzt beobachtete Betriebsrichtung
  AS.paused = () => apOpen;
  const apMpp = () => 156543.03392 * Math.cos(apMap.getCenter().lat * Math.PI / 180) / Math.pow(2, apMap.getZoom());
  const apOnGround = ac => ac.alt_baro === "ground" || (typeof ac.gs === "number" && ac.gs < 35 && typeof ac.alt_baro === "number" && ac.alt_baro < 1500);
  const apFmtAlt = alt => alt === "ground" ? T.apGround : typeof alt !== "number" ? "" : alt < 5000 ? `${Math.round(alt / 100) * 100} ft` : `FL${String(Math.round(alt / 100)).padStart(3, "0")}`;
  const angDiff = (a, b) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; };
  const rwyNum = d => String(((Math.round(d / 10) + 35) % 36) + 1).padStart(2, "0");
  const apCourse = ac => typeof ac.track === "number" ? ac.track : (typeof ac.true_heading === "number" ? ac.true_heading : null);

  // Abstand eines Punkts zur Mittellinie einer Piste in Metern (lokal eben gerechnet) und ob er zwischen den Enden liegt
  function onRunway(lat, lon){
    for(const r of apRunways){
      const k = Math.cos(r.a[0] * Math.PI / 180) * 111320, m = 110540;
      const ax = 0, ay = 0, bx = (r.b[1] - r.a[1]) * k, by = (r.b[0] - r.a[0]) * m;
      const px = (lon - r.a[1]) * k, py = (lat - r.a[0]) * m;
      const L2 = bx * bx + by * by, t = ((px - ax) * bx + (py - ay) * by) / L2;
      if(t < -0.02 || t > 1.02) continue;
      if(Math.hypot(px - t * bx, py - t * by) <= Math.max(45, r.width)) return r;
    }
    return null;
  }
  // Pistenbezeichnung für eine Bewegungsrichtung, z. B. „07“ beim Rollen Richtung Osten auf 07/25
  function rwyFor(r, crs){
    if(crs === null) return null;
    if(angDiff(crs, r.brg) < 30) return r.refA;
    if(angDiff(crs, (r.brg + 180) % 360) < 30) return r.refB;
    return null;
  }
  // Was macht das Flugzeug gerade? stand, taxi, rwy (Start- oder Landelauf), arr, dep, other, veh
  function classify(ac){
    if(AS.isVehicle(ac)) return { k:"veh" };
    const crs = apCourse(ac), gs = typeof ac.gs === "number" ? ac.gs : 0;
    if(apOnGround(ac)){
      const r = onRunway(ac.lat, ac.lon);
      if(r && gs >= 40) return { k:"rwy", rwy:rwyFor(r, crs) };
      return gs >= 3 ? { k:"taxi" } : { k:"stand" };
    }
    const alt = AS.altFt({ alt:ac.alt_baro }), dNm = AS.haversineNm(ac.lat, ac.lon, AP.lat, AP.lon);
    if(alt == null || alt > 8000 || dNm > 25 || crs === null) return { k:"other" };
    const toAp = AS.bearingDeg(ac.lat, ac.lon, AP.lat, AP.lon), vr = typeof ac.baro_rate === "number" ? ac.baro_rate : null;
    let rwy = null; for(const r of apRunways){ rwy = rwy || rwyFor(r, crs); }
    if(angDiff(crs, toAp) < 35 && (vr === null || vr <= 300)){
      return { k:"arr", rwy, eta: gs > 60 ? dNm / gs * 60 : null };
    }
    if(angDiff(crs, toAp) > 120 && dNm < 15 && (vr === null || vr >= 0)) return { k:"dep", rwy };
    return { k:"other" };
  }

  function openAirportView(){
    if(!window.L){ AS.setNotice(T.apNoMap); return; }
    apView.classList.add("open"); apOpen = true;
    if(!apMap) apInitMap(); else apMap.invalidateSize();
    apPoll();
    clearInterval(apTimer); apTimer = setInterval(apPoll, AP_POLL_MS);
    clearInterval(apAnim); apAnim = setInterval(apAnimate, 250);
  }
  function closeAirportView(){
    apView.classList.remove("open"); apOpen = false;
    clearInterval(apTimer); clearInterval(apAnim);
    AS.fetchData();
  }
  apBt.addEventListener("click", openAirportView);
  function setSheet(open){
    $("ap-sheet").hidden = !open;
    apView.querySelector('[data-ap="list"]').setAttribute("aria-pressed", String(open));
    apView.querySelector('[data-ap="list"]').classList.toggle("active", open);
    if(open) renderMovements();
  }
  apView.addEventListener("click", e => {
    const b = e.target.closest("button[data-ap]");
    if(b){
      const k = b.dataset.ap;
      if(k === "close") closeAirportView();
      else if(k === "wx") toggleWx();
      else if(k === "list") setSheet($("ap-sheet").hidden);
      else if(k === "apron"){
        if(AP.apron) apMap.flyToBounds(AP.apron, { padding:[16, 16], duration:.8 });
        else apMap.flyTo([AP.lat, AP.lon], 15, { duration:.8 });
      }
      else if(k === "area") apMap.flyTo([AP.lat, AP.lon], 11, { duration:.8 });
      return;
    }
    const row = e.target.closest(".ap-row[data-hex]");
    if(row){
      const en = apAc[row.dataset.hex]; if(!en) return;
      setSheet(false);
      apMap.flyTo(en.marker.getLatLng(), Math.max(apMap.getZoom(), 15), { duration:.6 });
      setTimeout(() => apShowPopup(row.dataset.hex), 650);
    }
  });
  document.addEventListener("keydown", e => {
    if(!apOpen || e.key !== "Escape") return;
    if(!$("ap-sheet").hidden) setSheet(false); else closeAirportView();
  });

  // Regenradar auch in der Flughafenansicht, gesteuert über denselben Schalter wie im Radar
  let apWx = null;
  function applyApWx(){
    const b = apView.querySelector('[data-ap="wx"]');
    if(b){ b.setAttribute("aria-pressed", String(wx.on)); b.classList.toggle("active", wx.on); }
    if(!apMap) return;
    if(wx.on){
      if(!apWx){
        apMap.createPane("apWx").style.zIndex = 300;
        apWx = L.tileLayer.wms("https://maps.dwd.de/geoserver/dwd/wms", {
          layers:"dwd:Niederschlagsradar", format:"image/png", transparent:true,
          version:"1.3.0", pane:"apWx", opacity:.7, maxZoom:19, time:wxTime()
        });
      }
      if(!apMap.hasLayer(apWx)) apWx.addTo(apMap);
      if(apWx.wmsParams.time !== wxTime()) apWx.setParams({ time:wxTime() });
    } else if(apWx && apMap.hasLayer(apWx)) apMap.removeLayer(apWx);
  }
  function apInitMap(){
    apMap = L.map("ap-map", { zoomControl:false, zoomSnap:.25, minZoom:8, maxZoom:19 }).setView([AP.lat, AP.lon], 14.5);
    apMap.attributionControl.setPrefix(false);
    apMap.attributionControl.addAttribution('© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende, Kacheln © Esri');
    apMap.createPane("apScrim").style.zIndex = 250;
    apMap.createPane("apGround").style.zIndex = 400;
    apMap.createPane("apTrail").style.zIndex = 450;
    apMap.getPane("apTrail").style.pointerEvents = "none";
    L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      { maxZoom:19, maxNativeZoom:16 }).addTo(apMap);
    // Straßenkarte stark gedämpft: der Flughafen soll wie ein freigestellter Plan wirken
    L.rectangle([[-85, -180], [85, 180]], { pane:"apScrim", interactive:false, stroke:false, fillColor:"#0b0e12", fillOpacity:.8 }).addTo(apMap);
    apMap.on("zoomend", apOnZoom);
    apLoadGeo(); apOnZoom(); applyApWx();
  }
  function apText(ll, text, cls){
    L.marker(ll, { interactive:false, keyboard:false,
      icon:L.divIcon({ className:"ap-txt " + cls, html:`<div>${esc(text)}</div>`, iconSize:[0, 0] }) }).addTo(apMap);
  }
  async function apLoadGeo(){
    let fc;
    try{ const r = await fetch(AP.dataUrl, { cache:"force-cache" }); if(!r.ok) throw 0; fc = await r.json(); }
    catch(e){ AS.setNotice(T.apNoGeo); return; }
    const R = L.canvas({ pane:"apGround", padding:.3 });
    const feats = fc.features || [], by = pred => feats.filter(pred), aw = f => f.properties.aeroway || "";
    // Gelände des Flughafens etwas heller als die Umgebung
    L.geoJSON({ type:"FeatureCollection", features:by(f => aw(f) === "aerodrome" && /Polygon/.test(f.geometry.type)) },
      { renderer:R, interactive:false, style:{ stroke:false, fillColor:"#141920", fillOpacity:.9 } }).addTo(apMap);
    const apronLayer = L.geoJSON({ type:"FeatureCollection", features:by(f => aw(f) === "apron") },
      { renderer:R, interactive:false, style:{ stroke:false, fillColor:"#1b222b", fillOpacity:1 } }).addTo(apMap);
    const taxi = by(f => (aw(f) === "taxiway" || aw(f) === "taxilane") && f.geometry.type === "LineString");
    for(const f of taxi){
      const body = L.polyline(f.geometry.coordinates.map(c => [c[1], c[0]]),
        { renderer:R, interactive:false, color:"#2a313b", lineCap:"round", lineJoin:"round" }).addTo(apMap);
      apScaled.push({ layer:body, widthM:parseFloat(f.properties.width) || AP_TAXI_WIDTH, minPx:2 });
    }
    // Mittellinien nur noch dezent
    for(const f of taxi) L.polyline(f.geometry.coordinates.map(c => [c[1], c[0]]),
      { renderer:R, interactive:false, color:"#4a4436", weight:1, opacity:.6 }).addTo(apMap);
    // Pisten: In OpenStreetMap ist eine Piste oft in mehrere Abschnitte geteilt. Gezeichnet werden alle
    // Abschnitte, beschriftet und für die Auswertung genutzt wird aber jede Piste nur einmal, mit ihren
    // äußersten Enden. Sonst stünden Kennungen wie „25“ mitten auf der Piste.
    const rwFeats = by(f => aw(f) === "runway" && f.geometry.type === "LineString");
    const rwGroups = new Map();
    for(const f of rwFeats){
      const ll = f.geometry.coordinates.map(c => [c[1], c[0]]);
      const widthM = parseFloat(f.properties.width) || 45;
      const body = L.polyline(ll, { renderer:R, interactive:false, color:"#4a5260", lineCap:"butt" }).addTo(apMap);
      apScaled.push({ layer:body, widthM, minPx:4 });
      L.polyline(ll, { renderer:R, interactive:false, color:"#d6dde5", weight:1.2, dashArray:"10 8", opacity:.8 }).addTo(apMap);
      if(ll.length < 2) continue;
      const brg0 = AS.bearingDeg(ll[0][0], ll[0][1], ll[ll.length - 1][0], ll[ll.length - 1][1]);
      const key = f.properties.ref || ("~" + Math.round(((brg0 % 180) + 180) % 180 / 10));   // Abschnitte derselben Piste
      if(!rwGroups.has(key)) rwGroups.set(key, { pts:[], width:widthM });
      const g = rwGroups.get(key); g.pts.push(...ll); g.width = Math.max(g.width, widthM);
    }
    for(const g of rwGroups.values()){
      // Achse: die beiden am weitesten voneinander entfernten Punkte der Piste
      let a = g.pts[0], b = g.pts[0], best = -1;
      for(const p of g.pts) for(const q of g.pts){
        const d = (p[0] - q[0]) ** 2 + ((p[1] - q[1]) * Math.cos(p[0] * Math.PI / 180)) ** 2;
        if(d > best){ best = d; a = p; b = q; }
      }
      // Einheitlich so ausrichten, dass a das Ende mit der kleineren Kennung ist (z. B. 07 vor 25)
      let brg = AS.bearingDeg(a[0], a[1], b[0], b[1]);
      if(brg >= 180){ [a, b] = [b, a]; brg = (brg + 180) % 360; }
      apRunways.push({ a, b, brg, width:g.width, refA:rwyNum(brg), refB:rwyNum((brg + 180) % 360) });
      // Hinter der Schwelle (etwa 160 m auf der Piste) beschriften
      const at = (p, q, m) => { const d = AS.haversineNm(p[0], p[1], q[0], q[1]) * 1852, t = Math.min(1, m / d);
        return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
      apText(at(a, b, 160), rwyNum(brg), "ap-rwy"); apText(at(b, a, 160), rwyNum((brg + 180) % 360), "ap-rwy");
    }
    // Startansicht: der ganze Flugplatz entlang der Piste. „Vorfeld“ zeigt nur die Vorfelder in Pistennähe;
    // weiter entfernte Flächen, die OpenStreetMap ebenfalls als Vorfeld führt, zählen nicht mit.
    if(apRunways.length){
      const all = apRunways.flatMap(r => [r.a, r.b]);
      const field = L.latLngBounds(all).pad(0.08);
      const mid = field.getCenter();
      const near = apronLayer.getLayers().filter(l => l.getBounds().getCenter().distanceTo(mid) < 2500);
      if(near.length) AP.apron = near.reduce((bb, l) => bb.extend(l.getBounds()), L.latLngBounds(near[0].getBounds().getSouthWest(), near[0].getBounds().getNorthEast()));
      apMap.fitBounds(field, { padding:[12, 12] });
    } else if(apronLayer.getLayers().length){
      AP.apron = apronLayer.getBounds();
      apMap.fitBounds(AP.apron, { padding:[16, 16] });
    }
    L.geoJSON({ type:"FeatureCollection", features:by(f => aw(f) === "parking_position") },
      { renderer:R, interactive:false, style:{ color:"#2c3542", weight:1, fill:false } }).addTo(apMap);
    L.geoJSON({ type:"FeatureCollection", features:by(f => f.properties.building || aw(f) === "terminal" || aw(f) === "hangar") }, {
      renderer:R, interactive:false,
      style:f => aw(f) === "terminal" || f.properties.building === "terminal" ? { color:"#33404f", weight:1, fillColor:"#26303c", fillOpacity:1 }
              : { color:"#2b3440", weight:1, fillColor:"#1f262f", fillOpacity:1 }
    }).addTo(apMap);
    for(const f of by(f => aw(f) === "gate" && f.properties.ref && f.geometry.type === "Point")){
      const c = f.geometry.coordinates; apText([c[1], c[0]], f.properties.ref, "ap-gate");
    }
    for(const f of by(f => f.properties.name && f.geometry.type === "Polygon" && (aw(f) === "terminal" || f.properties.building))){
      const ring = f.geometry.coordinates[0];
      apText([ring.reduce((s, c) => s + c[1], 0) / ring.length, ring.reduce((s, c) => s + c[0], 0) / ring.length], f.properties.name, "ap-bldg");
    }
    apOnZoom();
  }
  function apOnZoom(){
    if(!apMap) return;
    const z = apMap.getZoom(), mpp = apMpp();
    for(const t of apScaled) t.layer.setStyle({ weight:Math.max(t.minPx, t.widthM / mpp) });
    const el = $("ap-map");
    el.classList.toggle("ap-z-lo", z < 16); el.classList.toggle("ap-z-far", z < 12.5);
    for(const hex in apAc) apStyleMarker(apAc[hex]);
    if(apOpen) apPoll();   // Zoomwechsel kann den Abfrageradius ändern
  }
  const apRadiusNm = () => apMap && apMap.getZoom() >= 13.5 ? 25 : 30;   // Anflüge auch bei Nahansicht erfassen
  async function apPoll(){
    if(!apOpen || apFetching) return;
    apFetching = true;
    // Ohne Zeitlimit kann eine hängende Anfrage (etwa beim Netzwechsel) jeden weiteren Abruf blockieren;
    // dann bleiben alle Flugzeuge stehen, obwohl adsb.fi längst neue Positionen hat
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 8000);
    try{
      const r = await fetch(`${BASE}/aircraft?lat=${AP.lat}&lon=${AP.lon}&radius=${apRadiusNm()}`, { cache:"no-store", signal:ctl.signal });
      if(!r.ok) throw new Error("HTTP " + r.status);
      const data = await r.json(), list = data.ac || data.aircraft || [], now = Date.now();
      // Bezugszeit der Daten (der Server cacht einige Sekunden): seen_pos bezieht sich auf data.now
      const dataNow = Number.isFinite(data.now) ? (data.now < 1e12 ? data.now * 1000 : data.now) : now;
      const seen = new Set();
      for(const ac of list){
        if(!ac.hex || !Number.isFinite(ac.lat) || !Number.isFinite(ac.lon)) continue;
        if(typeof ac.seen_pos === "number" && ac.seen_pos > AP_STALE_S) continue;
        seen.add(ac.hex);
        let e = apAc[ac.hex];
        if(!e){
          e = apAc[ac.hex] = { ac, ts:now, trail:[], marker:null, line:null };
          e.marker = L.marker([ac.lat, ac.lon], { keyboard:false, icon:L.divIcon({ className:"ap-ac", iconSize:[0, 0],
            html:`<div class="ap-ac-wrap"><svg class="ap-ac-svg" viewBox="-50 -50 100 100"><path d="${AP_PLANE}"/></svg><span class="ap-tag"></span></div>` }) }).addTo(apMap);
          e.marker.on("click", () => apShowPopup(ac.hex));
        }
        const posTs = dataNow - (typeof ac.seen_pos === "number" ? ac.seen_pos : 0) * 1000;
        // Keine ältere Position übernehmen. Eine veränderte Position gilt aber auch dann, wenn ihr Zeitstempel
        // bis zu 15 s älter wirkt: Server und Quellen liefern nicht immer exakt gleich getaktete Zeitstempel.
        const moved = e.ac && (ac.lat !== e.ac.lat || ac.lon !== e.ac.lon);
        if(e.posTs && (moved ? posTs < e.posTs - 15000 : posTs <= e.posTs)){ e.seenAt = now; continue; }
        e.ac = ac; e.ts = Math.min(posTs, now); e.posTs = Math.max(posTs, e.posTs || 0); e.seenAt = now; e.recvAt = now;
        e.st = classify(ac);
        if((e.st.k === "rwy" || e.st.k === "arr" || e.st.k === "dep") && e.st.rwy) apRwyUse = { ref:e.st.rwy, at:now };
        const last = e.trail[e.trail.length - 1];
        if(!last || last[0] !== ac.lat || last[1] !== ac.lon) e.trail.push([ac.lat, ac.lon, e.ts]);
        while(e.trail.length && now - e.trail[0][2] > AP_TRAIL_MS) e.trail.shift();
        // Spur nur für rollende und startende oder landende Flugzeuge, dezent
        const showTrail = e.st.k === "taxi" || e.st.k === "rwy";
        if(showTrail){
          const ll = e.trail.map(q => [q[0], q[1]]);
          if(!e.line) e.line = L.polyline(ll, { pane:"apTrail", interactive:false, weight:1.5, opacity:.4, color:AP_COL.taxi }).addTo(apMap);
          else e.line.setLatLngs(ll);
        } else if(e.line){ apMap.removeLayer(e.line); e.line = null; }
        apStyleMarker(e);
      }
      for(const hex in apAc){
        const e = apAc[hex];
        if(!seen.has(hex) && now - (e.seenAt || e.ts) > 20000){
          apMap.removeLayer(e.marker); if(e.line) apMap.removeLayer(e.line); delete apAc[hex];
        }
      }
      apLastOk = now;
      renderChips(); renderRwyUse();
      if(!$("ap-sheet").hidden) renderMovements();
    }catch(e){
      $("ap-chips").innerHTML = `<span class="ap-err">${esc(T.apNoData + " (" + (e.name === "AbortError" ? T.apTimeout : e.message) + ")")}</span>`;
    }
    finally{ clearTimeout(timer); apFetching = false; }
  }
  function apCounts(){
    const c = { arr:0, taxi:0, stand:0, veh:0, rwy:0, dep:0 };
    for(const hex in apAc){ const k = (apAc[hex].st || {}).k; if(k in c) c[k]++; }
    return c;
  }
  function renderChips(){
    const c = apCounts(), chip = (n, t, col) => `<span class="ap-chip"><b style="color:${col}">${n}</b>${esc(t)}</span>`;
    const tx = c.taxi + c.rwy;
    $("ap-chips").innerHTML = chip(c.arr, T.apChipArr(c.arr), "var(--txt-hi)") + chip(tx, T.apChipTaxi(tx), "#9fd0f2") +
      chip(c.stand, T.apChipStand(c.stand), "var(--txt)") + (c.veh ? chip(c.veh, T.apChipVeh(c.veh), "var(--txt-dim)") : "");
    $("ap-clock").textContent = new Date().toLocaleTimeString(AS.LANG === "de" ? "de-DE" : "en-GB");
    $("ap-clock").classList.remove("stale");
  }
  function renderRwyUse(){
    const el = $("ap-rwyuse"), ok = apRwyUse && Date.now() - apRwyUse.at < 30 * 60 * 1000;
    el.classList.toggle("unknown", !ok);
    el.lastChild.textContent = ok ? T.apRwyShort(apRwyUse.ref) : T.apRwyUnknown;
    el.title = ok ? T.apRwy(apRwyUse.ref) : T.apRwyUnknownLong;
    el.setAttribute("aria-label", el.title);
    $("ap-sheet-rwy").textContent = ok ? T.apRwyShort(apRwyUse.ref) : "";
  }
  // Bewegungsliste: was als Nächstes passiert zuerst
  function routeHint(e, field){
    const cs = (e.ac.flight || "").trim(); if(!cs || AS.isVehicle(e.ac)) return "";
    if(!e.routeAsked){
      e.routeAsked = true;
      AS.getRoute({ flight:cs, lat:e.ac.lat, lon:e.ac.lon, alt:e.ac.alt_baro === "ground" ? "ground" : e.ac.alt_baro,
                    track:e.ac.track, vRate:e.ac.baro_rate }).then(j => { e.route = j; if(!$("ap-sheet").hidden) renderMovements(); });
    }
    const rt = e.route && e.route.plausible !== false && e.route.route;
    const p = rt && rt[field];
    return p ? (p.city || p.iata || p.icao || "") : "";
  }
  function renderMovements(){
    const groups = { arr:[], dep:[], taxi:[] };
    let stand = 0, veh = 0;
    for(const hex in apAc){
      const e = apAc[hex], k = (e.st || {}).k;
      if(k === "arr") groups.arr.push(e);
      else if(k === "dep" || k === "rwy") groups.dep.push(e);
      else if(k === "taxi") groups.taxi.push(e);
      else if(k === "stand") stand++;
      else if(k === "veh") veh++;
    }
    groups.arr.sort((a, b) => (a.st.eta ?? 99) - (b.st.eta ?? 99));
    const typ = e => esc(e.ac.t || "");
    const row = (e, cls, what, when) => `<button class="ap-row ${cls}" data-hex="${esc(e.ac.hex)}"><span class="cs">${esc((e.ac.flight || "").trim() || e.ac.r || e.ac.hex.toUpperCase())}</span>`+
      `<span class="ty">${typ(e)}</span><span class="wh">${esc(what)}</span><span class="tm">${esc(when || "")}</span></button>`;
    let h = "";
    h += `<span class="ap-sec">${esc(T.apSecArr)}</span>`;
    h += groups.arr.length ? groups.arr.map(e => {
      const from = routeHint(e, "orig"), eta = e.st.eta;
      const what = [e.st.rwy ? T.apLandRwy(e.st.rwy) : T.apLanding, from ? T.apFrom(from) : ""].filter(Boolean).join(", ");
      return row(e, "arr", what, eta == null ? "" : eta < 1 ? T.apNow : `${Math.round(eta)} min`);
    }).join("") : `<span class="ap-empty">–</span>`;
    h += `<span class="ap-sec">${esc(T.apSecDep)}</span>`;
    h += groups.dep.length ? groups.dep.map(e => {
      const to = routeHint(e, "dest");
      const what = [e.st.k === "rwy" ? (e.st.rwy ? T.apOnRwy(e.st.rwy) : T.apRunway) : T.apClimbing, to ? T.apTo(to) : ""].filter(Boolean).join(", ");
      return row(e, "dep", what, "");
    }).join("") : `<span class="ap-empty">–</span>`;
    h += `<span class="ap-sec">${esc(T.apSecTaxi)}</span>`;
    h += groups.taxi.length ? groups.taxi.map(e => {
      const to = routeHint(e, "dest"), from = routeHint(e, "orig");
      return row(e, "taxi", to ? T.apTo(to) : from ? T.apFrom(from) : `${Math.round(e.ac.gs || 0)} kt`, "");
    }).join("") : `<span class="ap-empty">–</span>`;
    h += `<span class="ap-sec">${esc(T.apSecStand)}</span><span class="ap-empty">${esc(T.apStandSum(stand, veh))}</span>`;
    $("ap-list").innerHTML = h;
  }
  function apStyleMarker(e){
    const el = e.marker.getElement(); if(!el) return;
    const ac = e.ac, st = e.st || classify(ac);
    const w = el.firstChild, svg = w.querySelector(".ap-ac-svg"), tag = w.querySelector(".ap-tag");
    const cs = (ac.flight || "").trim() || ac.r || ac.hex.toUpperCase();
    // Bodenfahrzeug: kleines Quadrat statt Flugzeugsilhouette, ohne Spur, nur dezente Kennung
    if(st.k === "veh"){
      el.style.display = "";
      svg.style.display = "none";
      if(!w.querySelector(".ap-veh")) w.insertAdjacentHTML("afterbegin", `<span class="ap-veh"></span>`);
      w.style.width = w.style.height = "0px"; w.style.transform = "";
      tag.className = "ap-tag veh"; tag.style.left = "8px"; tag.style.top = "-10px";
      tag.textContent = (ac.flight || "").trim();
      tag.hidden = !(ac.flight || "").trim();
      return;
    }
    // Überflüge in Reiseflughöhe gehören nicht in die Flughafenansicht
    el.style.display = st.k === "other" ? "none" : "";
    if(st.k === "other"){ if(e.line){ apMap.removeLayer(e.line); e.line = null; } return; }
    svg.style.display = "";
    const ground = apOnGround(ac);
    const span = AP_SPAN[(ac.category || "").toUpperCase()] || 34;
    const px = Math.round(Math.max(ground ? 20 : 24, Math.min(120, span / apMpp())));
    const hdg = typeof ac.true_heading === "number" && ground ? ac.true_heading : (apCourse(ac) ?? 0);
    w.style.width = w.style.height = px + "px"; w.style.transform = `translate(${-px / 2}px, ${-px / 2}px)`;
    svg.setAttribute("width", px); svg.setAttribute("height", px); svg.style.transform = `rotate(${hdg}deg)`;
    const path = svg.firstChild;
    const col = st.k === "stand" ? AP_COL.stand : st.k === "taxi" ? AP_COL.taxi : st.k === "rwy" ? AP_COL.rwy : AP_COL.air;
    path.setAttribute("fill", col);
    path.setAttribute("stroke", "#0a0d12"); path.setAttribute("stroke-width", "4");
    const cls = st.k === "stand" ? "stand" : st.k === "taxi" ? "taxi" : st.k === "rwy" ? "rwy" : "air";
    tag.className = "ap-tag " + cls;
    tag.style.left = (px * .7) + "px"; tag.style.top = (px * .5 - 10) + "px";
    tag.innerHTML = esc(cs) + (ac.t ? `<small>${esc(ac.t)}</small>` : "");
    tag.hidden = false;
  }
  // Zwischen den Abfragen mit Geschwindigkeit und Kurs weiterrechnen, höchstens 12 s
  function apAnimate(){
    if(!apOpen) return;
    const now = Date.now();
    if(apLastOk && now - apLastOk > 10000) $("ap-clock").classList.add("stale");
    for(const hex in apAc){
      const e = apAc[hex], ac = e.ac;
      // Am Boden fehlt oft der Kurs (dann nur die Ausrichtung des Flugzeugs) oder das Tempo ist sehr klein.
      // Dann nicht hochrechnen, aber immer die zuletzt gemeldete Position zeigen.
      const crs = apCourse(ac);
      let pos = [ac.lat, ac.lon];
      if(typeof ac.gs === "number" && ac.gs >= 3 && crs !== null){
        const dNm = ac.gs * Math.min(12, (now - e.ts) / 1000) / 3600, tr = crs * Math.PI / 180;
        pos = [ac.lat + dNm / 60 * Math.cos(tr), ac.lon + dNm / 60 * Math.sin(tr) / Math.cos(ac.lat * Math.PI / 180)];
      }
      const cur = e.marker.getLatLng();
      if(cur.lat !== pos[0] || cur.lng !== pos[1]) e.marker.setLatLng(pos);
    }
  }
  async function apShowPopup(hex){
    const e = apAc[hex]; if(!e) return;
    const ac = e.ac, cs = (ac.flight || "").trim(), names = AS.names, veh = AS.isVehicle(ac);
    const airline = cs && /^[A-Z]{3}\d/.test(cs) ? (names.airlines[cs.slice(0, 3)] || "") : "";
    const type = ac.t ? (names.types[ac.t] || ac.t) : "";
    const html = [
      `<div class="cs">${esc(cs || ac.r || hex.toUpperCase())}</div>`,
      airline ? `<div>${esc(airline)}</div>` : "",
      veh ? `<div>${esc(T.apVehicle)}</div>` : `<div class="mut">${esc([type, ac.r].filter(Boolean).join(", "))}</div>`,
      `<div class="mut">${esc(apFmtAlt(ac.alt_baro))}${typeof ac.gs === "number" ? ", " + Math.round(ac.gs) + " kt" : ""}</div>`,
      `<div class="mut">${esc(T.apPosAge(Math.round((typeof ac.seen_pos === "number" ? ac.seen_pos : 0) + (Date.now() - (e.recvAt || Date.now())) / 1000)))}</div>`,
      // Kennung und ADS-B-Kategorie: zeigt z. B., ob es ein Bodenfahrzeug ist (C1 bis C3, Kennung mit „~“)
      `<div class="mut">${esc(T.apHex)} ${esc(hex.toUpperCase())}${hex.startsWith("~") ? " (" + esc(T.apNoIcao) + ")" : ""}</div>`,
      ac.category ? `<div class="mut">${esc(T.apCat)} ${esc(ac.category)}${T.cats[ac.category] ? ", " + esc(T.cats[ac.category]) : ""}</div>` : "",
      veh ? "" : `<div class="rt" id="ap-rt-${esc(hex)}">${cs ? T.apRoute : ""}</div>`
    ].join("");
    L.popup({ closeButton:true, autoPan:true, offset:[0, -6] }).setLatLng(e.marker.getLatLng()).setContent(html).openOn(apMap);
    if(!cs || veh) return;
    // Gleicher Routen-Speicher und gleiche Plausibilitätsprüfung wie im Radar
    const j = await AS.getRoute({ flight:cs, lat:ac.lat, lon:ac.lon,
      alt: ac.alt_baro === "ground" ? "ground" : ac.alt_baro, track:ac.track, vRate:ac.baro_rate });
    const el = document.getElementById("ap-rt-" + hex); if(!el) return;
    const rt = j && j.route;
    el.textContent = rt && j.plausible !== false && rt.orig && rt.dest
      ? `${rt.orig.iata || rt.orig.icao} → ${rt.dest.iata || rt.dest.icao}` : T.apRouteNone;
  }

  /* ============ Start ============ */
  try{ localStorage.removeItem("asl_ownerTheme"); }catch(e){}   // Altlast des früheren Darstellungs-Umschalters
  initSources();
  initFavs();
  if(AS.LS.get("ownerView3d", false)) setView3d(true);
  afterSourceChange();
})();
