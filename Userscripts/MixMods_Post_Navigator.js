// ==UserScript==
// @name            MixMods Post Navigator
// @version         1.0.0
// @author          ChaliceChore
// @namespace       https://github.com/ChaliceChore/JSScripts/Userscripts
// @description:en  Floating overlay buttons to jump between posts. Supports double-click pagination with auto-scroll, PT-BR/English labels (translation locked only when GTranslate is explicitly set to English), a collapsed FAB on mobile, long-press tooltips, styling that follows the site's own light/dark toggle, and confirm-state tooltips that stay in the visitor's chosen GTranslate language.
// @license         CC BY-NC-SA 4.0
// @match           https://www.mixmods.com.br/*
// @icon            https://www.mixmods.com.br/favicon.ico
// @grant           none
// @run-at          document-idle
// @downloadURL     https://github.com/ChaliceChore/JSScripts/blob/main/Userscripts/MixMods_Post_Navigator.js
// @updateURL       https://github.com/ChaliceChore/JSScripts/blob/main/Userscripts/MixMods_Post_Navigator.js
// ==/UserScript==

(() => {
    "use strict";

    // Individual post pages use the date-based permalink /YYYY/MM/slug/ —
    // everything else (homepage, category/tag listings, /page/N/, etc.)
    // is a listing page and should get the nav overlay.
    const EXCLUDED_PATH = /^\/\d+\/\d+\/[^\/]+\/?$/;
    if (EXCLUDED_PATH.test(location.pathname))
        return;

    const findPosts = () => {
        const scope = document.querySelector("#content") ||
            document.querySelector("main") ||
            document.body;
        const selectors = [
            ".entry-title",
            'article[id^="post-"] h2',
            "article.post h2",
            "h2.entry-title",
        ];
        for (const selector of selectors) {
            const found = scope.querySelectorAll(selector);
            if (found.length)
                return Array.from(found);
        }
        return [];
    };

    const posts = findPosts();
    if (posts.length === 0)
        return;

    // ── Language detection ───────────────────────────────────────────────────
    // The site's native language is Portuguese; the GTranslate widget lets
    // visitors translate the page into any language. We only need to decide
    // two things: which baseline text to render (pt/en), and whether to stop
    // GTranslate from re-translating that text afterward. We only lock
    // translation when the visitor has explicitly picked English — GTranslate
    // re-scanning the DOM on reflow can otherwise bounce our English labels
    // back out into whatever the page's default is. For any other explicit
    // selection (including Portuguese), we leave translation enabled so
    // GTranslate keeps the labels in sync with the rest of the page.
    const detectLanguage = () => {
        // 1. Google Translate widget"s currently selected language
        const wrapper = document.querySelector(".gtranslate_wrapper");
        let selectedValue = "";
        if (wrapper) {
            const selected = wrapper.querySelector("option[selected]") ||
                wrapper.querySelector("select")?.selectedOptions?.[0];
            selectedValue = (selected?.value || selected?.textContent || "").toLowerCase();
        }

        const isEnglishSelected = selectedValue.includes("en");
        if (isEnglishSelected)
            return {
                lang: "en",
                allowTranslation: false,
            };

        // 2. Fallback: 
        // No explicit English selection (a different language is selected,
        // or GTranslate hasn't reported a selection at all) — pick a
        // baseline via the HTML lang attribute, then the GTranslate value
        // itself, defaulting to English, and allow translation to proceed.
        const htmlLang = (document.documentElement.lang || "").toLowerCase();
        const baseline = htmlLang
            ? (htmlLang.startsWith("pt") ? "pt" : "en")
            : (selectedValue.startsWith("pt") || selectedValue.includes("portug") ? "pt" : "en");

        return {
            lang: baseline,
            allowTranslation: true,
        };
    };

    const { lang: LANG, allowTranslation: ALLOW_TRANSLATION } = detectLanguage();

    const LABELS = {
        pt: {
            top:         "Primeiro post",
            prev:        "Post anterior",
            next:        "Próximo post",
            last:        "Último post",
            confirmNext: "Confirmar: Próxima página?",
            confirmPrev: "Confirmar: Página anterior?",
            toggle:      "Mostrar navegação",
        },
        en: {
            top:         "First post",
            prev:        "Previous post",
            next:        "Next post",
            last:        "Last post",
            confirmNext: "Confirm: Next page?",
            confirmPrev: "Confirm: Previous page?",
            toggle:      "Show navigation",
        },
    };

    const TEXTS = LABELS[LANG];

    // ── Pagination & Persistence Logic ───────────────────────────────────────
    const SCROLL_STORAGE_KEY = "mm_nav_target";
    let nextConfirm = false;
    let prevConfirm = false;

    const getBasePath = () => {
        // Strip a trailing /page/N/ segment (if present) to get the
        // listing"s own base path, e.g.
        // "/gta-sa/carros/page/2/" -> "/gta-sa/carros/"
        let base = window.location.pathname.replace(/page\/\d+\/?$/, "");
        if (!base.endsWith("/"))
            base += "/";
        return base;
    };

    const getPageNumber = () => {
        const match = window.location.pathname.match(/\/page\/(\d+)\//);
        return match
            ? parseInt(match[1])
            : 1;
    };

    /**
     * @param {number} num - Page number to go to
     * @param {"first"|"last"} scrollTarget - Where to scroll after load
     */
    const goToPage = (num, scrollTarget) => {
        if (num < 1)
            return;

        sessionStorage.setItem(SCROLL_STORAGE_KEY, scrollTarget);
        const base = getBasePath();
        window.location.href = num === 1
            ? `https://www.mixmods.com.br${base}`
            : `https://www.mixmods.com.br${base}page/${num}/`;
    };

    const CONFIRM_TIMEOUT_MS = 3500;

    const resetConfirms = () => {
        nextConfirm = false;
        prevConfirm = false;
        clearTimeout(window.mmConfirmTimeout);
        document.querySelectorAll(".mm-nav button").forEach(
            (btn) => btn.classList.remove("mm-confirm")
        );
    };

    const armConfirmTimeout = () => {
        clearTimeout(window.mmConfirmTimeout);
        window.mmConfirmTimeout = setTimeout(resetConfirms, CONFIRM_TIMEOUT_MS);
    };

    // ── Navigation Helpers ───────────────────────────────────────────────────
    const HEADER_OFFSET = 24;
    const EPS = 10;

    const offsetTopOf = (el) =>
        el.getBoundingClientRect().top + window.pageYOffset - HEADER_OFFSET;
    
    const scrollToEl = (el) => {
        if (!el)
            return;

        window.scrollTo({
            top: Math.max(0, offsetTopOf(el)),
            behavior: "smooth",
        });
        resetConfirms();
    };

    const goTop  = () => scrollToEl(posts[0]);

    const goLast = () => scrollToEl(posts[posts.length - 1]);

    const goPrev = () => {
        const currentTop = window.pageYOffset;
        const firstPostTop = offsetTopOf(posts[0]);

        if (currentTop <= firstPostTop + EPS) {
            const currentPage = getPageNumber();
            if (currentPage > 1)
                if (!prevConfirm) {
                    resetConfirms();
                    prevConfirm = true;
                    document.querySelector('[data-action="prev"]').classList.add("mm-confirm");
                    armConfirmTimeout();
                } else
                    goToPage(currentPage - 1, "last"); // Go to prev page, scroll to bottom
            return;
        }

        let target = posts[0];
        for (let i = 0; i < posts.length; i++) {
            if (offsetTopOf(posts[i]) < currentTop - EPS)
                target = posts[i];
            else
                break;
        }
        scrollToEl(target);
    };

    const goNext = () => {
        const currentTop = window.pageYOffset;
        const lastPostTop = offsetTopOf(posts[posts.length - 1]);

        if (currentTop >= lastPostTop - EPS) {
            if (!nextConfirm) {
                resetConfirms();
                nextConfirm = true;
                document.querySelector('[data-action="next"]').classList.add("mm-confirm");
                armConfirmTimeout();
            } else
                goToPage(getPageNumber() + 1, "first"); // Go to next page, scroll to top
            return;
        }

        let target = posts[posts.length - 1];
        for (let i = 0; i < posts.length; i++) {
            if (offsetTopOf(posts[i]) > currentTop + EPS) {
                target = posts[i];
                break;
            }
        }
        scrollToEl(target);
    };

    // Check if we just arrived from another page and need to scroll
    const checkPendingScroll = () => {
        const target = sessionStorage.getItem(SCROLL_STORAGE_KEY);
        if (!target) 
            return;
        
        sessionStorage.removeItem(SCROLL_STORAGE_KEY);
        if (target === "first")
            goTop();
        if (target === "last")
            goLast();
    };

    // ── UI & Events ──────────────────────────────────────────────────────────
    window.addEventListener("scroll", () => {
        if (!nextConfirm && !prevConfirm)
            return;
        
        clearTimeout(window.mmScrollTimeout);
        window.mmScrollTimeout = setTimeout(() => {
            resetConfirms();
        }, 500);
    }, { passive: true });

    const ICONS = {
        top:    '<path d="M12 19V6M12 6l-5 5M12 6l5 5"/><path d="M5 4h14" stroke-linecap="round"/>',
        prev:   '<path d="M6 15l6-6 6 6"/>',
        next:   '<path d="M6 9l6 6 6-6"/>',
        last:   '<path d="M12 5v13M12 18l5-5M12 18l-5-5"/><path d="M5 20h14" stroke-linecap="round"/>',
        toggle: '<path d="M7 15l5 5 5-5"/><path d="M7 9l5-5 5 5"/>',
    };

    const getSvgHtml = (name) => /* html */`
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" 
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            ${ICONS[name]}
        </svg>`;

    // Builds the floating action buttons / mobile FAB, injects their
    // styling, and wires up all of their interaction behavior (long-press
    // tooltips, mobile expand/collapse, and following the site's theme
    // toggle). Confirm-state tooltips are pre-rendered and switched purely
    // via CSS (see the "mm-tip-default"/"mm-tip-confirm" rules) rather than
    // rewritten at runtime, so GTranslate's translation of them survives.
    const createFloatingNav = () => {
        const style = document.createElement("style");
        style.textContent = /* css */`
            .mm-nav {
                position: fixed;
                right: 22px;
                bottom: 90px;
                z-index: 999999;
                display: flex;
                flex-direction: column;
                gap: 10px;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                user-select: none;
            }
            .mm-nav button {
                position: relative;
                width: 48px;
                height: 48px;
                border-radius: 50%;
                border: 1px solid rgba(0, 0, 0, 0.08);
                cursor: pointer;
                background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(238, 238, 244, 0.94));
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                color: #5b4fc4;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 14px rgba(20, 20, 30, 0.14), inset 0 0 0 1px rgba(255, 255, 255, 0.6);
                transition: all .15s ease;
                padding: 0;
            }
            .mm-nav button:hover {
                transform: translateY(-2px) scale(1.06);
                color: #453aa8;
                box-shadow: 0 8px 20px rgba(91, 79, 196, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.8);
                background: linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(230, 230, 240, 0.98));
            }
            .mm-nav button.mm-confirm {
                color: #fff !important;
                background: #5b4fc4 !important;
                border-color: #453aa8;
                animation: mm-pulse 1.5s infinite;
            }
            @keyframes mm-pulse {
                0%   { box-shadow: 0 0 0 0 rgba(91, 79, 196, 0.5); }
                70%  { box-shadow: 0 0 0 10px rgba(91, 79, 196, 0); }
                100% { box-shadow: 0 0 0 0 rgba(91, 79, 196, 0); }
            }
            .mm-nav button .mm-tip {
                position: absolute;
                right: 58px;
                top: 50%;
                transform: translateY(-50%) translateX(4px);
                white-space: nowrap;
                background: rgba(255, 255, 255, 0.98);
                color: #222226;
                padding: 6px 12px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 600;
                border: 1px solid rgba(0, 0, 0, 0.08);
                opacity: 0;
                pointer-events: none;
                transition: all .15s ease;
                box-shadow: 0 4px 12px rgba(20, 20, 30, 0.18);
            }
            .mm-nav button:hover .mm-tip {
                opacity: 1;
                transform: translateY(-50%) translateX(0);
            }
            .mm-nav button .mm-tip-confirm {
                display: none;
            }
            .mm-nav button.mm-confirm .mm-tip-default {
                display: none;
            }
            .mm-nav button.mm-confirm .mm-tip-confirm {
                display: block;
            }
            @media (prefers-color-scheme: dark) {
                .mm-nav button {
                    border-color: rgba(255, 255, 255, 0.12);
                    background: linear-gradient(160deg, rgba(40, 42, 50, 0.95), rgba(25, 26, 32, 0.95));
                    color: #8e86c9;
                    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.03);
                }
                .mm-nav button:hover {
                    color: #b0a9df;
                    box-shadow: 0 8px 20px rgba(78, 71, 132, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.06);
                    background: linear-gradient(160deg, rgba(55, 58, 70, 0.98), rgba(35, 36, 42, 0.98));
                }
                .mm-nav button.mm-confirm {
                    background: #4e4784 !important;
                    border-color: #8e86c9;
                }
                @keyframes mm-pulse {
                    0%   { box-shadow: 0 0 0 0 rgba(78, 71, 132, 0.7); }
                    70%  { box-shadow: 0 0 0 10px rgba(78, 71, 132, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(78, 71, 132, 0); }
                }
                .mm-nav button .mm-tip {
                    background: rgba(25, 26, 32, 0.98);
                    color: #f2f2f2;
                    border-color: rgba(255, 255, 255, 0.1);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
                }
            }
            /* Explicit site-toggle overrides — win over both the light default
            and the prefers-color-scheme fallback above, since the site's own
            toggle reflects the visitor's actual chosen theme. */
            .mm-nav.mm-theme-dark button {
                border-color: rgba(255, 255, 255, 0.12);
                background: linear-gradient(160deg, rgba(40, 42, 50, 0.95), rgba(25, 26, 32, 0.95));
                color: #8e86c9;
                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.35), inset 0 0 0 1px rgba(255, 255, 255, 0.03);
            }
            .mm-nav.mm-theme-dark button:hover {
                color: #b0a9df;
                box-shadow: 0 8px 20px rgba(78, 71, 132, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.06);
                background: linear-gradient(160deg, rgba(55, 58, 70, 0.98), rgba(35, 36, 42, 0.98));
            }
            .mm-nav.mm-theme-dark button.mm-confirm {
                background: #4e4784 !important;
                border-color: #8e86c9;
            }
            .mm-nav.mm-theme-dark button .mm-tip {
                background: rgba(25, 26, 32, 0.98);
                color: #f2f2f2;
                border-color: rgba(255, 255, 255, 0.1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
            }
            .mm-nav.mm-theme-light button {
                border-color: rgba(0, 0, 0, 0.08);
                background: linear-gradient(160deg, rgba(255, 255, 255, 0.94), rgba(238, 238, 244, 0.94));
                color: #5b4fc4;
                box-shadow: 0 4px 14px rgba(20, 20, 30, 0.14), inset 0 0 0 1px rgba(255, 255, 255, 0.6);
            }
            .mm-nav.mm-theme-light button:hover {
                color: #453aa8;
                box-shadow: 0 8px 20px rgba(91, 79, 196, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.8);
                background: linear-gradient(160deg, rgba(255, 255, 255, 0.98), rgba(230, 230, 240, 0.98));
            }
            .mm-nav.mm-theme-light button.mm-confirm {
                background: #5b4fc4 !important;
                border-color: #453aa8;
            }
            .mm-nav.mm-theme-light button .mm-tip {
                background: rgba(255, 255, 255, 0.98);
                color: #222226;
                border-color: rgba(0, 0, 0, 0.08);
                box-shadow: 0 4px 12px rgba(20, 20, 30, 0.18);
            }
            .mm-nav .mm-toggle {
                display: none;
            }
            .mm-actions {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            @media (max-width: 600px) {
                .mm-nav {
                    right: 22px;
                    bottom: 50px;
                    gap: 8px;
                }
                .mm-nav button {
                    width: 44px;
                    height: 44px;
                }

                .mm-nav button.mm-show-tip .mm-tip {
                    opacity: 1;
                    transform: translateY(-50%) translateX(0);
                }

                .mm-nav .mm-toggle {
                    display: flex;
                }
                .mm-nav .mm-toggle svg {
                    transition: transform .2s ease;
                }
                .mm-nav.mm-expanded .mm-toggle svg {
                    transform: rotate(180deg);
                }
                .mm-actions {
                    display: none;
                }
                .mm-nav.mm-expanded .mm-actions {
                    display: flex;
                    animation: mm-expand .18s ease;
                }
                @keyframes mm-expand {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    } to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            }
        `;
        document.head.appendChild(style);

        const container = document.createElement("div");
        if (ALLOW_TRANSLATION)
            container.className = "mm-nav";
        else {
            container.className = "mm-nav notranslate";
            container.setAttribute("translate", "no");
        }

        const actions = document.createElement("div");
        actions.className = "mm-actions";

        const buttonConfigs = [
            { id: "top" , icon: "top" , label: TEXTS.top  , action: goTop  },
            { id: "prev", icon: "prev", label: TEXTS.prev , action: goPrev, confirmLabel: TEXTS.confirmPrev },
            { id: "next", icon: "next", label: TEXTS.next , action: goNext, confirmLabel: TEXTS.confirmNext },
            { id: "last", icon: "last", label: TEXTS.last , action: goLast },
        ];

        const LONG_PRESS_MS = 450;
        const TIP_LINGER_MS = 1200;

        buttonConfigs.forEach((config) => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.dataset.action = config.id;
            btn.setAttribute("aria-label", config.label);

            // Both tooltip variants are rendered up front and switched
            // purely via CSS (the "mm-confirm" class). This matters for
            // GTranslate: it only translates text that's present in the DOM
            // at scan time — if we instead rewrote .textContent on click
            // (as before), the freshly-injected text would show up
            // untranslated (falling back to the script's own PT/EN
            // baseline) instead of staying in the visitor's chosen language.
            const tipHtml = config.confirmLabel
                ? `<span class="mm-tip mm-tip-default">${config.label}</span>` +
                  `<span class="mm-tip mm-tip-confirm">${config.confirmLabel}</span>`
                : `<span class="mm-tip mm-tip-default">${config.label}</span>`;
            btn.innerHTML = `${getSvgHtml(config.icon)} ${tipHtml}`;

            let pressTimer = null;
            let longPressActive = false;

            btn.addEventListener("touchstart", () => {
                longPressActive = false;
                clearTimeout(pressTimer);
                pressTimer = setTimeout(() => {
                    longPressActive = true;
                    btn.classList.add("mm-show-tip");
                }, LONG_PRESS_MS);
            }, { passive: true });

            const endPress = () => {
                clearTimeout(pressTimer);
                if (longPressActive)
                    setTimeout(() => btn.classList.remove("mm-show-tip"), TIP_LINGER_MS);
            };
            btn.addEventListener("touchend", endPress);
            btn.addEventListener("touchcancel", endPress);

            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                // A long press that revealed the tooltip shouldn"t also fire
                // the button"s action on the touchend-triggered click.
                if (longPressActive) {
                    longPressActive = false;
                    return;
                }
                config.action();
            });
            actions.appendChild(btn);
        });

        // Mobile-only FAB toggle: collapses the four actions into a single
        // button that expands on first touch. Hidden via CSS on desktop, where
        // the actions are always shown. Appended last so it stays anchored at
        // the same position regardless of expanded/collapsed state.
        const toggleBtn = document.createElement("button");
        toggleBtn.type = "button";
        toggleBtn.className = "mm-toggle";
        toggleBtn.setAttribute("aria-label", TEXTS.toggle);
        toggleBtn.setAttribute("aria-expanded", "false");
        toggleBtn.innerHTML = getSvgHtml("toggle");
        toggleBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const expanded = container.classList.toggle("mm-expanded");
            toggleBtn.setAttribute("aria-expanded", String(expanded));
        });

        // Tapping outside the widget while expanded collapses it back down.
        document.addEventListener("click", (e) => {
            if (container.classList.contains("mm-expanded") && !container.contains(e.target)) {
                container.classList.remove("mm-expanded");
                toggleBtn.setAttribute("aria-expanded", "false");
            }
        });

        container.appendChild(actions);
        container.appendChild(toggleBtn);
        document.body.appendChild(container);

        // ── Site theme sync ──────────────────────────────────────────────
        // MixMods has its own light/dark toggle (a widget with a ".wpnm-button"
        // switch that gains an "active" class in dark mode). When present, that
        // reflects the visitor's actual chosen theme more accurately than the
        // OS-level prefers-color-scheme media query, so mirror it directly and
        // keep watching it in case the visitor flips the toggle live.
        const THEME_TOGGLE_SELECTOR = ".widget.widget_block .wpnm-button";

        const applySiteTheme = () => {
            const toggleEl = document.querySelector(THEME_TOGGLE_SELECTOR);
            if (!toggleEl)
                return; // no site toggle found — fall back to prefers-color-scheme

            const isDark = toggleEl.classList.contains("active");
            container.classList.toggle("mm-theme-dark", isDark);
            container.classList.toggle("mm-theme-light", !isDark);
        };

        // Initial application of site theme
        applySiteTheme();

        const themeToggleEl = document.querySelector(THEME_TOGGLE_SELECTOR);
        if (themeToggleEl)
            new MutationObserver(applySiteTheme).observe(themeToggleEl, {
                attributes: true,
                attributeFilter: ["class"],
            });
    };

    createFloatingNav();

    // Initial check for cross-page navigation
    checkPendingScroll();
})();
