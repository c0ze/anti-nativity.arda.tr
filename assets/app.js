/* Anti-Nativity — player, synced lyrics, themes, lore renderers. Vanilla, no build step.
   Data: window.AN_SONGS (tracks + voice-tagged lyrics) + window.AN_LORE (lore). */
(function () {
  "use strict";

  var SONGS = window.AN_SONGS || [];
  var LORE  = window.AN_LORE  || {};
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
  function fmt(t) {
    if (!isFinite(t) || t < 0) t = 0;
    var m = Math.floor(t / 60), s = Math.floor(t % 60);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }
  function flatten(song) {
    var out = [];
    song.sections.forEach(function (sec) {
      sec.lines.forEach(function (l) { out.push(l); });
    });
    return out;
  }

  /* --- voice labels + tag helper ---------------------------------------- */
  var VOICE_LABEL = {
    talciron:  "talciron.d",   ophelia: "ophelia.wrl", choir: "choir",     soprano: "soprano",
    masses:    "the masses",   scribe:  "the scribe",  beast: "mirror-beast",
    homunculus:"homunculus",   both:    "duet",         stage: ""
  };
  function voiceTag(v) {
    var lbl = VOICE_LABEL[v] || "";
    return lbl ? '<span class="voice-tag">' + esc(lbl) + "</span>" : "";
  }

  /* --- theme switch ----------------------------------------------------- */
  function initThemes() {
    var saved = localStorage.getItem("an-theme");
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    var current = document.documentElement.getAttribute("data-theme");
    document.querySelectorAll(".themeswitch button").forEach(function (b) {
      var name = b.getAttribute("data-theme-name");
      b.setAttribute("aria-pressed", String(name === current));
      b.addEventListener("click", function () {
        document.documentElement.setAttribute("data-theme", name);
        localStorage.setItem("an-theme", name);
        document.querySelectorAll(".themeswitch button").forEach(function (x) {
          x.setAttribute("aria-pressed", String(x === b));
        });
      });
    });
  }

  /* --- LRC parsing ------------------------------------------------------ */
  function parseLrc(text) {
    var times = [];
    text.split(/\r?\n/).forEach(function (line) {
      var re = /\[(\d+):(\d+(?:\.\d+)?)\]/g, m;
      while ((m = re.exec(line))) times.push(parseInt(m[1], 10) * 60 + parseFloat(m[2]));
    });
    return times.sort(function (a, b) { return a - b; });
  }
  function loadLrc(song) {
    if (window.AN_LRC && window.AN_LRC[song.id]) {
      return Promise.resolve(parseLrc(window.AN_LRC[song.id]));
    }
    if (!song.lrc) return Promise.resolve(null);
    return fetch(song.lrc)
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (t) { return t ? parseLrc(t) : null; })
      .catch(function () { return null; });
  }

  /* --- the stage -------------------------------------------------------- */
  var PLAY  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>';
  var PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" fill="currentColor"/><rect x="14" y="5" width="4" height="14" fill="currentColor"/></svg>';
  var VOL_ON  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 8.8a4 4 0 0 1 0 6.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M19 6.5a7 7 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var VOL_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  var NEXT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" fill="currentColor"/></svg>';
  var LOOP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" fill="currentColor"/></svg>';

  function buildStage() {
    var el = document.getElementById("stage");

    var ACTS = [ ["I","Act I \xb7 Creation"], ["II","Act II \xb7 The Failed Nativity"],
                 ["III","Act III \xb7 The Aftermath"], ["bonus","Coda"] ];
    var tracks = ACTS.map(function (a) {
      var rows = SONGS.map(function (s, i) { return s.act === a[0] ?
        '<button class="track" type="button" data-i="' + i + '" aria-current="' + (i === 0) + '">' +
          '<span class="track__num">' + esc(s.num) + '</span>' +
          '<span><span class="track__rom">' + esc(s.title) + '</span></span>' +
          '<span class="track__dur" data-dur="' + i + '">' + fmt(s.duration) + '</span></button>' : "";
      }).join("");
      return rows ? '<p class="track-group">' + esc(a[1]) + '</p>' + rows : "";
    }).join("");

    el.innerHTML =
      '<header class="section-head reveal"><p class="section-kicker">the stage</p>' +
      '<h2>Listen</h2><p class="section-lede">Choose a rite. With sound on, lyrics light line by line — each voice colour-coded.</p></header>' +
      '<div class="tracklist reveal">' + tracks + '</div>' +
      '<div class="reveal"><div class="np">' +
        '<div class="np__title" data-np="title"></div>' +
        '<div class="np__sub"   data-np="sub"></div>' +
        '<div class="np__concept" data-np="concept"></div></div>' +
      '<div class="lyrics" data-view="all"><div class="lyrics__scroller"></div></div>' +
      '<p class="lyrics-hint"></p>' +
      '<div class="controls">' +
        '<button class="btn-play" type="button" aria-label="Play">' + PLAY + '</button>' +
        '<button class="btn-next" type="button" aria-label="Next track">' + NEXT + '</button>' +
        '<span class="time time--cur">0:00</span>' +
        '<input class="scrub" type="range" min="0" max="1000" value="0" step="1" aria-label="Seek" />' +
        '<span class="time time--dur">0:00</span>' +
        '<button class="btn-loop" type="button" aria-label="Loop album" aria-pressed="false">' + LOOP + '</button>' +
        '<div class="vol">' +
          '<button class="vol__btn" type="button" aria-label="Mute"></button>' +
          '<input class="vol__slider" type="range" min="0" max="100" value="100" step="1" aria-label="Volume" />' +
        '</div>' +
      '</div></div>';

    var audio = new Audio();
    audio.preload = "metadata";
    var canFlac = !!(audio.canPlayType("audio/flac") || audio.canPlayType("audio/x-flac"));
    var pickAudio = function (s) { return canFlac && s.audioFlac ? s.audioFlac : s.audio; };
    var scroller  = el.querySelector(".lyrics__scroller");
    var lyricsBox = el.querySelector(".lyrics");
    var playBtn   = el.querySelector(".btn-play");
    var scrub     = el.querySelector(".scrub");
    var curT      = el.querySelector(".time--cur");
    var durT      = el.querySelector(".time--dur");
    var hint      = el.querySelector(".lyrics-hint");

    var state = { i: -1, lines: [], times: null, active: -1 };
    var allowPlay = false;   // play-gate: only let audio play when we actually intend to

    function renderLyrics(song) {
      state.lines = flatten(song);
      scroller.innerHTML = state.lines.map(function (l, idx) {
        return '<div class="lyric v-' + (l.voice || "stage") + '" data-idx="' + idx + '">' +
          '<div class="lyric__rom">' + voiceTag(l.voice) + esc(l.t) + "</div></div>";
      }).join("");
      scroller.querySelectorAll(".lyric").forEach(function (node) {
        node.addEventListener("click", function () {
          var idx = +node.getAttribute("data-idx");
          if (state.times && state.times[idx] != null) { audio.currentTime = state.times[idx]; audio.play(); }
        });
      });
    }

    function setActive(idx) {
      if (idx === state.active) return;
      state.active = idx;
      var nodes = scroller.children;
      for (var k = 0; k < nodes.length; k++) {
        nodes[k].classList.toggle("is-active", k === idx);
        nodes[k].classList.toggle("is-past", k < idx);
      }
      var node = nodes[idx];
      if (node) {
        var y = lyricsBox.clientHeight / 2 - (node.offsetTop + node.offsetHeight / 2);
        scroller.style.transform = "translateY(" + y + "px)";
      }
    }

    function selectTrack(i) {
      if (i === state.i) return;
      state.i = i; state.active = -1; state.times = null;
      var song = SONGS[i];
      Array.prototype.forEach.call(el.querySelectorAll(".track"), function (t) {
        t.setAttribute("aria-current", String(+t.getAttribute("data-i") === i));
      });
      el.querySelector('[data-np="title"]').textContent   = song.title;
      el.querySelector('[data-np="sub"]').textContent     = song.subtitle || "";
      el.querySelector('[data-np="concept"]').textContent = song.concept  || "";
      allowPlay = false;
      audio.pause();
      audio.src = pickAudio(song);
      // src changes don't reliably fire "pause" (Safari) and can auto-resume (Chromium);
      // force the paused UI now — the play-gate below cancels any auto-resume.
      playBtn.innerHTML = PLAY; playBtn.setAttribute("aria-label", "Play"); setPlaybackState("paused");
      updateMediaSession(song);
      renderLyrics(song);
      scroller.style.transform = "translateY(0)";
      lyricsBox.classList.remove("is-synced"); lyricsBox.classList.add("is-static");
      hint.textContent = "";
      loadLrc(song).then(function (times) {
        if (times && times.length) {
          state.times = times;
          lyricsBox.classList.add("is-synced"); lyricsBox.classList.remove("is-static");
        } else {
          hint.textContent = "Lyrics sync follows once a timed .lrc is added.";
        }
      });
    }

    playBtn.addEventListener("click", function () { if (audio.paused) startPlay(); else audio.pause(); });
    audio.addEventListener("play",  function () { if (!allowPlay) { audio.pause(); return; } playBtn.innerHTML = PAUSE; playBtn.setAttribute("aria-label", "Pause"); setPlaybackState("playing"); });
    audio.addEventListener("pause", function () { playBtn.innerHTML = PLAY;  playBtn.setAttribute("aria-label", "Play"); setPlaybackState("paused"); });
    audio.addEventListener("ended", function () { if (loopMode) next(); });
    audio.addEventListener("loadedmetadata", function () { durT.textContent = fmt(audio.duration); });
    audio.addEventListener("timeupdate", function () {
      var d = audio.duration || SONGS[state.i].duration || 0;
      curT.textContent = fmt(audio.currentTime);
      var pct = d ? (audio.currentTime / d) * 100 : 0;
      scrub.value = pct * 10;
      scrub.style.background = "linear-gradient(to right, var(--accent) " + pct + "%, var(--hair) " + pct + "%)";
      if (state.times) {
        var a = -1;
        for (var k = 0; k < state.times.length; k++) { if (state.times[k] <= audio.currentTime) a = k; else break; }
        if (a >= 0) setActive(a);
      }
    });
    scrub.addEventListener("input", function () {
      var d = audio.duration || 0;
      if (d) audio.currentTime = (scrub.value / 1000) * d;
    });

    var volSlider = el.querySelector(".vol__slider");
    var volBtn    = el.querySelector(".vol__btn");
    var lastVol   = 1;
    function applyVol(v, save) {
      v = Math.min(1, Math.max(0, v));
      audio.volume = v;
      if (v > 0) lastVol = v;
      volSlider.value = Math.round(v * 100);
      volSlider.style.background = "linear-gradient(to right, var(--accent) " + v * 100 + "%, var(--hair) " + v * 100 + "%)";
      volBtn.innerHTML = v <= 0 ? VOL_OFF : VOL_ON;
      volBtn.setAttribute("aria-label", v <= 0 ? "Unmute" : "Mute");
      if (save) localStorage.setItem("an-volume", String(v));
    }
    var savedVol = parseFloat(localStorage.getItem("an-volume"));
    applyVol(isNaN(savedVol) ? 1 : savedVol, false);
    volSlider.addEventListener("input", function () { applyVol(volSlider.value / 100, true); });
    volBtn.addEventListener("click", function () { applyVol(audio.volume > 0 ? 0 : lastVol || 1, true); });

    el.querySelectorAll(".track").forEach(function (t) {
      t.addEventListener("click", function () { selectTrack(+t.getAttribute("data-i")); });
      var i = +t.getAttribute("data-i");
      var a = new Audio(); a.preload = "metadata"; a.src = pickAudio(SONGS[i]);
      a.addEventListener("loadedmetadata", function () {
        el.querySelector('[data-dur="' + i + '"]').textContent = fmt(a.duration);
      });
    });

    /* --- transport: next / loop / lock-screen (Media Session) --------- */
    var nextBtn = el.querySelector(".btn-next");
    var loopBtn = el.querySelector(".btn-loop");
    var loopMode = localStorage.getItem("an-loop") !== "0";   // album-loop, default on
    loopBtn.setAttribute("aria-pressed", String(loopMode));

    function startPlay() { allowPlay = true; audio.play(); }
    function playIndex(i) { selectTrack(i); startPlay(); }
    function next() { playIndex((state.i + 1) % SONGS.length); }
    function prev() { playIndex((state.i - 1 + SONGS.length) % SONGS.length); }

    nextBtn.addEventListener("click", next);
    loopBtn.addEventListener("click", function () {
      loopMode = !loopMode;
      localStorage.setItem("an-loop", loopMode ? "1" : "0");
      loopBtn.setAttribute("aria-pressed", String(loopMode));
    });

    function setPlaybackState(s) {
      if ("mediaSession" in navigator) { try { navigator.mediaSession.playbackState = s; } catch (e) {} }
    }
    function updateMediaSession(song) {
      if (!("mediaSession" in navigator) || typeof window.MediaMetadata !== "function") return;
      try {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: song.title, artist: "The Seventh Shadow", album: "Anti-Nativity",
          artwork: [{ src: new URL("assets/img/cover.jpg", location.href).href, sizes: "1024x1024", type: "image/jpeg" }]
        });
      } catch (e) {}
    }
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play", function () { startPlay(); });
        navigator.mediaSession.setActionHandler("pause", function () { audio.pause(); });
        navigator.mediaSession.setActionHandler("nexttrack", next);
        navigator.mediaSession.setActionHandler("previoustrack", prev);
      } catch (e) {}
    }

    selectTrack(0);
    window.anPlay = function (i) { selectTrack(i); document.getElementById("stage").scrollIntoView(); startPlay(); };
  }

  /* --- act liner notes -------------------------------------------------- */
  function buildActs() {
    var el = document.getElementById("acts");
    var LISTEN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5l12 7-12 7z" fill="currentColor"/></svg>';
    var ACTS = [ ["I","Act I","Creation"], ["II","Act II","The Failed Nativity"],
                 ["III","Act III","The Aftermath"], ["bonus","Coda",""] ];
    ACTS.forEach(function (a) {
      var inAct = SONGS.filter(function (s) { return s.act === a[0]; });
      if (!inAct.length) return;
      var head = document.createElement("div"); head.className = "act__head reveal";
      head.innerHTML = '<span class="act__num">' + esc(a[1]) + '</span>' +
        '<span class="act__name">' + esc(a[2]) + '</span>';
      el.appendChild(head);
      inAct.forEach(function (song) {
        var i = SONGS.indexOf(song);
        var sections = song.sections.map(function (sec) {
          var lines = sec.lines.map(function (l) {
            return '<div class="a-line v-' + (l.voice || "stage") + '">' +
              '<div class="a-line__rom">' + voiceTag(l.voice) + esc(l.t) + '</div></div>';
          }).join("");
          return '<div class="sect sect--' + sec.kind + '">' +
            (sec.label ? '<p class="sect__label">' + esc(sec.label) + '</p>' : "") + lines + '</div>';
        }).join("") || '<p class="lyrics-hint">Lyrics to come.</p>';
        var node = document.createElement("article"); node.className = "song reveal";
        node.innerHTML =
          '<div class="song__head"><h3 class="song__rom">' + esc(song.num) + ' \xb7 ' + esc(song.title) + '</h3>' +
          '<span class="song__en">' + esc(song.subtitle || "") + '</span>' +
          '<button class="song__listen" type="button" data-play="' + i + '">' + LISTEN + 'listen</button></div>' +
          '<p class="song__concept">' + esc(song.concept) + '</p>' + sections;
        el.appendChild(node);
      });
    });
    el.querySelectorAll("[data-play]").forEach(function (b) {
      b.addEventListener("click", function () { window.anPlay(+b.getAttribute("data-play")); });
    });
  }

  /* --- dramatis personae ------------------------------------------------ */
  function buildPersonae() {
    var el = document.getElementById("personae"); if (!el || !LORE.characters) return;
    el.innerHTML =
      '<div class="personae">' + LORE.characters.primary.map(function (c) {
        return '<article class="persona reveal">' +
          '<img class="persona__img" src="' + esc(c.portrait) + '" alt="' + esc(c.id) + '" loading="lazy" />' +
          '<div class="persona__body">' +
            '<div class="persona__id">' + esc(c.id) + '</div>' +
            '<div class="persona__role">' + esc(c.role) + '</div>' +
            '<div class="persona__meta"><span>origin: ' + esc(c.origin) + '</span>' +
              '<span>status: ' + esc(c.status) + '</span></div>' +
            '<p class="persona__key">' + esc(c.keyLine) + '</p>' +
            '<p class="persona__text">' + esc(c.body) + '</p></div></article>';
      }).join("") + '</div>' +
      '<div class="personae personae--minor">' + LORE.characters.secondary.map(function (c) {
        return '<article class="persona reveal"><div class="persona__body">' +
          '<div class="persona__id">' + esc(c.id) + '</div>' +
          '<div class="persona__role">' + esc(c.role) + '</div>' +
          '<p class="persona__text">' + esc(c.body) + '</p></div></article>';
      }).join("") + '</div>';
  }

  /* --- world: glossary + the event ------------------------------------- */
  function buildWorld() {
    var el = document.getElementById("world-body"); if (!el || !LORE.glossary) return;
    var ev = LORE.event;
    el.innerHTML =
      '<div class="glossary">' + LORE.glossary.map(function (g) {
        return '<div><div class="gloss__term">' + esc(g.term) + '</div>' +
          '<div class="gloss__def">' + esc(g.gloss) + '</div></div>';
      }).join("") + '</div>' +
      (ev ? '<div class="event reveal"><div class="event__meta">' +
        '<span>' + esc(ev.name) + '</span><span>' + esc(ev.date) + ' — ' + esc(ev.time) + '</span>' +
        '<span class="event__code">' + esc(ev.code) + '</span></div>' +
        '<p>' + esc(ev.body) + '</p></div>' : "");
  }

  /* --- scroll reveal ---------------------------------------------------- */
  function initReveal() {
    var items = document.querySelectorAll(".reveal");
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach(function (n) { n.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    items.forEach(function (n) { io.observe(n); });
  }

  /* --- hero motes ------------------------------------------------------- */
  function initMotes() {
    var c = document.querySelector(".hero__motes");
    if (!c) return;
    var ctx = c.getContext("2d"), motes = [], W, H;
    function size() {
      var r = c.parentElement.getBoundingClientRect();
      W = c.width = r.width; H = c.height = r.height;
    }
    function ink() {
      return getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#3f6fb0";
    }
    function make() {
      motes = [];
      var n = Math.min(46, Math.round(W / 26));
      for (var i = 0; i < n; i++) motes.push({
        x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + 0.3,
        a: Math.random() * 0.5 + 0.1, vy: -(Math.random() * 0.18 + 0.03), tw: Math.random() * Math.PI * 2
      });
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var col = ink();
      motes.forEach(function (m) {
        m.y += m.vy; m.tw += 0.02;
        if (m.y < -4) { m.y = H + 4; m.x = Math.random() * W; }
        ctx.globalAlpha = m.a * (0.6 + 0.4 * Math.sin(m.tw));
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    }
    size(); make();
    window.addEventListener("resize", function () { size(); make(); });
    if (reduce) {
      var col = ink(); ctx.fillStyle = col;
      motes.forEach(function (m) { ctx.globalAlpha = m.a; ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
    } else { draw(); }
  }

  /* --- boot ------------------------------------------------------------- */
  function boot() {
    initThemes();
    if (SONGS.length) { buildStage(); buildActs(); }
    buildPersonae();
    buildWorld();
    initReveal();
    initMotes();
    var th = document.querySelector('[data-lore="thesis"]'); if (th) th.textContent = LORE.thesis || "";
    var tl = document.querySelector('[data-lore="themes"]');
    if (tl && LORE.themes) tl.innerHTML = LORE.themes.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
