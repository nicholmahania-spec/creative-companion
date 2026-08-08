# Creative Companion — complete copy audit

**Date:** 2026-08-07  
**Scope:** Every internal view, the shared shell, overlays, public client routes,
questionnaire schema, empty/loading/error/success states, and every visible or
accessible control label in `src/`. This is a critique only; no product copy was
changed.

## Verdict

The product has a recognisable voice, but not yet a controlled language system.
Its best copy is unusually good: concrete, low-shame, warm without being cute,
and attentive to state loss. Its weakest copy is not “bad writing” so much as
**unresolved product naming expressed through words**. The same object becomes a
*Strategy form*, *brief*, *discovery brief*, *project overview*, *questionnaire*,
or *client form* depending on where the user stands. The same delivery object
becomes *pack*, *package*, *brand book*, *handoff*, *Assets*, or *leave-behind*.

That drift makes the user repeatedly ask “is this the same thing?” The effect is
especially costly for an ADHD user because it turns recognition into recall.

**Overall copy score: 6.4/10.** Voice: 8/10. Clarity: 6/10. Consistency: 4/10.
Action labels: 6/10. Errors/recovery: 6/10. Client-facing copy: 7/10.

## Audit standard

Every string was judged against five UX-copy tests: clear, concise, consistent,
useful, and human. Controls were also tested for **verb + object + accurate
outcome**. Errors were tested for **what happened + why, when known + recovery**.
Empty states were tested for **what this area is + why it is empty + the next
action**. Copy was also checked against the product's own rules: name real
objects, avoid shame and scoreboards, reduce decisions, preserve working memory,
and never claim persistence or output the product cannot provide.

Priority means:

- **P0:** can cause the wrong action, data loss, or a client-facing trust failure.
- **P1:** repeated comprehension or terminology cost.
- **P2:** polish, grammar, rhythm, or accessibility specificity.
- **Keep:** already does its job; changing it would be churn.

## Product-wide language decisions needed first

| Priority | Problem | Evidence | Recommendation |
|---|---|---|---|
| P0 | One form has six names | “Share Strategy form”, “Discovery brief”, “project overview”, “brief”, “questionnaire”, “client form” | Use **Strategy** for the path stop, **project brief** for the artifact, and **brief form** for the client action. Retire “discovery brief” and “project overview” only where they point to this same schema; keep “project overview” for a genuinely different artifact. |
| P1 | Delivery nouns have no hierarchy | Assets, pack, client pack, client package, brand book, handoff, leave-behind | Define: **Assets** = path stop; **brand book** = PDF artifact; **client package** = downloadable file bundle; **handoff** = sending the package. Use “pack” only as an informal short form after “client package” is established. |
| P1 | “Open”, “More”, “Edit”, “Fix”, and “Done” often lack an object | Shell, Desk, Identity, Review, Assets, dialogs | Label the result: “Open Strategy”, “Edit brief”, “Review 5 gaps”, “Save and close”, “Download brand book PDF”. |
| P1 | Status fragments imitate dashboard telemetry | “Ready · 3/5”, “Gaps · 2 left”, “pass pairs”, “Still thin”, “needed ones done” | Turn fragments into plain status sentences: “3 items are ready”, “2 gaps to review”, “All required answers are in”. |
| P1 | Mixed dialect and spelling | “Colour” throughout Identity; “Color page”, “Colors”, “color” in the builder and generated text | Pick one product dialect. The existing authored voice leans British (“colour”, “centre”, “matt”), so standardise UI copy on **colour** unless the owner explicitly chooses US English. Preserve technical tokens such as CSS `color`. |
| P1 | State-changing toggles sometimes label the state, sometimes the action | Notifications “Quiet/All”; theme “Switch to…”; Helper “Helper/Helper on”; pack stars | Prefer action labels for buttons (“Use quiet notifications”) or use a labelled switch with a persistent setting name and separate state text. |
| P1 | Internal process language leaks into customer-facing or first-run text | “Bump”, “route”, “direction”, “hero”, “role”, “pass pairs”, “retained versions” | Translate to the user's object and outcome: “Save version”, “concept”, “main image”, “colour use”, “readable pairs”, “conflict copies”. |
| P2 | Punctuation system drifts | `Next · X`, `Continue →`, `← Back`, em dashes, arrows, middle dots, slashes | Use words for navigation and reserve punctuation for metadata. Recommended: “Next: Research”; “Back to Strategy”. |
| P2 | Loading and success copy is inconsistent | “Loading…”, “Getting it ready…”, “Making the PDF…”, “Building…”, “Exporting…” | Name the object whenever waiting exceeds an instant: “Building client package…”, “Preparing brand book PDF…”. Keep quiet “Saved” for autosave. |

### Implementation calibration

The code-context and ADHD review corrected an overly mechanical tendency in the
first audit pass. A one-word control is not automatically defective when one
nearby object makes its outcome unmistakable. Designer terms such as artboard,
direction, raster, hero, and history are also not automatically jargon. The
implementation therefore prioritises unstable nouns, hidden consequences,
client-facing language, and controls whose result cannot be inferred safely.
It does not lengthen every compact contextual control for the sake of a rule.

## 1. Login / lock screen — 7.5/10

The positioning sentence is strong: it tells the user what the app carries and
what it does not replace. “Work stays on this device” is concrete and earns
trust. The weak point is account-mode language: **Create** does not say what is
being created, **Forgot** is not a grammatical action, and the local/cloud modes
make the same submit button mean three different things.

### Copy and controls

| Current | Verdict | Recommended |
|---|---|---|
| “Creative Companion” | Keep | — |
| “Take a brand project from…” | Keep; accurate positioning | Tighten only if layout demands it. |
| “The five stops you’ll move through” | Keep | — |
| “Work stays on this device…” | Keep; unusually honest | In cloud mode, ensure this changes because it is then false. |
| “Sign in” tab/button | Keep | — |
| “Create” tab/button | P1; missing object | “Create account” in cloud mode; “Set password” in local setup. |
| Email / Name / Password / Confirm | P1; “Confirm” is ambiguous | “Confirm password”. |
| Optional | P2; detached qualifier | “Name (optional)”. |
| Show / Hide | Keep | — |
| Password strength: | P2; colon plus adjacent status is mechanical | “Password strength” with state below. |
| “At least 6 characters. Longer is better…” | P1; requirement and advice conflict (6 vs 8) | State one rule: “Use at least 8 characters.” If six is truly accepted, say “6 required; 8 or more is safer.” |
| “…” busy submit | P1; gives no state | “Signing in…” / “Creating account…” / “Opening…”. |
| “Open” local submit | P1; open what? | “Open workspace”. |
| “Forgot” | P1; fragment | “Forgot password?” |
| “Clear form” | Keep | — |
| Auth errors | P0 if they expose backend wording | Every message must say what failed and the next action; never show Supabase vocabulary to the user. |

## 2. New project intake — 8/10

This is one of the clearest pages. The sequence is conversational and the
engagement choices explain themselves. The second CTA is the main problem: “Or
send the client a form to fill in first” is a sentence attached to a button and
introduces a competing start path without naming what will happen to the project.

| Current | Verdict | Recommended |
|---|---|---|
| “New project” | Keep | — |
| “Who’s it for?” | Keep; human and specific | — |
| “Business or client name” | Keep | — |
| “This names the project too. You can rename it later.” | Keep; removes uncertainty | — |
| “Where are they starting from?” | Keep | — |
| Starting from scratch / Rebranding / Adding to a brand… | Keep; mutually distinct | Shorten third to “Extending a brand that already works” for parallel grammar. |
| “What do they need made?” | Keep | — |
| “You can change any of this later.” | Keep; good low-pressure reassurance | — |
| “Any deadline?” | Keep | — |
| “Start project” | Keep | — |
| “Or send the client a form to fill in first” | P1; sentence-button, outcome unclear | “Create project and send brief” if it creates first; otherwise “Send brief before starting”. Busy state must match the action, not only “Creating…”. |

## 3. Home — 6.5/10

The page uses real nouns, but it calls itself both **Home** and **Studio**. Panel
headings are understandable; row actions are often generic and require reading
the surrounding panel to know what “Open” means.

| Current | Verdict | Recommended |
|---|---|---|
| Home / Studio | P1; duplicate page identity | Keep “Home” in navigation; use the configured studio name as the page heading, or use “Your studio” consistently. |
| “+ New project” | Keep; plus is redundant but harmless | “New project”. |
| “Client waiting” | P1; could mean waiting on client or client waiting on designer | “Client needs a response”. |
| “Starter — rename it or start your own” | P2; “it” is vague | “Sample project — rename it or create your own”. |
| “Desk” row action | P1; noun-only | “Open desk”. |
| “Due soon” | Keep | — |
| “No project or task dues yet…” | P2; “dues” is unnatural | “Nothing is due yet. Add a deadline when a date matters.” |
| “Full deadlines” | P1; odd adjective | “View all deadlines”. |
| “Client” panel | P1; too broad | “Client activity”. |
| “Open inbox” / “Client inbox” | P2; duplicate destination, two labels | Use “Open client inbox” everywhere. |
| “Ready to ship” | P1; delivery metaphor conflicts with Handoff | “Ready for handoff”. |
| “When a pack is ready…” | P1; undefined pack | “When a client package is ready for handoff, it appears here.” |
| “Open” | P1; generic | “Open Assets”. |
| “Hours worked” | Keep | — |
| “No clocked hours…” | Keep; clearly separates private clock from invoice | — |

## 4. Desk — 6/10

The headings are useful, but the card copy alternates among terse metadata,
commands, and unexplained brand-process language. Duplicate “Edit identity”
controls weaken confidence: identical labels should not appear twice unless the
destinations differ and are named.

| Current | Verdict | Recommended |
|---|---|---|
| “live artboard” | P2; jargon is acceptable to a designer, lowercase fragment is not | “Identity preview”. |
| “Edit identity” (twice) | P1; duplicate route | Keep one. If destinations differ: “Edit mark” / “Edit identity”. |
| “Open” | P1 | Name destination. |
| “Research pack” | P1; “pack” here means shortlist, elsewhere delivery | “Research shortlist”. |
| “starred for the client shortlist” | Keep; explains star meaning | “starred for the shortlist” if it is not yet client-visible. |
| “Open the wall” | Keep | — |
| “Nothing starred yet.” | P2; says state, not start | “Nothing shortlisted yet. Star references on the Research wall.” |
| “the brief” | Keep | Capitalise only as a heading: “Brief”. |
| “Edit” | P1 | “Edit brief”. |
| “Nothing in the brief yet.” | P1; no route | “The brief is empty. Add the client and project basics in Strategy.” |
| Client / Goal / Audience / Feel / Deliverables / Off the table | Keep; strong scan labels | — |
| “Client link & approvals” | Keep | — |
| “What’s next” | Keep | — |
| “Already done” | P2; unclear effect | “Mark as already done”. |
| “Skip this one” | P1; sounds temporary, stores not-needed state | “Mark as not needed”. |
| “Done” | P2 | “Mark done” before action; “Done” as status. |
| “Not needed” | Keep as status | — |
| “This week” / “Hours this week” | Keep | — |

## 5. Strategy / project brief — 7/10

The page-level copy is quiet and appropriate for a long form. The schema itself
is mostly conversational, but sharing and completion language drifts. “needed
ones done” sounds generated rather than spoken, and client-state copy alternates
between “sent”, “submitted”, and “answers”.

### Page controls and states

| Current | Verdict | Recommended |
|---|---|---|
| “Client submitted their answers.” | Keep | — |
| “Sent — waiting on the client.” | Keep | — |
| “Not sent yet.” | P2; no object | “Brief not sent yet.” |
| “Loading…” | P2 | “Loading brief…” |
| “needed” / “needed ones done” / “none needed” | P1; machine-like and inconsistent | “3 required”, “Required answers complete”, “No required answers”. |
| “Start with {field}” | P1 when the first field is already visible; duplicates initiation | Remove if redundant; otherwise “Go to {field}”. |
| “+ Attach image” | Keep | — |
| “Didn’t send. Try again” | Keep; good inline recovery | “Upload failed. Try again” is slightly more specific. |
| “Back to the desk” | Keep | — |

### Questionnaire field audit

The five chapter names—**Your details, Your business, Your customers, Look and
feel, What you need**—form a coherent progression and should stay. Across the
individual questions:

- Keep direct prompts such as “What does success look like?”, “Who are you
  trying to reach?”, “How should people feel?”, and “What should we avoid?” They
  invite concrete answers without teaching branding theory.
- Replace noun-label fields that suddenly stop the conversation (“USP”,
  “Competitors”, “Technical needs”, “Accessibility needs”) with questions or add
  a plain-language prompt. “What makes you the clear choice?” is better than
  “USP”; “Who else might your customers choose?” is better than “Competitors”.
- Keep tips at six words or fewer on public routes, but do not make brevity win
  over comprehension. “Optional” alone is not help text.
- Explain **decision-makers** as “Who gives final approval?”; it is clearer and
  maps to the approval workflow.
- “What’s out of scope?” is excellent because it names a real commercial object.
- Spectrum endpoints must remain grammatically parallel. Modern/Traditional,
  Playful/Professional, High-end/Affordable, and Bold/Minimal are readable;
  “high-end” describes market position while “affordable” describes price, so
  consider “premium / accessible” only if the owner wants a positioning rather
  than pricing axis.
- Never expose schema or process terms such as `engagement`, `brand surfaces`,
  `messaging proof`, or `technical needs` without examples.

## 6. Research — 7.5/10

The empty-state instruction is among the best copy in the app: it names all
accepted objects and what happens to client submissions. Weaknesses are mostly
inside pin controls, where “pack”, “shortlist”, “Hero”, and arrows describe the
same curation operation in four dialects.

| Current | Verdict | Recommended |
|---|---|---|
| Upload / Take photo / URL / Note | Keep; concrete object/action labels | “Add link” instead of URL if nontechnical users ever see it. |
| “Newest first. Drop an image…” | Keep; sets ordering and action | — |
| “Drop an image here…” | Keep | — |
| Add | P2; context makes it clear but result can be named | “Add link” / “Add note”. |
| Unstar all | P1; star is interaction, shortlist is meaning | “Clear shortlist”. |
| Star the rest | P1; may silently stop at six | “Fill shortlist” and say “up to 6”. |
| “In pack — remove” / “Add to pack” | P1 | “Remove from shortlist” / “Add to shortlist”. |
| “★ pack” / “☆ pack” feedback | P1 | “Added to shortlist” / “Removed from shortlist”. |
| “Client pack is full (6 pictures max)” | P1; “full” is okay, “pack” is not | “Shortlist is full (6 references maximum).” |
| “Add {hex} to palette” | Keep | — |
| Open link | Keep | — |
| More pin actions | Keep | — |
| ↑ / ↓ visible buttons | P1; unlabeled to sighted users | “Move earlier” / “Move later”. |
| Hero | P1; unexplained role | “Make main image”. |
| Remove reference | Keep | — |
| Shortlist | Keep as the canonical noun | — |
| Adjust crop focus / Cancel | Keep | — |
| Prev / Next | Keep, though “Previous” is more consistent | — |
| “★ Pack” / “☆ Pack” lightbox button | P1 | “Remove from shortlist” / “Add to shortlist”. |
| “Next · Identity” | P2 | “Next: Identity”. |

## 7. Identity — 5.5/10

This is the densest language surface and the least consistent. Many field labels
are excellent studio language, but tool controls use internal shorthand. The
page also switches from “mark” to “logo” and from “colour” to generated “color”
copy depending on component boundaries.

### Global Identity controls

| Current | Verdict | Recommended |
|---|---|---|
| Bump | P1; version-control jargon | “Save version”. |
| History | P1; object missing | “Version history”. |
| Templates | Keep if the user knows what is templated | “Identity templates” is safer. |
| Mark / Words / Colour / Type / Preview subnav | Keep; clear and parallel | Ensure Preview is the actual label if the fifth screen is an artboard. |
| Back · {section} | P2 | “Back to {section}”. |
| Back to the desk | Keep | — |

### Mark

| Current | Verdict | Recommended |
|---|---|---|
| “How the mark behaves” | Keep | — |
| “always with wordmark” | Keep as example | — |
| “Client chose” | P2; incomplete sentence | “Chosen direction”. Hint can say “Note what the client chose and when.” |
| Clearspace / Smallest mark size | Keep; audience is a designer | — |
| “Mark mistakes to avoid” | Keep | — |
| “Leave this blank and the handoff uses these:” | Keep; explains default consequence | — |
| “Start from these” | P1; unclear whether it overwrites | “Use suggested rules”. |
| Mark versions / Primary / Reverse / Mono | Keep, but “Mono” should be “Monochrome” in client output | — |
| Remove mark | Keep | — |
| Upload/Replace mark image | Keep | — |

### Words

| Current | Verdict | Recommended |
|---|---|---|
| “Direction you're building” | P1; direction is internal and grammar is awkward | “Identity direction”. |
| Why | P1; too bare | “Why this direction fits”. |
| Tagline / Positioning / Voice / Do / Don’t / Promise / Proof / Personality | Mostly keep | “Do” and “Don’t” should be “Writing do’s” / “Writing don’ts” if rules are specifically verbal. |
| Optional — one line | Keep | — |
| “Who it’s for · how it should feel” | Keep; excellent compact hint | — |

### Colour

| Current | Verdict | Recommended |
|---|---|---|
| “How this palette compares to your strategy” | Keep | — |
| “Your brief says no {x}. {x} is in the palette.” | Keep; specific contradiction | Avoid accusatory tone if repeated: “The brief avoids {x}, but the palette includes it.” |
| Palette health | P1; health metaphor can imply judgment | “Palette checks”. |
| Pick colour / Remove / Add colour | Keep | — |
| Reset to default | P0 if destructive and immediate | “Reset palette to defaults”; confirm what will be replaced. |
| Colour jobs | P1; unclear terminology | “Colour uses”. |
| “Which job to assign next” | P1 | “Choose a colour use”. |
| “Contrast and why” | P1; not parallel | “Readability”. |
| Fix contrast | P1; opaque automation | “Apply contrast fixes” plus a preview/undo expectation. |
| Suggest | P1; suggest what? | “Suggest colour”. |
| Why | P1 | “Why this colour fits”. |
| “pass pairs” / None / Aa on… | P1; technical fragments | “Readable pairs”; “No passing pairs”; full labels such as “Text on background”. |

### Type, imagery, writing and print

| Current | Verdict | Recommended |
|---|---|---|
| Font unavailable warning | Keep; unusually honest about preview/export substitution | Break the long sentence after the font name. |
| Type pair | Keep | — |
| Custom labels… | P1; ellipsis without expected result | “Edit font labels”. |
| Heading face / Body face | Keep | — |
| “No match for…” | Keep; clear consequence and exception | — |
| “The quick brown fox keeps the brief honest.” | P2; charming but not a useful specimen | Use brand-relevant sample text or explain it is preview text. |
| “Why these faces” | Keep | — |
| Artboard / Loading… | P2 | “Identity preview” / “Loading preview…”. |
| Look of photos / Pictures we want / Pictures to avoid | Keep; plain language | — |
| Writing and print / Headings / Short labels only / UI labels… / Never | Keep; but field relationships need visual context | — |
| Anything else about the words | Keep | — |
| Pantone match / Paper stock / Finish | Keep for professional audience | — |

### Version history and templates

| Current | Verdict | Recommended |
|---|---|---|
| “No saves yet…” | P1; long and uses “Bump” | “No saved versions yet. Identity saves hourly while the studio is open. Choose Save version when you want to name a point.” |
| This save / Vs now / Comparing to now… | P1 | “Saved version” / “Compare with current” / “Comparing with current…”. |
| No templates yet. | P1; no next step | “No identity templates yet. Save this setup as a template to reuse it.” |
| Apply / Edit / Delete | P1; object absent | “Apply template” / “Edit template” / “Delete template”. |
| Template name / Notes (optional) / Cancel | Keep | — |

## 8. Touchpoints — 5.5/10

This view inherits the legacy internal name **Sketch**, while the visible job is
applications. Copy mixes task management (“queue”, “step”, “energy”) with design
review (“mock is good”) and onboarding. The result is operationally capable but
linguistically crowded.

| Current | Verdict | Recommended |
|---|---|---|
| Current step | Keep | — |
| Add step | Keep | — |
| Break down project | P1; action actually breaks down one task/goal | “Break into steps”. |
| Why / Why this step | P1 | “Why this matters”. |
| Complete step | Keep | — |
| Split if too big | Keep; excellent ADHD-aware phrasing | — |
| More | P2; acceptable disclosure if only secondary actions live there | — |
| Due | P2 | “Set due date” before one exists. |
| Remove / Delete | P1; inconsistent permanence language | Use “Remove step” for reversible, “Delete step” only if permanent, and state consequence in confirmation. |
| From Ideate | Keep | — |
| Queue all | P1; queue what? | “Add all to the queue”. |
| Feedback so far (shared with Review) | P1; implementation note leaks | Keep “Feedback so far”; remove “shared with Touchpoints/Review” from UI. |
| “Change · why · keep” | P1; compressed and cryptic | “What should change, why, and what should stay?” |
| Add / Next step | P2 | “Add step”. |
| Options / Hide | Keep | — |
| Energy H/M/L | P1; codes require recall | “High / Medium / Low”, or icon plus full label. |
| Voice | P1; could mean brand voice | “Dictate”. |
| Got it | Keep for dismissing explanatory card | — |
| Queue · n / Done · n / Show / Hide | Keep; clear with section context | — |
| Undo tick | P1; visible glyph has no visible action | “Move back to queue”. |
| Where the brand shows up | Keep | — |
| Website / Social / Print / App | Keep; “Social media” is clearer than “Social”. |
| “Mock is good” / “This mock is good” | P1; state/action mismatch | Button action: “Mark mock ready”; state: “Mock ready”. |
| “Next · Assets” | P2 | “Next: Assets”. |

## 9. Assets / handoff — 5.5/10

The page is trying to do three jobs in copy: prepare the brand book, export many
formats, and send the work. That produces vague section labels and a particularly
risky CTA: **Download it now** does not name the file or distinguish preview from
final output.

| Current | Verdict | Recommended |
|---|---|---|
| Ship (accessible label) | P1; conflicts with handoff vocabulary | “Assets and handoff”. |
| Still thin | P1; shame-adjacent and nonspecific | “More is needed for the core package” plus named gaps. |
| “Core pack looks ready — download when you want” | P1 | “Core client package is ready to download.” |
| “Every page you send says:” | Keep; concrete consequence | — |
| Your studio / Change in Settings | Keep | — |
| Handoff | Keep as canonical process noun | — |
| “What’s included · how to use it” | Keep as placeholder | Use a sentence in generated output. |
| Download it now | P2 in context; this is a retry under a failed named PDF export | “Retry PDF download”. |
| Also open | P1; unclear heading | “Other files”. |
| Loading preview… | Keep | — |
| Page setup · print size | P1; redundant fragment | “Page setup”. |
| Going to a print shop | Keep | — |
| Learned | P1; unexplained retrospective | “Project notes” or “What you learned”. |
| What worked · what next | P1 | “What worked, and what would you do next?” |
| Extras · print, ZIP, backup | P1; “extras” hides important outputs | “Other downloads”. |
| Brand book PDF | P1 as a button if it downloads | “Download brand book PDF”. |
| Print | P1 | “Print brand book”. |
| Everything (zip) | P1 | “Download all files (.zip)”. |
| Copy summary | Keep if it copies | “Copy handoff summary” is clearer. |
| Preview | P1 | “Open preview”. |
| Raster | P1; expert noun but no outcome | “Download raster images”. |
| MD | P1; raw extension | “Download Markdown”. |
| Backup | P1 | “Download project backup”. |
| Leave | P0; destination and unsaved consequence unclear | “Back to desk” or “Close Assets”. |
| New project | Keep | — |
| Back to the desk | Keep | — |

## 10. Review tool — 5/10

Review is the most fragment-heavy page. “Ready · n/n” and “Gaps · n left” look
compact but ask the user to decode a scoreboard. The page also displays “Fix” on
items whose required action varies.

| Current | Verdict | Recommended |
|---|---|---|
| Review | Keep | — |
| “Ready · n/n” | P1; scoreboard | “{n} items ready”. |
| “Gaps · n left” | P1 | “{n} gaps to review”. |
| Notes (shared with Touchpoints) | P1; implementation language | “Project notes”; omit parenthetical. |
| “Change · why · keep” | P1 | “What should change, why, and what should stay?” |
| Prompts | Keep | — |
| Prompt chips | P1 if stems are fragments that hide full prompts in title tooltips | Show the full question; do not depend on hover. |
| “Fix · n gap” | P1; generic and grammatically wrong at plural | “Review {n} gaps”. Each row should name the action, e.g. “Add body font”. |
| Preview | P1 | “Package preview”. |
| “Next · Assets” | P2 | “Next: Assets”. |

## 11. Ideate — 6.5/10

The phase explanation is strong and correctly lowers perfection pressure. The
buttons then switch to process jargon: promote, shortlist, direction, pin, Board.
“Pin to Board” also capitalises a noun that the visible path calls Research.

| Current | Verdict | Recommended |
|---|---|---|
| “Volume first. Messy list…” | Keep; excellent expectation setting | — |
| Goal: | Keep | Drop colon if visually separated. |
| “1 · Diverge (rough dump)” | P1; theory plus slang | “1. Make a messy list”. |
| “Aim for range…” | Keep, except “Promote” has no matching control | Replace “Promote” with “Shortlist” to match the button. |
| ↑ shortlist | P1; glyph plus noun | “Add to shortlist”. |
| Add rough idea / Add | P2 | Button: “Add idea”. |
| “2 · Shortlist · A · B · C” | P1; punctuation-heavy | “2. Choose up to three directions”. |
| Direction title / Direction why | P1; awkward labels | “Direction name” / “Why it could work”. |
| Chosen / Choose | Keep as state/action pair | — |
| Prompt | Keep | — |
| Use as next A/B/C title | P1; internal slot language | “Use for next open direction”. |
| New | P1 | “New prompt”. |
| Opposite | Keep; a useful ideation verb | “Try the opposite” is more explicit. |
| Pin to Board | P1 | “Add to Research wall”. |
| “Send · Touchpoints” | P1; unclear what is sent | “Add chosen directions to Touchpoints”. |
| “Keep diverging (or choose A/B/C)” | P1; disabled button gives instruction as label | Keep button “Add to Touchpoints”; put “Choose at least one direction first” beside it. |

## 12. Timer — 4.5/10

The timer relies on bare numbers and insider knowledge. A button labelled **25**
and another labelled **2** do not say minutes or what mode they set. This directly
conflicts with the product rule that numbers should not be the primary readout.

| Current | Verdict | Recommended |
|---|---|---|
| Timer | Keep | — |
| Now · {task} | P2 | “Focusing on {task}”. |
| Dynamic Start/Pause/Resume label | Keep if all three are explicit | Verify “Start focus”, “Pause timer”, “Resume timer”. |
| 25 | P1 | “25 min focus”. |
| 2 | P1 | “2 min reset” or the actual purpose. |
| Next · Ideate | P1; timer should not imply path progression to an off-path tool | “Open Ideate”. |
| Break lock | P1; technical/security connotation | “Lock screen during breaks”. |
| Mark done | Keep if task is named nearby | “Mark task done” is safer. |
| n / n steps | P1; scoreboard | “Next step ready” or a verbal progress state. |
| Helper / Helper on | P1; state/action confusion | Persistent label “Helper” with separate On/Off state. |

## 13. Calendar — 6/10

Core labels are familiar. The page mixes “deadline” and “due” without a rule and
uses bare glyphs for date creation.

| Current | Verdict | Recommended |
|---|---|---|
| Deadlines | Keep | Use “deadlines” for projects and “due dates” for tasks only, if both exist. |
| Due / ? / Set / Cancel | P1; “?” is not a value | “No date”; “Set deadline”; “Cancel”. |
| Clear | P1 | “Clear deadline”. |
| Month / Today | Keep | — |
| Previous/Next month aria labels, arrow glyphs | Keep; accessible names are specific | — |
| + | P1 if not beside a named list | “Add deadline”. |
| “No deadlines yet…” | Keep; clear start instruction | — |
| Open | P1 | “Open project” or “Open task”. |

## 14. Clients and client record — 7/10

The directory is clean and scannable. The record page is mostly clear but uses
“line” for a relationship/notes item and has ambiguous removal semantics.

| Current | Verdict | Recommended |
|---|---|---|
| Clients / Search clients or projects / Most recent / A–Z | Keep | — |
| “Add a logo to use it here” | P1; where is “here”? | “Add a client logo to show it on this card.” |
| Call / Email | Keep | — |
| “No client named…” | Keep; explains likely reason | Add a route: “Back to clients”. |
| New project for {client} | Keep | — |
| Project name / Save / Rename | P1; Save can apply to notes too | “Save project name”; “Rename project”. |
| What I know about them | Keep; warm and memorable | — |
| Notes / “Anything worth remembering next time” | Keep; strong prompt | — |
| Remove | P0 if destructive and target unclear | “Remove note” / “Remove contact detail” with consequence. |
| Add a line | P1; internal visual term | “Add detail”. |
| Prefers email | Keep as example | — |
| Add | P2 | “Add detail”. |

## 15. Asset library — 6.5/10

The page is honest about local file availability, which is good credibility
copy. It lacks a useful empty state and uses “filed” as metaphor without first
establishing folders/categories.

| Current | Verdict | Recommended |
|---|---|---|
| Asset library | Keep | — |
| “Files aren’t on this device. Names, versions and sources are.” | Keep if technically true; excellent honesty | If files can be re-fetched, add how. |
| Choose files | Keep | “Add files” is more outcome-oriented. |
| “Files that were not filed” | P1; repetitive and vague | “Uncategorised files”. |
| — empty value | P2; gives no meaning | “No category” or “Unknown”. |

## 16. Brand book builder — 4.5/10

The builder exposes print and typography vocabulary appropriately, but it is
the strongest example of naming drift and raw implementation language. “Print /
save as PDF” competes with a separate PDF download; “source of truth” is a
governance phrase, not a user action; colour spelling changes; and the reorder UI
can expose raw section ids.

| Current | Verdict | Recommended |
|---|---|---|
| Content overflows page boundary | Keep; actionable location still needed | “Content runs off this page. Shorten it or increase edge space.” |
| Front cover / Colour palette / Typography / Logo / Applications / Back cover | Keep; standard book sections | Standardise Colour spelling. |
| ← Back / Next → / Close | Keep | “Previous page” / “Next page” if not obvious. |
| Flip through it | P1; conversational but vague | “Preview book”. |
| Print / save as PDF | P1; two outcomes in one label and duplicates vector PDF | Split into “Print” and “Save as PDF”, or remove if the vector download supersedes it. |
| Brand book — source of truth | P1; internal phrase | “Brand book settings”. |
| Name & tagline / Setup / Colours / Type scale / Page backgrounds / Grid / Running elements | Keep; professional, scannable | — |
| Sheet | P1 | “Page size”. |
| Edge space | P1; uncommon term | “Page margins” unless it means bleed/safe area. |
| Going to a print shop | Keep | — |
| + add color | P1; dialect + casing | “Add colour”. |
| Type color | P1 | “Type colour”. |
| Show grid guides / header / footer / page numbers | Keep | — |
| Alternate for facing pages | P1; alternate what? | “Mirror alignment on facing pages” or actual behaviour. |
| In this book | Keep | — |
| Move up / Move down | P2 | “Move earlier” / “Move later” better matches pages. |
| n of n sections in the book | P1; scoreboard adds little | “{n} sections included”. |
| “needs — open” / “needs” | P1; broken generated grammar | “Open {section} to add {missing item}.” |
| Raw ids or blank section labels | P0 credibility defect | Always render human page titles; never anchor ids. |

## 17. Settings — 5.5/10

Settings has clear groups but inconsistent control grammar. Some buttons show the
next action (“Switch to dark”); Notifications shows only a state (“Quiet” or
“All”); switches have visible setting labels but accessible state only. Backup,
Import, Sync, and Send project are also insufficiently distinct.

| Current | Verdict | Recommended |
|---|---|---|
| Calm | P1; vague group name | “Focus and motion”. |
| Hide nav while typing / Less motion | Keep | “Reduce motion” is the conventional setting label. |
| Notifications + Quiet/All | P1; button state/action unclear | Use a select labelled “Notifications” with “All” and “Quiet”, or label action “Use quiet notifications”. |
| Theme + Switch to dark/light | Keep | — |
| Keyboard shortcuts + Show | P1 | “View shortcuts”. |
| Data | Keep | — |
| Sign out / Lock | Keep; correctly mode-specific | — |
| Sync | P1; direction and scope unclear | “Sync all data”. |
| Send project | P1; send where? | “Save project to cloud”. |
| Backup | P1 | “Download backup”. |
| Import | P1 | “Import backup”. |
| Retry | P1 | “Retry sync”. |
| Retained versions | P1; system language | “Conflict copies”. |
| Empty conflict explanation | Keep; excellent plain-language explanation | Rename heading to match it. |
| Bring back / Discard | P0; consequences unclear | “Restore this copy” / “Delete this copy”; say whether current data is replaced. |
| Newer / Older | Keep | — |
| Current / New (6+) | P1; placeholder-only labels | Visible “Current password” / “New password”. |
| Update | P1 | “Update password”. |
| Sample project + Soft Signal / Harbor & Hearth | P1; names do not say action or replacement cost | “Load Soft Signal sample” / “Load Harbor & Hearth sample”; retain the replacement confirmation. |
| Danger | P1; noun is vague | “Delete data”. |
| Clear all projects | P0; confirmation is good, distinction from reset is not | Add summary: “Deletes projects; keeps settings and account.” |
| Full reset | P0 | “Reset app and delete all local data”; explicitly list what remains in cloud. |
| “Full reset + setup?” | P0; consequence too vague | Use a consequence-led confirmation, never the feature name alone. |

## 18. Shared shell, navigation and global overlays — 5.5/10

The shell carries many micro-surfaces, and terminology drift compounds here
because these labels appear on every page.

### Navigation and menus

| Current | Verdict | Recommended |
|---|---|---|
| Studio / Projects / This project / Desk / Tools / Account | Mostly keep | Resolve Studio vs Home; “This project” is a good scope label. |
| No projects yet. / New project | Keep | — |
| Archive project / Delete project / Restore archived… | Keep; specific | “Restore project” after selection. |
| Continue → | P1; destination may be invisible | “Continue to {next stop}”. |
| Go to | P1 as menu heading | “Tools and pages”. |
| Timer / Ideate / Review / This project / Share Strategy form / Export / Hours & invoice / Discovery brief | P1; mixed destination and action grammar | Use destinations as nouns and actions as verb phrases; rename shared brief artifact consistently. |
| Keys | P1; obscure heading | “Keyboard shortcuts”. |
| “1–Path”, “C–Done step”, etc. | P1; compressed | Render “1–5: Open path stop”, “C: Mark step done”, etc. |
| “Esc Close / Helper” | P1; one key, two context-dependent actions | “Esc: Close open panel”. If Helper also closes, it is still a panel. |

### Work and capture chrome

| Current | Verdict | Recommended |
|---|---|---|
| To-do / Working / Focus | Keep nouns, but timers need named values | — |
| “Clocked work time — runs by itself while you work” | Keep; clear distinction | — |
| “Focus timer you started…” | Keep | — |
| “Lock the screen 5–10 min after focus?” | P1; range is unexplained | “Lock the screen for a break after each focus session?” State exact duration elsewhere. |
| On / Off | Keep only next to persistent setting label | — |
| “Put it down, sort it later” | Keep; excellent ADHD-aware copy | — |
| “Whatever just came to mind” | Keep | — |
| Add | P2 | “Capture note”. |
| “Esc to close. Anything typed is kept.” | Keep; excellent state-loss reassurance | — |
| Undo · {action} | Keep if action is named | — |

### Export overlay

| Current | Verdict | Recommended |
|---|---|---|
| Export | Keep as heading | — |
| Open | P1 | Name the selected export destination. |
| Brand book PDF | P1 | “Download brand book PDF”. |
| More / HTML / MD / JSON / Print | P1; file extensions without purpose | “Download HTML”, “Download Markdown”, “Download project data (JSON)”, “Print”. |

### Account menu

| Current | Verdict | Recommended |
|---|---|---|
| Account | Keep | — |
| Theme action / Settings / Sign out or Lock | Keep | — |

## 19. Client dashboard setup, inbox and brief sharing — 5.5/10

These studio-facing panels contain the most severe naming collision. The same
public dashboard is called a client link, client dashboard, portal, and project
overview. Choose “client dashboard” for the product surface and “dashboard link”
for the URL; reserve “portal” for code.

### Client dashboard setup

| Current | Verdict | Recommended |
|---|---|---|
| Create client dashboard | Keep as canonical action | — |
| Try again / Check for updates | Keep; specific context should name dashboard/form status | — |
| Copy | P1 | “Copy dashboard link”. |
| Email link to client | Keep | — |
| Revoke link / Tap again to revoke | Keep; consequence should say client loses access | Add “The client will no longer be able to open this dashboard.” |
| Ask client to fill it out | P1; “it” unclear | “Send project brief”. |
| Re-send form | P1; noun drift | “Resend project brief”. |
| Review client’s answers | Keep | — |
| Survey buttons | Keep if each survey name is plain | Use consistent “Send {survey name}”. |
| Send | P1 | “Send message”. |
| Download a PDF of this page | P1 | “Download project overview PDF” only if the artifact really differs from the brief. |
| Print a blank brief / scan one back in | P1; two jobs in one button | “Use a paper brief”; explain download and scan on the next screen. |
| Save these answers | P0; implies save, but may merge/overwrite | “Apply these answers to the brief”; show what changes before applying. |
| Download blank form (PDF) | Keep | — |

### Discovery brief panel

| Current | Verdict | Recommended |
|---|---|---|
| Discovery brief | P1 | “Project brief”. |
| Fill it out myself | Keep | “Fill in the brief” is more direct. |
| Run as a call script | Keep; clear mode | — |
| Email to client / upload a completed form | P1; two workflows in one choice | Split or use “Send or import a brief”. |
| Previous / Next question | Keep | — |
| Done — back to brief | Keep | — |
| Create client link | P1 | “Create brief link”. |
| Copy | P1 | “Copy brief link”. |
| Email link to client | Keep | — |
| Check for client’s answers | Keep | — |
| Revoke link | Keep with consequence text | — |
| Download fillable form (.md) | P1; Markdown is not normally “fillable” | “Download questions (Markdown)”. |
| Open email draft | Keep | — |
| Copy as text | Keep | — |
| Remove | P1 | “Remove uploaded form”. |

### Client inbox

| Current | Verdict | Recommended |
|---|---|---|
| Client / Client — new activity | P1; singular noun labels a cross-client inbox | “Client inbox” / “Client inbox — new activity”. |
| Link it to “project” | P1; “it” requires recall | “Link dashboard to {project}”. |
| Send | P1 | “Send reply”. |
| Open their answers | Keep | — |
| Go to {step} | Keep | — |
| Open Assets | Keep | — |
| Try again | Keep if error explains what failed | — |
| Create a client link | P1 | “Create client dashboard”. |
| New | Keep as accessible unread state | — |

## 20. Public client brief — 6.5/10

Client-facing field language is generally warmer and clearer than the studio
chrome. The final button **Submit** is the weak point: it does not name the brief,
whether submission is final, or what happens next.

| Current | Verdict | Recommended |
|---|---|---|
| Shared brief questions | Mostly keep; see Strategy field audit | Remove studio jargon and any first-person language that ambiguously refers to designer vs client. |
| Submit / Submitting… | P1 | “Send brief” / “Sending brief…”. If single-use, add “You won’t be able to edit it after sending.” |
| Already submitted state | P0 if it offers no recovery | Confirm receipt and name the studio/client contact. |
| Load/not-found errors | P0 | Never say only “Try again shortly”; explain the link may be expired and tell the client to contact the named studio. |

## 21. Public client dashboard — 6.5/10

The approval workflow is concrete, but “Open it” has no object, generic Submit
buttons appear for different forms, and two-tap approval copy uses mobile-specific
“Tap” even on desktop.

| Current | Verdict | Recommended |
|---|---|---|
| Open it | P2; the nearby heading supplies context, but the object can still be clearer | “Open brand book”. |
| Approve / Tap again to approve | P1; device-specific and surprising | First action “Review approval”; confirmation button “Approve {step}”. Or “Select again to approve” if two-tap must remain. |
| Request changes | Keep | — |
| Request changes instead | Keep; clear escape from armed approval | — |
| Saving… | Keep | — |
| Submit (project form) | P1 | “Send project brief”. |
| — empty select option | P1 | “Choose an option”. |
| Send answers | Keep if survey is named; otherwise “Send survey answers” | — |
| Send (message) | P1 | “Send message”. |
| Refresh messages | Keep | — |
| Error and empty states | P0 | Always name the studio as the support route; never expose storage/cloud/backend terms. |

## 22. Public brand reveal — 8/10

This surface has the best client-facing action copy. Waiting language is human,
and the primary download names both object and format.

| Current | Verdict | Recommended |
|---|---|---|
| Download the PDF / Getting it ready… | Keep | “Preparing your PDF…” is slightly more specific but not necessary. |
| Send it (reaction) | P1; object unclear | “Send feedback”. |
| Reveal headings/body | Keep if they use client/brand names and avoid “pack” jargon | — |

## 23. Brand delivery controls — 6/10

The flow is friendly but overuses pronouns. “It” refers variously to the brand
book, client package, and dashboard link.

| Current | Verdict | Recommended |
|---|---|---|
| Set up their link | P1 | “Set up client dashboard”. |
| Ready to send it | P1 | “Preview handoff”. |
| Send it to {client} | P1 | “Send client package to {client}”. |
| Not yet | Keep as cancel after a preview | “Back to Assets” is more explicit. |
| Copy the link | P1 | “Copy reveal link”. |
| Take it back | P0; consequence unclear | “Withdraw delivery”; explain client access ends. |
| Send it again | P1 | “Resend client package”. |

## 24. Brand checks, readability and application checks — 5/10

These tools know a lot but often present diagnoses as fragments. A check should
name the object, the problem, and the next action without making the user infer
what “Fix” or “Why” controls.

| Current | Verdict | Recommended |
|---|---|---|
| Search | P1; search what? | “Check brand consistency” if it runs analysis; “Search references” if literal search. |
| Check all {n} brand items | P1; count without categories | “Run full brand check”. Put count in supporting copy. |
| Hide the full check | Keep | “Hide full brand check” for symmetry. |
| Gap labels as buttons | P1 | Use action phrases: “Add logo clearspace”, “Choose body font”. |
| Readability route “Fix” actions | P0 if they mutate colours without naming result | “Change {role} to {hex}”; provide undo and preserve brand-impact warning. |
| Application and mark colour checks | P1 | Use “Pass”, “Needs review”, and “Couldn’t check”; never “good/bad” without criteria. |

## 25. Brand artboard and reusable identity controls — 6/10

| Current | Verdict | Recommended |
|---|---|---|
| Remove mark | Keep | — |
| Set as {role} · now: {labels} | P1; role jargon | “Use {colour} for {plain-language use}”. |
| Hex / RGB / CMYK | Keep for designer audience | — |
| Upload/Replace mark image | Keep | — |
| “Set a few words in Strategy…” | Keep; connects cause to effect | Replace em-dash list with examples only if space requires. |
| clear (axis) | P2; inconsistent casing | “Clear {axis}” visibly or keep accessible label and use “Clear”. |
| Add / Adjust / Place it / Remove (strategy words) | P1 | “Add word”, “Adjust position”, “Place on axis”, “Remove word”. |

## 26. Brand book preview, stationery, case study, client package — 6/10

### Stationery

| Current | Verdict | Recommended |
|---|---|---|
| Add contact | Keep | — |
| Download PDF / PNG | P1 when repeated across artifacts | “Download letterhead PDF”, “Download business card PDF”, etc. |
| Untitled contact | Keep | — |
| Copy HTML | P1 | “Copy signature HTML”. |

### Case study

| Current | Verdict | Recommended |
|---|---|---|
| Case study | Keep | — |
| Download case study / Exporting… | Keep; name format if it is not obvious | — |
| Decision rows | P1 if they expose internal rule flags | Phrase as human design decisions and rationales, not “breaks rule”. |

### Client package

| Current | Verdict | Recommended |
|---|---|---|
| Which item is this? | Keep | — |
| Remove | P1 | “Remove file”. |
| Add files / Reading… | Keep | “Adding files…” may better describe async work. |
| Build the client package | Keep; canonical object/action | — |
| “{n} held back” | P1; may sound punitive | “{n} files excluded”. Explain why beside each file. |

## 27. Invoice and private work log — 6.5/10

The product correctly distinguishes private tracked time from invoice lines. Copy
should reinforce that distinction every time a number can cross the boundary.

| Current | Verdict | Recommended |
|---|---|---|
| Add fixed line / Log hours | Keep; accurately conditional | — |
| Invoice details · needed | P1; fragment | “Add invoice details” with “Required before download” supporting text. |
| Hide invoice details | Keep | — |
| Download invoice / Exporting… | Keep; add PDF if relevant | “Download invoice PDF”. |
| Remove entry from {date} | P1; entry may be ambiguous | Include description or amount when available. |
| Show numbers / Hide numbers | P1; which numbers? | “Show exact time” / “Hide exact time”. |
| Private work-log explanation | Keep when it explicitly says it does not fill the invoice | — |

## 28. Running to-do and task breakdown — 5.5/10

### Running to-do

| Current | Verdict | Recommended |
|---|---|---|
| Yes / Not now | P1; answers depend on a prompt that may scroll or be announced separately | Name action: “Add it” / “Not now”. |
| Add / Done | P1 | “Add task” / “Close list”. |
| Add to list | Keep | — |
| Sort | P1; does it auto-sort or open options? | “Sort tasks” or “Sort automatically”. |
| Mark done / Mark not done | Keep; excellent accessible labels | “Mark incomplete” is more conventional than “not done”. |
| Remove “task” | Keep | — |

### Task breakdown

| Current | Verdict | Recommended |
|---|---|---|
| Start / Back / Next | Keep within a named wizard | — |
| Depth labels | Keep if each explains output size | — |
| Low / Med / High | P1; unclear dimension | Full labels with setting name, e.g. “Low energy”. |
| Generate | P1; generator jargon and object missing | “Build step list”. |
| + Step | Keep | “Add step”. |
| Add {n} to Sketch | P1; path calls the page Touchpoints | “Add {n} steps to Touchpoints”. |
| More | P1; after completion, likely means restart | “Break down another task”. |
| Start #1 | P1; code-like numbering | “Start first step”. |

## 29. Revision rounds — 7/10

| Current | Verdict | Recommended |
|---|---|---|
| Finish round {n} | Keep | — |
| Start a round / Start an extra round | Keep; honest about contracted limit without blocking | — |
| Log it | P1 | “Add feedback”. |
| Remove “issue” | Keep | — |
| Limit copy | Keep only if neutral: never “over limit” as scolding | “This is an extra round” is enough. |

## 30. Helper / Mate — 5/10

The Helper has a good high-level action set—Coach, Critique, Break—but the panel
expands into a vocabulary thicket. It is also called Helper, Mate, Buddy, and
body doubling in different layers. The owner-facing product should choose one
name; internal module names do not matter.

| Current | Verdict | Recommended |
|---|---|---|
| Helper | Keep as canonical product name | Retire visible Mate/Buddy/body-doubling labels unless they mean distinct modes. |
| New tip | P1; may be a message, not a tip | “New Helper message”. |
| Minimize / Turn off helper | Keep | — |
| Ask | P1 | “Ask Helper”. |
| Coach / Critique / Break | Keep; distinct verbs | — |
| Water / Food / Bath | P1; “Bath” means bathtub, but action logs bathroom | “Water” / “Food” / “Bathroom”. |
| Log break | Keep | — |
| Done: {item} / Remove {item} | Keep accessible labels | — |
| More / Less | Keep as secondary action disclosure | — |
| Stuck | P1; feeling used as button command | “Help me get unstuck”. |
| Full review | Keep if scope is explained | “Review this page” may be more accurate. |
| Time | P1 | “Plan my time” or actual outcome. |
| Progress | P1 | “Show my progress”. |
| Dynamic quick-action stems | P1 | Every stem must be a complete, predictable request; never one-word process jargon. |
| Helper AI errors | P0 | Say whether work was saved, whether the request can be retried, and never imply the user's prompt caused the failure. |

## 31. Forced break — 6/10

The overlay must be especially careful not to sound punitive. The normal break
items are concrete; “Emergency unlock” raises alarm and “Unlock” does not say
what the user is overriding.

| Current | Verdict | Recommended |
|---|---|---|
| Break item labels and ~minutes | Keep if estimates are not countdowns | — |
| Emergency unlock | P1; high-arousal wording | “End break early”. Keep “Emergency” only if policy truly requires it. |
| Unlock | P1 | “Return to work”. |
| Locked-state body copy | P0 | Must state remaining condition, preserve dignity, and explain the early-exit route without shame. |

## 32. Error boundary, loading, empty and confirmation language — 5.5/10

The app contains several good local recoveries but lacks a single error grammar.

| Pattern | Verdict | Standard |
|---|---|---|
| Reload | Keep when retrying the current page is safe | Prefer “Reload page”. |
| Back to your projects / Back to the project | Keep; strong safe escape | — |
| Retry / Try again | P2 | Name operation when more than one could have failed: “Retry sync”, “Retry preview”. |
| Loading… everywhere | P2 | Use object-specific loading on page transitions; generic is fine for sub-100ms skeletons. |
| Empty states that say only “Nothing here” | P1 | Name what belongs there, why none exists, and how to add the first. |
| “Are you sure?”-style confirmations | P0 | Lead with the action and object; list irreversible consequences; action buttons repeat the destructive verb. |
| Toasts | P1 | Past-tense confirmation with object (“Brief link copied”), not symbol-heavy fragments (“★ pack”). |

## 33. Accessibility copy

- **Keep:** close buttons generally have specific accessible labels; remove buttons
  usually name their target; previous/next month arrows are correctly named.
- **P0:** empty `alt` on decorative identity images is correct only when adjacent
  text communicates the same information. Client logos, mark versions, and book
  previews need meaningful alternatives when the image itself is the content.
- **P1:** sighted users should not have to decode buttons that only screen readers
  can understand. Visible `×`, `↑`, `↓`, `+`, `H/M/L`, `25`, and `2` need visible
  words unless they fall within the product's deliberately closed icon-only set.
- **P1:** tooltip-only explanations (`title`) do not work on touch and are not a
  substitute for visible copy. This affects Review prompts, palette controls,
  version actions, and disabled Ideate directions.
- **P2:** accessible labels should describe action, not shape: “Remove reference”
  is good; “Close” is adequate only when dialog context is programmatically named.

## 34. Generated coaching, surveys and system copy — 5.5/10

These strings are easy to miss because they are generated from libraries rather
than written in page JSX. They still reach users and need the same editorial
control.

### Process guide

| Current | Verdict | Recommended |
|---|---|---|
| Conducting research / Clarifying strategy / Designing identity / Creating touchpoints / Managing assets | P1; mixed gerunds and conceptual labels | Match the path nouns, then use a sentence for the job. “Strategy — clarify the brief”; “Assets — prepare the handoff”. |
| “Stop after about 20 minutes so you do not drown.” | P1; vivid but mildly alarmist and prescriptive | “Try a 20-minute pass, then choose what is useful.” |
| “Save refs” | P1; abbreviation | “Save references”. |
| “What must be in. What is nice later.” | P1; choppy fragments | “Separate what must be included from what can wait.” |
| “Do not marry the first idea.” | P2; common idiom, but not inclusive/plain | “Do not commit to the first idea.” |
| “Colour jobs” / “system holds” / “primary download” | P1; internal vocabulary | “Colour uses” / “the identity works” / name the file. |
| Coaching checklists | P1 where they prescribe optional work as completion | Distinguish “Useful checks” from required work; “Used a timer” must never read as a completion requirement when the prompt says it is optional. |
| Review questions | Mostly keep; specific and goal-focused | Replace slash chains (“hopeful / safe / clear”) with the actual strategy words when available. |

### Client surveys

The survey questions are generally excellent: specific, answerable, and tied to
something the studio can change. Keep the decision to avoid a blank survey
builder.

| Current | Verdict | Recommended |
|---|---|---|
| Partway through / After handover / Quarterly check-in | Keep | — |
| “Reflective — what the work was actually like.” | P2; “actually” subtly doubts other feedback | “Reflect on what the work was like.” |
| Not at all / Not really / Mostly / Yes / Completely | P1; scale is not grammatically valid for every question | Write question-specific scales or make every scale question share a stem that these answers complete. “Has the review process felt clear?” + “Yes” works; “Mostly” is awkward; “Completely” lacks an adjective. |
| Mid-project questions | Keep; direct and actionable | — |
| “Have the files and guidelines been usable without asking us?” | P1; “us” is wrong for a solo studio and may imply the client should not ask | “Could you use the files and guidelines without extra help?” |
| “Did the timings match…” | P2; dialect choice | If standardising on British English, keep; otherwise “timeline”. |
| “Where did it feel like hard work for you?” | Keep; invites friction without blame | — |
| “Does the arrangement still feel worth it to you?” | Keep; brave and useful | — |
| Survey — answered / with the client / not sent | P1; status fragments | “Client answered the survey” / “Survey sent; waiting for the client” / “Survey not sent”. |

### Secondary discovery-question catalog

`src/lib/client/discoveryBrief.js` carries another questionnaire vocabulary in
addition to the main detective brief. This is a copy-governance risk even when
both are functionally required.

- **Project Overview & Administration**, **Company Background & Strategy**,
  **Target Audience & Market**, **Brand Voice & Creative Direction**, and
  **Deliverables & Technical Scope** are title-case consultant language. On the
  client surface, use the warmer main chapters or sentence case.
- **The story**, **The problem**, **Target audience**, and **Tone of voice** are
  labels, while neighbouring entries are questions. Pick one register; questions
  are easier for clients to answer.
- “Where do you see your brand in 5 years?” is a stock future-vision question
  that often produces speculation. Ask what the identity must support in the
  next few years.
- “High-end vs. Affordable” repeats the mixed positioning/price axis issue.
- “Words, colors, styles, or clichés to avoid” must follow the chosen spelling.
- “File formats you need” can ask clients for technical knowledge they hired the
  designer to supply. Offer common outcomes or default it for them.
- “Key decision-makers approving concepts” should be “Who gives final approval?”

### Completeness and package-plan copy

| Current | Verdict | Recommended |
|---|---|---|
| “What the project has to change”, “Who it is for”, “What is off the table” | Keep; concrete gap names | — |
| “Starred references, each with a reason” | P1; interaction term | “Shortlisted references with notes”. |
| “The direction you chose, and why” | Keep | — |
| “Each colour has a job” | P1 | “Each colour has a use”. |
| “A text pair that passes AA” | P1; technical and slightly wrong (contrast pair, not text pair) | “A readable text/background pair (AA)”. |
| “At least one surface worked through” | P1; awkward passive phrase | “At least one finished application”. |
| “Client owns it” | P1; legal certainty may be false without contract context | “Ownership transfers to client” only when verified. |
| “Licensed for handover” | P1; specialist phrase | “Client may use it under licence”. |
| “Yours, not theirs” | P1; pronouns and adversarial tone | “Studio-owned; not transferred”. |
| Third-party / stock; Do not distribute; Rights not set | Keep, with consequence text | “Rights not set” should block external inclusion only if that is the actual rule. |

### Before/after, break kit and small generated labels

| Current | Verdict | Recommended |
|---|---|---|
| colors / logo / tagline / voice | P1; spelling and “logo” vs “mark” drift | “Colour”, “Mark”, “Tagline”, “Voice”. |
| Tiny (5 steps) / Standard (8 steps) / Full (12 steps) | P1; raw counts and “Full” imply completeness rather than depth | “Quick”, “Standard”, “Detailed”; put counts in supporting text. |
| “Low energy · under an hour of planning” | Keep; useful selection cue | — |
| “when the fog is thick” | P2; evocative but vague | “For complex projects or when the next steps are unclear.” |
| Med / Care / To-do / Task / Errand / Habit | P1; Task and To-do are indistinguishable | Merge or clearly define the difference. “Medication” is clearer than “Med”. |
| Pills / Stretch / One life task / Quick task / Text / pay / Daily | P1; fragments need their setting context | Use as examples prefixed by “Example:”. |
| Stand · stretch / Eyes far | P1; unnatural fragments | “Stand and stretch” / “Look into the distance”. |
| “1 kit item” / “n kit items” | P1; kit is internal vocabulary | “1 break task” / “{n} break tasks”. |
| “used/total min · check off” | P1; numeric scoreboard and command fragment | “Fits within this break. Mark each task when done.” |

## 35. Remaining reusable microcopy — 6/10

| Surface | Current | Verdict / recommendation |
|---|---|---|
| Yours only | “Yours only”; “Never sent to the client” | Keep; excellent privacy reassurance. |
| Yours only | Park / Clear | P1: “Save private note” / “Remove note”. “Park” is friendly but not universally understood. |
| Yours only | “What you would not put in an email” | Keep; strong prompt. |
| Studio identity | “Your studio”; “Using … from your invoice details” | Keep; explains provenance. Replace “Type here to use something else” with “Enter a different name for brand materials.” |
| Studio identity | Remove / Choose a logo image | P1: “Remove studio logo” / “Choose studio logo”. |
| Studio identity | “Stored at footer size…” | Keep; unusually honest file-quality warning. |
| Layout patterns | Use it when / Watch / Reads as | P1: “Use when” / “Watch out for” / “Visual effect”. Current labels are fragments but understandable to a designer. |
| Glossary | “Term explained simply” | Keep as region label; each definition must avoid circular design jargon. |
| Brief attachments | Attach image / Remove / Try again | Keep after naming upload failure as recommended above. |
| Journey gap strip | Open Assets | Keep when Assets is the actual next gap; title “Steps look full” should become “Earlier path work is complete”. |
| Deploy notice | Dynamic action label | Must name destination and externality: “Open latest version in new tab”, not “Update” if no in-place update occurs. |
| Pull to refresh | Dynamic status | Use “Pull to refresh”, “Release to refresh”, “Refreshing…”, then a quiet success or actionable failure. |
| Path skeleton | Loading labels | Name the stop (“Loading Research…”), and standardise capitalisation. |

## Recommended order of repair

1. **Name the shared artifacts.** Decide and codify project brief, client
   dashboard, research shortlist, brand book, client package, and handoff.
2. **Fix P0 consequence copy.** Reset/delete/restore, apply client answers,
   reset palette, withdraw delivery, public-route failures.
3. **Rewrite every generic action.** Open, Edit, Add, Remove, Save, Submit, Send,
   Fix, Suggest, More, Leave, Bump.
4. **Remove shorthand.** Scoreboards, fragment chains, raw ids, H/M/L, bare
   minute buttons, extension-only exports, punctuation-led navigation.
5. **Unify states.** Loading, empty, success, error, and confirmation patterns.
6. **Polish the long-form schema.** Convert noun labels and industry acronyms to
   client questions while retaining the strong conversational prompts.
7. **Run the final copy in the rendered app.** Check wrapping, truncation,
   disabled-state explanation, mobile touch context, and screen-reader names.

## Copy system to prevent regression

- Add a short content style guide beside the design grammar: canonical nouns,
  dialect, sentence case, punctuation, CTA grammar, status grammar, and examples.
- Centralise shared artifact names just as journey labels are centralised. Logic
  may use stable ids; rendered nouns should come from one vocabulary module.
- Add tests that ban raw internal terms in rendered copy (`portal`, `route`,
  `hero`, `Bump`, raw anchor ids) and flag one-word generic buttons unless allowlisted.
- Require client-facing errors to pass a three-part contract: failure, consequence,
  recovery/contact route.
- Review copy in context after implementation. A string can be individually good
  and still be wrong because an adjacent heading, duplicated CTA, or hidden state
  changes its meaning.

## Bottom line

Do not flatten the voice. The humane lines are an asset. The repair is to give
that voice a disciplined noun system and make every action label carry its own
meaning. Creative Companion should sound like one calm studio partner who knows
exactly what each object is called—not several thoughtful writers describing the
same workflow from different parts of the codebase.
