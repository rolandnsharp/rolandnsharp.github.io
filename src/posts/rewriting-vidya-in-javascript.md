---
title: "Rewriting Vidya in JavaScript"
date: 2026-03-01
layout: "base.njk"
tags: post
---

# Rewriting Vidya in JavaScript

We are rewriting Vidya in plain JavaScript on Deno.

This is not a decision we made lightly. The OCaml codebase works. The autograd engine
is correct. The training loop runs. The model learns. We have spent six weeks building
a [from-scratch transformer framework](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/)
in OCaml and it does everything we asked of it.

We are rewriting it anyway, because the next phase of this project demands something
the current codebase cannot give us: fluency.

---

## Why Now

The [v2 architecture](/posts/designing-v2-what-a-small-transformer-needs-in-2026/) is
designed. Five changes to the model: SwiGLU activation, Grouped Query Attention, 30
layers, a 32,000-token vocabulary, and a 2,048-token context window. Every one of these
touches the forward pass, the backward pass, and the checkpoint format. The v1 model
definition is effectively replaced.

If we are rewriting the model anyway, we should rewrite it in a language we can move
fast in. The framework code — autograd, optimizer, tokenizer — carries forward in
concept but not in syntax. The total rewrite is about 2,000 lines.

This is the last moment before the
[irreversible line](/posts/a-model-for-life/). Once we start teaching the model with
reinforcement learning, the weights become irreplaceable. Before that line, the code is
the thing we can afford to change. After it, the weights are the thing we cannot.

---

## Why JavaScript

We built Vidya in OCaml to understand every layer. No PyTorch, no Python, no
frameworks. That goal is accomplished — we understand transformers, autograd,
tokenization, and training loops from first principles. The question now is not "can
we build it?" but "can we maintain it, extend it, and debug it for years?"

The answer is: more easily in JavaScript.

**We think in JavaScript.** When we see a bug in training, we need to trace through the
forward pass, identify the wrong gradient, and fix it. That debugging happens faster in
a language where the syntax is invisible — where we read logic, not notation. OCaml is
readable, but JavaScript is native. The difference is small on any given line and large
over a year of maintenance.

**Claude codes better in JavaScript.** This project is a collaboration between a human
and an AI. Claude has seen orders of magnitude more JavaScript than OCaml. The result
is fewer subtle bugs in the first draft, better API patterns, and more capacity focused
on the math rather than the language. For a numeric library where a wrong sign in a
gradient wastes a week of training, that matters.

**Deno runs JavaScript natively.** No compile step. No build system. `deno run train.js`
and it runs. Deno's FFI calls C libraries directly — we call OpenBLAS the same way
we call it from OCaml, with less boilerplate:

```js
const lib = Deno.dlopen("libopenblas.so", {
  cblas_dgemm: {
    parameters: ["i32", "i32", "i32", "i32", "i32", "f64",
                 "buffer", "i32", "buffer", "i32", "f64", "buffer", "i32"],
    result: "void"
  }
});
```

One declaration. No C stub file. No marshalling code. The same BLAS library, the same
matrix multiply, fewer lines between our code and the silicon.

---

## Why Not TypeScript

We considered TypeScript. It is the obvious choice for a JavaScript project in 2026 —
better tooling, type safety, industry standard. But Vidya is not an industry project.
It is 3,000 lines of numeric code that multiplies arrays of floats.

**The types add nothing.** A tensor is a `Float64Array`, a gradient is a `Float64Array`,
a weight matrix is a `Float64Array`. Writing type annotations on every function that
takes a float array and returns a float array is not safety — it is ceremony. The
function names and variable names carry more information than the types.

```typescript
// TypeScript
function matmul(
  a: { data: Float64Array; rows: number; cols: number },
  b: { data: Float64Array; rows: number; cols: number }
): { data: Float64Array; rows: number; cols: number }

// JavaScript
function matmul(a, b)
```

The TypeScript version is not safer. A transposed matrix has the same type as a
non-transposed matrix. A wrong learning rate has the same type as a correct one. The
bugs that kill training runs — wrong gradient formulas, off-by-one in head slicing,
incorrect advantage normalization — are mathematical errors that no type system catches.

**Types scale with complexity.** In a web application with dozens of API endpoints,
nested state, and five developers, TypeScript prevents real bugs. In a numeric library
with one developer, flat data structures, and 20 functions that all do math on arrays,
the type system is overhead. We would spend more time satisfying the type checker than
it would ever save us in caught bugs.

**Lean code, clear names.** JavaScript forces you to write readable function names
because the types are not there to document the interface. `computeGradient`,
`clipNorm`, `cosineLR` — the names carry the meaning. If we need type hints for
editor support, JSDoc gives us that without a type system:

{% raw %}
```js
/** @param {{ data: Float64Array, grad: Float64Array }} tensor */
function backward(tensor) { ... }
```
{% endraw %}

VS Code reads JSDoc and provides full autocomplete. No TypeScript required.

---

## Why Deno

Deno is a minimal JavaScript runtime with built-in FFI, a built-in test runner, and
no configuration files. It runs `.js` files directly. That philosophy — small tools,
no ceremony, everything built in — matches how we build Vidya.

We are also porting [Aither](/posts/aither-live-coding-audio-synthesis-in-javascript/)
to Deno for its JACK audio FFI support. One runtime for all our projects means one set
of patterns, one FFI interface, one test runner. When we eventually port Vidya to
[Tenstorrent Blackhole](/posts/burn-the-stack-llms-without-nvidia/), the FFI call to
TT-NN looks exactly like the FFI call to OpenBLAS — `Deno.dlopen` with a different
library name.

---

## Performance

The question everyone asks: is JavaScript fast enough for training a neural network?

The answer is: JavaScript does not train the neural network. BLAS does. Vidya's hot
path is `cblas_dgemm` — a matrix multiply running in optimized C and Fortran inside
OpenBLAS. Whether the caller is OCaml, JavaScript, or Python, the matrix multiply
takes the same time.

Everything outside the BLAS call — softmax, activation functions, gradient
accumulation, Adam optimizer updates — is array arithmetic in a loop. Deno's V8
engine JIT-compiles these loops to machine code. The result is not as fast as OCaml's
ahead-of-time compilation, but the difference is small:

| Operation | OCaml (native) | Deno (V8 JIT) | Impact on training step |
|---|---|---|---|
| BLAS matmul | Same | Same | 70-80% of time |
| Element-wise ops | ~1.0x | ~1.3x slower | 10-15% of time |
| Adam updates | ~1.0x | ~1.2x slower | 5-10% of time |
| Autograd bookkeeping | ~1.0x | ~1.5x slower | <5% of time |

The non-BLAS code is roughly 20-30% of a training step. If that code runs 1.3x slower,
the total training step is about 7-10% slower. On a 2-second step, that is 150
milliseconds. On a GPU step measured in milliseconds, it is invisible.

If a specific loop ever becomes a bottleneck — unlikely, but possible — Deno's FFI
lets us drop that one function to C. Compile a `.so`, call it from JavaScript, done.
The escape hatch exists. We do not expect to need it.

---

## What We Test This Time

The OCaml codebase has no tests. That was fine for an experiment. It is not fine for a
model we intend to [keep for life](/posts/a-model-for-life/).

The rewrite adds targeted tests for the things that fail silently and expensively. Not
100% coverage — that would be ceremony for a 3,000-line codebase. Just the tests that
catch the bugs that waste weeks.

### Gradient Checks

Every autograd operation gets a numerical gradient test. The method is simple: nudge
each input by a tiny epsilon, measure how the output changes, compare that to the
analytical gradient from the backward pass.

```js
function numericalGrad(fn, input, eps = 1e-5) {
  const grad = new Float64Array(input.length);
  for (let i = 0; i < input.length; i++) {
    input[i] += eps;
    const plus = fn(input);
    input[i] -= 2 * eps;
    const minus = fn(input);
    input[i] += eps;
    grad[i] = (plus - minus) / (2 * eps);
  }
  return grad;
}
```

One test per operation:

| Operation | What it catches |
|---|---|
| matmul | Transposition errors, wrong accumulation |
| softmax | Numerical instability, wrong Jacobian |
| SiLU / SwiGLU gate | Wrong derivative formula |
| RMSNorm | Incorrect variance computation |
| RoPE | Wrong rotation direction, off-by-one in frequency |
| Cross-entropy loss | Sign errors in the gradient |
| GQA head broadcasting | Wrong head grouping in backward pass |

These are the bugs that produce a model that trains to garbage over three days without
any error message. A gradient check catches them in milliseconds.

### Tokenizer Round-Trip

Encode a string to tokens, decode back to string, verify they match. Test edge cases:
empty string, single character, unknown bytes, multi-byte UTF-8. A tokenizer bug
produces silent data corruption — the model trains on garbage tokens and the loss
curve looks normal.

### Forward Pass Smoke Test

Run a known input through the full model. Verify the output shape is correct, all
values are finite (no NaN, no infinity), and the softmax sums to 1. One test, ten
lines. Catches wiring errors when connecting layers.

### What We Do Not Test

The training loop, checkpoint saving, file I/O, CLI arguments, logging. These break
loudly and obviously — a crash, a missing file, a wrong number on screen. Silent
failures are the enemy. Loud failures fix themselves.

About 15 tests total. Each under 20 lines. Run in under a second with `deno test`.
The entire test suite is smaller than a single transformer layer, and it protects
months of training time.

---

## The Rewrite Plan

The rewrite follows the dependency order of the framework:

```
1. tensor.js      Autograd engine — all ops, forward + backward
                   (test: gradient checks for every op)

2. blas.js        Deno FFI to OpenBLAS cblas_dgemm
                   (test: multiply two known matrices, verify result)

3. bpe.js         BPE tokenizer — train, encode, decode
                   (test: round-trip encode/decode)

4. model.js       v2 model definition — 30 layers, SwiGLU, GQA
                   (no test needed — struct definitions)

5. forward.js     Training and inference forward passes
                   (test: smoke test — finite outputs, correct shapes)

6. train.js       Adam optimizer, cosine LR, gradient clipping
                   (test: one Adam step reduces loss)

7. generate.js    Text generation — sampling, chat, prompted
                   (no test needed — output is subjective)

8. main.js        CLI entry point
                   (no test needed — wiring only)
```

Each file is written and tested before moving to the next. The autograd engine comes
first because everything depends on it. The model definition uses the
[v2 architecture](/posts/designing-v2-what-a-small-transformer-needs-in-2026/) from
the start — SwiGLU, GQA, 30 layers, 32K vocabulary, 2,048-token context. There is no
intermediate step of reimplementing v1 in JavaScript. We go straight to v2.

---

## What Changes, What Stays

**Changes:**
- Language: OCaml to plain JavaScript on Deno
- Activation: GELU to SwiGLU
- Attention: Full MHA to GQA (3:1)
- Depth: 12 layers to 30 layers
- Vocabulary: 2,188 to 32,000 tokens
- Context: 256 to 2,048 tokens
- FFI: C stubs to Deno.dlopen
- Tests: none to ~15 gradient checks + smoke tests

**Stays:**
- The math. Autograd, backprop, RMSNorm, RoPE, Adam, cosine LR — all identical.
- The architecture philosophy. Small, dense, open, growable.
- The training approach. Book training, human-in-the-loop RL, interactive teaching.
- The hardware path. OpenBLAS now, TT-NN on Blackhole later.
- The vision. A [model for life](/posts/a-model-for-life/).

The framework is a vehicle. The model is the destination. We are switching vehicles
before the road gets steep.

---

*See also: [Designing v2](/posts/designing-v2-what-a-small-transformer-needs-in-2026/),
[A Model for Life](/posts/a-model-for-life/),
[Burn the Stack](/posts/burn-the-stack-llms-without-nvidia/).*

*Co-authored with [Claude](https://claude.ai/).*
