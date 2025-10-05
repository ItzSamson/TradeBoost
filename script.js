// ---------- Dynamická výška fixního headeru ----------
function setHeaderOffset() {
  const header = document.querySelector('header');
  if (!header) return;
  const h = header.offsetHeight;
  document.documentElement.style.setProperty('--header-h', `${h}px`);
}
window.addEventListener('resize', setHeaderOffset);
document.addEventListener('DOMContentLoaded', setHeaderOffset);

// ---------- Animace čísel (0 -> cílová hodnota při zobrazení) ----------
function animateCounter(counter) {
  const target = +counter.getAttribute("data-target");
  const isFloat = counter.getAttribute("data-target").includes(".");
  let current = 0;
  const steps = 200;
  const increment = target / steps;

  const update = () => {
    current += increment;
    if (current < target) {
      counter.textContent = isFloat ? current.toFixed(1) : Math.floor(current);
      requestAnimationFrame(update);
    } else {
      counter.textContent = isFloat ? target.toFixed(1) : target;
    }
  };
  update();
}

document.addEventListener("DOMContentLoaded", () => {
  // Spouštěč animace čísel až když jsou vidět
  const counters = document.querySelectorAll(".counter");
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });
  counters.forEach(counter => observer.observe(counter));

  // ---------- FAQ akordeon ----------
  document.querySelectorAll(".faq-item").forEach(item => {
    item.querySelector(".faq-question").addEventListener("click", () => item.classList.toggle("open"));
  });

  // ---------- Discord modal (demo) ----------
  const modal = document.getElementById("discordModal");
  const btn = document.getElementById("discordBtn");
  const closeBtn = document.querySelector(".modal .close");
  if (btn && modal && closeBtn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");
    });
    closeBtn.addEventListener("click", () => {
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
    });
    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
      }
    });
  }

  // ---------- Karusel: plynulá smyčka bez jakéhokoli skoku ----------
  const carousels = document.querySelectorAll(".carousel");
  carousels.forEach((carousel) => {
    const viewport = carousel.querySelector(".carousel-viewport");
    const track = carousel.querySelector(".carousel-track");
    const btnPrev = carousel.querySelector(".carousel-btn.prev");
    const btnNext = carousel.querySelector(".carousel-btn.next");
    if (!viewport || !track) return;

    let n = 0;               // počet originálních slidů
    let index = 0;           // aktuální index v trojité sadě
    let delta = 0;           // posun o 1 slide (šířka + gap)
    let gapPx = 0;
    let peekPx = 0;
    let offsetPx = 0;        // DŮLEŽITÉ: základní posun, který vyrovná "wrap", aby transform zůstal stejný
    let animating = false;
    const TRANSITION = "transform .35s ease";

    const setTransition = (on) => track.style.transition = on ? TRANSITION : "none";
    const parsePeekPx = () => {
      const val = getComputedStyle(carousel).getPropertyValue("--peek").trim();
      if (val.endsWith("%")) return (viewport.clientWidth * parseFloat(val)) / 100;
      if (val.endsWith("px")) return parseFloat(val);
      return 0;
    };

    // Vytvoř trojitou sadu [orig][orig][orig] a začni u prostřední
    function buildTripleSet() {
      if (track.dataset.built === "1") return;
      const originals = Array.from(track.children);
      n = originals.length;
      const frag = document.createDocumentFragment();
      for (let r = 0; r < 3; r++) originals.forEach(node => frag.appendChild(node.cloneNode(true)));
      track.innerHTML = "";
      track.appendChild(frag);
      track.dataset.built = "1";
      index = n; // 1. snímek prostřední sady
    }

    function measure() {
      const csTrack = getComputedStyle(track);
      gapPx = parseFloat(csTrack.gap || csTrack.columnGap || "0");
      peekPx = parsePeekPx();
      const slide = track.querySelector(".carousel-slide");
      const slideRect = slide.getBoundingClientRect();
      const slideWidth = slideRect.width;
      delta = slideWidth + gapPx;

      // Přepočítej transform bez viditelného skoku
      const prevTransition = track.style.transition;
      setTransition(false);
      applyTransform();
      // force reflow, ať se hodnota hned uplatní
      void track.offsetWidth;
      track.style.transition = prevTransition;
    }

    // Výpočet transformace: offsetPx - (index*delta - peekPx)
    function applyTransform() {
      const tx = offsetPx - (index * delta - peekPx);
      track.style.transform = `translateX(${tx}px)`;
    }

    // Normalizace indexu do prostřední sady, ale BEZE ZMĚNY transformace!
    function normalizeIndex() {
      if (index >= 2 * n) {
        index -= n;
        offsetPx -= n * delta; // vyrovnáme posun → výsledná transformace zůstane identická
      } else if (index < n) {
        index += n;
        offsetPx += n * delta;
      }
      // transformace se nezmění ani o pixel; volání applyTransform() nastaví stejnou hodnotu
      applyTransform();
    }

    function next() {
      if (animating) return;
      animating = true;
      index += 1;
      setTransition(true);
      applyTransform();
      track.addEventListener("transitionend", () => {
        normalizeIndex(); // beze změny vizuálu
        animating = false;
      }, { once: true });
    }

    function prev() {
      if (animating) return;
      animating = true;
      index -= 1;
      setTransition(true);
      applyTransform();
      track.addEventListener("transitionend", () => {
        normalizeIndex(); // beze změny vizuálu
        animating = false;
      }, { once: true });
    }

    // Ovládání
    btnNext?.addEventListener("click", next);
    btnPrev?.addEventListener("click", prev);
    carousel.setAttribute("tabindex", "0");
    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    });

    // Inicializace
    function init() {
      setTransition(false);
      buildTripleSet();
      measure();
      // Start: uprostřed „první“ reálný, vlevo kouká „poslední“, vpravo „druhý“
      applyTransform();
      requestAnimationFrame(() => setTransition(true));
    }

    // Po načtení obrázků + resize
    const imgs = track.querySelectorAll("img");
    let loaded = 0;
    const tryInit = () => { if (loaded >= imgs.length) init(); };
    imgs.forEach(img => {
      if (img.complete) { loaded++; tryInit(); }
      else img.addEventListener("load", () => { loaded++; tryInit(); });
    });
    window.addEventListener("load", () => { loaded = imgs.length; tryInit(); });
    window.addEventListener("resize", measure);

    init();
  });
});
