/* owner.js: Zusatzfunktionen von AirSpace nur für den Betreiber.
   index.html lädt diese Datei nur, wenn ein Owner-Token im Browser liegt (Anmeldung über #owner).
   Alles, was hier passiert, prüft der Server zusätzlich anhand des Tokens.

   Stufe 1: Owner-Kennzeichen, Abmelden, Umschalter zwischen AirSpace-Darstellung und klassischer Darstellung
   Stufe 2: Datenquelle Live (GPS), Feeder (Heim-Pi) oder Fixpunkt
   Stufe 3: Favoriten mit Telegram-Alarm, Markierung in Radar und Liste, Alarmring */
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

  /* ============ Darstellung (Farben und Schrift der privaten App) ============ */
  const style = document.createElement("style");
  style.textContent = `
    @font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:400;font-display:swap;
      src:url('fonts/ibm-plex-mono-400.woff2') format('woff2')}
    @font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:600;font-display:swap;
      src:url('fonts/ibm-plex-mono-600.woff2') format('woff2')}
    :root[data-theme="classic"]{
      --bg:#12161c; --surface:#1a1f27; --line:#2a323d;
      --txt:#c3ccd6; --txt-dim:#97a2af; --target:#cdd6e0;
      --sel:#4a9fd4; --fav:#d98a3d;
      --font-data:'IBM Plex Mono','Courier New',monospace;
    }
    :root[data-theme="classic"] .aclist table{font-size:13px}
    #ownerSlot .seg button:disabled{color:var(--txt-dim);opacity:.45;cursor:default}
    .favadd{display:flex;gap:8px}
    .favadd .search{flex:1;min-width:0}
    .favadd button{flex:none;background:var(--surface);border:1px solid var(--line);border-radius:4px;
      color:var(--txt);font-size:16px;padding:0 16px;cursor:pointer}
    .favs{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 0}
    .favchip{display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid var(--line);
      border-radius:4px;color:var(--txt);font-family:var(--font-data);font-size:14px;padding:5px 8px;cursor:pointer}
    .favchip.live{border-color:var(--fav);color:var(--fav)}
    .favchip svg{opacity:.6}
    .owner-note{margin:8px 0 0;font-size:14px;color:var(--txt-dim)}
    .owner-note a{color:inherit}
  `;
  document.head.appendChild(style);

  function setTheme(t){
    if(t === "classic") document.documentElement.dataset.theme = "classic";
    else delete document.documentElement.dataset.theme;
    AS.LS.set("ownerTheme", t);
    AS.refreshTheme();
    markSeg("ownerThemeSeg", "theme", t);
  }

  /* ============ Oberfläche ============ */
  const slot = $("ownerSlot");
  slot.innerHTML = `
    <span class="field-lbl" id="ownerSrcLbl">Datenquelle</span>
    <div class="seg" id="ownerSrcSeg" role="group" aria-labelledby="ownerSrcLbl">
      <button data-src="live">Live</button>
      <button data-src="feeder" disabled>Feeder</button>
      <button data-src="fixpoint" disabled>Fixpunkt</button>
    </div>
    <p class="owner-note" id="ownerSrcNote"></p>

    <span class="field-lbl" id="favLbl">Favoriten</span>
    <div class="favadd">
      <input class="search" id="favInput" type="text" placeholder="Callsign oder Anfang, z. B. EZS"
        autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="done"
        aria-labelledby="favLbl">
      <button id="favAdd">Hinzufügen</button>
    </div>
    <div class="favs" id="favList"></div>
    <p class="owner-note" id="favNote">Telegram meldet Favoriten im Umkreis von ${ALERT_NM} NM um deinen Standort.</p>

    <span class="field-lbl" id="ownerThemeLbl">Darstellung</span>
    <div class="seg" id="ownerThemeSeg" role="group" aria-labelledby="ownerThemeLbl">
      <button data-theme="airspace">AirSpace</button>
      <button data-theme="classic">Klassisch</button>
    </div>
    <p class="owner-note">Owner-Bereich, nur in diesem Browser. <a href="#logout">Abmelden</a></p>`;
  slot.hidden = false;
  $("ownerBadge").hidden = false;

  function markSeg(id, key, val){
    for(const b of $(id).querySelectorAll("button")) b.classList.toggle("active", b.dataset[key] === val);
  }

  /* ============ Stufe 2: Datenquelle ============ */
  const SOURCES = {
    feeder:   { id:"feeder",   label:"Feeder",   center:null,
                url:()=>`${BASE}/feeder`, headers:hdr },
    fixpoint: { id:"fixpoint", label:"Fixpunkt", center:null,
                url:()=>`${BASE}/fixpoint?radius=${AS.fetchRadius()}`, headers:hdr }
  };
  let denied = 0;

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
    markSeg("ownerSrcSeg", "src", id);
    const now = AS.source ? AS.source.id : "live";
    if(now !== id) AS.setSource(id === "live" ? null : SOURCES[id]);
  }

  $("ownerSrcSeg").addEventListener("click", e => {
    const b = e.target.closest("button");
    if(b && !b.disabled) selectSource(b.dataset.src);
  });

  async function initSources(){
    const [f, x] = await Promise.all([check("feeder"), check("fixpoint")]);
    SOURCES.feeder.center = f; SOURCES.fixpoint.center = x;
    $("ownerSrcSeg").querySelector('[data-src="feeder"]').disabled = !f;
    $("ownerSrcSeg").querySelector('[data-src="fixpoint"]').disabled = !x;
    const note = [];
    if(!f) note.push("Feeder gerade nicht erreichbar");
    if(!x) note.push("Fixpunkt nicht eingerichtet oder nicht erreichbar");
    $("ownerSrcNote").textContent = note.join(". ") + (note.length ? "." : "");
    if(denied >= 2){
      AS.setNotice("Der Server hat den Owner-Token abgelehnt. Mit #owner neu anmelden.", 12000);
      $("ownerSrcNote").textContent = "Token abgelehnt.";
    }
    selectSource(AS.LS.get("ownerSource", "live"));
  }

  /* ============ Stufe 3: Favoriten und Alarme ============ */
  // Der Server ist die Wahrheit. Vor jedem Speichern wird die aktuelle Liste geholt und nur die
  // gewünschte Änderung angewendet; so überschreibt AirSpace nie eine Liste, die anderswo geändert wurde.
  let favs = null;                // null = noch nicht vom Server geladen
  let pushChain = Promise.resolve();
  let lastPush = 0;

  function favMatch(cs){
    if(!favs || !cs) return false;
    const u = cs.trim().toUpperCase();
    return favs.some(f => { const v = String(f).trim().toUpperCase(); return v && u.startsWith(v); });
  }
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
      if(!g){
        if(change) AS.setNotice("Ohne Standort kann ich die Favoriten nicht speichern.");
        return false;
      }
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
        renderFavs(); AS.renderList(); AS.requestDraw();
        return true;
      }catch(e){
        console.warn("Owner push:", e.message);
        if(change) AS.setNotice("Favoriten konnten nicht gespeichert werden. Bitte später erneut versuchen.");
        return false;
      }
    });
    return pushChain;
  }

  function renderFavs(){
    const box = $("favList");
    if(favs === null){ box.innerHTML = `<span class="owner-note">Wird geladen …</span>`; return; }
    if(!favs.length){ box.innerHTML = `<span class="owner-note">Noch keine Favoriten.</span>`; return; }
    const live = new Set(AS.state.aircraft.map(a => (a.flight || "").toUpperCase()));
    box.innerHTML = favs.map(f => {
      const isLive = [...live].some(cs => cs.startsWith(String(f).toUpperCase()));
      return `<button class="favchip${isLive ? " live" : ""}" data-fav="${esc(f)}" aria-label="${esc(f)} entfernen">`+
        `${esc(f)}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" `+
        `stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>`;
    }).join("");
  }

  function addFav(){
    const inp = $("favInput");
    const v = inp.value.trim().toUpperCase().replace(/\s+/g, "");
    if(!/^[A-Z0-9]{2,8}$/.test(v)){ inp.value = ""; return; }
    inp.value = "";
    push(list => list.includes(v) ? list : [...list, v]);
  }
  $("favAdd").addEventListener("click", addFav);
  $("favInput").addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); addFav(); } });
  $("favList").addEventListener("click", e => {
    const b = e.target.closest("button[data-fav]");
    if(b) push(list => list.filter(f => f !== b.dataset.fav));
  });

  async function initFavs(){
    renderFavs();
    try{ favs = await fetchFavs(); }catch(e){ favs = null; $("favNote").textContent = "Favoriten gerade nicht abrufbar."; }
    renderFavs(); AS.renderList(); AS.requestDraw();
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

  /* ============ Start ============ */
  $("ownerThemeSeg").addEventListener("click", e => {
    const b = e.target.closest("button"); if(b) setTheme(b.dataset.theme);
  });
  setTheme(AS.LS.get("ownerTheme", "airspace"));
  initSources();
  initFavs();
})();
