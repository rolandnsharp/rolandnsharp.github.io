---
title: "Vidya: A Neurosymbolic Language Model with a Forth Soul"
date: 2026-02-21
layout: "base.njk"
tags: post
---

# Vidya: A Neurosymbolic Language Model with a Forth Soul

## What Vidya Is

Vidya is a small language model that thinks with two minds at once.

The first mind is a neural transformer -- a 6-layer, 128-dimensional GPT-2
style network with rotary position embeddings, weight-tied output, and
BLAS-accelerated matrix operations. It has about 1.25 million parameters.
It trains on a corpus (currently the Enneads of Plotinus) and learns what
token sequences are likely. This is the standard story. Every language model
does this.

The second mind is a Forth interpreter.

Not a toy, not a gimmick. A real Forth with a dictionary, a data stack,
stack-effect validation, and concept entries extracted from the corpus itself.
This second mind doesn't predict -- it *constrains*. It decides what's valid,
what's coherent, what's worth saying. When the neural model proposes the next
token, the Forth mind adjusts the probabilities before sampling happens.

The neural model ranks by likelihood. The symbolic system defines what's
allowed. They speak through logits.

## How It Works

### The Neural Side

Vidya's transformer is small but complete:

- **6 layers**, 128-dimensional embeddings, 8 attention heads
- **RoPE** (Rotary Position Embeddings) for position-aware attention
- **Weight tying**: the output projection shares the embedding matrix, so
  the model's concept of "what a word means" and "what word comes next" are
  the same matrix, viewed from different directions
- **Residual scaling**: each layer's output is initialized with reduced
  variance (std = 0.08 / sqrt(2L)) to keep activations bounded through
  the network
- **KV-cache** for efficient single-token inference at generation time
- **BPE tokenizer**: 500 merge rounds, ~580 token vocabulary, ~2.7
  characters per token on the Enneads

Training is Adam with cosine learning rate schedule, gradient clipping at
max norm 1.0, 400-step warmup, and 100K total steps across ~16K documents.
Standard supervised learning -- cross-entropy loss, predict the next token.

### The Symbolic Side

Five constraints are applied to the neural model's logits before sampling,
in sequence:

**1. Repetition penalty.** A 32-token ring buffer tracks recently generated
tokens. Each recent token's logit gets -1.5. Simple, effective, prevents
the model from getting stuck in loops.

**2. Word boundary detection.** When the partial word accumulated so far is
already a complete valid word, tokens that would extend it into a non-word
get penalized (-5.0). This prevents "is" + "in" from becoming "isin". The
penalty is soft -- if the neural model is very confident about a continuation,
it can override.

**3. Word validation.** Hard constraint. Tokens that would create invalid
words or invalid prefixes are masked to negative infinity. The model literally
cannot select them. The valid word and prefix sets are built once from the
corpus at startup.

**4. Concept coherence.** This is where Forth enters. When recent tokens
activate concepts in the Forth dictionary, related concepts get boosted.
If "soul" was recently generated, tokens associated with "body", "mind",
"nature" get +2.0 * 0.85^age. The boost decays over 16 tokens. The
associations come from co-occurrence statistics in the corpus, stored as
Forth concept entries with their top-8 neighbors.

**5. Topic depth penalty.** If the same concept has been activated more than
4 times, its associated tokens get penalized. This prevents the model from
circling the same cluster of ideas endlessly. Encourages thematic movement.

A safety valve: if all constraints together produce negative infinity for
every token (the model is stuck), it falls back to just the repetition
penalty. The neural model always has a way out.

### The Knowledge Layer

The Forth dictionary is populated from the corpus in a pipeline:

1. **Extract concepts**: words with frequency >= 20 and length >= 4.
   Filters out "the", "and", "is" -- keeps "soul", "nature", "body",
   "eternal".

2. **Build co-occurrence matrix**: which concepts appear in the same
   document? Count every pair.

3. **Build associations**: for each concept, take its top-8 co-occurring
   neighbors. "soul" gets ["body", "nature", "mind", "intellect", ...].

4. **Map BPE tokens to concepts**: which tokens activate which concepts?
   Exact match and prefix match. A concept becomes a Forth word of type
   `Concept` with associations, strength (normalized frequency), and
   token IDs.

5. **Populate the dictionary**: each concept enters the Forth dictionary
   alongside the primitive stack operations (DUP, +, SWAP, etc.) and any
   user-defined words.

The result: the Forth dictionary is both a symbolic reasoning substrate
and a structured knowledge base extracted from the same corpus the neural
model trained on. Two views of the same data -- one learned through
gradient descent, one extracted through counting and co-occurrence.

## Why Forth

For the full case for Forth as a computing substrate, see
[Forth9](/posts/forth9-the-lisp-forth-machine-that-fits-in-your-pocket/).
Here's why it matters specifically for neurosymbolic generation.

### Verification in microseconds

When a neural model proposes code, you want to check thousands of
candidates per second. Forth word definitions are validated by a single
left-to-right scan: is each word in the dictionary? What's its stack
effect? If any word is missing or the stack underflows: reject. This runs
in microseconds. Always terminates. No theorem prover, no sandbox.

| Substrate | Verification | Can it hang? |
|-----------|-------------|--------------|
| Prolog | Exponential search | Yes |
| Python | Execute in sandbox | Yes |
| Haskell | Type inference | No, but slow |
| SMT (Z3) | Constraint solving | Effectively yes |
| **Forth** | **Dictionary lookup + stack count** | **No. Never.** |

### Concatenation matches token generation

In Forth, `A B C` is a valid program if A, B, and C are valid words. The
composition operator is whitespace. This matters for neural generation
because the model's output space is simpler -- sequences from a known
vocabulary, separated by spaces. Complexity grows linearly, not
combinatorially. And Forth evaluates left to right, one word at a time,
which is exactly how token generation works: incremental, temporal, with
the stack as a finite working memory.

## What Vidya Generates

Vidya trains on the Enneads of Plotinus -- 6 treatises of Neoplatonic
philosophy. After 100K steps of training (~6 epochs), prompted with
"what is the Absolute?", it generates 10 completions:

```
1: what is the Absolute? and therefore is in various of the same experiences?
2: what is the Absolute? of this lower, but a matter of course, which it has been we
3: what is the Absolute? and therefore is Authentic Existent.
4: what is the Absolute? they are not merely allowed to its course, or another, in
5: what is the Absolute? and therefore is to be seen and its intellection and
6: what is the Absolute? of this sphere of the lower soul- as a question to remember
7: what is the Absolute? Evil is no definite number and intervening down to its intention
8: what is the Absolute? and as a less human being a definite shape is unless and as
9: what is the Absolute? where there is nothing of the Soul, but a master
10: what is the Absolute? of this sphere which in a light or up it a region
```

Every word is valid (no misspellings, no non-words). Related concepts
cluster together -- soul, intellection, existent. Some completions are
fragments; others land on coherent philosophical statements ("and
therefore is Authentic Existent"; "Evil is no definite number"). Without
the symbolic constraints, a model this small produces unreadable noise.
With them, it produces philosophical sketches.

## Where It Goes From Here

### Reinforcement Learning

Vidya currently has no way to evaluate its own output. The symbolic layer
enforces validity (are the words real?) but not quality (is the text
meaningful?). Reinforcement learning could provide this missing signal.

For the full RL roadmap — average-reward formulation, Dyna-style planning
with the Forth knowledge layer, TD-learned concept associations, and six
concrete approaches — see
[Reinforcement Learning: From Sutton's Foundations to Vidya](/posts/reinforcement-learning-from-suttons-foundations-to-vidya/).

### Growing Lisp Features Into Forth

Sutton wrote all his RL reference implementations in Common Lisp. Lisp has
genuine strengths -- homoiconicity, recursive data structures, pattern
matching. But the decision for Vidya is clear: keep Forth, grow the useful
parts of Lisp into it.

What to add:
- **Cons cells on the stack**: structured pairs, giving lists and trees
  without leaving Forth
- **Recursive definitions**: use the return stack with base-case checking
- **Pattern matching**: a MATCH word that destructures stack values
- **Quotations**: push a code block onto the stack as data, execute later
  (like Factor does)

What to deliberately leave out: full metaprogramming, unrestricted eval of
constructed code. Sutton's Verification Principle says the AI must be able
to check its own knowledge. Unrestricted self-modification undermines this.
Forth's verifiability is a feature, not a limitation.

### The Model Proposing Its Own Words

The current Forth dictionary is populated from corpus statistics. The next
step: let the model propose new word definitions during generation. The
symbolic layer validates them (stack-effect check, dictionary lookup).
Valid definitions enter the dictionary. The model can use them in future
output.

This is the full neurosymbolic loop: the neural model proposes, the
symbolic engine validates, the dictionary accumulates, and the model's
vocabulary grows through use. A self-evolving domain-specific language
for philosophical text, emerging from the interaction between learned
statistics and verified structure.

## The Architecture at a Glance

```
Corpus (Enneads)
    |
    v
BPE Training (500 merges) ──> Tokenizer (~580 tokens)
    |                              |
    |                    +---------+---------+
    |                    |                   |
    v                    v                   v
Neural Training    Knowledge Extraction   Symbolic Build
(100K steps)       (concepts, co-occur)   (valid words/prefixes)
    |                    |                   |
    v                    v                   v
Transformer         Forth Dictionary     Word Sets
(6L, 128d, RoPE)   (concepts + prims)   (hashtables)
    |                    |                   |
    +--------+-----------+-------------------+
             |
             v
       Generation Loop:
  1. Forward pass ──> raw logits
  2. Repetition penalty
  3. Word boundary bias
  4. Word validation (hard mask)
  5. Concept coherence (Forth)
  6. Topic depth penalty
  7. Softmax + sample
  8. Update ring buffer, partial word, concepts
  9. Emit token
             |
             v
       Generated Text
```

## The Name

Vidya (विद्या) is Sanskrit for "knowledge" or "right knowledge" -- the kind
that comes from seeing clearly, not from accumulation. In Indian philosophy,
vidya is the opposite of avidya (ignorance, misperception). It's not about
knowing more facts. It's about knowing correctly.

A language model that can tell for itself whether its words are valid, whether
its concepts cohere, whether its topics evolve -- that's reaching toward vidya.
Not there yet. But pointed in the right direction.

---

*Vidya is written in OCaml with C FFI for BLAS-accelerated matrix operations.
The source is at [github.com/rolandnsharp/vidya](https://github.com/rolandnsharp/vidya).
It trains on a single CPU in about 30 minutes and generates text in real time.*
