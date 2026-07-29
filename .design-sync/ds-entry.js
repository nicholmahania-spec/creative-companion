// Library entry for design-sync only — the app itself never imports this.
//
// This repo is a private Vite app, not a published package: there is no
// library build and no `node_modules/creative-companion-react`. Without an
// explicit entry the converter falls back to synth-entry mode, which
// `export *`s every .jsx in src/ — bundling the whole application (store,
// routes, Supabase client) instead of the design system.
//
// Only genuinely working, styled components belong here. See NOTES.md for why
// Badge/Card/Textarea/ButtonGroup are excluded.
export { default as Button } from '../src/components/ui/Button.jsx';
