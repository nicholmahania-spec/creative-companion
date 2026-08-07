# Your turn

Things only you can do. I can't do these for me — either because they need a
decision that's yours, or because my access doesn't reach that far.

Ordered so the quick wins are first. **Nothing here is urgent tonight.** Do one,
close the file, come back later. That's what it's for.

Each item tells you *why it matters*, *what to click*, and *how to know it
worked*. If a step doesn't match what you see on screen, stop — that means
something changed and I should look at it rather than you guessing.

---

## 1. Put your studio name on your client PDFs

**Time:** about 30 seconds
**Why it matters:** Every PDF you send a client currently has no credit line on
it. Not the platform's name — nothing. The footer reads the project name and
the date. Your name should be there.

**Check first — it may already be filled in.** You typed a studio name into
this app once, in the invoice details, and the export code used to ignore it.
That's now fixed, so your name may already be showing.

**Steps:**

1. Open the app.
2. Click **Account** in the top right, to reach **Settings**.
3. The very first block is **"Your studio"**.
4. **Business name** — type what you want clients to read. If it already shows
   a name underneath from your invoice details, you're done; type here only if
   you want something different.
5. **Logo** — optional. "Add a logo" opens a file picker. Pick your mark and
   it's saved.

**How to know it worked:** at the bottom of that block is a line reading
**"Every page you send says: …"**. It updates as you type and shows the exact
footer that will print. When it looks right, it *is* right — that's the real
thing, not a description of it.

**You only do this once.** It's remembered for every project and every export.

**Two notes on the logo:**

- It's shrunk to footer size when saved. Your original file is untouched. This
  isn't fussiness — your whole workspace saves as one lump to browser storage
  with a hard size limit, and a full-size logo in there would have broken
  saving for your projects and approvals too.
- **The logo doesn't print on exports yet.** It's stored and previewed, but
  every export still prints the text name. That's the next piece of work.

**This item used to say something different.** It sent you to the Assets screen,
into a collapsed row called "Page setup · print size", to a box labelled
"Footer credit". You said that was far too complicated and you were right — it
was account-level identity sitting on a per-project screen. It moved to
Settings on 7 Aug. The Assets screen now just shows you the footer line and
links here.

---

## 2. ~~Merge the work that's finished and waiting~~ ✅ DONE

**You asked me to do this one on 7 Aug and it's merged.** Nothing left for you
here. Leaving it on the list so you can see what landed.

**What went in:** your studio name on all seven places client work shows up, the
XP/points system deleted (it was running invisibly and the product spec bans
it), the screen-lock consent box fix from your screenshot, and three standing
rules for how I work.

Before merging I checked that all the automated tests genuinely ran rather than
just reporting green — 1,355 tests, plus the slower browser tests, all passed.
That check mattered: a "success" that quietly skipped the browser tests would
have looked identical.

**It's live.** Vercel rebuilt your site automatically. If you want to see the
change, do item 1 below and then export any PDF — your name will be on it.

**Item 5 got shorter** — see it below. The branch that just merged would normally
join that tidy-up list, but I'm still using it for the next piece of work, so
don't delete that one.

---

## 3. ~~Decide: what happens to the `--no-watermark` switch~~ ✅ DONE

**You chose A on 7 Aug — remove it — and it's done.**

The switch is gone from the help text and from the code. It doesn't silently
ignore you any more: if you (or an old script) still pass it, the command stops
and says the flag no longer exists and why.

**The bigger half is also fixed.** That terminal tool never passed your studio
name through at all, so a brand pack made that way could never carry your
credit, flag or no flag. It now reads your studio name from the workspace file
— including the fall-back to your invoice details — so a pack made in the
terminal and one made in the app are credited identically.

There were no tests covering any of this, which is how it got through. There
are now six, and I checked they can actually fail by breaking the code three
different ways.

---

## 4. ~~Decide: is the Asset Library ready to be a pull request?~~ ✅ DECIDED

**You chose B on 7 Aug — wait.**

No pull request for now. I'll build the file-upload half first, so what you
eventually see is a screen where dragging a file onto it actually does
something. Nothing for you to do here.

---

## 5. Tidy up six finished branches

**Time:** about 2 minutes
**Why it matters:** Purely tidiness. Six branches are fully merged — their work
is already in `main`, and the branches are just clutter now. Nothing breaks
either way.

**This said nine when I first wrote it.** Three of them deleted themselves within
the hour, because your repo is set to remove a branch automatically once its
pull request merges. So this list shrinks on its own over time. The six below
are older ones from before that setting was on — they're the only ones left that
need doing by hand.

**Why you and not me:** my access can create and push branches but not delete
them. GitHub rejects my delete requests. Not something I can work around.

**Steps:**

1. Go to https://github.com/nicholmahania-spec/creative-companion/branches
2. Click the **"Stale"** tab at the top.
3. For each of the six names below, find its row and click the **rubbish bin
   icon** on the right:

   - `claude/mai-ike-version-broken-7w8p30`
   - `claude/next-phase-xytovw`
   - `test-vercel-ci`
   - `worktree-fix-main-branch`
   - `worktree-fix-react-final`
   - `worktree-focus-mode-implementation`

**If a name isn't there,** it already deleted itself. That's fine — skip it.

**Safety net:** GitHub shows an **"Undo"** button right after each delete, and
even later you can restore a deleted branch. All six are fully merged, so
there's nothing in them that isn't already safe in `main`.

**Only delete the six listed.** Others in that list still have unmerged work in
them — including the two I'm working on right now.

---

## 6. Decide: five broken references sitting in the repo

**Time:** 2 minutes to decide, and I do the work
**Priority: low.** This is old, it isn't hurting anything today, and it can wait.

**Plain English:** At some point, five folders got committed to the project in a
way git doesn't understand — it recorded them as "links to another repository"
but never recorded *which* repository. So every time the code is checked out,
git prints an error about them:

```
.claude/worktrees/fix-main
.claude/worktrees/fix-react-final
.claude/worktrees/fix-tasks
.claude/worktrees/fix-test-ref
reverse-skill
```

Four of them are leftovers from temporary working folders. The fifth,
`reverse-skill`, I don't recognise — it might be something you added deliberately.

**Right now it's only a warning,** and everything still builds. But it's noise in
every build log, and noise is where real problems hide.

**Your options:**

- **A — Delete all five.** Cleanest, if `reverse-skill` isn't yours.
- **B — Delete the four `worktrees` ones, keep `reverse-skill`.** Safest if
  you're not sure.
- **C — Leave it.** It's been like this a while and nothing has broken.

**What to do:** reply **A**, **B**, or **C**. If you don't recognise
`reverse-skill` either, say so and I'll dig into where it came from before we
touch it.

---

## 7. Tell me which website is the real one

**Time:** 1 minute
**Why it matters:** There are two live copies of your app and I don't know which
one you consider *the* site. That matters because one of them is currently
out of date, and if it's the one you send people to, that's a problem.

- **Vercel** — `creative-companion-ten.vercel.app`. This is the one in your
  screenshot. It's up to date and rebuilds itself automatically.
- **GitHub Pages** — a second copy that only rebuilds when GitHub's build system
  runs. That system has been broken most of today, so this copy is probably
  showing older code.

**What to do:** tell me which address you actually use. If it's Vercel, I'll stop
worrying about the Pages one. If it's Pages, I need to get it updated.

---

## Not on this list on purpose

**Anything to do with today's red X's in GitHub.** GitHub had a major outage
today. Most of the failures were their fault, not the code's. Telling them apart
needs digging into build logs — that's mine to do, and I'll bring you anything
real.

**The bigger product decisions** — pricing, whether the client portal says
"Powered by", the connection scoring system. Those are worth a proper
conversation when you've got the headspace, not a checklist item at midnight.
