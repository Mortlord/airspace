/* owner.js: Zusatzfunktionen von AirSpace nur für den Betreiber.
   index.html lädt diese Datei nur, wenn ein Owner-Code im Browser liegt
   (Anmeldung: fünfmal auf die Uhrzeit tippen oder adsb-radar.de/#owner).
   Alles, was hier passiert, prüft der Server zusätzlich anhand des Codes.

   Eingebaut in die gemeinsame Oberfläche statt angehängt:
   - Kopfzeile: Wähler für die Datenquelle (Standort, Heim-Pi, Fixpunkt)
   - Werkzeugleiste: 3D-Ansicht, Regenradar (nur Heim-Pi), Flughafen Stuttgart
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
         apLoading:"Lade …", apApron:"Vorfeld", apArea:"Umgebung", apClose:"Schließen", apGround:"Boden", apAir:"Luft", apNoData:"Keine Daten",
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
         apLoading:"Loading …", apApron:"Apron", apArea:"Area", apClose:"Close", apGround:"Ground", apAir:"Air", apNoData:"No data",
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

  /* ============ Stufe 6: Regenradar (DWD, nur im Feeder-Modus) ============ */
  // Niederschlagsradar des Deutschen Wetterdienstes als Ebene über der Hintergrundkarte.
  // Das neueste Messbild liegt etwa 5 bis 10 Minuten zurück: jetzt minus 8 Minuten, auf 5 Minuten abgerundet.
  const wx = { on: AS.LS.get("ownerWx", false), layer:null };
  const WX_STEP = 5 * 60000;
  const wxTimeMs = () => Math.floor((Date.now() - 8 * 60000) / WX_STEP) * WX_STEP;
  const wxTime = () => new Date(wxTimeMs()).toISOString().replace(/\.\d+Z$/, ".000Z");
  const wxBt = toolButton(T.tRain,
    `<svg viewBox="0 0 24 24"><path d="M7 15a4 4 0 0 1 .5-8A5 5 0 0 1 17 8a3.5 3.5 0 0 1 0 7z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/></svg>`);
  const wxCredit = document.createElement("p"); wxCredit.className = "map-credit"; wxCredit.hidden = true;
  $("mapCredit").after(wxCredit);
  const wxActive = () => wx.on && !!AS.source && AS.source.id === "feeder";
  AS.mapForced = () => wxActive();
  function applyWx(){
    wxBt.hidden = !(AS.source && AS.source.id === "feeder");
    wxBt.classList.toggle("active", wx.on);
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
  }
  wxBt.addEventListener("click", () => { wx.on = !wx.on; AS.LS.set("ownerWx", wx.on); applyWx(); });
  setInterval(() => { if(wxActive()) applyWx(); }, 60000);

  // Kompass nur im Live-Modus, Regenradar nur im Feeder-Modus: bei jedem Quellenwechsel neu prüfen
  const origSetSource = AS.setSource;
  AS.setSource = src => { origSetSource(src); afterSourceChange(); };
  function afterSourceChange(){
    cmpRow.hidden = !(isIOS && typeof DeviceOrientationEvent !== "undefined" && !AS.source);
    applyWx();
  }

  /* ============ Stufe 8: Flughafenansicht ============ */
  // Vollbildkarte mit Vorfeld, Rollwegen, Pisten und Gebäuden aus OpenStreetMap (Datei im Repo,
  // © OpenStreetMap-Mitwirkende, ODbL). Flugzeuge über /aircraft um den Flughafen, am Boden maßstäblich.
  // Stuttgart statt Basel-Mulhouse, weil adsb.fi dort auch Bodenverkehr gut empfängt. Für einen anderen
  // Flughafen genügt es, AP anzupassen und die passende Datei aus Overpass Turbo abzulegen.
  // Solange die Ansicht offen ist, pausiert der Abruf des Hauptradars.
  const AP = { icao:"EDDS", name:"Stuttgart", lat:48.6900, lon:9.2219, dataUrl:"airport-edds.json",
               apron:null };   // Bereich des Vorfelds, wird aus den Flughafendaten bestimmt
  const AP_POLL_MS = 2000, AP_STALE_S = 60, AP_TRAIL_MS = 3 * 60 * 1000, AP_TAXI_WIDTH = 23;
  const AP_SPAN = { A1:12, A2:20, A3:36, A4:40, A5:62, A7:12, B1:15, B4:10 };
  const AP_PLANE = "M0,-48C4,-48 5,-40 5,-30L5,-10L46,8L46,15L5,6L4,30L16,40L16,46L0,42L-16,46L-16,40L-4,30L-5,6L-46,15L-46,8L-5,-10L-5,-30C-5,-40 -4,-48 0,-48Z";
  const apCss = document.createElement("style");
  apCss.textContent = `
    #ap-view{position:fixed;inset:0;z-index:3000;display:none;flex-direction:column;background:var(--bg);
      padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
    #ap-view.open{display:flex}
    #ap-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;
      background:var(--surface);border-bottom:1px solid var(--line);font-family:var(--font)}
    #ap-head .ap-title{font-weight:600;font-size:18px;color:var(--txt)}
    #ap-head .ap-title span{font-family:var(--font-data);font-size:13px;color:var(--txt-dim);margin-left:6px}
    #ap-head .ap-stat{font-family:var(--font-data);font-size:13px;color:var(--txt-dim)}
    #ap-head .ap-stat b{color:var(--txt);font-weight:600}
    #ap-head .ap-sp{flex:1}
    #ap-head button{background:var(--bg);border:1px solid var(--line);color:var(--txt-dim);border-radius:4px;
      padding:6px 10px;font:15px var(--font);cursor:pointer}
    #ap-head button.ap-close{font-size:18px;line-height:1;padding:4px 10px}
    #ap-map{flex:1;background:#0c0f14}
    #ap-map .leaflet-control-attribution{background:rgba(18,22,28,.8);color:var(--txt-dim);font:10px var(--font)}
    #ap-map .leaflet-control-attribution a{color:inherit}
    .ap-ac{background:none;border:none}
    .ap-ac-wrap{position:absolute;left:0;top:0;pointer-events:auto;cursor:pointer}
    .ap-ac-svg{position:absolute;left:0;top:0;overflow:visible}
    .ap-ac-lbl{position:absolute;white-space:nowrap;font:10.5px/1.25 var(--font-data);color:var(--txt);
      text-shadow:0 0 3px #0a0d12,0 0 3px #0a0d12,0 0 2px #0a0d12;pointer-events:none}
    .ap-ac-lbl small{display:block;color:var(--txt-dim);font-size:9.5px}
    .ap-txt{background:none;border:none}
    .ap-txt div{transform:translate(-50%,-50%);white-space:nowrap;font-family:var(--font-data);color:var(--txt-dim);
      text-shadow:0 0 3px #0a0d12,0 0 3px #0a0d12;pointer-events:none}
    .ap-rwy div{font-size:13px;color:#9aa6b3;font-weight:600}
    .ap-gate div{font-size:9.5px}
    .ap-bldg div{font-family:var(--font);font-size:11px}
    #ap-map.ap-z-lo .ap-gate,#ap-map.ap-z-lo .ap-bldg{display:none}
    #ap-map.ap-z-far .ap-rwy{display:none}
    #ap-map .leaflet-popup-content-wrapper,#ap-map .leaflet-popup-tip{background:var(--surface);color:var(--txt);
      border:1px solid var(--line);box-shadow:0 6px 24px rgba(0,0,0,.5)}
    #ap-map .leaflet-popup-content{margin:10px 12px;font:14px/1.45 var(--font)}
    #ap-map .leaflet-popup-content .cs{font-family:var(--font-data);font-size:16px}
    #ap-map .leaflet-popup-content .mut{color:var(--txt-dim)}
    #ap-map .leaflet-popup-content .rt{font-family:var(--font-data);color:var(--sel);margin-top:4px}
    #ap-map a.leaflet-popup-close-button{color:var(--txt-dim)}`;
  document.head.appendChild(apCss);
  const apView = document.createElement("div");
  apView.id = "ap-view"; apView.setAttribute("role", "dialog"); apView.setAttribute("aria-label", T.tAirport);
  apView.innerHTML = `<div id="ap-head"><div class="ap-title">${esc(AP.name)}<span>${esc(AP.icao)}</span></div>
      <div class="ap-stat" id="ap-stat">${esc(T.apLoading)}</div><div class="ap-sp"></div>
      <button data-ap="apron">${esc(T.apApron)}</button><button data-ap="area">${esc(T.apArea)}</button>
      <button class="ap-close" data-ap="close" aria-label="${esc(T.apClose)}">×</button></div><div id="ap-map"></div>`;
  document.body.appendChild(apView);
  const apBt = toolButton(T.tAirport,
    `<svg viewBox="0 0 24 24"><path d="M3 21h18M5 21V10h14v11M9 21v-5h6v5M8 10V6h8v4M12 6V3"/></svg>`);
  let apMap = null, apTimer = null, apAnim = null, apFetching = false, apOpen = false;
  const apScaled = [], apAc = {};
  AS.paused = () => apOpen;
  const apMpp = () => 156543.03392 * Math.cos(apMap.getCenter().lat * Math.PI / 180) / Math.pow(2, apMap.getZoom());
  const apOnGround = ac => ac.alt_baro === "ground" || (typeof ac.gs === "number" && ac.gs < 35 && typeof ac.alt_baro === "number" && ac.alt_baro < 1500);
  const apAltColor = alt => typeof alt !== "number" ? "#9c8a70" : alt < 5000 ? "#6f7d8c" : alt < 15000 ? "#8a97a5" : alt < 30000 ? "#a9b4c0" : "#cdd6e0";
  const apFmtAlt = alt => alt === "ground" ? T.apGround : typeof alt !== "number" ? "" : alt < 5000 ? `${Math.round(alt / 100) * 100} ft` : `FL${String(Math.round(alt / 100)).padStart(3, "0")}`;

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
  apView.querySelector("#ap-head").addEventListener("click", e => {
    const b = e.target.closest("button[data-ap]"); if(!b) return;
    if(b.dataset.ap === "close") closeAirportView();
    else if(b.dataset.ap === "apron"){
      if(AP.apron) apMap.flyToBounds(AP.apron, { padding:[16, 16], duration:.8 });
      else apMap.flyTo([AP.lat, AP.lon], 15, { duration:.8 });
    }
    else apMap.flyTo([AP.lat, AP.lon], 11, { duration:.8 });
  });
  document.addEventListener("keydown", e => { if(apOpen && e.key === "Escape") closeAirportView(); });

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
    L.rectangle([[-85, -180], [85, 180]], { pane:"apScrim", interactive:false, stroke:false, fillColor:"#0a0d12", fillOpacity:.62 }).addTo(apMap);
    apMap.on("zoomend", apOnZoom);
    apLoadGeo(); apOnZoom();
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
    const apronLayer = L.geoJSON({ type:"FeatureCollection", features:by(f => aw(f) === "apron") },
      { renderer:R, interactive:false, style:{ stroke:false, fillColor:"#1d242d", fillOpacity:1 } }).addTo(apMap);
    // Startansicht: das Vorfeld bildschirmfüllend
    if(apronLayer.getLayers().length){
      AP.apron = apronLayer.getBounds();
      apMap.fitBounds(AP.apron, { padding:[16, 16] });
    }
    const taxi = by(f => (aw(f) === "taxiway" || aw(f) === "taxilane") && f.geometry.type === "LineString");
    for(const f of taxi){
      const body = L.polyline(f.geometry.coordinates.map(c => [c[1], c[0]]),
        { renderer:R, interactive:false, color:"#262e38", lineCap:"round", lineJoin:"round" }).addTo(apMap);
      apScaled.push({ layer:body, widthM:parseFloat(f.properties.width) || AP_TAXI_WIDTH, minPx:1.5 });
    }
    for(const f of taxi) L.polyline(f.geometry.coordinates.map(c => [c[1], c[0]]),
      { renderer:R, interactive:false, color:"#7d6a35", weight:1, opacity:.8 }).addTo(apMap);
    for(const f of by(f => aw(f) === "runway" && f.geometry.type === "LineString")){
      const ll = f.geometry.coordinates.map(c => [c[1], c[0]]);
      const body = L.polyline(ll, { renderer:R, interactive:false, color:"#38414c", lineCap:"butt" }).addTo(apMap);
      apScaled.push({ layer:body, widthM:parseFloat(f.properties.width) || 45, minPx:3 });
      L.polyline(ll, { renderer:R, interactive:false, color:"#9aa6b3", weight:1, dashArray:"10 8", opacity:.7 }).addTo(apMap);
      if(f.properties.ref && ll.length >= 2){
        const a = ll[0], b = ll[ll.length - 1], brg = AS.bearingDeg(a[0], a[1], b[0], b[1]);
        const n = d => String(((Math.round(d / 10) + 35) % 36) + 1).padStart(2, "0");
        // Hinter der Schwelle (etwa 160 m auf der Piste) beschriften
        const at = (p, q, m) => { const d = AS.haversineNm(p[0], p[1], q[0], q[1]) * 1852, t = Math.min(1, m / d);
          return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; };
        apText(at(a, b, 160), n(brg), "ap-rwy"); apText(at(b, a, 160), n((brg + 180) % 360), "ap-rwy");
      }
    }
    L.geoJSON({ type:"FeatureCollection", features:by(f => aw(f) === "parking_position") },
      { renderer:R, interactive:false, style:{ color:"#465160", weight:1, fill:false } }).addTo(apMap);
    L.geoJSON({ type:"FeatureCollection", features:by(f => f.properties.building || aw(f) === "terminal" || aw(f) === "hangar") }, {
      renderer:R, interactive:false,
      style:f => aw(f) === "terminal" ? { color:"#2f6d96", weight:1, fillColor:"#24313f", fillOpacity:1 }
              : aw(f) === "hangar" ? { color:"#3a4452", weight:1, fillColor:"#20262e", fillOpacity:1 }
              : { color:"#353e4a", weight:1, fillColor:"#222831", fillOpacity:1 }
    }).addTo(apMap);
    for(const f of by(f => aw(f) === "gate" && f.properties.ref && f.geometry.type === "Point")){
      const c = f.geometry.coordinates; apText([c[1], c[0]], f.properties.ref, "ap-gate");
    }
    for(const f of by(f => f.properties.name && f.geometry.type === "Polygon")){
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
  const apRadiusNm = () => apMap && apMap.getZoom() >= 13.5 ? 4 : 30;
  async function apPoll(){
    if(!apOpen || apFetching) return;
    apFetching = true;
    try{
      const r = await fetch(`${BASE}/aircraft?lat=${AP.lat}&lon=${AP.lon}&radius=${apRadiusNm()}`, { cache:"no-store" });
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
            html:`<div class="ap-ac-wrap"><svg class="ap-ac-svg" viewBox="-50 -50 100 100"><path d="${AP_PLANE}"/></svg><span class="ap-ac-lbl"></span></div>` }) }).addTo(apMap);
          e.marker.on("click", () => apShowPopup(ac.hex));
        }
        const posTs = dataNow - (typeof ac.seen_pos === "number" ? ac.seen_pos : 0) * 1000;
        if(e.posTs && posTs <= e.posTs){ e.seenAt = now; continue; }   // keine ältere Position übernehmen
        e.ac = ac; e.ts = Math.min(posTs, now); e.posTs = posTs; e.seenAt = now;
        const last = e.trail[e.trail.length - 1];
        if(!last || last[0] !== ac.lat || last[1] !== ac.lon) e.trail.push([ac.lat, ac.lon, e.ts]);
        while(e.trail.length && now - e.trail[0][2] > AP_TRAIL_MS) e.trail.shift();
        const ll = e.trail.map(q => [q[0], q[1]]), color = apOnGround(ac) ? "#9c8a70" : "#4a9fd4";
        if(!e.line) e.line = L.polyline(ll, { pane:"apTrail", interactive:false, weight:1.5, opacity:.45, color }).addTo(apMap);
        else { e.line.setLatLngs(ll); e.line.setStyle({ color }); }
        apStyleMarker(e);
      }
      for(const hex in apAc){
        const e = apAc[hex];
        if(!seen.has(hex) && now - (e.seenAt || e.ts) > 20000){
          apMap.removeLayer(e.marker); if(e.line) apMap.removeLayer(e.line); delete apAc[hex];
        }
      }
      let g = 0, a = 0; for(const hex in apAc) apOnGround(apAc[hex].ac) ? g++ : a++;
      $("ap-stat").innerHTML = `${esc(T.apGround)} <b>${g}</b>, ${esc(T.apAir)} <b>${a}</b>, ${new Date(now).toLocaleTimeString(AS.LANG === "de" ? "de-DE" : "en-GB")}`;
    }catch(e){ $("ap-stat").textContent = T.apNoData + " (" + e.message + ")"; }
    finally{ apFetching = false; }
  }
  function apStyleMarker(e){
    const el = e.marker.getElement(); if(!el) return;
    const ac = e.ac, ground = apOnGround(ac);
    const span = AP_SPAN[(ac.category || "").toUpperCase()] || 34;
    const px = Math.round(Math.max(ground ? 14 : 18, Math.min(120, span / apMpp())));
    const hdg = typeof ac.true_heading === "number" && ground ? ac.true_heading : (typeof ac.track === "number" ? ac.track : 0);
    const w = el.firstChild, svg = w.firstChild, lbl = w.lastChild;
    w.style.width = w.style.height = px + "px"; w.style.transform = `translate(${-px / 2}px, ${-px / 2}px)`;
    svg.setAttribute("width", px); svg.setAttribute("height", px); svg.style.transform = `rotate(${hdg}deg)`;
    const path = svg.firstChild;
    path.setAttribute("fill", ground ? "#9c8a70" : apAltColor(ac.alt_baro));
    path.setAttribute("stroke", "#0a0d12"); path.setAttribute("stroke-width", "3");
    lbl.style.left = (px * .75) + "px"; lbl.style.top = (px * .15) + "px";
    const cs = (ac.flight || "").trim() || ac.r || ac.hex.toUpperCase();
    const sub = ground ? (typeof ac.gs === "number" && ac.gs >= 3 ? `${Math.round(ac.gs)} kt` : "")
      : `${apFmtAlt(ac.alt_baro)}${typeof ac.baro_rate === "number" && Math.abs(ac.baro_rate) >= 300 ? (ac.baro_rate > 0 ? " ↑" : " ↓") : ""}`;
    lbl.innerHTML = esc(cs) + (sub ? `<small>${esc(sub)}</small>` : "");
  }
  // Zwischen den Abfragen mit Geschwindigkeit und Kurs weiterrechnen, höchstens 12 s
  function apAnimate(){
    if(!apOpen) return;
    const now = Date.now();
    for(const hex in apAc){
      const e = apAc[hex], ac = e.ac;
      if(typeof ac.gs !== "number" || typeof ac.track !== "number" || ac.gs < 3) continue;
      const dNm = ac.gs * Math.min(12, (now - e.ts) / 1000) / 3600, tr = ac.track * Math.PI / 180;
      e.marker.setLatLng([ac.lat + dNm / 60 * Math.cos(tr), ac.lon + dNm / 60 * Math.sin(tr) / Math.cos(ac.lat * Math.PI / 180)]);
    }
  }
  async function apShowPopup(hex){
    const e = apAc[hex]; if(!e) return;
    const ac = e.ac, cs = (ac.flight || "").trim(), names = AS.names;
    const airline = cs && /^[A-Z]{3}\d/.test(cs) ? (names.airlines[cs.slice(0, 3)] || "") : "";
    const type = ac.t ? (names.types[ac.t] || ac.t) : "";
    const html = [
      `<div class="cs">${esc(cs || ac.r || hex.toUpperCase())}</div>`,
      airline ? `<div>${esc(airline)}</div>` : "",
      `<div class="mut">${esc([type, ac.r].filter(Boolean).join(", "))}</div>`,
      `<div class="mut">${esc(apFmtAlt(ac.alt_baro))}${typeof ac.gs === "number" ? ", " + Math.round(ac.gs) + " kt" : ""}</div>`,
      `<div class="rt" id="ap-rt-${esc(hex)}">${cs ? T.apRoute : ""}</div>`
    ].join("");
    L.popup({ closeButton:true, autoPan:true, offset:[0, -6] }).setLatLng(e.marker.getLatLng()).setContent(html).openOn(apMap);
    if(!cs) return;
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
