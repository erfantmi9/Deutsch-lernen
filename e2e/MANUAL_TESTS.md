# Manual checks on a real phone

Playwright cannot raise a real on-screen keyboard; `grammar.spec.ts` only simulates one by faking `visualViewport`.
Check these on a real device (iOS Safari and Android Chrome), in `/en` and `/fa`.

## Grammar practice with the keyboard (`/grammar/dative`, scroll to "Practice")

1. Reach a typed question ("Fill the gap" / "Transform"). The keyboard should NOT open just from scrolling there.
2. Tap the input. The keyboard opens, and:
   - [ ] the **Check button bar sits directly above the keyboard** (not under it);
   - [ ] the **ä ö ü ß keys are in that bar**, also above the keyboard;
   - [ ] the input and the question are visible above the bar (nothing hidden behind it);
   - [ ] no gap or overlap between the bar and the keyboard (iPhone with a home indicator: no extra blank strip).
3. Tap an umlaut key: the letter is inserted, the **keyboard stays open**, the caret stays in the field.
4. Type an answer and tap **Check**: feedback appears under the question, the field becomes read-only (keyboard stays),
   the button reads **Next**.
5. Press the keyboard's Return/Next key (or tap Next): the next question appears, no question is skipped.
   Double-tap Next quickly: exactly one question advances.
6. Dismiss the keyboard: the umlaut keys move back under the input, the bar returns to the bottom edge.
7. Rotate to landscape and back with the keyboard open: bar and keys stay above the keyboard.
8. Finish the session: the summary scrolls to the top of the screen, the heading is focused (VoiceOver/TalkBack
   announces "Round finished"), "Practice again" and "All grammar lessons" are in the bar.

## Everywhere with a bottom bar (Arcade, Verb practice)

- [ ] The bottom navigation is replaced by the action bar while practicing and is back after leaving the page.
- [ ] Nothing important is hidden behind the home indicator / gesture bar.
- [ ] Pinch-zoom the page to ~150%: feedback and the bar do not overlap.

## Sentences (`/sentences`) on a real phone

- [ ] Tap a word: it moves to the answer line. Tap it there: it goes back. Nothing below it jumps.
- [ ] Start a swipe **on a word** and scroll the page: it scrolls, no word is placed or picked up.
- [ ] Press and hold a word for a moment (~¼ s), then drag it onto the answer line: it is placed (optional drag).
- [ ] In `/fa` the German sentence still reads left to right, first word on the left.
- [ ] Check with a wrong order: the wrong words get a red ✗ right on the answer line; "Details" opens a sheet with the hint.
- [ ] The Check button, Reset (↺) and Skip (⏭) never change position or disappear; only Check turns into Next.
- [ ] The 🎨 toggle colours the parts; the small labels are readable and nothing moves.
- [ ] Mini lesson (📖): open on the very first visit of a focus, collapsed afterwards, the button toggles it.

---

# Batch 2 (ux-batch-2): real-phone checklist

Devices: one iPhone (Safari) and one Android phone (Chrome). Run each block in `/en`, then repeat the starred (★) items in `/fa`.
**Estimated time: about 45–60 minutes for both phones** (roughly 25 min for the first phone, 15–20 for the second, plus ~10 min
re-checking ★ items in Persian).

## 1. Keyboard + ä ö ü ß above the keyboard (Exam Schreiben, Grammar, Verbs drill) ★
- [ ] Exam → Schreiben (confirm start), tap a form field: the Hand-in bar and the ä ö ü ß row sit directly on top of the keyboard.
- [ ] Tap ä/ö/ü/ß: the letter goes into the field you were in, the keyboard stays open, the caret stays put.
- [ ] Grammar → a typed exercise, Verbs → drill: same two checks.
- [ ] The field you type in is never hidden behind the bar.

## 2. Closing the keyboard
- [ ] Close it with the keyboard's own button / back gesture / tapping outside: the bar drops to the bottom edge with no gap and
      no blank strip; on iPhone it clears the home indicator. Repeat 3 times (iOS sometimes reports this late).

## 3. Persian ↔ English keyboard switching ★
- [ ] In `/fa`, type in a German field, switch the system keyboard between Persian and English (its height often changes): the
      bar follows the keyboard edge each time, no overlap.

## 4. Press-and-hold on Sentences chips
- [ ] Long-press a word chip: no text-selection bubble, no iOS callout/magnifier, no page zoom; dragging still works.
- [ ] Tapping still adds/removes words. Scroll the page starting on a chip: the page scrolls.

## 5. Sliders vs scrolling in Numbers (Clock tab and Practice → set the clock)
- [ ] Swipe up/down starting ON a slider: the page scrolls and the time does not change.
- [ ] Drag sideways on a slider: the time changes; the readout stays visible (sticky) while you drag.
- [ ] Tap a point on the slider: it jumps there.

## 6. Speech on iPhone Safari (needs a tap)
- [ ] Listen: nothing plays when the page opens or a round starts; the first word plays only after tapping Play.
- [ ] Play turns into Stop while speaking and back afterwards; Stop stops immediately.
- [ ] Leaving the page while speaking stops the audio.
- [ ] Phone in silent mode: note whether speech plays (iOS may mute it; not an app bug, just note it).
- [ ] If no German voice is installed, the tip appears instead of the drill.

## 7. Exam refresh / resume ★
- [ ] Start Schreiben, type a few words, pull-to-refresh: same part, your text is still there, timer shows the real remaining time.
- [ ] Lock the phone for 2 minutes, unlock: the timer has moved on by about 2 minutes.
- [ ] Start Sprechen (shortest), lock the phone until its time is over, unlock: it is handed in with the "Time is up" message.

## 8. Sheet and dialog positions ★
- [ ] Bottom sheets (Sentences Details, Reading translation, dialogue word, Progress calendar day) sit flush at the bottom edge;
      on a tablet/landscape ≥768px they dock to the side (left side in `/fa`).
- [ ] Confirm dialogs (any Reset, Vocabulary Add all, Exam start/hand-in) are centred; Cancel is focused; the page behind does not scroll.
