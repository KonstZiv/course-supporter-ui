// Self-hosted fonts for both entries (author app and portal), the same as on
// the public site. The files are bundled from the @fontsource packages, so the
// browser never contacts a font CDN. Families match the fontFamily names in
// tailwind.config.js: Source Serif 4 for headings — weight 600 only, the
// browser uses it for any heading weight; Manrope as a variable font for the
// body text; JetBrains Mono for code.
import '@fontsource/source-serif-4/600.css'
import '@fontsource-variable/manrope'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
