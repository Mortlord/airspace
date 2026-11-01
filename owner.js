/* owner.js: Zusatzfunktionen von AirSpace nur für den Betreiber.
   index.html lädt diese Datei nur, wenn ein Owner-Token im Browser liegt (Anmeldung über #owner).
   Alles, was hier passiert, prüft der Server zusätzlich anhand des Tokens.

   Stufe 1: Owner-Kennzeichen, Abmelden, Umschalter zwischen AirSpace-Darstellung und klassischer Darstellung
   Stufe 2: Datenquelle Live (GPS), Feeder (Heim-Pi) oder Fixpunkt
   Stufe 3: Favoriten mit Telegram-Alarm, Markierung in Radar und Liste, Alarmring
   Stufe 4: Link zur 3D-Empfangsreichweite (coverage.html)
   Stufe 5: 3D-Ansicht (three.js aus three.min.js im eigenen Repo) */
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
    :root[data-theme="classic"] .aclist table{font-size:12px}
    :root[data-theme="classic"] .aclist .c-cs{width:22%} :root[data-theme="classic"] .aclist .c-al{width:19%}
    :root[data-theme="classic"] .aclist .c-rt{width:20%} :root[data-theme="classic"] .aclist .c-fl{width:15%}
    :root[data-theme="classic"] .aclist .c-nm{width:12%} :root[data-theme="classic"] .aclist .c-kt{width:12%}
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
    AS.radarStyle = t === "classic" ? "classic" : "airspace";
    AS.LS.set("ownerTheme", t);
    AS.refreshTheme();
    markSeg("ownerThemeSeg", "theme", t);
    if(typeof v3 !== "undefined" && v3.on){ v3.groundKey = null; draw3d(true); }
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
    <p class="owner-note" id="covLink" hidden><a href="coverage.html">Empfangsreichweite des Heim-Pi in 3D</a></p>

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
    $("covLink").hidden = !f;          // Stufe 4: Reichweite gibt es nur mit erreichbarem Feeder
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
    .v3-btn{position:absolute;top:0;right:0;z-index:4;min-width:40px;height:32px;padding:0 8px;
      background:var(--surface);border:1px solid var(--line);border-radius:4px;color:var(--txt-dim);
      font:600 14px var(--font);cursor:pointer}
    .v3-btn.active{color:var(--sel);border-color:var(--sel)}
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
  const v3bt = document.createElement("button"); v3bt.className = "v3-btn"; v3bt.textContent = "3D";
  v3bt.setAttribute("aria-label", "3D-Ansicht ein- oder ausschalten");
  wrap.append(v3cv, v3lb, v3bt);

  const V3_FT_KM = 0.0003048, V3_NM_KM = 1.852;
  const v3 = { on:false, loading:null, ready:false, renderer:null, scene:null, camera:null, ground:null, planes:null,
               groundKey:null, dataKey:null, Rkm:74, exag:3, orbit:{ theta:0, phi:0.95, dist:0 }, fitted:false,
               labels:[], queued:false, items:[], fixed:[] };
  const cssVar = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
  function altColor(a){
    if(a.alt === "ground" || AS.altFt(a) == null) return "#d98a3d";
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
    [["N",0],["O",90],["S",180],["W",270]].forEach(([t, a]) => { const [x, z] = v3Polar(a, GR*1.04); v3.fixed.push({ t, v:new THREE.Vector3(x,0,z), c:"v3-dir" }); });
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
      .catch(() => { setView3d(false); AS.setNotice("Die 3D-Ansicht konnte nicht geladen werden (three.min.js fehlt?)."); });
  }
  v3bt.addEventListener("click", () => setView3d(!v3.on));
  // Neue Daten, anderer Umkreis oder andere Auswahl: Szene neu aufbauen (Prüfung jede Sekunde)
  setInterval(() => { if(v3.on && !document.hidden) draw3d(false); }, 1000);
  window.addEventListener("resize", () => { if(v3.on) draw3d(true); });

  /* ============ Start ============ */
  $("ownerThemeSeg").addEventListener("click", e => {
    const b = e.target.closest("button"); if(b) setTheme(b.dataset.theme);
  });
  setTheme(AS.LS.get("ownerTheme", "airspace"));
  initSources();
  initFavs();
  if(AS.LS.get("ownerView3d", false)) setView3d(true);
})();
