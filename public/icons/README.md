# PWA Icons Guide

## Required Icons

For optimal PWA experience, create the following icons:

### Required Sizes:
- **icon-192x192.png** - Standard PWA icon (192x192px)
- **icon-512x512.png** - High-res PWA icon (512x512px)
- **apple-touch-icon.png** - Apple devices icon (180x180px)

### Design Guidelines:
1. Use simple, recognizable imagery (e.g., Risk game board, dice, or world map)
2. High contrast for visibility
3. Solid background color (#1e3a8a - blue from theme)
4. Center the main icon element
5. Leave 10% padding around edges for safe area

### Tools to Create Icons:
- **Figma** - https://www.figma.com
- **Canva** - https://www.canva.com
- **RealFaviconGenerator** - https://realfavicongenerator.net
- **PWA Asset Generator** - https://github.com/elegantapp/pwa-asset-generator

### Quick Generation with PWA Asset Generator:
```bash
npx pwa-asset-generator logo.svg public/icons --manifest public/manifest.json
```

## Temporary Placeholders

Until custom icons are created, use these resources:
- https://via.placeholder.com/192x192/1e3a8a/ffffff?text=RISK
- https://via.placeholder.com/512x512/1e3a8a/ffffff?text=RISK

## Verification

Test icons at:
- https://www.pwabuilder.com
- Chrome DevTools > Application > Manifest
