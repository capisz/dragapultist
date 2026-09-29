# Archetype sprite sizing and spacing

- Frame local sprites by their nontransparent pixels and center the result.
  Mega Lucario, for example, occupies only 19 by 24 pixels of its 68 by 56
  source canvas. Measuring visible bounds prevents this padding from shrinking
  the displayed Pokemon. Measurements are cached per image URL in memory.
- Keep original image files, aspect ratios, fallback handling, and pixel styling.
  If a browser cannot measure a sprite, retain the ordinary image presentation.
- Use 30px filter icons, 8px between icons in one archetype, 16px outer padding,
  and a vertical divider between archetype buttons. The choices remain scrollable.
- Use 42px single constellation icons and 30px paired icons with a 6px gap.
  Paired/triple badges widen from 64px to 76px; previews keep a stable badge size.
- Preserve filtering, delayed opponent previews, navigation, and saved records.

Type checking and the production build passed (existing image/hook lint warnings).
Whitespace checks passed. No browser/native interaction
checks or automated tests were run for this styling correction.
