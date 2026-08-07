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
**Why it matters:** Right now every PDF you send a client has no credit line on
it. Not the platform's name — nothing. The footer just reads the project name
and the date. Your name should be there. That's the whole point of the change I
made today, but it can't guess what you're called.

**Steps:**

1. Open the app and open any project.
2. Go to the **Deliver** screen.
3. Find the grey collapsed row that says **"Page setup · print size"** and click
   it to open it. (It's closed by default, which is why you've probably never
   seen what's inside.)
4. Inside there's a box labelled **"Footer credit"**.
5. Type your studio name — whatever you want clients to read. For example
   `Sparrow Studio` or `Nichol Mahania`.

**How to know it worked:** Directly under the box is a line starting
**"Footer reads:"**. It updates as you type and shows you the exact line that
will print. When it looks right, it *is* right — that's a live preview, not a
description.

**Note:** You only do this once. It's remembered for every project and every
PDF from then on.

---

## 2. Merge the work that's finished and waiting

**Time:** about a minute
**Why it matters:** There's finished, tested work sitting in a pull request. It
isn't live for you until it's merged.

**What's in it:** your studio name on all seven places client work shows up, the
XP/points system deleted (it was running invisibly and the product spec bans
it), the screen-lock consent box fix from your screenshot, and three standing
rules for how I work.

**Steps:**

1. Go to https://github.com/nicholmahania-spec/creative-companion/pull/146
2. Scroll to the bottom.
3. Look for a green tick and the words **"All checks have passed"**.
   - **Green tick →** click the green **"Merge pull request"** button, then
     **"Confirm merge"**. Done.
   - **Red X →** *stop and tell me.* Don't merge. A red X today has usually been
     GitHub being broken rather than the code, but I need to check which one it
     is. That's my job, not yours.
   - **Still spinning →** come back in ten minutes.

**How to know it worked:** The page turns purple and says **"Merged"**.

**After that:** Vercel automatically rebuilds your live site within a couple of
minutes. You don't have to do anything.

---

## 3. Decide: what happens to the `--no-watermark` switch

**Time:** 2 minutes to decide, and I do the work
**This one is a real decision and I've deliberately not made it for you.**

**Plain English version of the problem:**

There's a way to make a brand pack from the command line (a typed-command tool,
not the app). It has a switch called `--no-watermark` whose job was to remove
the "Creative Companion" credit from the PDF.

Today two pieces of work collided:

- One of them **deleted** the thing that switch controlled, and replaced it with
  your studio name (item 1 above).
- The other one **added** the command-line tool, still using the old switch.

Both are now in play. The result: the switch still exists, its help text still
promises it removes the watermark, and it now does **absolutely nothing**. It
doesn't error. It doesn't warn. It just quietly ignores you.

There's a second half to it: the command-line tool never passes your studio name
through, so PDFs made that way can't have your credit on them at all.

**Your options:**

- **A — Remove the switch and wire your studio name through.** My
  recommendation. The switch controls something that no longer exists, so it's
  lying either way; better to delete it than leave a promise the code can't
  keep. Roughly ten minutes of work for me.
- **B — Leave it.** Nothing breaks. It's a small lie in a tool only you use.
- **C — Something else** — tell me what you actually want that switch to do and
  I'll build that instead.

**What to do:** just reply with **A**, **B**, or **C**. No clicking needed.

---

## 4. Decide: is the Asset Library ready to be a pull request?

**Time:** 2 minutes to decide
**Why I'm asking:** I built the Asset Library screen and it's tested and green
(1,375 tests pass). But it's **half a feature**, and I don't want to slide that
past you.

**What works:** the screen, the layout, filing things into categories, moving
something to a different category.

**What doesn't:** the drop zone. You can drag a file onto it and it will accept
the drag — and then nothing happens. The file goes nowhere. That's the part I
haven't built yet.

**Your options:**

- **A — Open the pull request now,** clearly labelled as unfinished, so you can
  click around the screen and tell me if the layout is right before I build the
  hard part. Sensible if you want a say in how it looks.
- **B — Wait.** I build the file-upload half first, then open one pull request
  with a feature that actually works end to end.

**What to do:** reply **A** or **B**.

---

## 5. Tidy up nine finished branches

**Time:** about 3 minutes
**Why it matters:** Purely tidiness. Nine branches are fully merged — their work
is already in `main`, and the branches are just clutter now. It makes the branch
list easier to read. Nothing breaks either way.

**Why you and not me:** my access can create and push branches but not delete
them. GitHub rejects my delete requests. Not something I can work around.

**Steps:**

1. Go to https://github.com/nicholmahania-spec/creative-companion/branches
2. Click the **"Stale"** tab at the top.
3. For each of the nine names below, find its row and click the **rubbish bin
   icon** on the right:

   - `cc-cli`
   - `claude/brand-brain-completeness-ox6c3e`
   - `claude/mai-ike-version-broken-7w8p30`
   - `claude/next-phase-xytovw`
   - `fix-backup-save-handle`
   - `test-vercel-ci`
   - `worktree-fix-main-branch`
   - `worktree-fix-react-final`
   - `worktree-focus-mode-implementation`

**Safety net:** GitHub shows an **"Undo"** button right after each delete, and
even later you can restore a deleted branch. These nine are all fully merged, so
there's nothing in them that isn't already safe in `main`.

**Only delete the nine listed.** Others in that list still have unmerged work in
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
