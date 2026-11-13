# Catalyst — Fiverr gallery screenshots

Marketing screenshots of the Catalyst dashboard. Every name, number and message in them is made up.

```
posts/
  png/            exported PNGs (3200×2000 = 1600×1000 @2x)
  src/
    styles.css    brand tokens (colors, cards, tags, buttons)
    shell.js      sidebar + icon set shared by every screen
    1-inbox.html  2-train-ai.html  3-analytics.html  4-payments.html  5-channels.html
  render.ps1      re-exports the PNGs with headless Edge
```

## Changing the data

Each screen has a `// ---- Edit the fake data here ----` block near the bottom of its HTML file
(conversations, services, stats, slips, channels…). Edit it, then re-render.

To preview a screen, open the HTML file in a browser at 1600×1000.

## Re-rendering

```powershell
powershell -ExecutionPolicy Bypass -File posts\render.ps1            # all screens
powershell -ExecutionPolicy Bypass -File posts\render.ps1 analytics  # just one
```

Needs Microsoft Edge (or Chrome) installed. The script loads Inter from Google Fonts and falls
back to Segoe UI if you're offline.
