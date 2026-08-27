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
  const CONFIG = {
    activeColor: '#00a4dc',
    addonId: 'abLoopButton',
    addonLabel: 'A-B Loop',
    buttonId: 'btnAbLoop',
    // ---- custom config start ----
    spacingMode: 'balanced', // 'seamless' (no other custom OSD buttons) or 'balanced' (used together with other injected custom buttons)
    symmetricExtraGapEm: 2.1, // target gap in em on both sides (only applies when spacingMode is 'balanced', ignored in 'seamless')
    hideOnNarrowWindow: true // mimics Jellyfin's own vanilla window-width behavior (e.g. chapter jump buttons), auto-hides this button below 50em window width
    // ---- custom config end ----
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
  function tryRegisterWithMenu() {
    if (registeredWithMenu) return;
    const api = window.JellyfinVideoOSDCustomsMenu;
    if (!api || typeof api.registerAddon !== 'function') return;
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
  function injectResponsiveStyle() {
    if (!CONFIG.hideOnNarrowWindow) return;
    if (document.getElementById(RESPONSIVE_STYLE_ID)) return;
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
  function applySpacing(btn) {
    if (CONFIG.spacingMode === 'seamless') {
      btn.style.marginLeft = '';
      btn.style.marginRight = '';
      return;
    }
    btn.style.marginLeft = (CONFIG.symmetricExtraGapEm - BALANCED_FIXED_OFFSET.left) + 'em';
    btn.style.marginRight = (CONFIG.symmetricExtraGapEm - BALANCED_FIXED_OFFSET.right) + 'em';
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
      injectResponsiveStyle();
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
})();
