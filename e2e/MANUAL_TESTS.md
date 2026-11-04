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
