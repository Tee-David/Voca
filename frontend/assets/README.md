# Capacitor asset sources

Run `npm run mobile:assets` (from `frontend/`) to regenerate every Android density
into `android/app/src/main/res/**` from the PNG sources in this directory.

> `@capacitor/assets` is an **optionalDependencies** entry — it pulls in `sharp`,
> which sometimes times out downloading `libvips` on flaky networks. If you see
> "capacitor-assets: not found" when running `mobile:assets`, install it on its
> own once: `npm i -D @capacitor/assets` (retry a few times if needed). The
> already-committed PNGs under `android/app/src/main/res/**` work without it.

| File | Purpose | Size |
|------|---------|------|
| `icon-only.png`       | Legacy launcher icon (full bleed, rounded corners already baked in) | 1024×1024 |
| `icon-foreground.png` | Adaptive icon foreground layer (safe zone = inner 66%) | 1024×1024 |
| `icon-background.png` | Adaptive icon background layer (solid `#4338CA`)       | 1024×1024 |
| `splash.png`          | Splash screen (light + dark use same dark canvas for now) | 2732×2732 |
| `splash-dark.png`     | Dark splash variant                                    | 2732×2732 |

The `_*.svg` files are the authoring sources. To rebuild a PNG after editing an SVG:

```bash
cd frontend/assets
rsvg-convert -w 1024 -h 1024 _icon-foreground.svg -o icon-foreground.png
# repeat for the others, matching the sizes above
```

Then run `npm run mobile:assets` to fan them out to every mipmap/drawable density.
