/* ============================================================
   Site shell — owns the two top-level sections and builds the
   mock-up gallery from the live prototype.

   Everything it knows about the phone comes through window.Luna.
   ============================================================ */
(function () {
  "use strict";

  var SCREENS = [
    {
      screen: "search",
      n: "01",
      name: "Search",
      desc: "Entry point. Recent queries, generated playlist art, mood tiles and a live radio strip."
    },
    {
      screen: "playlist",
      n: "02",
      name: "Playlist",
      desc: "Cover hero, at-a-glance stats and a track list where the row number becomes a meter on the playing track."
    },
    {
      screen: "now",
      n: "03",
      name: "Now Playing",
      desc: "Raised as a sheet from the mini-player rather than a peer tab — so the bottom strip stays playback, not navigation."
    },
    {
      screen: "library",
      n: "04",
      name: "Library",
      desc: "Filterable song list with segmented scopes, plus genre tiles carrying their own artwork and waveforms."
    },
    {
      screen: "profile",
      n: "05",
      name: "Profile",
      desc: "Account fields and playback preferences. Reuses the search field, section labels and segmented control rather than inventing new ones."
    }
  ];

  var MODES = ["gallery", "prototype"];
  var DEFAULT_MODE = "gallery";

  var PHONE_W = 372;   // the width the phone UI is authored at
  var PHONE_H = 780;
  var MIN_SCALE = 0.34;
  var MAX_SCALE = 0.92; // never blow the mock-ups up past near-life-size

  var body = document.body;
  var grid = document.getElementById("galleryGrid");
  var tabs = [].slice.call(document.querySelectorAll(".shell__tab"));

  /* app.js must run first and publish window.Luna. If it didn't — a failed
     load, or a stale cached copy from before the export existed — say so
     in the page instead of throwing an opaque stack trace at the console. */
  if (!window.Luna || typeof window.Luna.buildMock !== "function") {
    grid.insertAdjacentHTML(
      "afterend",
      '<div class="boot-error"><b>Gallery could not be built</b>' +
        "<code>js/app.js</code> did not load, or a stale copy is cached. " +
        "Hard-reload the page (<code>Ctrl</code>+<code>Shift</code>+<code>R</code>) " +
        "and confirm <code>js/app.js</code> sits next to <code>js/site.js</code>.</div>"
    );
    return;
  }

  /* ---------------- Build the gallery ----------------
     Once, at load, from the prototype's pristine boot state. Building
     lazily on first open would capture whatever the user had fiddled
     with, so two visits would disagree. */

  function mockCard(spec) {
    var fig = document.createElement("figure");
    fig.className = "mock";

    var stage = document.createElement("div");
    stage.className = "mock__stage";

    var device = document.createElement("div");
    device.className = "device mock__device";
    // Not focusable, not announced — the caption below carries the meaning.
    device.setAttribute("inert", "");
    device.setAttribute("aria-hidden", "true");
    device.appendChild(window.Luna.buildMock(spec.screen));

    stage.appendChild(device);

    var cap = document.createElement("figcaption");
    cap.className = "mock__cap";

    var head = document.createElement("div");
    head.className = "mock__head";
    head.innerHTML =
      '<span class="mock__num">' + spec.n + "</span>" +
      "<b>" + spec.name + "</b>";

    var desc = document.createElement("p");
    desc.textContent = spec.desc;

    var open = document.createElement("button");
    open.type = "button";
    open.className = "mock__open";
    open.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>' +
      "Open in prototype";
    open.setAttribute("aria-label", "Open " + spec.name + " in the interactive prototype");
    open.addEventListener("click", function () {
      window.Luna.show(spec.screen);
      setMode("prototype");
    });

    cap.appendChild(head);
    cap.appendChild(desc);
    cap.appendChild(open);

    fig.appendChild(stage);
    fig.appendChild(cap);
    return fig;
  }

  SCREENS.forEach(function (spec) {
    grid.appendChild(mockCard(spec));
  });

  /* ---------------- Fluid sizing ----------------
     The grid gives each card a continuously varying width; the phone inside
     is a fixed 372px design. Deriving the scale from the measured column
     means the mock-ups track the window smoothly rather than stepping at
     breakpoints — and the stage height has to follow, since a transform
     doesn't affect layout. */

  var stages = [].slice.call(grid.querySelectorAll(".mock__stage"));

  function fitMocks() {
    // Read every width first, then write. Interleaving them lets the height
    // written for one card shift the layout that the next card is measured
    // against, which leaves the four mock-ups on slightly different scales.
    var widths = stages.map(function (stage) { return stage.clientWidth; });

    stages.forEach(function (stage, i) {
      var w = widths[i];
      if (!w || stage._w === w) return;
      stage._w = w;

      var s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, w / PHONE_W));
      stage.style.setProperty("--s", s);
      stage.style.height = Math.round(PHONE_H * s) + "px";
    });
  }

  fitMocks();

  if (window.ResizeObserver) {
    // Writes are deferred to the next frame. Doing them inside the observer
    // callback resizes the grid mid-cycle, which Chrome reports as
    // "ResizeObserver loop completed with undelivered notifications".
    var pending = null;
    var schedule = function () {
      if (pending !== null) return;
      pending = requestAnimationFrame(function () {
        pending = null;
        fitMocks();
      });
    };
    // observe the grid, not the window — catches the nav rail collapsing too
    new ResizeObserver(schedule).observe(grid);
  } else {
    window.addEventListener("resize", fitMocks);
  }

  /* ---------------- Mode switching ---------------- */

  function setMode(mode, skipHash) {
    if (MODES.indexOf(mode) === -1) mode = DEFAULT_MODE;

    body.dataset.mode = mode;

    tabs.forEach(function (t) {
      var on = t.dataset.mode === mode;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });

    if (!skipHash && location.hash.slice(1) !== mode) {
      history.replaceState(null, "", "#" + mode);
    }

    // A hidden grid measures 0, so ResizeObserver can't track it while the
    // prototype is showing. Re-fit whenever the gallery comes back into view.
    if (mode === "gallery") fitMocks();

    window.scrollTo(0, 0);
  }

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      setMode(tab.dataset.mode);
    });

    tab.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      var i = MODES.indexOf(tab.dataset.mode);
      var next = MODES[(i + (e.key === "ArrowRight" ? 1 : MODES.length - 1)) % MODES.length];
      setMode(next);
      document.querySelector('.shell__tab[data-mode="' + next + '"]').focus();
    });
  });

  window.addEventListener("hashchange", function () {
    setMode(location.hash.slice(1), true);
  });

  /* ---------------- Boot ---------------- */
  setMode(location.hash.slice(1) || DEFAULT_MODE, true);
})();
