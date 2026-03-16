(function () {
  const data = window.PARENT_GUIDE_DATA;
  if (!data) {
    return;
  }

  const tabsRoot = document.querySelector("[data-tabs]");
  const sectionsRoot = document.querySelector("[data-sections]");
  const coverOutlineRoot = document.querySelector("[data-cover-outline]");
  const tabsShell = document.querySelector(".chapter-nav-shell");
  const chapterNav = document.querySelector("#chapter-nav");
  const progressBar = document.querySelector("[data-progress]");
  const pdfLink = document.querySelector("[data-pdf-link]");
  const titleNode = document.querySelector("[data-doc-title]");
  const lightbox = document.querySelector("[data-lightbox]");
  const lightboxImage = document.querySelector("[data-lightbox-image]");
  const lightboxMeta = document.querySelector("[data-lightbox-meta]");
  const lightboxClose = document.querySelector("[data-lightbox-close]");
  const toTopButton = document.querySelector("[data-to-top]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileTabsRestOffset = 34;
  let tabHintPlayed = false;
  let tabHintTimers = [];

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function pageLabel(page) {
    return `페이지 ${page.number}`;
  }

  function sectionLinkHtml(link) {
    return `
      <a class="pill-link" href="${escapeHtml(link.uri)}" target="_blank" rel="noreferrer">
        <span>${escapeHtml(link.label)}</span>
      </a>
    `;
  }

  function renderLinks(links) {
    if (!links.length) {
      return "";
    }

    const items = links.map(sectionLinkHtml).join("");
    if (links.length <= 6) {
      return `<div class="link-pills">${items}</div>`;
    }

    return `
      <details class="link-drawer">
        <summary>관련 링크 ${links.length}개 보기</summary>
        <div class="link-pills">${items}</div>
      </details>
    `;
  }

  function renderOverlay(link) {
    const left = `${link.x * 100}%`;
    const top = `${link.y * 100}%`;
    const width = `${link.w * 100}%`;
    const height = `${link.h * 100}%`;
    const label = `${link.label} 열기`;
    return `
      <a
        class="page-link-overlay"
        href="${escapeHtml(link.uri)}"
        target="_blank"
        rel="noreferrer"
        aria-label="${escapeHtml(label)}"
        title="${escapeHtml(link.label)}"
        style="left:${left};top:${top};width:${width};height:${height};"
      ></a>
    `;
  }

  function renderPage(page, sectionTitle) {
    const loading = page.number <= 10 ? "eager" : "lazy";
    const fetchPriority = page.number <= 4 ? "high" : "auto";
    return `
      <article class="page-card reveal-card" style="--reveal-delay:${Math.min((page.number % 4) * 60, 180)}ms">
        <div class="page-card-head">
          <span class="page-number">${pageLabel(page)}</span>
          <button
            class="zoom-button"
            type="button"
            data-open-lightbox
            data-image="${escapeHtml(page.image)}"
            data-alt="${escapeHtml(page.alt)}"
            data-meta="${escapeHtml(`${sectionTitle} · ${pageLabel(page)}`)}"
          >
            확대 보기
          </button>
        </div>
        <div class="page-frame">
          <img
            class="page-image"
            src="${escapeHtml(page.image)}"
            alt="${escapeHtml(page.alt)}"
            loading="${loading}"
            fetchpriority="${fetchPriority}"
            decoding="async"
            data-open-lightbox
            data-image="${escapeHtml(page.image)}"
            data-alt="${escapeHtml(page.alt)}"
            data-meta="${escapeHtml(`${sectionTitle} · ${pageLabel(page)}`)}"
          />
          ${page.links.map(renderOverlay).join("")}
        </div>
      </article>
    `;
  }

  function renderSection(section, index) {
    return `
      <section
        class="chapter-section reveal-section"
        id="${escapeHtml(section.id)}"
        data-section="${escapeHtml(section.id)}"
        style="--reveal-delay:${Math.min(index * 40, 200)}ms"
      >
        <div class="section-head">
          <div class="section-marker">${escapeHtml(section.numeral)}</div>
          <div class="section-heading">
            <p class="section-kicker">Chapter ${String(index + 1).padStart(2, "0")}</p>
            <h2>${escapeHtml(section.title)}</h2>
            <p class="section-description">${escapeHtml(section.description)}</p>
          </div>
        </div>
        ${renderLinks(section.links)}
        <div class="pages-grid">
          ${section.pages.map((page) => renderPage(page, section.title)).join("")}
        </div>
      </section>
    `;
  }

  function renderCoverOutline() {
    if (!coverOutlineRoot) {
      return;
    }

    coverOutlineRoot.innerHTML = data.sections
      .filter((section) => section.id !== "resources")
      .map(
        (section) => `
          <li>
            <a href="#${escapeHtml(section.id)}">${escapeHtml(section.numeral)}. ${escapeHtml(section.title)}</a>
          </li>
        `
      )
      .join("");
  }

  function renderTabs() {
    tabsRoot.innerHTML = data.sections
      .map(
        (section, index) => `
          <button
            class="chapter-tab${index === 0 ? " is-active" : ""}"
            type="button"
            data-tab-target="${escapeHtml(section.id)}"
            aria-current="${index === 0 ? "true" : "false"}"
          >
            ${escapeHtml(section.tab)}
          </button>
        `
      )
      .join("");
  }

  function renderSections() {
    sectionsRoot.innerHTML = data.sections.map(renderSection).join("");
  }

  function openLightbox(image, alt, meta) {
    lightboxImage.src = image;
    lightboxImage.alt = alt;
    lightboxMeta.textContent = meta;
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImage.removeAttribute("src");
    lightboxImage.alt = "";
    lightboxMeta.textContent = "";
    document.body.classList.remove("lightbox-open");
  }

  function syncProgress() {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = total <= 0 ? 0 : Math.min(window.scrollY / total, 1);
    progressBar.style.width = `${ratio * 100}%`;
  }

  function isMobileViewport() {
    return window.innerWidth <= 780;
  }

  function clearTabHintTimers() {
    tabHintTimers.forEach((timerId) => window.clearTimeout(timerId));
    tabHintTimers = [];
    tabsRoot.classList.remove("is-hinting");
  }

  function getTabsRestOffset() {
    const maxScroll = Math.max(0, tabsRoot.scrollWidth - tabsRoot.clientWidth);
    return Math.min(mobileTabsRestOffset, maxScroll);
  }

  function syncTabsOverflowState() {
    if (!tabsShell) {
      return;
    }

    const maxScroll = Math.max(0, tabsRoot.scrollWidth - tabsRoot.clientWidth);
    const hasOverflow = maxScroll > 24;
    const isAtEnd = !hasOverflow || tabsRoot.scrollLeft >= maxScroll - 8;
    tabsShell.classList.toggle("is-overflowing", hasOverflow);
    tabsShell.classList.toggle("is-scrolled-end", isAtEnd);
  }

  function maybeRevealActiveTab(button) {
    if (!button || !isMobileViewport()) {
      return;
    }

    const shellRect = tabsRoot.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const outOfView =
      buttonRect.left < shellRect.left + 10 || buttonRect.right > shellRect.right - 18;

    if (outOfView) {
      button.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }

  function playTabsHintMotion() {
    if (tabHintPlayed || prefersReducedMotion.matches || !isMobileViewport()) {
      return;
    }

    const maxScroll = Math.max(0, tabsRoot.scrollWidth - tabsRoot.clientWidth);
    if (maxScroll <= 24) {
      return;
    }

    tabHintPlayed = true;
    tabsRoot.classList.add("is-hinting");
    const hintDistance = Math.min(118, maxScroll);
    const restOffset = getTabsRestOffset();

    tabHintTimers.push(
      window.setTimeout(() => {
        tabsRoot.scrollTo({ left: hintDistance, behavior: "smooth" });
      }, 180)
    );

    tabHintTimers.push(
      window.setTimeout(() => {
        tabsRoot.scrollTo({ left: restOffset, behavior: "smooth" });
      }, 1150)
    );

    tabHintTimers.push(
      window.setTimeout(() => {
        tabsRoot.classList.remove("is-hinting");
        syncTabsOverflowState();
      }, 1850)
    );
  }

  function bindTabsHintMotion() {
    if (!chapterNav) {
      return;
    }

    const hintObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (!visible) {
          return;
        }
        playTabsHintMotion();
        if (tabHintPlayed) {
          hintObserver.disconnect();
        }
      },
      {
        threshold: 0.35,
      }
    );

    hintObserver.observe(chapterNav);
  }

  function syncToTopButton() {
    if (!toTopButton) {
      return;
    }
    toTopButton.classList.toggle("is-visible", window.scrollY > 240);
  }

  function setActiveTab(id) {
    document.querySelectorAll("[data-tab-target]").forEach((button) => {
      const active = button.dataset.tabTarget === id;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-current", active ? "true" : "false");
      if (active) {
        maybeRevealActiveTab(button);
      }
    });
  }

  function bindEvents() {
    tabsRoot.addEventListener("click", (event) => {
      const button = event.target.closest("[data-tab-target]");
      if (!button) {
        return;
      }
      const section = document.getElementById(button.dataset.tabTarget);
      if (!section) {
        return;
      }
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    tabsRoot.addEventListener(
      "scroll",
      () => {
        syncTabsOverflowState();
      },
      { passive: true }
    );

    tabsRoot.addEventListener("pointerdown", clearTabHintTimers, { passive: true });
    tabsRoot.addEventListener("touchstart", clearTabHintTimers, { passive: true });

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-open-lightbox]");
      if (!trigger) {
        return;
      }
      openLightbox(trigger.dataset.image, trigger.dataset.alt, trigger.dataset.meta);
    });

    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox || event.target === lightboxClose) {
        closeLightbox();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !lightbox.hidden) {
        closeLightbox();
      }
    });

    if (toTopButton) {
      toTopButton.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    window.addEventListener(
      "scroll",
      () => {
        syncProgress();
        syncToTopButton();
      },
      { passive: true }
    );

    window.addEventListener("resize", () => {
      syncProgress();
      syncTabsOverflowState();
      syncToTopButton();
      if (!tabHintPlayed && isMobileViewport()) {
        tabsRoot.scrollLeft = getTabsRestOffset();
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setActiveTab(visible.target.id);
        }
      },
      {
        rootMargin: "-22% 0px -58% 0px",
        threshold: [0.15, 0.35, 0.6],
      }
    );

    document.querySelectorAll("[data-section]").forEach((section) => observer.observe(section));
  }

  function bindRevealAnimations() {
    function revealVisibleNow() {
      document.querySelectorAll(".reveal-section, .reveal-card").forEach((node) => {
        const rect = node.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.96 && rect.bottom > 0) {
          node.classList.add("is-visible");
        }
      });
    }

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -8% 0px",
        threshold: 0.12,
      }
    );

    document.querySelectorAll(".reveal-section, .reveal-card").forEach((node) => {
      revealObserver.observe(node);
    });

    revealVisibleNow();
    window.addEventListener("load", revealVisibleNow, { once: true });
    window.addEventListener("scroll", revealVisibleNow, { passive: true });
  }

  titleNode.textContent = data.title;
  pdfLink.href = encodeURI(data.pdfPath);
  renderCoverOutline();
  renderTabs();
  renderSections();
  bindEvents();
  bindTabsHintMotion();
  bindRevealAnimations();
  syncProgress();
  if (isMobileViewport()) {
    tabsRoot.scrollLeft = getTabsRestOffset();
  }
  syncTabsOverflowState();
  syncToTopButton();
})();
