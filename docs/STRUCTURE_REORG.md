# Structural reorganization blueprint

**Date:** 2026-08-03 · **Product:** Creative Companion  
**Constraint:** ADHD / EF first — do **not** reorganize UI to match generic SaaS CRM if that fights the intentional path (Studio / This project / Tools).

---

## 1. What is intentional (do not “fix”)

| Surface | Role | Lives |
|---------|------|--------|
| **Studio** band | Multi-project destinations: Home, Calendar, Clients, Settings, Tools | Sidebar top |
| **This project** | Desk + five path stops | Sidebar below Studio |
| **Tools** | Off-path: Ideate, Timer, Review, Book builder, Hours, Share… | Tools menu |
| **Five-stop path** | Strategy → Research → Identity → Touchpoints → Assets | Path steps only |
| **Ideate** | Optional diverge tool, **not** a path stop | Tools → Ideate |
| **Settings** | Theme, calm typing, data, account | Studio → Settings (one door) |
| **Home** | Return wall: pick-up, projects, due soon, client, hours | `home` view |

These placements are product decisions, not accidents. Sorting must not invent a “Profile dashboard” that duplicates Settings + Clients + Desk.

---

## 2. Current structure (as built)

```
src/
  App.jsx                 # ~5k lines — shell + orchestration (debt)
  main.jsx                # public routes + shell mount
  index.css               # @import shell only
  components/             # 37 flat shared UI (mixed domains)
  views/                  # 16 route/page surfaces (+ HomeView extraction)
  lib/                    # 150+ pure modules + tests (bag of utils)
  store/                  # Zustand + tests
  services/               # versionService only
  styles/                 # shell + lazy-* per view
```

### Pain points

| Issue | Evidence |
|-------|----------|
| **God shell** | `App.jsx` owns chrome, home, export, cloud, timers, modals |
| **Flat components/** | Login, public portal, brief fields, desk artboard all siblings |
| **lib/ sprawl** | Domain logic + tests mixed; hard to find “client portal” vs “color” |
| **DetectiveSheet as view** | Brief form is a view file but used as component inside Define |
| **Login as component** | Entry surface, not a leaf widget |
| **CSS** | Already well sorted: `shell` + `lazy-*` (keep) |

---

## 3. Target structure (phased)

Do **not** big-bang move everything. Each phase must keep imports green and tests green.

```
src/
  main.jsx
  App.jsx                      # shell only: header, sidebar, main outlet, modals
  app/
    routes.js                  # view id → lazy component map (optional)
  views/                       # full pages only
    HomeView.jsx               # ✅ Phase 0 done
    DefineView.jsx
    ResearchView.jsx
    DesignView.jsx
    SketchView.jsx             # Touchpoints
    DeliverView.jsx
    DeskView.jsx
    SettingsView.jsx
    CalendarView.jsx
    ClientsView.jsx
    ClientRecordView.jsx
    SparkView.jsx              # Ideate
    ReviewView.jsx
    InsightsView.jsx           # Timer
    NewProjectIntake.jsx
    BrandBookBuilderView.jsx
    LoginView.jsx              # Phase 1: move from components/LoginPage
  features/                    # co-located feature modules
    brief/
      DetectiveSheet.jsx       # from views/
      ClientBriefFields.jsx
      BriefAttach.jsx
      BriefSpectrum.jsx
      ScopePanel.jsx
      DefineStartHere.jsx
    research/
      (mood helpers only if extracted)
    identity/
      BrandArtboard.jsx
      DeskLiveArtboard.jsx
    client-portal/
      PublicClientPortal.jsx
      PublicDiscoveryFill.jsx
      ProjectOverviewShare.jsx
      DiscoveryBrief.jsx
      ClientInbox.jsx
    helper/
      BuddyMate.jsx
      HelperCharacterLottie.jsx
      ForcedBreakOverlay.jsx
      GameHUD.jsx
    billing/
      HoursInvoice.jsx
      WorkLogPanel.jsx
      RunningTodo.jsx
  components/                  # true shared primitives only
    ErrorBoundary.jsx
    HeaderIcon.jsx
    LogoLockup.jsx
    PathStepIcon.jsx
    PathViewSkeleton.jsx
    InfoReveal.jsx
    EmptyIllustration.jsx
    PullToRefresh.jsx
    JourneyGapStrip.jsx
  lib/                         # keep; gradually group by prefix or subdirs
    journey.js
    clientPortal.js
    …
  store/
  services/
  styles/                      # unchanged pattern
```

---

## 4. Component placement matrix (UI)

| Page / chrome | Control | Current | Keep / move |
|---------------|---------|---------|-------------|
| **Sidebar** | Studio destinations | Top band | **Keep** |
| **Sidebar** | Path steps + Desk | This project | **Keep** |
| **Header** | To-do, client, timer chip, Tools | Right cluster | **Keep** (high-frequency) |
| **Home** | Continue / Desk / projects / due / client / hours | Grid panels | **Keep layout**; code now in `HomeView` |
| **Home** | Full month calendar | Not on Home | **Keep out** — Due soon + Full deadlines link |
| **Settings** | Theme, calm, data, demos | Settings page | **Keep** one door |
| **Tools** | Ideate, Timer, Review, Book, Hours | Menu | **Keep** off-path |
| **Identity** | Bump / History | Preview only | **Keep** (craft screens stay clean) |
| **Path footers** | Next primary | Bottom of each stop | **Keep** |
| **Login** | Gate | `views/LoginView` | **Done** |
| **Public `/f` `/c`** | Client fill | `features/client-portal/*` | **Done** |

### Do **not** do

- Merge Settings into a “Profile” mega-page  
- Put Ideate back on the five-stop path without an owner decision  
- Dump full Calendar grid onto Home  
- Split `lib/` in one PR (breaks test path guards / muscle memory)

---

## 5. Implementation phases

| Phase | Scope | Risk | Status |
|-------|--------|------|--------|
| **0** | Extract `HomeView` from `App.jsx` | Low | **Done** |
| **1** | `LoginPage` → `views/LoginView` | Low | **Done** |
| **2** | `features/client-portal/*` + public main.jsx imports | Medium | **Done** |
| **3** | `features/brief/*` (DetectiveSheet, ClientBriefFields, …) | Medium | Later |
| **4** | `features/helper/*`, billing panels | Medium | Later |
| **5** | `app/routes.js` map; thin App to outlet only | Higher | Later |
| **6** | Optional `lib/{domain}/` folders with codemod | High | Only with test green + owner OK |

Each phase: move → fix imports → `npm test` → no new `!important` debt.

---

## 6. Responsive integrity rules (when moving UI)

1. Prefer existing grid/shell areas (`sidebar` / `main` / `hud`) — never absolute-position whole pages  
2. Path footers stay in-flow under content (`path-continue-row`), not fixed unless already sticky by design  
3. Home panels use `.home-dash-grid` (1 col → 2 col ≥800px) — new panels join the grid, don’t invent a third column  
4. Modals stay `.export-overlay` centered (never bottom sheets)  
5. After any move: check ≤767 drawer + ≥768 desktop sidebar  

---

## 7. Success criteria

- [x] Home UI not inlined in App  
- [ ] App.jsx under ~4k lines (further extractions)  
- [ ] Public + login discoverable in one feature/view folder  
- [ ] `npm test` + build green after each phase  
- [ ] No dual maps reintroduced; Studio vs This project preserved
