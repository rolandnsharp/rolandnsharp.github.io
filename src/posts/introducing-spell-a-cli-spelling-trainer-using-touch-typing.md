---
title: "Spell: A CLI Spelling Trainer"
date: 2026-02-03
layout: "base.njk"
tags: post
---

# Spell: A CLI Spelling Trainer

Touch-typists don't spell words letter by letter. They execute motor patterns — each word is a specific sequence of finger movements across the keyboard. Misspell a word often enough and the wrong pattern gets trained. Spellcheck fixes the output but never retrains the fingers.

Spell is a terminal program that drills spelling through typing. You type each word repeatedly until the motor pattern is correct. Spaced repetition schedules when words come back. Massed practice builds the muscle memory in each session.

## How It Works

Spell maintains a word list at `~/.spell/spellingList.json`. Each word has a level and a next review date. When you run `spell`, it pulls up every word that's due.

### The Drilling Loop

A word appears on screen. You type it. If you get it right, a streak counter increments. Get it wrong, the streak resets to zero and you start over:

```javascript
function handleIncorrectGuess() {
  state.mode = 'error';
  state.userInput = '';
  state.currentWordStreak = 0;
  // flash red, return to typing after 700ms
}
```

The streak is a mastery gate. You must spell a word correctly 3 times in a row (configurable with `-r`) before the SRS advances it:

```javascript
if (state.currentWordStreak >= state.repeatCount) {
  currentWordData.level++;
  const interval = getReviewInterval(currentWordData.level);
  currentWordData.nextReviewDate = addDays(new Date(), interval).toISOString();
  state.currentWordStreak = 0;
  // move to next due word
}
```

You can't advance a word by getting lucky once. You demonstrate you can type it reliably, then the SRS trusts you to remember it.

### Spaced Repetition

The interval between reviews increases with each level:

```javascript
function getReviewInterval(level) {
  if (level <= 0) return 0;
  const intervals = [1, 3, 7, 16, 35, 70, 140];
  const calculatedInterval = intervals[level - 1] || 180;
  return Math.min(calculatedInterval, 180);
}
```

Level 1: review tomorrow. Level 3: review in a week. Level 7: review in 140 days. Miss a word and it drops back to level 0 — due immediately.

### A Session

```
$ spell

  idiosyncrasy
  > idiosyncracy
  ✗

  > idiosyncrasy
  ✓ (1/3)

  > idiosyncrasy
  ✓ (2/3)

  > idiosyncrasy
  ✓ (3/3) — level 4, next review in 16 days

  ✨ You completed all due words! ✨
```

Three correct in a row. The word advances. Tomorrow, a different set of words will be due.

## Adding Words

Spot a word you misspelled in your editor. Add it:

```
$ spell conscientious
```

It enters the list at level 0, due immediately. Next time you run `spell`, it's waiting.

Bulk import from a file with `--import`. Manage your list interactively with `--manage`. The data is a JSON file — back it up with your dotfiles.

---

*[GitHub](https://github.com/rolandnsharp/spell) / `npm install -g @rolandnsharp/spell`*

*Co-authored with [Claude](https://claude.ai/).*
