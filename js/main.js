/* ==========================================================================
   SPE USP STUDENT CHAPTER — COMPORTAMENTO DO SITE
   --------------------------------------------------------------------------
   Normalmente NÃO é preciso mexer aqui. Este arquivo cuida de:
   0. Abrir toda página no topo.
   1. Menu do celular (abrir e fechar).
   2. Aviso "página em construção" nos links marcados com data-em-breve.
   3. Carrossel de "Últimos acontecimentos" (setas, bolinhas, troca
      automática, pausa, teclado e deslizar no celular).
   5. Apresentações do SPE Case (abas por time e slides).
   ========================================================================== */

(function () {
  "use strict";

  var reducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------
     0. Toda página abre no topo
        Alguns navegadores (e a pré-visualização) mantêm a rolagem da
        página anterior. Links com #âncora continuam funcionando.
     --------------------------------------------------------------- */
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  var pessoaRolou = false;
  ["wheel", "touchstart", "keydown"].forEach(function (tipo) {
    window.addEventListener(tipo, function () { pessoaRolou = true; }, { passive: true, once: true });
  });
  function irParaTopo() {
    if (!location.hash && !pessoaRolou) window.scrollTo(0, 0);
  }
  irParaTopo();
  document.addEventListener("DOMContentLoaded", irParaTopo);
  window.addEventListener("load", irParaTopo);

  /* ---------------------------------------------------------------
     1. Menu do celular
     --------------------------------------------------------------- */
  var menuButton = document.querySelector(".menu-toggle");
  var nav = document.querySelector(".site-nav");

  function closeMenu() {
    if (!menuButton || !nav) return;
    menuButton.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  }

  if (menuButton && nav) {
    menuButton.addEventListener("click", function () {
      var open = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMenu();
    });
  }

  /* ---------------------------------------------------------------
     2. Links de páginas que ainda não existem (Passo 2)
     --------------------------------------------------------------- */
  var toast = document.querySelector(".toast");
  var toastTimer = null;

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest("a[data-em-breve]");
    if (!link || !toast) return;
    event.preventDefault();
    closeMenu();
    toast.textContent = "Página em construção: “" + link.textContent.trim() + "” chega em breve.";
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 2600);
  });

  /* ---------------------------------------------------------------
     3. Carrossel
     --------------------------------------------------------------- */
  var INTERVALO = 7000; // tempo de cada slide, em milissegundos

  Array.prototype.forEach.call(document.querySelectorAll("[data-carousel]"), function (carousel) {
    var viewport = carousel.querySelector(".carousel__viewport");
    var slides = Array.prototype.slice.call(carousel.querySelectorAll(".slide"));
    var dotsBox = carousel.querySelector("[data-dots]");
    var prev = carousel.querySelector("[data-prev]");
    var next = carousel.querySelector("[data-next]");
    var pauseBtn = carousel.querySelector("[data-pause]");
    var pauseLabel = carousel.querySelector("[data-pause-label]");
    if (!viewport || !slides.length) return;

    var current = 0;
    var timer = null;
    var userPaused = reducedMotion;   // sem animação automática para quem pediu menos movimento
    var hoverPaused = false;
    var dots = [];

    // Bolinhas: uma por slide (criadas aqui, não precisa editar no HTML)
    slides.forEach(function (slide, i) {
      slide.setAttribute("aria-label", (i + 1) + " de " + slides.length);
      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "carousel__dot";
      var title = slide.querySelector(".slide__title");
      dot.setAttribute("aria-label", "Ir para " + (title ? title.textContent.trim() : "slide " + (i + 1)));
      dot.addEventListener("click", function () { goTo(i, true); });
      dotsBox.appendChild(dot);
      dots.push(dot);
    });

    function update(index) {
      current = index;
      dots.forEach(function (dot, i) {
        dot.setAttribute("aria-current", i === index ? "true" : "false");
      });
      // Só o slide visível fica acessível pelo Tab
      slides.forEach(function (slide, i) {
        var visible = i === index;
        slide.setAttribute("aria-hidden", visible ? "false" : "true");
        Array.prototype.forEach.call(slide.querySelectorAll("a, button"), function (el) {
          if (visible) el.removeAttribute("tabindex"); else el.setAttribute("tabindex", "-1");
        });
      });
    }

    function goTo(index, fromUser) {
      var total = slides.length;
      index = (index + total) % total;
      viewport.scrollTo({ left: slides[index].offsetLeft - slides[0].offsetLeft, behavior: reducedMotion ? "auto" : "smooth" });
      update(index);
      if (fromUser) restart();
    }

    // Quando a pessoa desliza com o dedo, descobre qual slide ficou na tela
    var scrollTimer = null;
    viewport.addEventListener("scroll", function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var index = Math.round(viewport.scrollLeft / viewport.clientWidth);
        if (index !== current && index >= 0 && index < slides.length) { update(index); restart(); }
      }, 120);
    }, { passive: true });

    if (prev) prev.addEventListener("click", function () { goTo(current - 1, true); });
    if (next) next.addEventListener("click", function () { goTo(current + 1, true); });

    viewport.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") { event.preventDefault(); goTo(current - 1, true); }
      if (event.key === "ArrowRight") { event.preventDefault(); goTo(current + 1, true); }
    });

    // Troca automática
    function stop() { clearInterval(timer); timer = null; }
    function start() {
      stop();
      if (userPaused || hoverPaused || slides.length < 2 || document.hidden) return;
      timer = setInterval(function () { goTo(current + 1, false); }, INTERVALO);
    }
    function restart() { start(); }

    function renderPause() {
      if (!pauseBtn) return;
      pauseBtn.setAttribute("aria-pressed", String(userPaused));
      if (pauseLabel) pauseLabel.textContent = userPaused ? "Reproduzir" : "Pausar";
      // Leitores de tela anunciam a troca só quando ela não é automática
      viewport.setAttribute("aria-live", userPaused ? "polite" : "off");
    }
    if (pauseBtn) {
      pauseBtn.addEventListener("click", function () {
        userPaused = !userPaused;
        renderPause();
        start();
      });
    }

    // Pausa enquanto o mouse ou o foco do teclado estão no carrossel
    carousel.addEventListener("mouseenter", function () { hoverPaused = true; stop(); });
    carousel.addEventListener("mouseleave", function () { hoverPaused = false; start(); });
    carousel.addEventListener("focusin", function () { hoverPaused = true; stop(); });
    carousel.addEventListener("focusout", function (event) {
      if (!carousel.contains(event.relatedTarget)) { hoverPaused = false; start(); }
    });
    document.addEventListener("visibilitychange", start);

    // Mantém o slide certo no lugar quando a janela muda de tamanho
    window.addEventListener("resize", function () {
      viewport.scrollTo({ left: slides[current].offsetLeft - slides[0].offsetLeft, behavior: "auto" });
    });

    update(0);
    renderPause();
    start();
  });

  /* ---------------------------------------------------------------
     5. Apresentações do SPE Case (abas por time + slides)
     --------------------------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll("[data-apresentacoes]"), function (box) {
    var abas = Array.prototype.slice.call(box.querySelectorAll("[data-aba]"));
    var paineis = Array.prototype.slice.call(box.querySelectorAll("[data-viewer]"));

    function mostrarTime(n) {
      abas.forEach(function (aba) { aba.setAttribute("aria-selected", aba.getAttribute("data-aba") === String(n) ? "true" : "false"); });
      paineis.forEach(function (painel) { painel.hidden = painel.id !== "apres-time-" + n; });
    }

    abas.forEach(function (aba, i) {
      aba.addEventListener("click", function () { mostrarTime(aba.getAttribute("data-aba")); });
      aba.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
        var prox = abas[(i + (e.key === "ArrowRight" ? 1 : abas.length - 1)) % abas.length];
        prox.focus(); prox.click();
      });
    });

    // Botões "Ver apresentação" nas propostas abrem o time certo
    Array.prototype.forEach.call(document.querySelectorAll("[data-ver-time]"), function (link) {
      link.addEventListener("click", function () { mostrarTime(link.getAttribute("data-ver-time")); });
    });

    paineis.forEach(function (painel) {
      var lista = painel.querySelector(".apres__slides");
      var itens = lista.children;
      var atual = painel.querySelector("[data-atual]");
      var indice = 0;

      function ir(i) {
        indice = Math.max(0, Math.min(itens.length - 1, i));
        lista.scrollTo({ left: itens[indice].offsetLeft - itens[0].offsetLeft, behavior: reducedMotion ? "auto" : "smooth" });
        atual.textContent = String(indice + 1);
      }
      painel.querySelector("[data-ant]").addEventListener("click", function () { ir(indice - 1); });
      painel.querySelector("[data-prox]").addEventListener("click", function () { ir(indice + 1); });
      lista.addEventListener("keydown", function (e) {
        if (e.key === "ArrowLeft") { e.preventDefault(); ir(indice - 1); }
        if (e.key === "ArrowRight") { e.preventDefault(); ir(indice + 1); }
      });
      var t = null;
      lista.addEventListener("scroll", function () {
        clearTimeout(t);
        t = setTimeout(function () {
          if (!lista.clientWidth) return;
          indice = Math.round(lista.scrollLeft / lista.clientWidth);
          atual.textContent = String(indice + 1);
        }, 100);
      }, { passive: true });
    });
  });
})();

// Sliding panels support mouse hover, touch, and keyboard activation.
document.querySelectorAll('.mvv__details').forEach(function (card, index) {
  var button = card.querySelector('.mvv__toggle');
  var panel = card.querySelector('.mvv__description');
  panel.id = 'mvv-panel-' + index;
  button.setAttribute('aria-controls', panel.id);
  function show(active) {
    card.classList.toggle('is-active', active);
    button.setAttribute('aria-expanded', String(active));
    panel.setAttribute('aria-hidden', String(!active));
    panel.inert = !active;
  }
  show(false);
  card.addEventListener('pointerenter', function (event) {
    if (event.pointerType === 'mouse') show(true);
  });
  card.addEventListener('pointerleave', function (event) {
    if (event.pointerType === 'mouse') show(false);
  });
  button.addEventListener('click', function () { show(!card.classList.contains('is-active')); });
  card.addEventListener('keydown', function (event) { if (event.key === 'Escape') show(false); });
  card.addEventListener('focusout', function (event) {
    if (!card.contains(event.relatedTarget)) show(false);
  });
});
