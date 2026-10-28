/* =========================================================
   Juegos, progreso y simulacro
   ========================================================= */
(function () {
  "use strict";

  const STORE_KEY = "nietzsche-progress-v1";
  const SIM_KEY = "nietzsche-sim-v1";
  const GAME_IDS = ["apolo", "moral", "demonio", "timeline", "obras", "vf", "fichas"];

  /* ---------- utilidades ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
  }
  function writeJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* modo privado */ }
  }

  /* ---------- progreso ---------- */
  let progress = readJSON(STORE_KEY);

  function renderProgress(bump) {
    const done = GAME_IDS.filter((id) => progress[id]).length;
    const doneEl = $("#gamesDone");
    const totalEl = $("#gamesTotal");
    if (doneEl) doneEl.textContent = done;
    if (totalEl) totalEl.textContent = GAME_IDS.length;
    if (bump) {
      const chip = $(".score-chip");
      chip.classList.remove("bump");
      void chip.offsetWidth;
      chip.classList.add("bump");
    }
    document.querySelectorAll(".tab").forEach((tab) => {
      const id = tab.dataset.tab;
      let tick = tab.querySelector(".tick");
      if (progress[id] && !tick) {
        tick = document.createElement("span");
        tick.className = "tick";
        tick.textContent = "✓";
        tab.appendChild(tick);
      } else if (!progress[id] && tick) {
        tick.remove();
      }
    });
    return done;
  }

  function markDone(id) {
    if (progress[id]) return;
    progress[id] = true;
    writeJSON(STORE_KEY, progress);
    const done = renderProgress(true);
    if (done === GAME_IDS.length) {
      toast("¡Completaste los 7 juegos! Ya sos un superhombre del parcial.");
      confetti(120);
    } else {
      toast(`Juego completado · ${done}/${GAME_IDS.length}`);
      confetti(50);
    }
  }

  function resetProgress() {
    progress = {};
    writeJSON(STORE_KEY, progress);
    renderProgress(true);
    toast("Progreso reiniciado");
  }

  /* ---------- toast y confetti ---------- */
  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-on"), 2800);
  }

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function confetti(n) {
    if (reduced || !Element.prototype.animate) return;
    const colors = ["#d9b45a", "#f0d48f", "#9b1d33", "#d4405a", "#8fb8d8", "#f3ece1"];
    const w = window.innerWidth;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "confetti";
      p.style.background = colors[i % colors.length];
      document.body.appendChild(p);
      const x0 = w / 2 + (Math.random() - 0.5) * 120;
      const x1 = x0 + (Math.random() - 0.5) * w * 0.9;
      const yPeak = window.innerHeight * (0.15 + Math.random() * 0.3);
      const anim = p.animate(
        [
          { transform: `translate(${x0}px, ${window.innerHeight}px) rotate(0deg)`, opacity: 1 },
          { transform: `translate(${(x0 + x1) / 2}px, ${yPeak}px) rotate(${Math.random() * 360}deg)`, opacity: 1, offset: 0.45 },
          { transform: `translate(${x1}px, ${window.innerHeight + 40}px) rotate(${Math.random() * 900}deg)`, opacity: 0.8 },
        ],
        { duration: 1600 + Math.random() * 1200, easing: "cubic-bezier(.2,.7,.4,1)", delay: Math.random() * 200 }
      );
      anim.onfinish = () => p.remove();
    }
  }

  function endScreen(el, { score, total, review = [], onRetry, id }) {
    const pct = total ? score / total : 0;
    const msg =
      pct === 1 ? "Perfecto. Amor fati."
      : pct >= 0.8 ? "Muy bien, casi superhombre."
      : pct >= 0.5 ? "Vas bien, repasá los errores."
      : "Volvé a la sección y probá de nuevo.";
    el.innerHTML = `
      <div class="end">
        <p class="kicker">Resultado</p>
        <p class="end-score">${score}/${total}</p>
        <p class="end-msg">${msg}</p>
        ${review.length ? `<p class="end-sub">Para repasar:</p><div class="review">${review.map((r) => `<div>${r}</div>`).join("")}</div>` : `<p class="end-sub">Sin errores. Nietzsche estaría orgulloso (aunque no lo admitiría).</p>`}
        <div class="end-actions"><button class="btn btn-gold" data-retry>Jugar de nuevo</button></div>
      </div>`;
    el.querySelector("[data-retry]").addEventListener("click", onRetry);
    markDone(id);
  }

  /* =========================================================
     1 · Clasificar (Apolo/Dioniso y Señor/Esclavo)
     ========================================================= */
  const BINARY = {
    apolo: {
      kicker: "Juego · Clasificá",
      title: "¿Apolo o Dioniso?",
      desc: "Deslizá la carta o tocá un botón. También funcionan las flechas ← →.",
      left: "Apolo",
      right: "Dioniso",
      cls: "",
      items: [
        { t: "La forma", a: "L", why: "Lo apolíneo comprende la forma y la medida." },
        { t: "La medida", a: "L", why: "Lo apolíneo pone límite y proporción." },
        { t: "La embriaguez del vino", a: "R", why: "Dioniso es el dios del vino y las fiestas." },
        { t: "La música y la danza coral", a: "R", why: "Lo dionisíaco se plasma en la música y la danza del coro." },
        { t: "El “velo de Maya”", a: "L", why: "Lo apolíneo es el revestimiento bello que, como un velo, da presencia estética a lo cruel." },
        { t: "La emoción desenfrenada", a: "R", why: "Lo dionisíaco es lo impulsivo, pasional y desmedido." },
        { t: "El diálogo de la tragedia", a: "L", why: "Lo apolíneo se ve en la confrontación y el diálogo." },
        { t: "Lo sórdido y tenebroso de la vida", a: "R", why: "Lo dionisíaco es el libre brotar de lo vital con toda su entraña oscura." },
        { t: "Dios de la poesía y las artes", a: "L", why: "Así se lo define a Apolo." },
        { t: "El impulso vital", a: "R", why: "Dioniso es el impulso, la vida sin freno." },
        { t: "El ornato bello", a: "L", why: "Apolo da ornato y presencia estética." },
      ],
    },
    moral: {
      kicker: "Juego · Clasificá",
      title: "¿Moral de esclavos o de señores?",
      desc: "Ubicá cada valor o rasgo en su moral. Deslizá o tocá.",
      left: "Esclavos",
      right: "Señores",
      cls: "bin-moral",
      items: [
        { t: "Resentimiento", a: "L", why: "Es la fuente de la moral de esclavos: bronca frente a la plenitud de los fuertes." },
        { t: "Humildad", a: "L", why: "Es uno de los valores que expresan debilidad." },
        { t: "Resignación", a: "L", why: "Retiene la vida “en sus grados menos viriles”." },
        { t: "Nobleza", a: "R", why: "La moral de señores recoge todo lo que expresa nobleza." },
        { t: "Altivez", a: "R", why: "Junto con la arrogancia, conviene al ánimo señorial." },
        { t: "Moral gregaria", a: "L", why: "La moral de esclavos defiende el grupo: en la manada, el débil se protege del fuerte." },
        { t: "Promesa de un más allá", a: "L", why: "Es la ficción de un más allá prometido a los sumisos." },
        { t: "Individualidad excelsa", a: "R", why: "La moral de señores exalta la personalidad prominente." },
        { t: "Ascetismo y renuncia", a: "L", why: "Es la moral que somete lo vital." },
        { t: "Vida ascendente", a: "R", why: "Sus valores expresan vida ascendente, no decadente." },
        { t: "Misericordia", a: "L", why: "Junto con la caridad, es un valor que el débil eleva a virtud." },
        { t: "Gesto heroico y magnífico", a: "R", why: "Es lo que conviene al vivir hierático y enérgico del señor." },
        { t: "Caridad", a: "L", why: "Otro valor de la debilidad según Nietzsche." },
        { t: "Creación de valores", a: "R", why: "El hombre superior crea valores." },
      ],
    },
  };

  function binaryGame(el, id) {
    const cfg = BINARY[id];
    let deck, idx, score, review, locked;

    function start() {
      deck = shuffle(cfg.items).slice(0, 10);
      idx = 0; score = 0; review = []; locked = false;
      el.classList.add(...(cfg.cls ? [cfg.cls] : []));
      el.innerHTML = `
        <div class="game-head">
          <div>
            <p class="kicker">${cfg.kicker}${progress[id] ? ' · <span class="done-badge">✓ hecho</span>' : ""}</p>
            <h3 class="game-title">${cfg.title}</h3>
            <p class="game-desc">${cfg.desc}</p>
          </div>
          <span class="game-stat"><b data-score>0</b> aciertos · <span data-idx>1</span>/${deck.length}</span>
        </div>
        <div class="game-bar"><span data-bar style="transform:scaleX(0)"></span></div>
        <div class="bin-stage" data-stage></div>
        <div class="bin-actions">
          <button class="btn bin-left" data-side="L">← ${cfg.left}</button>
          <button class="btn bin-right" data-side="R">${cfg.right} →</button>
        </div>
        <div class="feedback" data-fb>Empezá cuando quieras.</div>`;
      el.querySelectorAll("[data-side]").forEach((b) => b.addEventListener("click", () => answer(b.dataset.side)));
      renderCards();
    }

    function renderCards() {
      const stage = el.querySelector("[data-stage]");
      stage.innerHTML = "";
      const next = deck[idx + 1];
      if (next) {
        const u = document.createElement("div");
        u.className = "bin-card is-under";
        u.textContent = next.t;
        stage.appendChild(u);
      }
      const c = document.createElement("div");
      c.className = "bin-card";
      c.textContent = deck[idx].t;
      stage.appendChild(c);
      if (Element.prototype.animate && !reduced) {
        c.animate([{ transform: "translateY(14px) scale(.94)", opacity: 0.5 }, { transform: "none", opacity: 1 }], { duration: 300, easing: "cubic-bezier(.2,.8,.2,1)" });
      }
      dragify(c);
    }

    function dragify(card) {
      let x0 = null, dx = 0, pid = null;
      card.addEventListener("pointerdown", (e) => {
        if (locked) return;
        x0 = e.clientX; dx = 0; pid = e.pointerId;
        card.setPointerCapture(pid);
        card.style.transition = "none";
      });
      card.addEventListener("pointermove", (e) => {
        if (x0 === null) return;
        dx = e.clientX - x0;
        card.style.transform = `translateX(${dx}px) rotate(${dx / 14}deg)`;
        card.style.background = dx < -30 ? "#dbe7f2" : dx > 30 ? (id === "apolo" ? "#f6d9df" : "#f4e4bd") : "";
      });
      const release = () => {
        if (x0 === null) return;
        x0 = null;
        if (Math.abs(dx) > 80) {
          answer(dx < 0 ? "L" : "R", dx);
        } else {
          card.style.transition = "transform .35s cubic-bezier(.2,.8,.2,1)";
          card.style.transform = "";
          card.style.background = "";
        }
      };
      card.addEventListener("pointerup", release);
      card.addEventListener("pointercancel", release);
    }

    function answer(side, fromDx) {
      if (locked || idx >= deck.length) return;
      locked = true;
      const item = deck[idx];
      const ok = item.a === side;
      const fb = el.querySelector("[data-fb]");
      const correctName = item.a === "L" ? cfg.left : cfg.right;
      if (ok) {
        score++;
        fb.className = "feedback ok";
        fb.innerHTML = `<b>✓ ${correctName}.</b> ${item.why}`;
      } else {
        fb.className = "feedback bad";
        fb.innerHTML = `<b>✗ Era ${correctName}.</b> ${item.why}`;
        review.push(`<b>${esc(item.t)}</b> → ${correctName}. ${item.why}`);
      }
      el.querySelector("[data-score]").textContent = score;
      const card = el.querySelector(".bin-card:not(.is-under)");
      const dir = side === "L" ? -1 : 1;
      const startX = fromDx || 0;
      const finish = () => {
        idx++;
        el.querySelector("[data-bar]").style.transform = `scaleX(${idx / deck.length})`;
        if (idx >= deck.length) {
          setTimeout(() => endScreen(el, { score, total: deck.length, review, onRetry: start, id }), ok ? 500 : 1400);
          return;
        }
        el.querySelector("[data-idx]").textContent = idx + 1;
        renderCards();
        locked = false;
      };
      if (card && Element.prototype.animate && !reduced) {
        card.animate(
          [
            { transform: `translateX(${startX}px) rotate(${startX / 14}deg)`, opacity: 1 },
            { transform: `translateX(${dir * 600}px) rotate(${dir * 30}deg)`, opacity: 0 },
          ],
          { duration: 380, easing: "cubic-bezier(.5,0,.75,0)", fill: "forwards" }
        ).onfinish = () => setTimeout(finish, ok ? 0 : 700);
      } else {
        setTimeout(finish, ok ? 200 : 900);
      }
    }

    el.tabIndex = 0;
    el.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") { e.preventDefault(); answer("L"); }
      if (e.key === "ArrowRight") { e.preventDefault(); answer("R"); }
    });
    start();
  }

  /* =========================================================
     2 · Ordená la vida
     ========================================================= */
  const EVENTS = [
    { y: "1844", t: "Nace en Röcken, Sajonia prusiana" },
    { y: "1849", t: "Muere su padre, pastor luterano" },
    { y: "1864", t: "Entra a la Universidad de Bonn" },
    { y: "1865", t: "Pasa a Leipzig y descubre a Schopenhauer" },
    { y: "1870", t: "Enfermero voluntario en la guerra franco-prusiana" },
    { y: "1872", t: "Publica El origen de la tragedia" },
    { y: "1879", t: "Deja la cátedra de Basilea por su salud" },
    { y: "1881", t: "“Revelación” del eterno retorno" },
    { y: "1883", t: "Empieza Así habló Zaratustra" },
    { y: "1889", t: "Colapso mental en Turín" },
    { y: "1900", t: "Muere en Weimar" },
  ];

  function timelineGame(el) {
    let placed, mistakes, pool;
    function start() {
      placed = 0; mistakes = 0;
      pool = shuffle(EVENTS.map((e, i) => ({ ...e, i })));
      el.innerHTML = `
        <div class="game-head">
          <div>
            <p class="kicker">Juego · Vida${progress.timeline ? ' · <span class="done-badge">✓ hecho</span>' : ""}</p>
            <h3 class="game-title">Ordená la vida de Nietzsche</h3>
            <p class="game-desc">Tocá los hechos en orden cronológico, del primero al último.</p>
          </div>
          <span class="game-stat"><b data-placed>0</b>/${EVENTS.length} · <span data-miss>0</span> errores</span>
        </div>
        <div class="game-bar"><span data-bar style="transform:scaleX(0)"></span></div>
        <ol class="tl-line" data-line><li class="tl-empty" style="background:none;border:0;animation:none">Acá se va armando la línea…</li></ol>
        <div class="tl-pool" data-pool></div>
        <div class="feedback" data-fb>¿Con qué empieza todo?</div>`;
      const poolEl = el.querySelector("[data-pool]");
      pool.forEach((ev) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "tl-chip";
        b.textContent = ev.t;
        b.addEventListener("click", () => pick(ev, b));
        poolEl.appendChild(b);
      });
    }
    function pick(ev, btn) {
      const fb = el.querySelector("[data-fb]");
      if (ev.i === placed) {
        const line = el.querySelector("[data-line]");
        if (placed === 0) line.innerHTML = "";
        const li = document.createElement("li");
        li.innerHTML = `<b>${ev.y}</b>${esc(ev.t)}`;
        line.appendChild(li);
        btn.remove();
        placed++;
        fb.className = "feedback ok";
        fb.innerHTML = `<b>✓ ${ev.y}.</b> ${placed < EVENTS.length ? "¿Y después?" : "¡Línea completa!"}`;
        el.querySelector("[data-placed]").textContent = placed;
        el.querySelector("[data-bar]").style.transform = `scaleX(${placed / EVENTS.length})`;
        if (placed === EVENTS.length) {
          const score = Math.max(0, EVENTS.length - mistakes);
          setTimeout(() => endScreen(el, { score, total: EVENTS.length, review: mistakes ? [`Tuviste ${mistakes} error(es). Repasá la sección <b>Vida</b> mirando los años.`] : [], onRetry: start, id: "timeline" }), 900);
        }
      } else {
        mistakes++;
        el.querySelector("[data-miss]").textContent = mistakes;
        btn.classList.remove("shake");
        void btn.offsetWidth;
        btn.classList.add("shake");
        fb.className = "feedback bad";
        fb.innerHTML = `<b>✗ Todavía no.</b> Eso pasa más adelante. Pista: lo que sigue ocurre en <b>${EVENTS[placed].y}</b>.`;
      }
    }
    start();
  }

  /* =========================================================
     3 · ¿Qué obra es?
     ========================================================= */
  const OBRAS = [
    { d: "1872. Exalta la energía y el vitalismo de Wagner contra la cultura racionalista y burguesa. Acá aparecen Apolo y Dioniso.", a: "El origen de la tragedia" },
    { d: "Cuatro ensayos (1873–1876) que presentan a Schopenhauer y Wagner como líderes de una nueva vitalidad cultural.", a: "Consideraciones intempestivas" },
    { d: "1878–79. Abre su segundo período, más cercano al racionalismo ilustrado, positivista y científico.", a: "Humano, demasiado humano" },
    { d: "1883–1885. Su obra más representativa: el profeta anuncia el superhombre y el eterno retorno.", a: "Así habló Zaratustra" },
    { d: "1887. Rastrea el origen de la moral: señores, esclavos y resentimiento.", a: "La genealogía de la moral" },
    { d: "1888. Escrito autobiográfico. De acá sale “No soy un hombre, soy dinamita”.", a: "Ecce homo" },
    { d: "Póstuma: reúne anotaciones que Nietzsche había preparado años antes.", a: "La voluntad de poder" },
    { d: "1882. Cierra la etapa “ilustrada” y en ella aparece “Dios ha muerto”.", a: "La gaya ciencia" },
    { d: "1886. Ataca la moral tradicional desde su mismo título.", a: "Más allá del bien y del mal" },
  ];
  const ALL_TITLES = OBRAS.map((o) => o.a).concat(["Aurora", "El Anticristo", "El ocaso de los ídolos"]);

  function obrasGame(el) {
    let qs, idx, score, review;
    function start() {
      qs = shuffle(OBRAS).slice(0, 7);
      idx = 0; score = 0; review = [];
      render();
    }
    function render() {
      const q = qs[idx];
      const opts = shuffle([q.a, ...shuffle(ALL_TITLES.filter((t) => t !== q.a)).slice(0, 3)]);
      el.innerHTML = `
        <div class="game-head">
          <div>
            <p class="kicker">Juego · Obra${progress.obras ? ' · <span class="done-badge">✓ hecho</span>' : ""}</p>
            <h3 class="game-title">¿Qué obra es?</h3>
          </div>
          <span class="game-stat"><b>${score}</b> aciertos · ${idx + 1}/${qs.length}</span>
        </div>
        <div class="game-bar"><span style="transform:scaleX(${idx / qs.length})"></span></div>
        <p class="q-prompt">${q.d}</p>
        <div class="q-opts">${opts.map((o) => `<button class="q-opt" type="button">${o}</button>`).join("")}</div>
        <div class="q-next" data-next></div>`;
      el.querySelectorAll(".q-opt").forEach((b) =>
        b.addEventListener("click", () => {
          const ok = b.textContent === q.a;
          el.querySelectorAll(".q-opt").forEach((x) => {
            x.disabled = true;
            if (x.textContent === q.a) x.classList.add("ok");
          });
          if (ok) score++;
          else { b.classList.add("bad"); review.push(`${q.d} → <b>${q.a}</b>`); }
          const last = idx === qs.length - 1;
          el.querySelector("[data-next]").innerHTML = `<button class="btn btn-gold" type="button">${last ? "Ver resultado" : "Siguiente →"}</button>`;
          const nb = el.querySelector("[data-next] button");
          nb.focus({ preventScroll: true });
          nb.addEventListener("click", () => {
            idx++;
            if (idx >= qs.length) endScreen(el, { score, total: qs.length, review, onRetry: start, id: "obras" });
            else render();
          });
        })
      );
    }
    start();
  }

  /* =========================================================
     4 · Verdadero o falso contrarreloj
     ========================================================= */
  const VF = [
    { s: "Nietzsche construyó un sistema filosófico ordenado.", v: false, why: "Su obra no constituye un sistema: es un desborde literario." },
    { s: "Para Nietzsche, la vida es irracional, ciega y sin sentido.", v: true, why: "Lo toma de la oposición vida/razón de Schopenhauer." },
    { s: "Lo apolíneo es lo impulsivo y pasional.", v: false, why: "Eso es lo dionisíaco. Lo apolíneo es forma y medida." },
    { s: "Sócrates inaugura la cultura racionalista que, según Nietzsche, deprime la vida.", v: true, why: "Con Sócrates nace la “falsa cultura racionalista”." },
    { s: "La moral de esclavos nace del resentimiento.", v: true, why: "Es resentimiento frente a la plenitud de los poderosos." },
    { s: "La moral de señores es la pura fuerza física.", v: false, why: "La fuerza se halla en la cualidad, no en la cantidad ni en el dominio de hecho." },
    { s: "La voluntad de poder es lo mismo que la voluntad de vivir de Schopenhauer.", v: false, why: "Nietzsche la supera: no es querer lo que ya es, sino más vida, poder." },
    { s: "Amor fati significa resignarse al destino.", v: false, why: "No es resignación: es amar lo necesario." },
    { s: "Según el eterno retorno, el mundo se repite sin novedad.", v: true, why: "Es un destino necesario y repetitivo, sin transformación." },
    { s: "Nietzsche definió con precisión al superhombre.", v: false, why: "No logró definirlo, porque rechaza toda definición universal." },
    { s: "“Dionisos contra el Crucificado” resume su oposición al cristianismo.", v: true, why: "Es su lema: el cristianismo es odio a la vida." },
    { s: "Para Nietzsche, todo conocimiento es un instrumento de poder.", v: true, why: "Conocer es amoldar la realidad a las exigencias de la vida." },
    { s: "Nietzsche valora la moral gregaria porque protege al grupo.", v: false, why: "La critica: es la moral del débil, que se defiende en la manada." },
    { s: "La negación de Dios es condición para crear valores.", v: true, why: "“¡Qué podría yo crear si hubiera dioses!”" },
    { s: "Nietzsche admiraba más el luteranismo que el catolicismo.", v: false, why: "Al revés: conservaba admiración por el esplendor del catolicismo." },
    { s: "Para el apunte, el poder nietzscheano queda vacío porque es un poder sin “para qué”.", v: true, why: "El poder es medio, no fin: sin fin ulterior, queda vacío." },
  ];
  const VF_TIME = 75;

  function vfGame(el) {
    let qs, idx, score, review, timer, t0, running;
    function intro() {
      el.innerHTML = `
        <div class="game-head">
          <div>
            <p class="kicker">Juego · Contrarreloj${progress.vf ? ' · <span class="done-badge">✓ hecho</span>' : ""}</p>
            <h3 class="game-title">Verdadero o falso</h3>
            <p class="game-desc">${VF_TIME} segundos. Respondé todas las que puedas. Teclado: V / F.</p>
          </div>
        </div>
        <div class="vf-start"><button class="btn btn-gold" data-go>Arrancar el reloj</button></div>`;
      el.querySelector("[data-go]").addEventListener("click", start);
    }
    function start() {
      qs = shuffle(VF).slice(0, 12);
      idx = 0; score = 0; review = []; running = true;
      el.innerHTML = `
        <div class="game-head">
          <div>
            <p class="kicker">Juego · Contrarreloj</p>
            <h3 class="game-title">Verdadero o falso</h3>
          </div>
          <span class="game-stat"><b data-score>0</b> aciertos · <span data-left>${VF_TIME}</span>s</span>
        </div>
        <div class="vf-timer"><span data-timer></span></div>
        <p class="vf-statement" data-st></p>
        <div class="vf-actions">
          <button class="btn bin-left" data-v="1">Verdadero</button>
          <button class="btn bin-right" data-v="0">Falso</button>
        </div>
        <div class="feedback" data-fb>¡Vamos!</div>`;
      el.querySelectorAll("[data-v]").forEach((b) => b.addEventListener("click", () => answer(b.dataset.v === "1")));
      show();
      t0 = performance.now();
      const bar = el.querySelector("[data-timer]");
      const left = el.querySelector("[data-left]");
      cancelAnimationFrame(timer);
      const tick = (now) => {
        if (!running) return;
        const elapsed = (now - t0) / 1000;
        const rem = Math.max(0, VF_TIME - elapsed);
        bar.style.transform = `scaleX(${rem / VF_TIME})`;
        left.textContent = Math.ceil(rem);
        if (rem <= 0) return finish(true);
        timer = requestAnimationFrame(tick);
      };
      timer = requestAnimationFrame(tick);
    }
    function show() {
      const st = el.querySelector("[data-st]");
      st.textContent = qs[idx].s;
      if (Element.prototype.animate && !reduced) st.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 250 });
    }
    function answer(v) {
      if (!running) return;
      const q = qs[idx];
      const fb = el.querySelector("[data-fb]");
      if (q.v === v) {
        score++;
        fb.className = "feedback ok";
        fb.innerHTML = `<b>✓</b> ${q.why}`;
      } else {
        fb.className = "feedback bad";
        fb.innerHTML = `<b>✗ Era ${q.v ? "verdadero" : "falso"}.</b> ${q.why}`;
        review.push(`“${esc(q.s)}” → <b>${q.v ? "V" : "F"}</b>. ${q.why}`);
      }
      el.querySelector("[data-score]").textContent = score;
      idx++;
      if (idx >= qs.length) return finish(false);
      show();
    }
    function finish(timeout) {
      running = false;
      cancelAnimationFrame(timer);
      const unanswered = qs.slice(idx).map((q) => `“${esc(q.s)}” → <b>${q.v ? "V" : "F"}</b>. ${q.why}`);
      if (timeout) toast("¡Se acabó el tiempo!");
      endScreen(el, { score, total: qs.length, review: review.concat(unanswered), onRetry: start, id: "vf" });
    }
    el.tabIndex = 0;
    el.addEventListener("keydown", (e) => {
      if (!running) return;
      if (e.key.toLowerCase() === "v") answer(true);
      if (e.key.toLowerCase() === "f") answer(false);
    });
    intro();
  }

  /* =========================================================
     5 · Fichas
     ========================================================= */
  const FICHAS = [
    { f: "Vida contra razón", b: "La vida es irracional, ciega y sin sentido. Ciencia, moral y religión la enmascaran al darle un sentido objetivo." },
    { f: "Lo apolíneo", b: "Forma, medida, revestimiento bello (“velo de Maya”). Se plasma en el diálogo de la tragedia." },
    { f: "Lo dionisíaco", b: "Lo impulsivo y pasional, la emoción desmedida, el libre brotar de lo vital. Música y danza coral." },
    { f: "Tragedia griega", b: "Conciliación de lo apolíneo y lo dionisíaco: la vida afirmada estéticamente, transformada en arte." },
    { f: "Sócrates", b: "Inaugura la falsa cultura racionalista que encorseta, sujeta y deprime la vida." },
    { f: "Moral de esclavos", b: "Nace del resentimiento. Ascética, gregaria, eleva la debilidad a virtud y promete un más allá." },
    { f: "Moral de señores", b: "Moral aristocrática: exalta la individualidad, la nobleza y la vida ascendente. La fuerza está en la cualidad." },
    { f: "Transmutación de valores", b: "Destruir los valores que niegan la vida: la negación de la negación de la vida." },
    { f: "¿Libre para qué?", b: "No basta liberarse: el hombre superior debe crear valores, dictaminar el sentido del mundo y de sí mismo." },
    { f: "Dios ha muerto", b: "Negar a Dios es condición para crear. El cristianismo es odio a la vida: “Dionisos contra el Crucificado”." },
    { f: "Voluntad de poder", b: "No voluntad de vivir sino de más vida. Bueno es lo que aumenta el poder. El conocimiento es instrumento de poder." },
    { f: "Amor fati", b: "Amor a lo necesario. No es resignación: es querer la vida tal como es, con su dolor." },
    { f: "Eterno retorno", b: "El mundo se repite sin novedad. La libertad es la libre asunción de lo inevitable." },
    { f: "Superhombre", b: "Supera el nihilismo, encarna la voluntad de poder y crea valores. “César romano con el alma de Cristo”." },
    { f: "Nihilismo sin límite", b: "Quiso saciar la sed de infinito en lo finito. La vida como absoluto queda vacía: un poder sin para qué." },
  ];

  function fichasGame(el) {
    let deck, idx, seen;
    function start(shuffled) {
      deck = shuffled ? shuffle(FICHAS) : FICHAS.slice();
      idx = 0; seen = new Set();
      el.innerHTML = `
        <div class="game-head">
          <div>
            <p class="kicker">Repaso${progress.fichas ? ' · <span class="done-badge">✓ hecho</span>' : ""}</p>
            <h3 class="game-title">Fichas</h3>
            <p class="game-desc">Intentá decir la definición en voz alta y después tocá la ficha para comprobar. Recorrelas todas.</p>
          </div>
          <span class="game-stat"><b data-seen>0</b>/${deck.length} vistas</span>
        </div>
        <div class="fc-wrap"><button class="fc" type="button" data-fc><span class="fc-in"><span class="fc-face fc-front" data-front></span><span class="fc-face fc-back" data-back></span></span></button></div>
        <div class="fc-nav">
          <button class="btn btn-ghost" data-prev type="button">← Anterior</button>
          <span class="fc-count" data-count></span>
          <button class="btn btn-gold" data-nextc type="button">Siguiente →</button>
        </div>
        <div class="fc-nav" style="justify-content:center"><button class="btn btn-ghost" data-shuffle type="button">Mezclar</button></div>`;
      const fc = el.querySelector("[data-fc]");
      fc.addEventListener("click", () => {
        fc.classList.toggle("is-flipped");
        if (fc.classList.contains("is-flipped")) {
          seen.add(deck[idx].f);
          el.querySelector("[data-seen]").textContent = seen.size;
          if (seen.size === deck.length) markDone("fichas");
        }
      });
      el.querySelector("[data-prev]").addEventListener("click", () => go(-1));
      el.querySelector("[data-nextc]").addEventListener("click", () => go(1));
      el.querySelector("[data-shuffle]").addEventListener("click", () => start(true));
      render();
    }
    function go(d) {
      idx = (idx + d + deck.length) % deck.length;
      const fc = el.querySelector("[data-fc]");
      if (fc.classList.contains("is-flipped")) {
        fc.classList.remove("is-flipped");
        setTimeout(render, 250);
      } else render();
    }
    function render() {
      el.querySelector("[data-front]").innerHTML = `${deck[idx].f}<small>Tocá para ver</small>`;
      el.querySelector("[data-back]").textContent = deck[idx].b;
      el.querySelector("[data-count]").textContent = `${idx + 1} / ${deck.length}`;
    }
    start(false);
  }

  /* =========================================================
     6 · El demonio del eterno retorno
     ========================================================= */
  function demonGame() {
    const box = $("#demon");
    if (!box) return;
    const out = $("#demonOut");
    box.querySelectorAll("[data-demon]").forEach((b) =>
      b.addEventListener("click", () => {
        const yes = b.dataset.demon === "si";
        out.hidden = false;
        out.innerHTML = yes
          ? `<h4>Eso es amor fati.</h4>
             <p>Quien puede querer su vida <b>exactamente igual, infinitas veces</b>, ya no necesita un más allá ni una promesa de mejora. Afirma la vida tal como es, con su dolor.</p>
             <p>Es la libertad que deja la muerte de Dios: la <b>libre aceptación de lo inevitable</b>. El eterno retorno es la prueba que solo supera el hombre superior.</p>`
          : `<h4>Reacción humana… pero no nietzscheana.</h4>
             <p>Si la repetición te parece una condena, todavía estás buscando que la vida tenga sentido <b>fuera</b> de ella: un premio, un final feliz, un más allá. Eso es lo que Nietzsche llama negar la vida.</p>
             <p>El desafío es llegar a decir “sí” a todo, incluso al dolor: <b>amor fati</b>, no resignación.</p>`;
        if (Element.prototype.animate && !reduced) out.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 450, easing: "ease-out" });
        markDone("demonio");
      })
    );
  }

  /* =========================================================
     Simulacro de examen
     ========================================================= */
  const SIM = [
    {
      q: "¿Por qué se dice que Nietzsche representa la reacción de la vida contra la razón?",
      kw: [["sistema"], ["schopenhauer"], ["irracional"], ["ciego", "ciega", "sin sentido"], ["ciencia"], ["moral"], ["religion"], ["enmascar", "mascara"], ["vital", "vitalidad"]],
      labels: ["no es un sistema", "Schopenhauer", "irracional", "ciega / sin sentido", "ciencia", "moral", "religión", "enmascaran", "lo vital"],
      model: "Nietzsche encarna la reacción de lo vital contra la razón absoluta que pretendía dominar toda la realidad; por eso su obra no constituye un sistema. Toma de Schopenhauer la oposición entre vida y razón: la vida es irracional, ciega y sin sentido, y la razón no puede hacerse cargo de ella. La ciencia, la moral y la religión intentaron darle una verdad, un valor y un sentido objetivos, pero así solo la enmascararon y la privaron de su energía auténtica.",
    },
    {
      q: "Explique lo apolíneo y lo dionisíaco y su relación con la tragedia griega.",
      kw: [["forma"], ["medida"], ["impuls", "pasion"], ["musica", "danza"], ["dialogo"], ["concilia", "union", "conexion"], ["tragedia"], ["estetic", "arte"], ["socrates"], ["heroe"]],
      labels: ["forma", "medida", "impulso / pasión", "música y danza", "diálogo", "conciliación", "tragedia", "arte / estético", "Sócrates", "héroe trágico"],
      model: "En su momento estético, Nietzsche ve en la tragedia griega la forma adecuada de enfrentar la vida. Lo dionisíaco es lo impulsivo y pasional, la emoción desmedida de la vida, plasmado en la música y la danza coral; lo apolíneo es la forma y la medida, el revestimiento bello (velo de Maya), presente en el diálogo. Su conciliación afirma la vida estéticamente: lo terrible no se niega, se transforma en arte sublime. De ahí el ideal del héroe trágico. Ese ideal se pierde con Sócrates, que inaugura la cultura racionalista que deprime la vida.",
    },
    {
      q: "Diferencie la moral de esclavos de la moral de señores. ¿En qué consiste la transmutación de los valores?",
      kw: [["resentimiento"], ["gregari", "grupo", "rebano"], ["debil"], ["humildad", "resignacion", "caridad", "misericordia"], ["mas alla"], ["ascet", "renuncia"], ["individual"], ["noble", "nobleza", "altivez"], ["cualidad", "fuerza fisica", "no es fuerza"], ["transmutacion", "negacion de la negacion"]],
      labels: ["resentimiento", "gregaria", "debilidad", "humildad, resignación…", "más allá", "ascetismo / renuncia", "individualidad", "nobleza", "fuerza = cualidad", "transmutación"],
      model: "La moral de esclavos nace del resentimiento de los débiles frente a la plenitud de los poderosos: es ascética y de renuncia, eleva a valor lo que expresa debilidad (caridad, humildad, resignación, misericordia), promete un más allá y es gregaria, porque en el grupo el débil se defiende del fuerte. La moral de señores es aristocrática: exalta la individualidad, la nobleza y la altivez, y expresa vida ascendente. La transmutación de todos los valores es destruir la moral que niega la vida: la negación de la negación de la vida. No se trata de pura fuerza física: “la fuerza se halla en la cualidad”.",
    },
    {
      q: "¿Qué significa “Dios ha muerto” y qué relación tiene con la creación de valores?",
      kw: [["para que"], ["crea"], ["valores"], ["hombre superior", "superior"], ["cristian"], ["odio a la vida", "niega la vida", "negacion de la vida"], ["dionisos", "crucificado"], ["cuerpo", "este mundo", "unicidad"], ["inocencia"]],
      labels: ["¿libre para qué?", "crear", "valores", "hombre superior", "cristianismo", "odio a la vida", "Dionisos vs. Crucificado", "este mundo / cuerpo", "inocencia del ser"],
      model: "Nietzsche no se conforma con preguntar “¿libre de qué?”, sino “¿libre para qué?”: el hombre superior debe crear valores y dictaminar el sentido del mundo y de sí mismo. Por eso Dios debe morir: “¡qué podría yo crear si hubiera dioses!”. La negación de Dios es condición para afirmar la vida creadora. El cristianismo es odio a la vida y máxima expresión de la moral de esclavos (“Dionisos contra el Crucificado”). Frente al más allá, Nietzsche afirma la unicidad de este mundo, la inocencia del ser: “soy por entero cuerpo”.",
    },
    {
      q: "Explique la voluntad de poder, el amor fati y el eterno retorno.",
      kw: [["schopenhauer"], ["voluntad de vivir"], ["poder"], ["conocimiento", "instrumento"], ["pesimismo", "ascet"], ["afirma"], ["amor fati"], ["resignacion"], ["necesario", "inevitable"], ["retorno", "repeti"]],
      labels: ["Schopenhauer", "voluntad de vivir", "poder", "conocimiento = instrumento", "rechaza pesimismo", "afirmación", "amor fati", "no es resignación", "lo necesario", "repetición"],
      model: "Siguiendo a Schopenhauer, Nietzsche concibe la vida como voluntad, pero no como voluntad de vivir sino de poder: querer más vida. Es bueno todo lo que aumenta el sentimiento de poder, y todo conocimiento es instrumento de poder. Rechaza el pesimismo y el ascetismo de Schopenhauer: la liberación es afirmar la vida a pesar del dolor, sin razón alguna. Esa afirmación es el amor fati: no resignación, sino amor a lo necesario. El eterno retorno extiende ese fatalismo al universo: todo se repite sin novedad, y la libertad es la libre aceptación de lo inevitable.",
    },
    {
      q: "¿Qué es el superhombre y por qué el apunte habla de un “nihilismo de lo humano sin límite”?",
      kw: [["nihilismo"], ["superar", "supera"], ["voluntad de poder"], ["crea", "creador"], ["defin"], ["limite"], ["infinito", "finito"], ["para que"], ["medio", "fin"], ["vacio"]],
      labels: ["nihilismo", "superarlo", "voluntad de poder", "creador", "no pudo definirlo", "sin límite", "infinito en lo finito", "sin para qué", "medio / fin", "vacío"],
      model: "Tras la muerte de Dios y la transmutación de valores, el hombre queda en el nihilismo, que debe superarse con un nuevo ideal: el superhombre, encarnación de la voluntad de poder, creador que da a las cosas su valor y su verdad. Pero Nietzsche no pudo definirlo, porque rechazaba toda definición universal y todo límite. Según el apunte, quiso saciar su sed de infinito en lo finito y terminó en el vacío de lo ilimitado: la vida como absoluto, un poder sin ningún “para qué”. Como el poder es medio y no fin, queda vacío.",
    },
    {
      q: "Actualización: relacione una idea de Nietzsche con un fenómeno actual.",
      kw: [["hoy", "actual", "actualidad"], ["redes", "influencer", "algoritmo", "tiktok", "instagram", "ia", "rendimiento"], ["nihilismo", "voluntad de poder", "superhombre", "amor fati", "gregari", "creacion de valores", "dios ha muerto"], ["porque", "ya que"], ["sin embargo", "pero", "aunque", "critica"]],
      labels: ["ubicás el hoy", "ejemplo concreto", "concepto de Nietzsche", "justificás", "matiz crítico"],
      model: "Una idea vigente es la crítica a la moral gregaria: la moral del débil que se defiende en el grupo y castiga lo que sobresale. Hoy se ve en las redes sociales, donde los likes y las tendencias premian lo que se parece a todos, porque funcionan como una “grey” digital. Sin embargo, también el “sé tu mejor versión” de los influencers se disfraza de creación de valores, cuando muchas veces es seguir un modelo impuesto, lo contrario del hombre superior que crea desde su soledad.",
    },
  ];

  function simulacro() {
    const root = $("#sim");
    if (!root) return;
    const saved = readJSON(SIM_KEY);
    const results = {};

    root.innerHTML = SIM.map(
      (s, i) => `
      <article class="sim-q" data-reveal>
        <header><span class="sim-n">${i + 1}</span><h3>${s.q}</h3></header>
        <textarea data-i="${i}" placeholder="Escribí tu respuesta como si fuera el examen…" aria-label="Respuesta ${i + 1}"></textarea>
        <div class="sim-actions">
          <button class="btn btn-wine" data-check="${i}" type="button">Corregir</button>
          <button class="btn btn-ghost" data-clear="${i}" type="button">Borrar</button>
          <span class="sim-meter" data-meter="${i}"></span>
        </div>
        <div class="sim-result" data-res="${i}"></div>
      </article>`
    ).join("") + `<div class="sim-total"><span>Palabras clave en tus respuestas corregidas</span><b data-total>—</b></div>`;

    root.querySelectorAll("textarea").forEach((ta) => {
      const i = ta.dataset.i;
      ta.value = saved[i] || "";
      ta.addEventListener("input", () => {
        saved[i] = ta.value;
        writeJSON(SIM_KEY, saved);
      });
    });

    root.querySelectorAll("[data-check]").forEach((b) =>
      b.addEventListener("click", () => {
        const i = +b.dataset.check;
        const s = SIM[i];
        const txt = norm(root.querySelector(`textarea[data-i="${i}"]`).value);
        const hits = s.kw.map((alts) => alts.some((a) => txt.includes(a)));
        const n = hits.filter(Boolean).length;
        results[i] = { n, total: s.kw.length };
        const res = root.querySelector(`[data-res="${i}"]`);
        res.innerHTML = `
          <ul class="kw">${s.labels.map((l, k) => `<li class="${hits[k] ? "hit" : ""}">${l}</li>`).join("")}</ul>
          <div class="model"><p class="kicker">Respuesta modelo</p><p>${s.model}</p></div>`;
        res.classList.add("is-on");
        root.querySelector(`[data-meter="${i}"]`).innerHTML = txt.trim() ? `Usaste <b>${n}/${s.kw.length}</b> palabras clave` : `Escribí algo y volvé a corregir`;
        const all = Object.values(results);
        const sum = all.reduce((a, r) => a + r.n, 0);
        const tot = all.reduce((a, r) => a + r.total, 0);
        root.querySelector("[data-total]").textContent = `${Math.round((sum / tot) * 100)}%`;
        if (txt.trim() && n / s.kw.length >= 0.7) toast("¡Respuesta de 10!");
      })
    );

    root.querySelectorAll("[data-clear]").forEach((b) =>
      b.addEventListener("click", () => {
        const i = b.dataset.clear;
        const ta = root.querySelector(`textarea[data-i="${i}"]`);
        ta.value = "";
        saved[i] = "";
        writeJSON(SIM_KEY, saved);
        root.querySelector(`[data-res="${i}"]`).classList.remove("is-on");
        root.querySelector(`[data-meter="${i}"]`).textContent = "";
      })
    );
  }

  /* ---------- init ---------- */
  window.Games = {
    init() {
      renderProgress(false);
      const map = [
        ["#gameApolo", (el) => binaryGame(el, "apolo")],
        ["#gameMoral", (el) => binaryGame(el, "moral")],
        ["#gameTimeline", timelineGame],
        ["#gameObras", obrasGame],
        ["#gameVF", vfGame],
        ["#gameFichas", fichasGame],
      ];
      map.forEach(([sel, fn]) => { const el = $(sel); if (el) fn(el); });
      demonGame();
      simulacro();
      const reset = $("#resetProgress");
      if (reset) reset.addEventListener("click", resetProgress);
    },
    toast,
    progress: () => progress,
    ids: GAME_IDS,
  };
})();
