# Forth9 Auto-Suggest

Context-aware tab completion for Forth9 on the PicoCalc.

## The idea

Tab completion that knows what's relevant right now. Not just "list every word in the dictionary" — surface the words that make sense given the current stack state and recent context.

## What it suggests

1. **Stack-compatible words** — if there are two numbers on the stack, suggest words with stack effect (2 → n). Don't suggest DUP when the stack is empty.
2. **Recently used words** — the player's working vocabulary, weighted by recency.
3. **Related words** — if the player just used SWAP, suggest other stack manipulation words. If they just used +, suggest other arithmetic.
4. **Player-defined words** — definitions the player has added to the image, always surfaced.

## How it works

Dictionary introspection + stack-effect validation. Forth already knows what words exist and what their effects are. The suggestion engine just filters and ranks.

```
( stack: 10 20 )
> [tab]
  + - * / SWAP DROP OVER AVERAGE

( stack: empty )
> [tab]
  DUP — needs 1 value    (greyed out)
  42 ." WORDS
```

## Implementation

A Forth word. The player can inspect it, modify it, extend the ranking. It uses the same stack-effect checking that Forth9 already has. Probably 50-100 lines of Forth.

## Status

Idea stage. Implement when Forth9 is running on the PicoCalc.
