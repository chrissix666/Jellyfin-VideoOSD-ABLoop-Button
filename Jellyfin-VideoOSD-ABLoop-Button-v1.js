function abIsSupportedPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = ['mobi', 'ipad', 'iphone', 'ipod', 'silk', 'opera mini'].some((term) => ua.includes(term));
  const isTv = ['tv', 'samsungbrowser', 'viera', 'web0s'].some((term) => ua.includes(term));
  const isTizen = ua.includes('tizen') || window.tizen != null;
  const isAndroid = ua.includes('android');
  const isIOS = ['ipad', 'iphone', 'ipod'].some((term) => ua.includes(term)) || (ua.includes('macintosh') && navigator.maxTouchPoints > 1);
  return !(isMobile || isTv || isTizen || isAndroid || isIOS);
}
(function () {
  'use strict';
  if (!abIsSupportedPlatform()) return;

  // ---- PLUGIN ADAPTER: config source, retrofit for VideoOSD Tweaks and Candy ----
  // GUID of the "VideoOSD Tweaks and Candy" Jellyfin plugin. Used only to
  // ask Jellyfin's own ApiClient for this plugin's saved settings. If the
  // plugin isn't installed (standalone JS-injector usage, as before), the
  // request below fails and everything falls back to the exact same local
  // CONFIG defaults this script always had -- zero behavior change for
  // standalone users.
  const PLUGIN_GUID = '468b1980-7a6c-4e45-a129-24825085ece4';

  // FIX for a real bug found live, the SAME systemic race condition
  // already found and fixed in the Core script much earlier in this
  // project, but never carried over to this adapter: Jellyfin is a
  // single-page app, this script's <script defer> tag runs once, at
  // the very first index.html parse, which can easily happen BEFORE
  // Jellyfin's own window.ApiClient global has finished initializing.
  // The original version below gave up permanently on the very first
  // failed attempt (no retry at all), silently falling back to the
  // standalone defaults for the entire browser session even when the
  // plugin genuinely was installed and configured -- confirmed live,
  // caught via unmistakably wrong margin values (the old standalone
  // "balanced" math) rendering even though the plugin's own config
  // page showed correct values the whole time. Retries every 250ms
  // for up to 30 seconds, generous enough for a slow app bootstrap,
  // not literally forever in case something else is wrong.
  async function fetchPluginConfig() {
    const maxAttempts = 120;
    const delayMs = 250;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (window.ApiClient && typeof ApiClient.getPluginConfiguration === 'function') {
        try {
          const config = await ApiClient.getPluginConfiguration(PLUGIN_GUID);
          if (config) return config;
        } catch (err) {
          // fall through, try again after the delay below
        }
      }
      await new Promise(function (resolve) { setTimeout(resolve, delayMs); });
    }
    return null;
  }

  function applyPluginConfig(pluginConfig) {
    if (!pluginConfig) return;

    // Plugin is present -- switch spacing calculation over to the new,
    // simpler plugin-driven system entirely (see applySpacing() below).
    usingPluginGap = true;

    if (typeof pluginConfig.ABLoopHideOnNarrowWindow === 'boolean') {
      CONFIG.hideOnNarrowWindow = pluginConfig.ABLoopHideOnNarrowWindow;
    }

    // Individual Centered Gap Override (this mod's own tab) takes
    // precedence over the General Centered Gap (General tab) when enabled.
    CONFIG.centeredGapEm = pluginConfig.ABLoopIndividualCenteredGapOverride
      ? (Number(pluginConfig.ABLoopCenteredGapValue) || 0)
      : (Number(pluginConfig.GeneralCenteredGap) || 0);
  }
  // ---- END PLUGIN ADAPTER ----

  // Tracks which of the two spacing calculations below is currently
  // active. Starts false (standalone/original math) and is flipped to
  // true only if a real plugin config was actually fetched successfully,
  // see applyPluginConfig() above. Kept as the single place this decision
  // is made, applySpacing() itself just reads this flag.
  let usingPluginGap = false;

  const CONFIG = {
    activeColor: '#00a4dc',
    addonId: 'abLoopButton',
    addonLabel: 'A-B Loop',
    buttonId: 'btnAbLoop',
    // ---- CUSTOM CONFIG START ----

    // ============================================================
    // == STANDALONE VALUES (JavaScript Injector, no plugin) ==
    // Only used when usingPluginGap is false, i.e. no plugin config
    // could be fetched. Untouched originals -- do not change these
    // to "match" the plugin defaults below, that would alter
    // standalone/JS-injector-only behavior, which this whole
    // adapter approach is specifically meant to avoid.
    // ============================================================
    spacingMode: 'balanced', // 'seamless' (no other custom OSD buttons) or 'balanced' (used together with other injected custom buttons)
    symmetricExtraGapEm: 2.1, // target gap in em on both sides (only applies when spacingMode is 'balanced', ignored in 'seamless')

    // ============================================================
    // == PLUGIN-ONLY VALUES ==
    // Only ever used once a plugin config was actually fetched
    // (usingPluginGap becomes true), overwritten by
    // applyPluginConfig() with the real admin-configured values at
    // that point. The number here is just a safe fallback default,
    // irrelevant to standalone usage.
    // ============================================================
    centeredGapEm: 0,

    // ============================================================
    // == SHARED VALUE (both standalone and plugin usage) ==
    // Standalone: stays exactly this hardcoded default, unless
    // hand-edited in this file directly (see README).
    // Plugin: overwritten by applyPluginConfig() with the admin's
    // "Hide on Narrow Window" setting once fetched.
    // ============================================================
    hideOnNarrowWindow: true // mimics Jellyfin's own vanilla window-width behavior (e.g. chapter jump buttons), auto-hides this button below 50em window width
    // ---- CUSTOM CONFIG END ----
  };
  const BALANCED_FIXED_OFFSET = {
    left: 0.29,
    right: 1.85
  };
  const ICON_SVG = '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M5.5,11.5 L5.5,5 L17.82,5 L17.82,8.5 L15.82,8.5 L15.82,7 L7.5,7 L7.5,11.5 Z" fill="currentColor"/><polygon points="13.32,8.5 20.32,8.5 16.82,11.5" fill="currentColor"/><path class="abIconLetterA" d="m6.0137 12.643-2.0137 5.377h0.97461l0.46484-1.3691h2.1152l0.48438 1.3691h0.97852l-1.998-5.377h-1.0059zm0.47266 0.79883h0.015625c0.025 0.155 0.047812 0.26789 0.070312 0.33789l0.74609 2.1445h-1.6465l0.74023-2.1445c0.0275-0.0825 0.051719-0.19539 0.074219-0.33789z" fill="currentColor" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/><path class="abIconLetterB" d="m15.418 12.643v5.377h1.7266c0.5525 0 1.0086-0.14273 1.3711-0.42773s0.54492-0.65719 0.54492-1.1172c0-0.37-0.11148-0.67039-0.33398-0.90039-0.22-0.2325-0.51476-0.36961-0.88476-0.41211v-0.013671c0.305-0.095001 0.54234-0.25547 0.71484-0.48047s0.25976-0.48992 0.25976-0.79492c0-0.365-0.15203-0.66117-0.45703-0.88867-0.3025-0.2275-0.71438-0.3418-1.2344-0.3418h-1.707zm0.88867 0.7168h0.65039c0.615 0 0.92188 0.22945 0.92188 0.68945 0 0.2675-0.088125 0.47555-0.26562 0.62305-0.175 0.145-0.41852 0.2168-0.72852 0.2168h-0.57812v-1.5293zm0 2.2461h0.64648c0.7725 0 1.1582 0.27844 1.1582 0.83594 0 0.27-0.090937 0.48172-0.27344 0.63672-0.18 0.1525-0.43703 0.22852-0.76953 0.22852h-0.76172v-1.7012z" fill="currentColor" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/></svg>';
  let state = 0;
  let pointA = null;
  let pointB = null;
  let currentVideo = null;
  let timeUpdateHandler = null;
  let enabled = true;
  let registeredWithMenu = false;
  function applyEnabled(value) {
    enabled = value;
    const btn = document.getElementById(CONFIG.buttonId);
    if (btn) btn.style.display = enabled ? '' : 'none';
    if (!enabled) resetLoop();
  }
  // Same storage key format as the other 4 already-completed mods use
  // (CUSTOMS_API_NAME + '.addon.' + id) -- A-B-Loop never defined these as
  // its own named constants before, it just referenced
  // 'window.JellyfinVideoOSDCustomsMenu' and CONFIG.addonId inline. Added
  // here only so the same seeding line below can be written the same way
  // as the other mods, nothing else changes.
  const CUSTOMS_API_NAME = 'JellyfinVideoOSDCustomsMenu';
  const CUSTOMS_STORAGE_KEY = CUSTOMS_API_NAME + '.addon.' + CONFIG.addonId;

  // FIX, part of the "default-enabled-state" correction: A-B-Loop was the
  // one mod of the 5 completed so far that did NOT pre-seed its own
  // localStorage key before registering. Without this, CustomOnOff-Menu's
  // own isAddonEnabled() found nothing there yet and defaulted to
  // disabled, unlike the other 4 mods, which already default to enabled.
  // This makes A-B-Loop consistent with the other 4: once loaded (i.e.
  // once the plugin's EnableABLoop allowed the script to be delivered at
  // all, or in standalone usage where it always loads), it starts visible
  // in the Customs Menu by default, matching the "if it's on, you expect
  // to see it" principle confirmed by the user, same as the other 4.
  function tryRegisterWithMenu() {
    if (registeredWithMenu) return;
    const api = window.JellyfinVideoOSDCustomsMenu;
    if (!api || typeof api.registerAddon !== 'function') return;

    if (localStorage.getItem(CUSTOMS_STORAGE_KEY) === null) {
      localStorage.setItem(CUSTOMS_STORAGE_KEY, 'true');
    }

    api.registerAddon({
      id: CONFIG.addonId,
      name: CONFIG.addonLabel,
      enable: () => applyEnabled(true),
      disable: () => applyEnabled(false)
    });
    registeredWithMenu = true;
  }
  function getVideoElement() {
    return document.querySelector('video');
  }
  function resetLoop() {
    state = 0;
    pointA = null;
    pointB = null;
    detachTimeUpdate();
    updateButtonVisual();
  }
  function attachTimeUpdate(video) {
    detachTimeUpdate();
    timeUpdateHandler = function () {
      if (state === 2 && pointB !== null && video.currentTime >= pointB) {
        video.currentTime = pointA;
      }
    };
    video.addEventListener('timeupdate', timeUpdateHandler);
    currentVideo = video;
  }
  function detachTimeUpdate() {
    if (currentVideo && timeUpdateHandler) {
      currentVideo.removeEventListener('timeupdate', timeUpdateHandler);
    }
    timeUpdateHandler = null;
  }
  function updateButtonVisual() {
    const btn = document.getElementById(CONFIG.buttonId);
    if (!btn) return;
    const letterA = btn.querySelector('.abIconLetterA');
    const letterB = btn.querySelector('.abIconLetterB');
    const colorA = state >= 1 ? CONFIG.activeColor : 'currentColor';
    const colorB = state === 2 ? CONFIG.activeColor : 'currentColor';
    if (letterA) {
      letterA.style.fill = colorA;
      letterA.style.stroke = colorA;
    }
    if (letterB) {
      letterB.style.fill = colorB;
      letterB.style.stroke = colorB;
    }
    btn.classList.toggle('buttonActive', state === 2);
    if (state === 0) {
      btn.title = 'A-B Loop (Punkt A setzen)';
    } else if (state === 1) {
      btn.title = 'Punkt A gesetzt \u2013 Punkt B setzen';
    } else if (state === 2) {
      btn.title = 'Loop aktiv (Klick = beenden)';
    }
  }
  function handleClick() {
    const video = getVideoElement();
    if (!video) return;
    if (state === 0) {
      pointA = video.currentTime;
      pointB = null;
      state = 1;
    } else if (state === 1) {
      if (video.currentTime <= pointA) {
        return;
      }
      pointB = video.currentTime;
      state = 2;
      attachTimeUpdate(video);
    } else if (state === 2) {
      resetLoop();
      return;
    }
    updateButtonVisual();
  }
  const RESPONSIVE_STYLE_ID = 'abLoopResponsiveStyle';
  // Renamed from injectResponsiveStyle() to refreshResponsiveStyle(): the
  // original only ever created the style once and never removed it. Now
  // that CONFIG.hideOnNarrowWindow can change after the fact (plugin
  // config arrives asynchronously, see PLUGIN ADAPTER above), this also
  // has to handle the "turn it back off" case by removing an
  // already-inserted style tag, not just the "turn it on" case.
  function refreshResponsiveStyle() {
    const existing = document.getElementById(RESPONSIVE_STYLE_ID);
    if (!CONFIG.hideOnNarrowWindow) {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    const style = document.createElement('style');
    style.id = RESPONSIVE_STYLE_ID;
    style.textContent = '@media all and (max-width: 50em) { .videoOsdBottom #' + CONFIG.buttonId + ' { display: none !important; } }';
    document.head.appendChild(style);
  }
  function createButton() {
    const btn = document.createElement('button');
    btn.id = CONFIG.buttonId;
    btn.type = 'button';
    btn.title = 'A-B Loop (Punkt A setzen)';
    btn.className = 'paper-icon-button-light autoSize';
    btn.style.display = enabled ? '' : 'none';
    btn.innerHTML = ICON_SVG;
    btn.addEventListener('click', handleClick);
    return btn;
  }
  // Two calculations, chosen by usingPluginGap (see above):
  // - Standalone (no plugin fetched): the exact original "balanced" math,
  //   completely unchanged from before this retrofit.
  // - Plugin present: the new, simpler General/Individual Centered Gap,
  //   baseline 0, applied symmetrically.
  function applySpacing(btn) {
    if (!usingPluginGap) {
      if (CONFIG.spacingMode === 'seamless') {
        btn.style.marginLeft = '';
        btn.style.marginRight = '';
        return;
      }
      btn.style.marginLeft = (CONFIG.symmetricExtraGapEm - BALANCED_FIXED_OFFSET.left) + 'em';
      btn.style.marginRight = (CONFIG.symmetricExtraGapEm - BALANCED_FIXED_OFFSET.right) + 'em';
      return;
    }

    // FIX, corrected after direct discussion with the user and
    // confirmed against the real source: earlier attempts tried to make
    // "gap 0" mean literally 0px (buttons touching) by compensating away
    // the native margin entirely. Checked directly against the real
    // native buttons in the same row (confirmed via the real source:
    // src/controllers/playback/video/index.html has btnPause between
    // btnRewind and btnFastForward, all three sharing the exact same
    // "paper-icon-button-light" class, no special-casing whatsoever) --
    // native buttons are NOT flush against each other, they visibly
    // carry their own "margin: 0 0.29em" on both sides, which combines
    // with a neighbor's own matching margin for a combined ~0.58em gap
    // between any two adjacent native buttons (confirmed via the real
    // CSS: ".videoOsdBottom .buttons" is a plain flex container with no
    // "gap" property of its own, so per-button margin is genuinely the
    // ONLY spacing mechanism at play). "Gap 0" should therefore mean
    // "looks exactly like a native button", not "touching": native
    // 0.29em as the baseline, with the user's own configured gap value
    // added on top for anything beyond that baseline.
    const gapEm = CONFIG.centeredGapEm || 0;
    const NATIVE_BUTTON_MARGIN_EM = 0.29;
    btn.style.marginLeft = (NATIVE_BUTTON_MARGIN_EM + gapEm) + 'em';
    btn.style.marginRight = (NATIVE_BUTTON_MARGIN_EM + gapEm) + 'em';
  }
  function getLastVanillaButton(container) {
    return container.querySelector('.btnNextTrack') || container.querySelector('.btnFastForward');
  }
  function injectButton() {
    const container = document.querySelector('.videoOsdBottom .buttons.focuscontainer-x > div[dir="ltr"]');
    if (!container) return;
    const lastVanilla = getLastVanillaButton(container);
    let btn = document.getElementById(CONFIG.buttonId);
    if (!btn) {
      btn = createButton();
      refreshResponsiveStyle();
      if (lastVanilla) {
        lastVanilla.insertAdjacentElement('afterend', btn);
      } else {
        container.appendChild(btn);
      }
      applySpacing(btn);
      updateButtonVisual();
      return;
    }
    if (btn.parentElement !== container) {
      if (lastVanilla) {
        lastVanilla.insertAdjacentElement('afterend', btn);
      } else {
        container.appendChild(btn);
      }
      applySpacing(btn);
      return;
    }
    if (lastVanilla && lastVanilla.nextElementSibling !== btn) {
      lastVanilla.insertAdjacentElement('afterend', btn);
      applySpacing(btn);
    }
  }
  function watchForVideoChange() {
    const video = getVideoElement();
    if (video && video !== currentVideo) {
      resetLoop();
      currentVideo = video;
    } else if (!video && currentVideo) {
      resetLoop();
      currentVideo = null;
    }
  }
  const observer = new MutationObserver(function () {
    tryRegisterWithMenu();
    injectButton();
    watchForVideoChange();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  tryRegisterWithMenu();
  injectButton();

  // ---- PLUGIN ADAPTER: apply fetched config once it arrives ----
  // Fired in parallel with the synchronous startup above, not awaited
  // there, so standalone (no-plugin) behavior starts exactly as fast as
  // before. When a plugin config does arrive, it's applied retroactively
  // to whatever's already on screen.
  fetchPluginConfig().then(function (pluginConfig) {
    applyPluginConfig(pluginConfig);
    refreshResponsiveStyle();
    const btn = document.getElementById(CONFIG.buttonId);
    if (btn) applySpacing(btn);
  });
  // ---- END PLUGIN ADAPTER ----
})();
