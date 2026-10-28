/* =========================================================
   Animaciones, navegación e interacciones
   ========================================================= */
(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const mobile = () => window.matchMedia("(max-width: 760px)").matches;

  // Los juegos generan HTML (con data-reveal), así que van primero.
  if (window.Games) window.Games.init();

  /* ---------- helpers ---------- */
  function splitChars(el) {
    const text = el.textContent;
    el.setAttribute("aria-label", text);
    el.innerHTML = text
      .split(" ")
      .map((w) => `<span class="word" aria-hidden="true">${[...w].map((c) => `<span class="char">${c}</span>`).join("")}</span>`)
      .join(" ");
    return $$(".char", el);
  }

  /* =========================================================
     Navegación
     ========================================================= */
  const sections = $$("main section[data-label]");
  const menu = $("#menu");
  const menuBtn = $("#menuBtn");
  const menuList = $("#menuList");

  menuList.innerHTML = sections
    .map((s) => `<li><a href="#${s.id}" data-target="${s.id}">${s.dataset.label}</a></li>`)
    .join("");

  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    document.body.style.overflow = open ? "hidden" : "";
    if (open && hasGSAP && !reduced) {
      gsap.fromTo($$("li", menuList), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.03, ease: "power3.out" });
    }
  }
  menuBtn.addEventListener("click", () => setMenu(menu.hidden));
  menuList.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !menu.hidden) setMenu(false); });

  // Sección actual en el índice
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        $$("a", menuList).forEach((a) => a.classList.toggle("is-current", a.dataset.target === en.target.id));
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => io.observe(s));

  // Barra de progreso y topbar
  const bar = $(".progress-bar");
  const topbar = $(".topbar");
  let ticking = false;
  function onScroll() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? window.scrollY / max : 0;
    bar.style.transform = `scaleX(${p})`;
    topbar.classList.toggle("is-solid", window.scrollY > 40);
    ticking = false;
  }
  window.addEventListener("scroll", () => { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });
  onScroll();

  /* =========================================================
     Interacciones que no dependen de GSAP
     ========================================================= */
  // Cartas de obras
  $$(".flip").forEach((f) => f.addEventListener("click", () => f.classList.toggle("is-flipped")));

  // Tarjetas de actualización
  $$(".now").forEach((n) =>
    n.addEventListener("click", () => {
      const open = !n.classList.contains("is-open");
      $$(".now.is-open").forEach((o) => o.classList.remove("is-open"));
      n.classList.toggle("is-open", open);
      if (hasGSAP) ScrollTrigger.refresh();
    })
  );

  // Tabs de la zona de juegos
  $$(".tab").forEach((t) =>
    t.addEventListener("click", () => {
      $$(".tab").forEach((x) => { x.classList.toggle("is-on", x === t); x.setAttribute("aria-selected", String(x === t)); });
      $$(".panel").forEach((p) => {
        const on = p.dataset.panel === t.dataset.tab;
        p.hidden = !on;
        p.classList.toggle("is-on", on);
      });
      if (hasGSAP) {
        const panel = $(`.panel[data-panel="${t.dataset.tab}"]`);
        if (!reduced) gsap.fromTo(panel, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out" });
        ScrollTrigger.refresh();
      }
    })
  );

  // Duelo Apolo / Dioniso
  const duel = $("#duel");
  const handle = $("#duelHandle");
  let duelTouched = false;
  function setPos(pct) {
    pct = Math.max(4, Math.min(96, pct));
    duel.style.setProperty("--pos", pct + "%");
    handle.setAttribute("aria-valuenow", Math.round(pct));
  }
  if (duel) {
    setPos(50);
    let dragging = false;
    const fromEvent = (e) => {
      const r = duel.getBoundingClientRect();
      setPos(((e.clientX - r.left) / r.width) * 100);
    };
    handle.addEventListener("pointerdown", (e) => {
      dragging = true; duelTouched = true;
      handle.setPointerCapture(e.pointerId);
      duel.classList.add("is-dragging");
    });
    handle.addEventListener("pointermove", (e) => { if (dragging) fromEvent(e); });
    const stop = () => { dragging = false; duel.classList.remove("is-dragging"); };
    handle.addEventListener("pointerup", stop);
    handle.addEventListener("pointercancel", stop);
    // Tocar en cualquier parte también mueve la línea
    duel.addEventListener("click", (e) => { if (e.target.closest(".duel-handle")) return; duelTouched = true; fromEvent(e); });
    handle.addEventListener("keydown", (e) => {
      const cur = parseFloat(getComputedStyle(duel).getPropertyValue("--pos")) || 50;
      if (e.key === "ArrowLeft") { duelTouched = true; setPos(cur - 5); e.preventDefault(); }
      if (e.key === "ArrowRight") { duelTouched = true; setPos(cur + 5); e.preventDefault(); }
    });
  }

  if (!hasGSAP) return; // sin GSAP la página sigue siendo legible y jugable
  document.documentElement.classList.add("has-gsap");
  gsap.registerPlugin(ScrollTrigger);

  // Scroll suave para enlaces internos (sin scroll-behavior CSS para no pelear con ScrollTrigger)
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.getElementById(a.getAttribute("href").slice(1));
    if (!target) return;
    e.preventDefault();
    const y = target.getBoundingClientRect().top + window.scrollY - (target.id === "inicio" ? 0 : 60);
    window.scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" });
  });

  /* =========================================================
     Steps activos (para todos los scrolly)
     ========================================================= */
  $$(".step").forEach((step) => {
    ScrollTrigger.create({
      trigger: step,
      start: "top 62%",
      end: "bottom 38%",
      toggleClass: "is-active",
      onToggle: (self) => {
        if (!self.isActive) return;
        const scrolly = step.closest(".scrolly");
        scrolly.dataset.step = step.dataset.step;
        scrolly.dispatchEvent(new CustomEvent("step", { detail: +step.dataset.step }));
      },
    });
  });

  if (reduced) {
    // Movimiento reducido: solo el estado final, sin animaciones de scroll.
    $$(".step").forEach((s) => s.classList.add("is-active"));
    $(".libre-1").style.setProperty("--strike", 1);
    return;
  }

  /* =========================================================
     HERO
     ========================================================= */
  const heroChars = splitChars($("#heroTitle"));
  const heroTl = gsap.timeline({ defaults: { ease: "power4.out" } });
  heroTl
    .from(".hero-kicker", { y: 20, opacity: 0, duration: 0.8 })
    .from(heroChars, { yPercent: 110, rotate: 8, opacity: 0, duration: 1.1, stagger: 0.045 }, "-=0.4")
    .from(".hero-sub", { y: 24, opacity: 0, duration: 0.9 }, "-=0.6")
    .from(".hero-meta > *", { y: 12, opacity: 0, duration: 0.5, stagger: 0.04 }, "-=0.6")
    .from(".scroll-cue", { opacity: 0, duration: 0.8 }, "-=0.2");

  gsap.to(".hero-inner", {
    yPercent: -18, opacity: 0, scale: 0.96, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
  gsap.to(".hero-glow", {
    scale: 1.5, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
  });
  // El brillo sigue al mouse
  const glow = $(".hero-glow");
  window.addEventListener("pointermove", (e) => {
    if (window.scrollY > window.innerHeight) return;
    gsap.to(glow, { x: (e.clientX / window.innerWidth - 0.5) * 120, y: (e.clientY / window.innerHeight - 0.5) * 80, duration: 1.2, ease: "power2.out" });
  });

  /* =========================================================
     DINAMITA: la mecha se quema y la palabra explota
     ========================================================= */
  const dinaChars = splitChars($("#dinaWord"));
  const fusePath = $("#fusePath");
  const fuseLen = fusePath.getTotalLength();
  const spark = $("#spark");
  const fuseBox = $(".fuse");
  gsap.set(fusePath, { strokeDasharray: "6 8" });
  const sparkState = { p: 0 };
  function placeSpark() {
    const pt = fusePath.getPointAtLength(sparkState.p * fuseLen);
    const w = fuseBox.clientWidth, h = fuseBox.clientHeight;
    gsap.set(spark, { x: (pt.x / 1000) * w, y: (pt.y / 120) * h });
    // La mecha ya quemada desaparece
    fusePath.style.clipPath = `inset(0 0 0 ${sparkState.p * 100}%)`;
  }
  placeSpark();

  const scatter = dinaChars.map(() => ({
    x: gsap.utils.random(-500, 500),
    y: gsap.utils.random(-350, 350),
    r: gsap.utils.random(-180, 180),
  }));

  const dinaTl = gsap.timeline({
    scrollTrigger: { trigger: ".dinamita", start: "top top", end: () => "+=" + window.innerHeight * 2.2, scrub: 0.6, pin: ".dinamita-stage", anticipatePin: 1 },
  });
  dinaTl
    .from("#dinaPre", { opacity: 0, y: 30, duration: 0.6 })
    .to(sparkState, { p: 1, duration: 3, ease: "none", onUpdate: placeSpark }, 0)
    .from(dinaChars, {
      x: (i) => scatter[i].x, y: (i) => scatter[i].y, rotate: (i) => scatter[i].r,
      opacity: 0, scale: 0.4, duration: 2.2, ease: "power3.out", stagger: { each: 0.04, from: "random" },
    }, 0.4)
    .to("#flash", { opacity: 0.9, duration: 0.15, ease: "power2.in" }, 2.9)
    .to("#flash", { opacity: 0, duration: 0.6 }, 3.05)
    .to(spark, { scale: 4, opacity: 0, duration: 0.3 }, 2.9)
    .to("#dinaWord", { color: "#f0d48f", textShadow: "0 0 40px rgba(217,180,90,.6)", duration: 0.4 }, 3)
    .fromTo("#dinaWord", { x: 0 }, { x: 6, duration: 0.05, repeat: 5, yoyo: true, ease: "none" }, 3)
    .from(".dina-foot", { opacity: 0, y: 10, duration: 0.4 }, 3.2)
    .to({}, { duration: 0.6 });

  /* =========================================================
     Revelado genérico
     ========================================================= */
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    once: true,
    onEnter: (els) => gsap.fromTo(els, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: 0.08, overwrite: true }),
  });
  gsap.set("[data-reveal]", { opacity: 0, y: 40 });
  // Lo que ya está por encima del viewport (por un salto de ancla) se muestra sin esperar
  ScrollTrigger.addEventListener("refresh", () => {
    $$("[data-reveal]").forEach((el) => {
      if (el.getBoundingClientRect().bottom < 0) gsap.set(el, { opacity: 1, y: 0 });
    });
  });

  // Números de capítulo con parallax
  $$(".chapter-num").forEach((n) => {
    gsap.fromTo(n, { yPercent: 30 }, { yPercent: -30, ease: "none", scrollTrigger: { trigger: n, start: "top bottom", end: "bottom top", scrub: true } });
  });

  /* =========================================================
     VIDA: línea de tiempo horizontal
     ========================================================= */
  const track = $("#vidaTrack");
  const vidaDistance = () => Math.max(0, track.scrollWidth - window.innerWidth);
  const vidaTween = gsap.to(track, {
    x: () => -vidaDistance(),
    ease: "none",
    scrollTrigger: {
      trigger: ".vida",
      start: "top top",
      end: () => "+=" + vidaDistance(),
      scrub: 0.5,
      pin: ".vida-pin",
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => gsap.set("#vidaBar", { scaleX: self.progress }),
    },
  });
  $$(".hito").forEach((h) => {
    gsap.from(h.children, {
      y: 30, opacity: 0, stagger: 0.08, duration: 0.6, ease: "power3.out",
      scrollTrigger: { trigger: h, containerAnimation: vidaTween, start: "left 85%", toggleActions: "play none none reverse" },
    });
  });

  /* =========================================================
     01 · Razón: la grilla ordenada se desarma
     ========================================================= */
  const grid = $("#orderGrid");
  grid.innerHTML = Array.from({ length: 36 }, () => "<span></span>").join("");
  const cells = $$("span", grid);
  const chaos = cells.map(() => ({
    x: gsap.utils.random(-260, 260),
    y: gsap.utils.random(-300, 300),
    r: gsap.utils.random(-260, 260),
    s: gsap.utils.random(0.3, 1.9),
  }));
  const razonScrolly = $('[data-scrolly="razon"]');
  gsap.timeline({
    scrollTrigger: { trigger: razonScrolly, start: "top top", end: "bottom bottom", scrub: 0.8 },
  })
    .to({}, { duration: 0.8 })
    .to(cells, { rotate: (i) => (i % 2 ? 6 : -6), duration: 1, ease: "none" })
    .to(cells, {
      x: (i) => chaos[i].x, y: (i) => chaos[i].y, rotate: (i) => chaos[i].r, scale: (i) => chaos[i].s,
      borderRadius: "50%", backgroundColor: (i) => (i % 3 ? "#9b1d33" : "#d4405a"),
      duration: 2, ease: "power1.in", stagger: { each: 0.02, from: "center" },
    })
    .to(cells, { opacity: (i) => (i % 4 ? 0.9 : 0.25), duration: 1 });

  const captions = [
    "La razón: todo en su casillero.",
    "Algo empieza a moverse…",
    "La vida no entra en la grilla.",
    "Las cajitas no aguantan.",
  ];
  const caption = $("#razonCaption");
  razonScrolly.addEventListener("step", (e) => {
    caption.textContent = captions[e.detail] || captions[0];
    caption.style.color = e.detail >= 2 ? "#ff9aac" : "";
  });

  /* =========================================================
     02 · Duelo: la línea entra sola hasta el medio
     ========================================================= */
  const posProxy = { v: 100 };
  gsap.to(posProxy, {
    v: 50,
    ease: "power2.out",
    scrollTrigger: { trigger: duel, start: "top 85%", end: "top 25%", scrub: 0.6 },
    onUpdate: () => { if (!duelTouched) setPos(posProxy.v); },
  });
  gsap.from(".eq-term, .eq-op", {
    y: 30, opacity: 0, scale: 0.9, stagger: 0.1, duration: 0.7, ease: "back.out(1.6)",
    scrollTrigger: { trigger: ".equation", start: "top 85%" },
  });

  /* =========================================================
     03 · Transmutación: VALORES se da vuelta
     ========================================================= */
  gsap.timeline({
    scrollTrigger: { trigger: "#flipStage", start: "top top", end: "+=" + window.innerHeight * 1.4, scrub: 0.6, pin: true, anticipatePin: 1 },
  })
    .from("#flipWord", { opacity: 0, scale: 0.8, duration: 0.6 })
    .to("#flipWord", { rotateX: 180, duration: 2, ease: "power2.inOut" })
    .to("#flipWord", { color: "#d9b45a", textShadow: "0 0 50px rgba(217,180,90,.45)", duration: 0.6 }, "-=0.8")
    .from("#flipCaption", { opacity: 0, y: 20, duration: 0.6 }, "-=0.4")
    .to({}, { duration: 0.4 });

  gsap.from(".vs-esclavos", { xPercent: -30, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".versus", start: "top 85%" } });
  gsap.from(".vs-senores", { xPercent: 30, opacity: 0, duration: 1, ease: "power3.out", scrollTrigger: { trigger: ".versus", start: "top 85%" } });
  gsap.from(".vs-mid", { scale: 0, rotate: -90, duration: 0.8, ease: "back.out(2)", scrollTrigger: { trigger: ".versus", start: "top 85%" } });

  /* =========================================================
     04 · ¿Libre de qué? → ¿Libre para qué?
     ========================================================= */
  gsap.timeline({
    scrollTrigger: { trigger: "#libre", start: "top 75%", end: "bottom 45%", scrub: 0.6 },
  })
    .from(".libre-1", { opacity: 0, y: 40, duration: 1 })
    .to(".libre-1", { "--strike": 1, duration: 1 })
    .to(".libre-1", { opacity: 0.45, duration: 0.5 })
    .from(".libre-2", { opacity: 0, y: 60, scale: 0.9, duration: 1 })
    .from(".libre-note", { opacity: 0, y: 20, duration: 0.6 });

  // Dios ha muerto: el texto se parte
  gsap.timeline({
    scrollTrigger: { trigger: "#crack", start: "top 70%", end: "bottom 30%", scrub: 0.6 },
  })
    .from(".crack-text", { scale: 0.85, opacity: 0, duration: 1 })
    .to(".crack-top", { y: -26, x: -18, rotate: -3, duration: 1.4, ease: "power2.in" }, 1)
    .to(".crack-bottom", { y: 30, x: 22, rotate: 3, duration: 1.4, ease: "power2.in" }, 1);

  /* =========================================================
     05 · Voluntad de poder: el medidor se llena
     ========================================================= */
  const poderScrolly = $('[data-scrolly="poder"]');
  const meterFg = $("#meterFg");
  const circ = 2 * Math.PI * 86;
  meterFg.style.strokeDasharray = circ;
  const meterPct = $("#meterPct");
  const meterTxt = $("#meterTxt");
  ScrollTrigger.create({
    trigger: poderScrolly,
    start: "top 30%",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      meterFg.style.strokeDashoffset = circ * (1 - p);
      meterPct.textContent = Math.round(p * 100) + "%";
      meterFg.style.stroke = p > 0.85 ? "#f0d48f" : "#d9b45a";
    },
  });
  const meterLabels = ["voluntad de vivir → poder", "más poder = bueno", "conocer = dominar", "afirmar contra toda razón", "amor fati"];
  poderScrolly.addEventListener("step", (e) => {
    meterTxt.textContent = meterLabels[e.detail];
    gsap.fromTo(meterTxt, { y: 8, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 });
  });

  /* =========================================================
     06 · Eterno retorno: el anillo gira con el scroll
     ========================================================= */
  const ringScroll = { trigger: '[data-scrolly="retorno"]', start: "top bottom", end: "bottom top", scrub: 0.5 };
  gsap.to("#ring", { rotate: 720, ease: "none", scrollTrigger: ringScroll });
  // El ∞ queda derecho mientras el anillo gira
  gsap.to(".ring-core", { rotate: -720, ease: "none", scrollTrigger: { ...ringScroll } });
  gsap.from(".demon", {
    scale: 0.94, opacity: 0, duration: 1, ease: "power3.out",
    scrollTrigger: { trigger: ".demon", start: "top 85%" },
  });

  /* =========================================================
     07 · Superhombre
     ========================================================= */
  gsap.timeline({
    scrollTrigger: { trigger: "#ascend", start: "top top", end: "+=" + window.innerHeight * 1.2, scrub: 0.6, pin: true, anticipatePin: 1 },
  })
    .from(".ascend-q .dead", { opacity: 0, y: 30, duration: 1 })
    .to(".ascend-q .dead", { opacity: 0.25, filter: "blur(3px)", scale: 0.92, duration: 1 })
    .from(".ascend-q .alive", { opacity: 0, y: 120, duration: 1.4, ease: "power3.out" }, "-=0.6")
    .to(".ascend-q .alive", { textShadow: "0 0 50px rgba(217,180,90,.55)", duration: 0.6 })
    .to({}, { duration: 0.4 });

  gsap.from(".stairs li", {
    y: 80, opacity: 0, duration: 0.9, stagger: 0.18, ease: "power3.out",
    scrollTrigger: { trigger: ".stairs", start: "top 80%" },
  });

  /* =========================================================
     08 · Nihilismo: las palabras se disuelven
     ========================================================= */
  const voidEl = $("#void");
  const words = $$("span", voidEl);
  function layoutVoid() {
    const R = voidEl.clientWidth / 2;
    words.forEach((w, i) => {
      const a = (i / words.length) * Math.PI * 2;
      const r = R * (0.45 + (i % 3) * 0.17);
      gsap.set(w, { left: R + Math.cos(a) * r, top: R + Math.sin(a) * r, xPercent: -50, yPercent: -50 });
    });
  }
  layoutVoid();
  window.addEventListener("resize", layoutVoid);
  const drift = words.map(() => ({ x: gsap.utils.random(-200, 200), y: gsap.utils.random(-200, 200), r: gsap.utils.random(-40, 40) }));
  gsap.timeline({
    scrollTrigger: { trigger: '[data-scrolly="nihilismo"]', start: "top top", end: "bottom bottom", scrub: 0.8 },
  })
    .to(words, {
      x: (i) => drift[i].x, y: (i) => drift[i].y, rotate: (i) => drift[i].r,
      opacity: 0, filter: "blur(10px)", duration: 3, stagger: { each: 0.2, from: "random" }, ease: "power1.in",
    })
    .to(".void-q", { opacity: 1, duration: 1 }, "-=0.8");

  /* =========================================================
     09 · Actualización / juegos / machete
     ========================================================= */
  gsap.from(".template mark", {
    backgroundColor: "rgba(217,180,90,0)", duration: 0.6, stagger: 0.15,
    scrollTrigger: { trigger: ".template", start: "top 80%" },
  });
  gsap.from(".final", {
    scale: 0.8, opacity: 0, duration: 1.2, ease: "elastic.out(1, 0.6)",
    scrollTrigger: { trigger: ".final", start: "top 90%" },
  });

  /* ---------- refrescos ---------- */
  window.addEventListener("load", () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  let lastW = window.innerWidth;
  window.addEventListener("resize", () => {
    // En celulares la barra de direcciones cambia el alto: solo refrescar si cambia el ancho.
    if (window.innerWidth !== lastW) { lastW = window.innerWidth; ScrollTrigger.refresh(); }
  });
  ScrollTrigger.config({ ignoreMobileResize: true });
})();
