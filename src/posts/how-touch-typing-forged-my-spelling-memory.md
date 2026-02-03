---
title: "Introducing Spell: A CLI Spelling Trainer Using Touch-Typing"
date: 2026-02-03
layout: "base.njk"
tags: post
---

## Building "Spell": How Touch-Typing Forged My Spelling Memory

## Introduction: Beyond Spellcheck – Discovering Body Memory for Words

Like many, I often relied on spellcheck. If I didn't know how to spell a word, a quick right-click usually fixed it. But this convenience came at a cost: I wasn't actually *learning* the spellings. Words like "idiosyncrasy" or "maneuver" remained a mystery to my fingers, even if I could recognize them.

Then, I made a surprising discovery. By forcing myself to repeatedly touch-type words I genuinely struggled with—instead of just spell-checking them—something clicked. For a touch-typist, each word isn't just a sequence of letters; it's a unique dance across the keyboard. My fingers, moving in specific patterns, began to form a 'body memory' for each word's shape. This kinesthetic input proved incredibly powerful for memorization, a stark contrast to the passive nature of recognition or correction.

This phenomenon, this deep physical encoding, doesn't quite work the same for 'search and peck' typists, where each letter is an isolated target. For true touch-typists, however, the continuous flow of keystrokes for an entire word creates a cohesive, memorable physical pattern.

This insight was the genesis of `Spell`, a minimalist, terminal-based spelling and vocabulary trainer. It's a tool built specifically to harness the power of touch-typing to forge unbreakable spelling habits.

## The "Why": Beyond Anki and Traditional Flashcards

Spaced Repetition Systems (SRS) are incredibly powerful. Tools like Anki have revolutionized learning for millions by optimizing for long-term memory retention. But for a specific skill like spelling for a touch-typist, a critical component is missing: **muscle memory**.

The core thesis of `Spell` is that to truly master a word, you need to build the physical pathways to type it correctly. `Spell` isn't about just recognizing a word; it's about drilling the active, physical process of typing it until it becomes second nature.

## The Science of Learning: A Two-Fold Approach

`Spell` combines two proven learning techniques to create a comprehensive system for both memory and fluency.

### 1. Spaced Repetition (for Long-Term Memory)

The foundation of `Spell` is a Spaced Repetition System (SRS), based on the "forgetting curve." This principle states that the best time to review something is right before you're about to forget it.

**The `Spell` Algorithm:**

Our SRS implementation is straightforward and effective. Every word in your list has two key properties: `level` and `nextReviewDate`.

*   **Level 0:** A brand new word, due for review immediately.
*   **Correct Answer:** When you spell a word correctly, its `level` increases. The `nextReviewDate` is then pushed further into the future based on a set of increasing intervals: 1 day, 3 days, 7, 16, 35, 70, and so on, up to a maximum of 180 days.
*   **Incorrect Answer:** If you misspell a word, its progress is reset. The `level` goes back to 0, and it's scheduled for review the very next day.

This ensures you efficiently focus your time on the words you struggle with, while reinforcing the ones you know at just the right moments.

### 2. Massed Practice / Drilling (for Muscle Memory)

While SRS is for long-term retention, drilling (or "massed practice") is crucial for building short-term muscle memory. This is where `Spell` truly differentiates itself.

*   **The Mastery Gate:** To advance a word's SRS `level`, you must first spell it correctly a set number of times in a row (the default is 3, but you can configure it with the `-r` flag).
*   **The Result:** This acts as a mastery gate. It forces you to have a firm, immediate grasp and the correct "feel" for typing a word before the SRS system trusts you to remember it over the long term. This is the key to building the muscle memory that traditional flashcard apps miss.

## A Tour of `Spell`: Key Features

*   **Minimalist, Keyboard-First UI:** A clean, distraction-free interface designed for touch-typists.
*   **Easy Word Management:** Add words individually (`spell <word>`), bulk import from a file (`--import`), or use the interactive manager (`--manage`).
*   **Simple Data Storage:** All your progress is stored in a human-readable JSON file at `~/.spell/spellingList.json`, making it easy to back up or sync with your dotfiles.

### Quick Workflow Tip: Turning Errors into Learning

Here's how `Spell` integrates seamlessly into your daily flow:

1.  **Spot an Error:** When you're typing in your browser or editor and see that familiar red squiggly line under a word you're unsure about.
2.  **Copy & Conquer:** After correcting your misspelled word with spell-check, quickly copy it to your clipboard.
3.  **Add to Spell:** Switch to your terminal and add it to your `Spell` list: `spell <word>` (e.g., `spell conscientious`).
4.  **Practice & Master:** Later, run `spell` to start a practice session. That tricky word will be queued up for you to actively learn through typing, building that invaluable body memory.

## Conclusion: A Tool for Doing, Not Just Knowing

`Spell` is a unique tool that combines two powerful learning techniques to improve not just what you know, but what you can *do*. It's for those who want to internalize words through physical repetition, building both a strong vocabulary and the fluency to use it effortlessly.

Check out the project on [GitHub](https://github.com/rolandnsharp/spell) and start mastering your spelling and typing today.
