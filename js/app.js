(function () {
  "use strict";

  /* ---------------- Data ---------------- */
  const TRACKS = [
    { t: "Neon Horizon",  a: "Pixel Bloom",      d: 222, art: "b", label: "NEON HORIZON" },
    { t: "Digital Rain",  a: "SynthWave Pro",    d: 255, art: "a", label: "NEON ECHO" },
    { t: "Arcade Memory", a: "Chrome Coast",     d: 238, art: "d", label: "ARCADE" },
    { t: "Solar Flare",   a: "Luna Collective",  d: 301, art: "e", label: "SOLAR" },
    { t: "Glass Garden",  a: "Aero Fields",      d: 262, art: "c", label: "GLASS" },
    { t: "Midnight Bus",  a: "Vista Kids",       d: 216, art: "f", label: "MIDNIGHT" },
    { t: "Liquid Chrome", a: "Pixel Bloom",      d: 244, art: "e", label: "CHROME" },
    { t: "Paper Lantern", a: "Aero Fields",      d: 199, art: "c", label: "LANTERN" }
  ];

  const LIBRARY = [
    { t: "Digital Horizon", a: "SynthWave Pro",   d: 255, art: "a", label: "HORIZON" },
    { t: "Neon Acrylic",    a: "Pixel Bloom",     d: 228, art: "b", label: "ACRYLIC" },
    { t: "Etheric Echo",    a: "Aero Fields",     d: 302, art: "c", label: "ETHERIC" },
    { t: "Bubble Physics",  a: "Chrome Coast",    d: 187, art: "f", label: "BUBBLE" },
    { t: "Wallpaper Bliss", a: "Vista Kids",      d: 241, art: "e", label: "BLISS" },
    { t: "Sunset Protocol", a: "Luna Collective", d: 274, art: "d", label: "SUNSET" }
  ];

  // One flat pool so the player can address anything the UI shows.
  // Playlist rows are 0..7, library rows continue from there.
  const ALL = TRACKS.concat(LIBRARY);
  const LIB_OFFSET = TRACKS.length;

  /* ---------------- State ---------------- */
  const state = {
    idx: 1,
    t: 102,           // elapsed seconds
    playing: true,
    shuffle: false,
    repeat: false,
    liked: false,
    dragging: false
  };

  const $  = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  const app       = $("#app");
  const seekBar   = $("#seekBar");
  const seekFill  = $("#seekFill");
  const seekHandle= $("#seekHandle");
  const dockFill  = $("#dockFill");
  const sheet     = $("#sheet");
  const scrim     = $("#scrim");

  const ICON_PLAY  = "M8 5v14l11-7z";
  const ICON_PAUSE = "M6 5h4v14H6zm8 0h4v14h-4z";

  const mmss = (s) => {
    s = Math.max(0, Math.round(s));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  };

  const cur = () => ALL[state.idx];

  /* ---------------- Build the meters ---------------- */
  // Visualizer: randomised delays/durations so it never looks like a loop.
  const viz = $("#viz");
  for (let i = 0; i < 26; i++) {
    const bar = document.createElement("i");
    bar.style.animationDelay = (-Math.random() * 1.1).toFixed(2) + "s";
    bar.style.animationDuration = (0.75 + Math.random() * 0.75).toFixed(2) + "s";
    viz.appendChild(bar);
  }

  // Static waveforms inside the genre tiles.
  $$(".wave").forEach((w) => {
    for (let i = 0; i < 11; i++) {
      const bar = document.createElement("i");
      bar.style.height = (25 + Math.random() * 75).toFixed(0) + "%";
      w.appendChild(bar);
    }
  });

  /* ---------------- Row templates ---------------- */
  function trackRow(track, idx, opts) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "track";
    btn.dataset.idx = idx;
    btn.innerHTML =
      '<span class="track__idx"><em>' + (opts.number || "") + "</em>" +
        '<span class="eq"><i></i><i></i><i></i><i></i></span></span>' +
      '<span class="art art--' + track.art + '"></span>' +
      '<span class="track__meta"><b>' + track.t + "</b><span>" + track.a + "</span></span>" +
      '<span class="track__dur">' + mmss(track.d) + "</span>";
    return btn;
  }

  const trackList = $("#trackList");
  TRACKS.forEach((tr, i) => trackList.appendChild(trackRow(tr, i, { number: i + 1 })));

  const libList = $("#libList");
  LIBRARY.forEach((tr, i) => libList.appendChild(trackRow(tr, LIB_OFFSET + i, {})));

  /* ---------------- Rendering ---------------- */
  function setArt(el, art) {
    el.className = el.className.replace(/\bart--[a-f]\b/, "art--" + art);
  }

  function renderQueue() {
    const q = $("#queue");
    q.innerHTML = "";
    for (let n = 1; n <= 4; n++) {
      const i = (state.idx + n) % ALL.length;
      const tr = ALL[i];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "q-item";
      btn.dataset.idx = i;
      btn.innerHTML =
        '<span class="art art--' + tr.art + '"></span>' +
        '<span class="m"><b>' + tr.t + "</b><span>" + tr.a + "</span></span>" +
        '<span class="d">' + mmss(tr.d) + "</span>";
      q.appendChild(btn);
    }
  }

  function renderTrack() {
    const tr = cur();

    $("#dockTitle").textContent = tr.t;
    $("#dockArtist").textContent = tr.a;
    $("#npTitle").textContent = tr.t;
    $("#npArtist").textContent = tr.a;
    $("#npLabel").textContent = tr.label;

    setArt($("#dockArt"), tr.art);
    setArt($("#npArt"), tr.art);

    const fromLib = state.idx >= LIB_OFFSET;
    $("#sheetSrcKind").textContent = fromLib ? "Playing from library" : "Playing from playlist";
    $("#sheetSrcName").textContent = fromLib ? "Your Library" : "Midnight Echoes";

    $$(".tracks .track", app).forEach((row) => {
      row.classList.toggle("is-current", +row.dataset.idx === state.idx);
    });

    renderQueue();
  }

  function renderProgress() {
    const tr = cur();
    const pct = Math.min(100, (state.t / tr.d) * 100);

    seekFill.style.width = pct + "%";
    seekHandle.style.left = pct + "%";
    dockFill.style.width = pct + "%";

    $("#npElapsed").textContent = mmss(state.t);
    $("#npRemain").textContent = "-" + mmss(tr.d - state.t);

    seekBar.setAttribute("aria-valuenow", Math.round(pct));
    seekBar.setAttribute("aria-valuetext", mmss(state.t) + " of " + mmss(tr.d));
  }

  function renderPlaying() {
    app.classList.toggle("is-paused", !state.playing);
    $$(".js-pp", app).forEach((svg) => {
      svg.firstElementChild.setAttribute("d", state.playing ? ICON_PAUSE : ICON_PLAY);
      svg.closest("button").setAttribute("aria-label", state.playing ? "Pause" : "Play");
    });
  }

  /* ---------------- Playback ---------------- */
  function play(on) {
    state.playing = on === undefined ? !state.playing : on;
    renderPlaying();
  }

  function goto(i, autoplay) {
    const n = ALL.length;
    state.idx = ((i % n) + n) % n;
    state.t = 0;
    state.liked = false;
    $("#npLike").setAttribute("aria-pressed", "false");
    if (autoplay) state.playing = true;
    renderTrack();
    renderProgress();
    renderPlaying();
  }

  function next() {
    if (state.shuffle) {
      let r = state.idx;
      while (r === state.idx && ALL.length > 1) r = Math.floor(Math.random() * ALL.length);
      goto(r, true);
    } else {
      goto(state.idx + 1, true);
    }
  }

  function prev() {
    // Standard behaviour: restart the track unless you're near the start.
    if (state.t > 3) { state.t = 0; renderProgress(); return; }
    goto(state.idx - 1, true);
  }

  // Progress clock
  setInterval(() => {
    if (!state.playing || state.dragging) return;
    state.t += 0.25;
    if (state.t >= cur().d) {
      if (state.repeat) { state.t = 0; }
      else { next(); return; }
    }
    renderProgress();
  }, 250);

  /* ---------------- Transport wiring ---------------- */
  $$("[data-act]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = btn.dataset.act;
      if (act === "toggle") play();
      else if (act === "next") next();
      else if (act === "prev") prev();
    });
  });

  function toggleAria(el, onChange) {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const on = el.getAttribute("aria-pressed") !== "true";
      el.setAttribute("aria-pressed", String(on));
      if (onChange) onChange(on);
    });
  }

  toggleAria($("#npShuffle"), (on) => {
    state.shuffle = on;
    $("#plShuffle").setAttribute("aria-pressed", String(on));
  });
  toggleAria($("#plShuffle"), (on) => {
    state.shuffle = on;
    $("#npShuffle").setAttribute("aria-pressed", String(on));
  });
  toggleAria($("#npRepeat"), (on) => { state.repeat = on; });
  toggleAria($("#npLike"), (on) => { state.liked = on; });
  toggleAria($("#plLike"));

  $("#playAll").addEventListener("click", () => goto(0, true));

  /* ---------------- Track / library selection ---------------- */
  trackList.addEventListener("click", (e) => {
    const row = e.target.closest(".track");
    if (row) goto(+row.dataset.idx, true);
  });

  libList.addEventListener("click", (e) => {
    const row = e.target.closest(".track");
    if (row) goto(+row.dataset.idx, true);
  });

  $("#queue").addEventListener("click", (e) => {
    const row = e.target.closest(".q-item");
    if (row) goto(+row.dataset.idx, true);
  });

  /* ---------------- Seek (click + drag) ---------------- */
  function seekFromEvent(e) {
    const r = seekBar.getBoundingClientRect();
    const pct = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    state.t = pct * cur().d;
    renderProgress();
  }

  seekBar.addEventListener("pointerdown", (e) => {
    state.dragging = true;
    seekBar.classList.add("is-dragging");
    seekBar.setPointerCapture(e.pointerId);
    seekFromEvent(e);
  });

  seekBar.addEventListener("pointermove", (e) => {
    if (state.dragging) seekFromEvent(e);
  });

  ["pointerup", "pointercancel"].forEach((ev) =>
    seekBar.addEventListener(ev, () => {
      state.dragging = false;
      seekBar.classList.remove("is-dragging");
    })
  );

  seekBar.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 30 : 5;
    if (e.key === "ArrowRight") { state.t = Math.min(cur().d, state.t + step); renderProgress(); e.preventDefault(); }
    if (e.key === "ArrowLeft")  { state.t = Math.max(0, state.t - step);       renderProgress(); e.preventDefault(); }
  });

  /* ---------------- Sheet open / close ---------------- */
  function openSheet() {
    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
    scrim.classList.add("is-on");
    $("#sheetClose").focus({ preventScroll: true });
  }

  function closeSheet() {
    sheet.classList.remove("is-open");
    sheet.setAttribute("aria-hidden", "true");
    scrim.classList.remove("is-on");
  }

  $("#dock").addEventListener("click", openSheet);
  $("#dock").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openSheet(); }
  });

  $("#sheetClose").addEventListener("click", closeSheet);
  scrim.addEventListener("click", closeSheet);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sheet.classList.contains("is-open")) closeSheet();
  });

  // Drag the sheet header down to dismiss.
  (function () {
    const bar = $("#sheetBar");
    let y0 = null;

    bar.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button")) return;
      y0 = e.clientY;
      bar.setPointerCapture(e.pointerId);
    });

    bar.addEventListener("pointermove", (e) => {
      if (y0 === null) return;
      const dy = Math.max(0, e.clientY - y0);
      sheet.style.transition = "none";
      sheet.style.transform = "translateY(" + dy + "px)";
    });

    ["pointerup", "pointercancel"].forEach((ev) =>
      bar.addEventListener(ev, (e) => {
        if (y0 === null) return;
        const dy = Math.max(0, e.clientY - y0);
        y0 = null;
        // Restore the transition, retarget, THEN drop the inline transform —
        // so it animates from where the finger left it instead of snapping.
        sheet.style.transition = "";
        if (dy > 90) closeSheet();
        sheet.style.transform = "";
      })
    );
  })();

  /* ---------------- Tabs (click, arrows, swipe) ----------------
     Every query below is scoped to `app`. The gallery holds cloned copies
     of this whole subtree, and a document-wide selector would drive their
     tabs, rows and play icons along with the live one. */
  const tabs = $$(".tab", app);
  const views = $("#views");
  const ORDER = ["search", "playlist", "library", "profile"];

  function setView(name) {
    tabs.forEach((t) => {
      const on = t.dataset.view === name;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    $$(".view", app).forEach((v) => {
      const on = v.dataset.view === name;
      v.classList.toggle("is-active", on);
      v.hidden = !on;
    });
    views.scrollTop = 0;
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => setView(tab.dataset.view));
    tab.addEventListener("keydown", (e) => {
      const i = ORDER.indexOf(tab.dataset.view);
      // wrap on ORDER.length, not a hard-coded count
      const n = ORDER.length;
      const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!step) return;
      const to = ORDER[(i + step + n) % n];
      setView(to);
      $('.tab[data-view="' + to + '"]', app).focus();
    });
  });

  // Horizontal swipe between views.
  (function () {
    let x0 = 0, y0 = 0, tracking = false;

    views.addEventListener("touchstart", (e) => {
      if (e.touches.length !== 1) return;
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    views.addEventListener("touchend", (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const from = ORDER.indexOf($(".view.is-active").dataset.view);
      const to = dx < 0 ? from + 1 : from - 1;
      if (to >= 0 && to < ORDER.length) setView(ORDER[to]);
    }, { passive: true });
  })();

  /* ---------------- Small touches ---------------- */
  // Recent-search chips behave as a single-select filter.
  $("#recentChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const on = chip.getAttribute("aria-pressed") !== "true";
    $$("#recentChips .chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
    chip.setAttribute("aria-pressed", String(on));
  });

  // Segmented + view toggles
  $$(".segmented").forEach((seg) => {
    seg.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      $$("button", seg).forEach((x) => x.setAttribute("aria-selected", "false"));
      b.setAttribute("aria-selected", "true");
    });
  });

  $$(".view-toggle").forEach((vt) => {
    vt.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      $$("button", vt).forEach((x) => x.setAttribute("aria-pressed", "false"));
      b.setAttribute("aria-pressed", "true");
    });
  });

  // The account button is the conventional way into settings in a music app,
  // so it opens the Profile tab rather than being decorative.
  $("#acctBtn").addEventListener("click", () => setView("profile"));

  // Password reveal
  (function () {
    const input = $("#pfPass");
    const btn = $("#pfReveal");
    btn.addEventListener("click", () => {
      const shown = input.type === "text";
      input.type = shown ? "password" : "text";
      btn.setAttribute("aria-pressed", String(!shown));
      btn.setAttribute("aria-label", shown ? "Show password" : "Hide password");
    });
  })();

  // Library text filter
  $("#libFilter").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    $$("#libList .track").forEach((row, i) => {
      const tr = LIBRARY[i];
      const hit = !q || (tr.t + " " + tr.a).toLowerCase().includes(q);
      row.style.display = hit ? "" : "none";
    });
  });

  // Radio listener count drifts, so the "live" badge isn't a lie.
  (function () {
    const el = $("#listeners");
    let n = 2418;
    setInterval(() => {
      n += Math.floor(Math.random() * 21) - 9;
      el.textContent = n.toLocaleString() + " listening now";
    }, 4000);
  })();

  /* ---------------- Boot ---------------- */
  renderTrack();
  renderProgress();
  renderPlaying();
  setView("search");

  /* ---------------- Public surface for the site shell ----------------
     Deliberately two functions. The shell needs to drive the prototype
     and to take snapshots of it; it has no business reaching anything else. */

  // The four gallery screens map onto three tabs — "now" is the playlist
  // tab with the sheet raised, so the mapping lives here, not in the shell.
  function show(screen) {
    if (screen === "now") {
      setView("playlist");
      openSheet();
    } else {
      closeSheet();
      setView(screen);
    }
  }

  function buildMock(screen) {
    const clone = app.cloneNode(true);

    // Strip identity. `$("#x")` returns the first match in document order,
    // so leaving IDs on clones would let them shadow the live app.
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    clone.querySelectorAll("[aria-controls], [aria-labelledby]").forEach((el) => {
      el.removeAttribute("aria-controls");
      el.removeAttribute("aria-labelledby");
    });

    const sheetOpen = screen === "now";
    const tab = sheetOpen ? "playlist" : screen;

    clone.querySelectorAll(".tab").forEach((t) => {
      const on = t.dataset.view === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });

    clone.querySelectorAll(".view").forEach((v) => {
      const on = v.dataset.view === tab;
      v.classList.toggle("is-active", on);
      v.hidden = !on;
    });

    const sheet = clone.querySelector(".sheet");
    sheet.classList.toggle("is-open", sheetOpen);
    sheet.setAttribute("aria-hidden", String(!sheetOpen));
    clone.querySelector(".scrim").classList.toggle("is-on", sheetOpen);

    return clone;
  }

  window.Luna = { show: show, buildMock: buildMock };
})();
