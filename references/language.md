# Language and scripts

## Contents
1. Decide the language settings once
2. Write for the ear
3. Captions vs voice: `{ text, say }`
4. Arabic
5. Frame strings and new languages
6. Checking a script

## 1. Decide the language settings once

Record the decision in `series.config.mjs → language.voice` so every later
edit follows it:

- **Register / dialect.** The product's UI language is the default (an MSA
  app → MSA narration). A dialect is a deliberate choice — usually to match
  the narrator's voice or a local audience — and wins on warmth but reads
  informal; it must never leak into the app's own labels. Ask the user when
  in doubt; let them hear a preview of both if they can't decide.
- **Who speaks.** First person plural ("we click…", «نضغط…», «بندوس…») is
  gender-neutral and sounds like a colleague showing you. Avoid addressing the
  viewer with gendered imperatives in gendered languages.
- **UI labels verbatim.** When narration names a button, tab or page, quote it
  exactly as the screen shows it («تسجيل الانصراف», "Request leave"), even in
  dialect narration. Viewers match words to pixels.
- Project style guides (e.g. `.claude/arabic-style.yml`) apply to the UI text
  you quote; note any deliberate exception for the narration and why.

## 2. Write for the ear

- One idea per line; 6–18 words. Long lines become long holds on a still screen.
- Active voice with a clear subject ("The system recorded…", "we press…").
  Passives are hard to follow by ear and, in Arabic, ambiguous on the page.
- Say what and why, not every click: the cursor shows the click; the line says
  why it matters ("Start with what's late — your supervisor sees it too").
- Spell out numbers that are read as words ("eight characters"), keep digits
  for things read as digits (codes, times on screen).
- Brand and product names the voice doesn't know: spell them phonetically in
  `say` (`فِن إكسبيرتيزا`, "Fin Expert-eeza").
- Don't read codes and IDs aloud (`FS-2026-0010`) — point at them instead.
- Keep the line count per episode tied to `run()`: the director throws if a
  script line is unused or missing, so lines and actions stay in step.

## 3. Captions vs voice: `{ text, say }`

A script line is a string, or `{ text, say }` when the voice needs a different
spelling than the caption. Captions show `text`; ElevenLabs reads `say`. Use
it for pronunciation only — same words, same meaning. Rewriting the sentence
to avoid the ambiguity is better than marking it; use `say` for what's left.

## 4. Arabic

**The core problem**: Arabic is written without short vowels, so the voice
guesses them — and some guesses flip the meaning:

| Unvowelled | Readings | Fix |
|---|---|---|
| سجّل | سَجَّلَ recorded / سَجِّلْ record! / سُجِّلَ was recorded | Active with a subject («النظام سجّل»), Egyptian «اتسجّل», or `say` with marks |
| سجل | سِجِلّ log / سَجَّلَ recorded | `say`: سِجِلّ |
| أنشئ، يحفظ، حسبت، يعتمد | active vs passive | Rewrite active («اكتمل إنشاء الحساب») |
| المكلف، المتوقع، مسندة، مرسل، المشرف | participle vowelling | `say`: المُكَلَّف، المُتَوَقَّع، مُسْنَدَة، مُرْسِل، المُشرِف |
| قيد الانتظار، أقر | fixed phrases | `say`: قَيْدَ الانتظار، أُقِرُّ |

Mark only the ambiguous word (and its case ending when it matters); fully
vowelled sentences sound stilted and cost nothing in clarity to drop.

**MSA vs dialect.** MSA: neutral, matches the UI, right for Gulf/government
/finance audiences. Egyptian: warm and natural with Egyptian voices
(«دلوقتي، اللي، عشان، مفيش، بندوس، التايمر»), still gender-neutral in "we"
form, and its passive «اتـ» (اتسجّل، اتعمل) is unambiguous — a bonus for TTS.
Gulf: use sparingly, MSA with Gulf word choice is usually safer. Whatever the
dialect, UI labels stay as the screen shows them.

Other Arabic notes: Arabic punctuation (، ؛ ؟); western or eastern digits per
the app; «» for quoted labels; numbers written as words when spoken
(«تمانية حروف», «ثمانية أحرف»). If an `arabic-content` skill is available,
use it to write and lint the script — it carries the glossary and dialect rules.

## 5. Frame strings and new languages

The frame's own words (intro kicker, top bar, outro, spoken title) come from
`engine/strings.mjs` presets (`en`, `ar-msa`, `ar-egyptian`) via
`series.config.mjs → strings`. For a new language, copy a preset, translate,
and make `spokenTitle` produce something natural to say ("Episode three:
Requesting leave."). Set `language.dir` for RTL/LTR and pick a font that
covers the script (`src/theme.ts`).

## 6. Checking a script

- Read every line aloud (or have the user read the preview audio): does it
  make sense heard once, without the screen?
- Dump captions to JSON and run the language linter if one exists, e.g.
  `node -e "…write {id:line}…"` then `lint_arabic.py file.json`.
- Generate a voice preview on the hardest lines before voicing everything.
