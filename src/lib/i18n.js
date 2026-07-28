/**
 * Full product UI catalog (primary chrome) + path/wordmark.
 * Missing keys fall back to English via deep lookup.
 */

import { pathStepFillHint } from './journeyProgress'

/**
 * Shipped locales.
 *
 * Was seven. The other six were cut in v1.53: only the `en` catalogue was
 * ever kept current, so switching language replaced correct English with a
 * stale translation of a product that no longer existed — all six still
 * described a seven-step path (Define → Ideate → Sketch → Design → Review →
 * Deliver) months after the app moved to five renamed stops. Several screens,
 * DeliverView worst of them, were never translated at all, so the result was
 * half-English anyway.
 *
 * A wrong translation is worse than an untranslated string: it reads as
 * authoritative. The machinery below is unchanged, so adding a locale back
 * means adding a catalogue — not rebuilding anything.
 */
export const LOCALES = [
  { id: 'en', label: 'English', native: 'English', dir: 'ltr' },
]

const EN = {
  productName: 'Creative Companion',
  tagline: 'A calm desk for creative work (ADHD-friendly)',
  pathAria: 'Your path in Creative Companion',
  path: {
    // 5-stop path — Wheeler / Logo Design Love process language
    research: 'Research',
    define: 'Strategy',
    design: 'Identity',
    sketch: 'Touchpoints',
    deliver: 'Assets',
    // Off-path Tools (still labeled when open)
    ideate: 'Ideate',
    review: 'Review',
    // view-id aliases (same strings)
    board: 'Research',
    project: 'Strategy',
    system: 'Identity',
    work: 'Touchpoints',
    pack: 'Assets',
  },
  pathPlain: {
    research:
      'Gather refs, notes, and existing brand cues. Star up to 6 for the pack.',
    define:
      'Positioning and brief. Who is this for? How should it feel? One clear goal.',
    design: 'Logo, color, type, voice. Bump version before big edits.',
    sketch:
      'Apply the system — desk steps, drafts, and real-world applications.',
    deliver:
      'Brand book, PDF, tokens, handoff. Preview and download the leave-behind.',
    ideate: 'Ideate means ideas. List many. Pick your best 3 (A, B, C).',
    review: 'Show the work. Ask a clear question. Fix what helps the goal.',
    board:
      'Gather refs, notes, and existing brand cues. Star up to 6 for the pack.',
    project:
      'Positioning and brief. Who is this for? How should it feel? One clear goal.',
    system: 'Logo, color, type, voice. Bump version before big edits.',
    work: 'Apply the system — desk steps, drafts, and real-world applications.',
    pack:
      'Brand book, PDF, tokens, handoff. Preview and download the leave-behind.',
  },
  language: 'Language',
  languageHint: 'App words and step names',
  ui: {
    tools: 'Tools',
    settings: 'Settings',
    timer: 'Timer',
    calendar: 'Calendar',
    helperOn: 'Turn Helper on',
    helperOff: 'Turn Helper off',
    helperHint: 'Tips · feedback · break',
    helperBodyDoubleNote:
      'Body doubling: work alongside Helper so starting is easier.',
    completeStep: 'Mark step done',
    more: 'More',
    downloadVectorPdf: 'Brand book PDF',
    printSavePdf: 'Print or save as PDF',
    previewFull: 'Full preview',
    editSystem: 'Edit Identity',
    work: 'Touchpoints',
    packTitle: 'Client assets',
    packEyebrow: 'What you hand to a client',
    packSub: 'Print or multi-page brand book PDF',
    clientHandoff: 'Send to client',
    packHint:
      'Brand book: cover, direction, logo, color, type, imagery, applications. Picture PDF under More formats.',
    thinPack: 'Thin pack — add tagline, colors, or ★ Research pins.',
    thinPackConfirmPrint:
      'Pack is thin (tagline / colors / ★ pins). Print anyway?',
    thinPackConfirmDownload:
      'Pack is thin (tagline / colors / ★ pins). Download anyway?',
    scrollPreview: 'Scroll to see the whole preview',
    leaveDesk: 'Leave desk',
    newProject: 'New project',
    logOut: 'Log out',
    logOutLock: 'Log out / lock',
    noStepYet: 'No step yet',
    queueClear: 'All done here',
    step: 'step',
    steps: 'steps',
    completed: 'completed',
    getStarted: 'Ready to start your first step?',
    nextStepSuggestion: "What's next?",
    addStep: 'Add step',
    noPinsYet: 'No pictures yet',
    emptyStepBody:
      'Write one small job you can finish in about 25 minutes.',
    emptyStepBodyDone:
      'You finished the list. Add the next small job below.',
    emptyPinsBody:
      'Add a few pictures. Star 2–6 with ★ so they show in Identity and Assets.',
    openWork: 'Go to Research',
    openSketch: 'Go to Touchpoints',
    openPack: 'Go to Assets',
    openReview: 'Go to Review',
    openIdeate: 'Go to Ideate',
    /** Primary linear CTA — stronger than gap strip / G recovery */
    continueNext: 'Next · {label}',
    pathMarkPackThin: 'Need tagline or ★ pins for client pack',
    backToIdeate: 'Back to Ideate',
    backToResearch: 'Back to Research',
    timerDoneIdeate:
      'Timer finished. Ideate is under Tools — or stay on Research.',
    anotherSpark: 'New idea prompt',
    oppositeDirection: 'Try the opposite',
    pinSpark: 'Save this prompt',
    sparkPinnedStay: 'Saved · still on Ideate',
    queueChosenSketch: 'Send chosen idea to Touchpoints',
    queuedDraft: 'Draft added to Touchpoints',
    openResearchBoard: 'Open Research',
    goToBoard: 'Go to Research',
    hasOpenWorkStep: 'Has an open Touchpoints step',
    howDeskWorks:
      'Five path stops: Strategy → Research → Identity → Touchpoints → Assets. Ideate and Review live under Tools.',
    projectSub:
      'Strategy — goal sheet first: who it is for, how it should feel, one goal sentence. Then Research.',
    systemSub:
      'Identity — fonts, colors, voice, logo, and starred pictures in a live preview.',
    boardSub:
      'Research — add pictures and notes after the brief. Star up to 6 for the client pack.',
    breakCareOpen:
      'Body check: water, food, stretch, or a real break when you take one.',
    pathReadiness: 'Quick fixes for other steps',
    appearance: 'Look & feel',
    presence: 'Helper & sound',
    workPrefs: 'Sketch prefs',
    account: 'Account',
    data: 'Data',
    about: 'About',
    theme: 'Theme',
    switchDark: 'Switch to dark',
    switchLight: 'Switch to light',
    reduceMotion: 'Less motion',
    reduceMotionHint: 'Fewer animations',
    helper: 'Helper',
    signOut: 'Sign out',
    unlockDesk: 'Unlock desk',
    signIn: 'Sign in',
    createAccount: 'Create account',
    backPath: '← Steps',
    backWork: '← Sketch',
    backResearch: '← Research',
    goToSystem: 'Go to Identity',
    uploadImages: 'Upload pictures',
    pasteUrl: 'Paste a link',
    colorNote: 'Color or note',
    starPack: '★ For client pack',
    outPack: '☆ Not in pack',
    moreFormats: 'More file types & backup',
    previewRaster: 'Picture PDF (simple preview)',
    hideWatermark: 'Hide app name (for client files)',
    currentStep: 'What to do now',
    dumpIdea: 'Write an idea',
    breakMicro: 'Break into tiny steps',
    packDest: 'Finish on Deliver — print or download the client pack.',
    coach: 'Coach',
    critique: 'Feedback',
    break: 'Break',
    processTools: 'Steps & tools',
    showLess: 'Show less',
    deadlines: 'Deadlines',
    focusTimer: 'Focus timer',
    doThisNow: 'Do this now',
    sparkHint: 'Quick idea → save it or put in A/B/C',
    starPinsHint: 'Star pictures on Research to choose favorites',
    onboardTitle: 'One project. Seven steps. Ship a client pack.',
    onboardLede:
      'Name the work and one small step you can finish in about 25 minutes. You will leave with a brand book PDF.',
    thinPackBanner:
      'Client pack is not ready — add a tagline, colors, or star pictures on Research.',
    continuePrint: 'Print anyway',
    continueDownload: 'Download anyway',
    cancel: 'Cancel',
    continue: 'Continue',
    deleteProject: 'Delete project',
    deleteProjectConfirm:
      'Delete this project and its steps & pictures? You cannot undo this.',
    forceBreaksTitle: 'Break lock',
    forceBreaksHint: 'Desk locks 5–10 min after focus',
    forceBreaksConsent: 'Lock desk 5–10 min after focus? Off anytime in Settings.',
    enable: 'On',
    helperQuiet: 'Quiet Helper',
    helperQuietHint: 'Nudges only when open',
    timerSound: 'Timer sound',
    timerSoundHint: 'Chime when focus ends',
    collapseQueue: 'Hide the queue by default',
    collapseQueueHint: 'Only show the current step',
    presenceSound: 'Helper & sound',
    setDeadline: 'Set deadline',
    setDeadlineTo: 'Set project deadline to',
    lightThemeOn: 'Light (warm paper) — on',
    darkThemeOn: 'Dark (charcoal) — on',
    stillThin: 'Still empty',
    stepFilled: 'This step · enough',
    stepOpen: 'This step · needs you',
    /** Status chip when step is open (not a jump toast) */
    openStepChip: 'Open · {label}',
    nextGapBtn: 'Next empty · {label} · G',
    shipBrandBook: 'Download brand book PDF',
    processFullDeliver: 'Steps look full · open Deliver',
    processLooksFull:
      'Steps look full — download the brand book on Deliver when you are ready',
    openStepMicro: 'Going to {label}',
    nextGapMicro: 'Next empty · {label}',
    stepComplete: 'Step done',
    undidStep: 'Undid that',
    helperOnMicro: 'Helper on',
    helperOffMicro: 'Helper off',
    syncedOk: 'Desk saved to the cloud',
    lockedOk: 'Desk locked',
    signedOutOk: 'Signed out — rest easy',
    projectRenamed: 'Name updated',
    projectDeleted: 'Project deleted',
    backupRestored: 'Backup restored',
    leaveBehindSaved: 'Client pack saved',
    backupSaved: 'Backup saved',
    pdfBuilding: 'Making your brand book PDF…',
    pdfPreviewing: 'Making a simple preview PDF…',
    pdfFailed: 'Could not finish that PDF — try again?',
    downloadFailed: 'Download did not finish — try again?',
    printFailed: 'Print did not open — try again?',
    saveCancelled: 'Save cancelled — no problem',
    unknownExport: 'Not sure what to export',
    breakDone: 'Break done · welcome back',
    researchTimerOn: 'Research · 20 min',
    breakLockFirst: 'Finish break first',
    deskReady: 'Project created — start with the goal, then head to Research',
    emptyDeskFirst: 'Empty desk — write your first real step',
    forceBreaksReview: 'Break lock · check Settings',
    forceBreaksOn: 'Break lock on',
    forceBreaksOff: 'Break lock off',
    keepOneProject: 'Keep at least one project',
    demoLoadFail: 'Could not load that demo',
    softSignalFail: 'Could not load Soft Signal demo',
    importFail: 'Could not import that file',
    readFileFail: 'Could not read that file',
    deleteFail: 'Could not delete that',
    syncFail: 'Could not sync right now',
    stepRemoved: 'Step removed',
    queuedDraftLabel: 'Draft added · {label}',
    queuedDraftsN: 'Added {n} draft options',
    captureIdeateFirst: 'Write A/B/C titles on Ideate first',
    refOrderUpdated: 'Picture order updated',
    heroPinSet: 'Main picture set',
    leaveBehindFull: 'Client pack is full (6 pictures max)',
    versionToReview: 'Version is now v2 · opening Review',
    markTooBig: 'Logo image must be under 2.5MB',
    markRemoved: 'Logo image removed',
    questionCopied: 'Question copied',
    helperOpenCritique: 'Helper is on — open Feedback',
    briefCopied: 'Brief copied — send to a reviewer',
    briefCopyFail: 'Could not copy brief',
    leaveBehindBriefCopied: 'Client brief copied',
    leaveBehindBriefCopyFail: 'Could not copy — try Download instead',
    archiveFail: 'Could not archive that',
    printDialogOpen: 'Print is open — choose Save as PDF if you want a file',
    nothingToPrint: 'Nothing to print yet',
    versionBumped: 'Version {version}',
    directionKitBumped: 'Starter kit: {name} · version {version}',
    directionKitOk: 'Starter kit: {name} — go to Research or Design',
    microStepsOne: 'One tiny step is ready — do only that one',
    microStepsN: '{n} tiny steps ready — only do #1 right now',
    workBlockDoneSoft:
      'Work block done (~{min} min). Break locks are off — stretch if you can.',
    breakLockedKit: 'Break locked: {min} min · {n} care item(s) for this window',
    breakLockedPlain: 'Break locked: {min} min (you worked about {work} min)',
    breakEndedEarly: 'Break ended early — try a real rest next time.',
    packReadyFix: '○ {label} — fix',
    firstStepWaiting: 'First step on Sketch:',
    openSketchStep: 'Open Sketch',
    designPreviewCaption: 'Live preview — edit sections below. PDF on Deliver.',
    pathFullLeaveBehindThin: 'Client pack still thin for handoff',
    earliestEmptyBtn: 'First empty · {label} · G',
    backAfterBreak: 'Back to {label}',
    breakResumed: 'Break still running — desk locked',
    resumeAfterBreak: 'Break done — pick up here',
    resumeTimerRunning: 'Timer still running',
    resumeCaptureHint: 'Add a step on Sketch',
    resumeContinue: 'Continue',
    resumeDismiss: 'Dismiss',
    decisionLogTitle: 'Why we chose this',
    decisionChose: 'Chose {label}',
    decisionBecause: 'because',
    decisionEmpty: 'Pick a winner on Ideate — we save the reason for Sketch.',
    decisionLogged: 'Choice saved · {label}',
    decisionSketchHint: 'Sketch this idea. Keep it rough.',
    decisionEditIdeate: 'Change on Ideate',
    kitBuilding: 'Building brand kit…',
    downloadKit: 'Download brand kit (zip folder)',
    kitHint: 'Zip: brand book PDF, guide, color files, logo',
    messagingPillars: 'Key messages',
    messagingPromise: 'What we promise',
    messagingProof: 'Why believe us',
    messagingPersonality: 'How we sound',
    imageryGuidelines: 'Picture rules',
    imageryStyle: 'Look of photos / drawings',
    imageryDo: 'Pictures we want',
    imageryDont: 'Pictures to avoid',
    logoDonts: 'Logo mistakes to avoid',
    logoMinSize: 'Smallest logo size',
    logoVariants: 'Logo versions',
    applicationMock: 'Sample use',
    brandCardMock: 'Sample business card',
    aboutBrandKit:
      'On Deliver, download the brand kit folder (PDF + guide + color files + logo).',
    aboutAdhd:
      'ADHD info (for learning only): CHADD.org — not medical advice.',
    pdfFontHonesty:
      'The brand book PDF uses simple built-in fonts. They may not match your exact screen fonts.',
  },
  // fillHint.* — non-EN locales only; EN defaults live in journeyProgress.PATH_FILL_HINTS
}

/** Deep-merge override onto English base */
function merge(base, over) {
  if (!over) return base
  const out = { ...base }
  for (const k of Object.keys(over)) {
    if (
      over[k] &&
      typeof over[k] === 'object' &&
      !Array.isArray(over[k]) &&
      base[k] &&
      typeof base[k] === 'object'
    ) {
      out[k] = merge(base[k], over[k])
    } else {
      out[k] = over[k]
    }
  }
  return out
}

/* No non-English catalogues ship today — see LOCALES above. */
const OVERRIDES = {}

export function normalizeLocale(id) {
  const s = String(id || 'en').toLowerCase().slice(0, 2)
  if (s === 'en' || OVERRIDES[s]) return s
  return 'en'
}

export function localeDir(id) {
  const loc = LOCALES.find((L) => L.id === normalizeLocale(id))
  return loc?.dir || 'ltr'
}

export function getMessages(locale) {
  const id = normalizeLocale(locale)
  if (id === 'en') return EN
  return merge(EN, OVERRIDES[id] || {})
}

export function t(locale, key) {
  if (!key) return ''
  const msg = getMessages(locale)
  const parts = String(key).split('.')
  let cur = msg
  for (const p of parts) {
    if (cur == null) break
    cur = cur[p]
  }
  if (cur != null && cur !== '') return cur
  // English fallback
  let en = EN
  for (const p of parts) {
    if (en == null) return key
    en = en[p]
  }
  return en == null ? key : en
}

export function pathLabel(locale, stepId) {
  return t(locale, `path.${stepId}`) || stepId
}

export function pathPlain(locale, stepId) {
  return t(locale, `pathPlain.${stepId}`) || ''
}

/** Short how-to fill a path step. Locale override via fillHint.*; EN from pathStepFillHint. */
export function pathFillHint(locale, stepId) {
  const s = t(locale, `fillHint.${stepId}`)
  if (s && s !== `fillHint.${stepId}`) return s
  return pathStepFillHint(stepId)
}

/** Simple `{label}` style template for strip / micro copy. */
export function tFormat(locale, key, vars = {}) {
  let s = String(t(locale, key) || key)
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v ?? ''))
  }
  return s
}

export function isRtl(locale) {
  return localeDir(locale) === 'rtl'
}
