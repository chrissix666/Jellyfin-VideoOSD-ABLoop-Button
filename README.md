[Jellyfin Projects](https://linktr.ee/JellyfinProjects) | [Kodi Projects](https://linktr.ee/KodiProjects)

---

Overview of all my Jellyfin Web VideoOSD projects: [Jellyfin-VideoOSD-Projects-Overview](https://github.com/chrissix666/Jellyfin-VideoOSD-Projects-Overview)

---

Note: This script is compatible with the [Jellyfin-VideoOSD-CustomOnOff-Menu](https://github.com/chrissix666/Jellyfin-VideoOSD-CustomOnOff-Menu).

# Jellyfin VideoOSD A-B Loop Button

---

Tested on Windows 11 on Chrome:

Adds an **A-B loop** button directly to the VideoOSD in Jellyfin Web.
Mark two points on the timeline and the video loops endlessly between them — just like VLC's own A-B repeat.
No menu diving. No playback interruption. Just click, click, and it loops.

---

## What It Does

- Injects an **A-B loop button** into the VideoOSD interface, right after the native playback controls
- First click sets point **A** at the current position
- Second click sets point **B** and the loop starts immediately
- Third click clears the loop and resets to the start
- Letters light up in Jellyfin's own accent color as each point is set
- Automatically resets when switching to a different video

---

## How It Works

The script:

1. Reads the current playback position from the `<video>` element to set point A and point B
2. Attaches a `timeupdate` listener that jumps back to point A once playback reaches point B
3. Uses a `MutationObserver` to:
   - Detect the VideoOSD transport bar
   - Insert the button right after the native playback controls
   - Keep the button pinned in position, even if other custom OSD buttons load afterwards

---

## Why It's Useful

Normally, repeating a short section of a video means manually seeking back and forth every time it ends.

This script:

- Loops a section endlessly without touching the seek bar again
- Keeps the loop controls directly inside the player UI
- Works alongside other custom OSD buttons like Speed or FrameByFrame without crowding the layout

It's especially useful for rewatching a scene, practicing along to a clip, or studying a short segment repeatedly.

---

## Installation

### Method: Jellyfin JavaScript Injector

1. Install the **JavaScript Injector** plugin in Jellyfin (if not already installed).
2. Open Jellyfin Admin Dashboard.
3. Go to: Dashboard → Plugins → JavaScript Injector
4. Paste the entire script content into the injector.
5. Save.
6. Refresh the Jellyfin web interface.

The A-B loop button will now appear in the VideoOSD.

---

## Configuration

All behavior is controlled via the `CONFIG` object at the top of the script:

- `spacingMode` — `'seamless'` (no other custom OSD buttons installed) or `'balanced'` (used together with Speed / FrameByFrame or other injected custom buttons)
- `symmetricExtraGapEm` — target gap in em applied to both sides when using `balanced` mode
- `hideOnNarrowWindow` — mimics Jellyfin's own vanilla window-width behavior, auto-hides this button below 50em window width

---

## Compatibility

- Designed for Jellyfin Web (Windows 11, Chrome)
- Only tested on 10.10.7 Web version (Icon injection may vary)
- Works with dynamic page navigation
- Desktop web browsers only — mobile, TV, and native app wrappers are intentionally excluded

---

## License

MIT License
