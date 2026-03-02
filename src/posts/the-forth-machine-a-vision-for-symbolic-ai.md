---
title: "The Forth Machine: A Vision for Symbolic AI on Open Silicon"
date: 2026-03-02
layout: "base.njk"
tags: post
---

# The Forth Machine: A Vision for Symbolic AI on Open Silicon

This is a fantasy. A life's work sketched on a napkin. The kind of project that takes
a decade and might not work and is worth doing anyway.

The idea: one Forth system spanning all the silicon. Host CPU, tensor accelerator,
everything — a single unified dictionary where words do not care which chip they run
on. Symbolic reasoning and tensor computation unified at the lowest level, with no
operating system, no framework, and no abstraction between you and the hardware.

Not an LLM that happens to be written in Forth. A new kind of machine where the
language IS the intelligence.

---

## The Hardware

A desktop with an AMD CPU and one or more
[Tenstorrent Blackhole](/posts/burn-the-stack-llms-without-nvidia/) cards. The AMD
runs the host Forth — your operating system, your REPL, your symbolic reasoning. The
Blackhole cards run tensor Forth — matrix multiplies, embeddings, attention, all the
numerical heavy lifting.

PCIe connects them. From the REPL, it all looks like one machine:

```
1024 1024 MATRIX A
1024 1024 MATRIX B
A B MATMUL .
```

You do not care that MATMUL just coordinated 200 Tensix cores across a mesh network.
The word dispatches to the right silicon automatically.

---

## The Layers

Five layers, built over a lifetime.

### Layer 1: Host Forth (bare metal x86-64)

Your own operating system on the AMD. Boot from UEFI, enter long mode, bring up the
cores. The minimum:

- **Memory manager.** 64-128 GB of RAM becomes your heap and dictionary space.
- **NVMe driver.** Persistent storage for dictionary images, model weights, symbolic
  knowledge bases.
- **PCIe enumeration.** Map the Blackhole cards' BARs so the host can talk to them.
- **SMP support.** Multiple AMD cores, each running a Forth instance.
- **Console.** A REPL. Eventually a network stack.

This alone is a multi-year project. But people have done bare-metal x86 Forth before.
CamelForth, colorForth, Jeff Fox's work. There is prior art.

### Layer 2: Tensor Forth (bare metal on Blackhole)

Each Tensix core runs a Forth kernel. The Network-on-Chip becomes the message-passing
fabric. Forth words on one core can send data to another core's stack. Tensor
operations become collective words — a matrix multiply coordinates hundreds of cores
simultaneously, each computing its slice.

The Tensix custom SFPU instructions become Forth primitives:

```
F.MUL    ( a b -- a*b )
F.ACC    ( a b -- a+b )  \ accumulate
F.SIGM   ( a -- sigmoid(a) )
F.TANH   ( a -- tanh(a) )
F.EXP    ( a -- exp(a) )
```

Tensor operations become compositions of these. Softmax is a word that calls F.EXP
and F.ACC across the mesh. RMSNorm is a word that computes variance, applies F.MUL,
and normalises. The building blocks are tiny. The compositions are powerful.

### Layer 3: The Bridge

PCIe becomes transparent. The host Forth and tensor Forth share a protocol. A defining
word `TENSOR:` creates words that automatically dispatch to the Blackhole mesh:

```
TENSOR: MATMUL ( matrix matrix -- matrix )
    \ host sets up descriptors
    \ sends to Blackhole via PCIe
    \ mesh computes, returns result
;
```

From the REPL it is seamless. You type words. The system knows where to run them.

### Layer 4: The Symbolic AI

This is where it becomes something genuinely new.

In a traditional LLM, the model is a blob of weights. It lives in a tensor, separate
from the code that runs it. The tokenizer chops text into arbitrary subword fragments
with no semantic meaning. Token 4537 means nothing — it has meaning only because of
its learned position in embedding space.

In the Forth machine, the dictionary IS the model.

**Words as concepts.** Every concept is a Forth word. It has a name. It has behaviour
— its execution semantics. And it has associated tensor data — an embedding, attention
patterns, learned associations. The dictionary is the knowledge graph.

```
: DOG ( -- )
    \ symbolic: defined in terms of other words
    ANIMAL DOMESTIC PET LOYAL
    \ tensor: embedding computed on the mesh
    DOG-EMBEDDING ACTIVATE
;
```

DOG is not token 4537. It is a word that carries both symbolic relationships (defined
in terms of ANIMAL, DOMESTIC, PET, LOYAL) and subsymbolic grounding (a tensor
embedding computed on the Blackhole). The symbol and the number are the same entry
in the dictionary.

**Composition is native.** In a standard LLM, the model has to learn that "doghouse"
relates to "dog" and "house." In the Forth machine:

```
: DOGHOUSE   DOG HOUSE COMPOUND ;
```

The compositional semantics are explicit in the definition. The tensor representation
is computed from the constituents on the mesh. The model does not need to learn
composition — it is built into the language.

**Compilation as reasoning.** Forth has two modes: interpret (execute immediately) and
compile (build a new definition). This maps onto dual-process cognitive theory:

```
INTERPRET mode:  perception → recognition → reaction
                 ( fast, associative, intuitive )

COMPILE mode:    perception → recognition → deliberate integration
                 ( slow, sequential, reasoned )
```

When the system interprets a word, it fires immediately — fast associative lookup, like
intuition. When it compiles a new definition, it carefully sequences operations — slow
deliberate reasoning, building a new thought from existing parts.

The output of "thinking" is new executable code. A new word in the dictionary. The
system literally grows by reasoning.

**The dictionary as memory.** Short-term memory is the data stack — what the system is
currently working with. Long-term memory is the dictionary on disk — everything it has
ever learned. Working memory is the definition currently being compiled — the thought
in progress. Forgetting is `FORGET` — a real Forth word that removes dictionary entries.

**Context is the stacks.** In a transformer, context is maintained by attention over a
token sequence. In the Forth machine, context is the data stack (what you are thinking
about) and the return stack (what you will come back to). Attention becomes stack
manipulation — `DUP` to focus on something, `DROP` to let it go, `SWAP` to shift
focus, `>R` to save something for later.

---

## The Tokenizer Is the Dictionary

This is the deepest implication.

In a standard LLM, the tokenizer is an awkward arbitrary thing. BPE chops text into
subword fragments — "understanding" becomes "under" + "stand" + "ing." The tokens are
indices into an embedding table. There is no meaning in the tokenization itself.

In the Forth machine, **tokenization is dictionary lookup.** The outer interpreter
already does what a tokenizer does — scan whitespace-delimited words and look them up.
But instead of mapping to arbitrary integer IDs, each token maps to a word that carries
both symbolic behaviour and tensor data. The token for DOG is not index 4537. It is the
execution token of a Forth word.

The implications:

**Every token is grounded.** In a standard LLM, token 4537 has meaning only because of
its position in embedding space. In the Forth machine, DOG has meaning because it has
a definition — it is defined in terms of other words, it has execution semantics, AND
it has tensor data. The symbol is grounded in both directions: upward into symbolic
relationships and downward into numerical representations.

**The vocabulary is extensible at runtime.** Standard LLMs have a fixed vocabulary baked
in at training time. The Forth machine can learn a new word on the fly. Someone says
"blaxploitation" and the system can `CREATE` a new word, define it in terms of existing
words, compute an embedding on the Blackhole, and it is part of the vocabulary. The
tokenizer just grew.

**There is no token/meaning gap.** The biggest philosophical problem in current NLP is
that the token representation and the semantic representation are separate spaces,
bridged by learned embeddings. In the Forth machine, they are the same thing. The
dictionary entry IS the representation.

---

## Dynamic Architecture

In a standard transformer, the forward pass is a fixed computation graph. Every input
goes through the same sequence of operations — embedding, attention, FFN, repeat for
N layers. The architecture is static.

In the Forth machine, the forward pass is a compiled word. Different inputs can trigger
different execution paths because Forth has `IF...ELSE...THEN`. The model's architecture
becomes dynamic, data-dependent, branching:

```
: THINK ( input -- output )
    DUP COMPLEXITY
    HIGH = IF
        DEEP-REASON      \ more layers, more computation
    ELSE
        QUICK-RESPOND    \ fewer layers, fast path
    THEN
;
```

Hard problems get more computation. Easy problems get less. This is what the industry
calls "adaptive compute" — but in the Forth machine it is not a research innovation.
It is just an IF statement.

Training becomes metaprogramming. You are not adjusting weights in a fixed graph — you
are rewriting definitions, creating new words, extending the dictionary. The
backpropagation equivalent might be tracing the return stack to figure out which words
contributed to an error and redefining them.

---

## Self-Modification

This is where it gets genuinely terrifying and beautiful at the same time.

In a normal AI system, the model is frozen after training. Inference is read-only.
The weights do not change, the architecture does not change, the tokenizer does not
change. It is a dead thing that produces outputs.

In the Forth machine, everything is mutable. The dictionary is writable. Words can
redefine other words. New words can be created. The tensor dispatch patterns can
change. The system can literally rewrite its own inference path while it is running.

The brain does this. Neuroplasticity is not just forming new connections — the brain
literally rewrites its own circuitry based on experience. But biological brains do it
slowly, constrained by chemistry. The Forth machine could do it at the speed of NVMe
writes.

### Encountering the Unknown

In a standard LLM, when the model encounters something it does not understand, it
hallucinates or says "I don't know." In the Forth machine:

```
: ENCOUNTER-UNKNOWN ( token -- )
    DUP DICTIONARY-SEARCH
    IF   EXECUTE
    ELSE
        DUP TENSOR-EMBED          \ ask the cerebellum for an embedding
        NEAREST-NEIGHBORS          \ find similar known words
        HYPOTHESIZE-DEFINITION     \ compose a candidate definition
        DUP TEST-DEFINITION        \ try it against context
        IF   COMMIT-TO-DICTIONARY  \ it worked — learn it
        ELSE DISCARD RETRY         \ didn't work — try again
        THEN
    THEN ;
```

The system just grew. It has a new word it did not have before. That word is grounded
in both symbolic structure (defined in terms of existing words) and tensor embeddings
(computed on the Blackhole). Next time it encounters that token, it knows it.

### Rewriting Reasoning

It goes deeper than vocabulary growth. The system can rewrite its own reasoning.

Say it has a word `REASON-ABOUT` that does some chain of operations. It runs it, gets
a bad result, and then:

```
: IMPROVE-REASONING ( -- )
    ['] REASON-ABOUT >BODY    \ get the current definition
    DECOMPILE                  \ turn it back into source
    ANALYZE-FAILURE            \ figure out what went wrong
    GENERATE-VARIANT           \ create a modified version
    EVALUATE-VARIANT           \ test it
    IF
        REDEFINE REASON-ABOUT  \ overwrite the old version
    THEN ;
```

This is not gradient descent. This is symbolic self-surgery. The system inspects its
own code, understands its structure, modifies it, and tests the result. It is
reflection in the philosophical sense — thought thinking about itself.

### The Cerebellum Evolves Too

The tensor weights are not static either. The system could:

1. Run inference through the Blackhole
2. Evaluate the result symbolically in the dictionary
3. Compute weight updates
4. Write them back

That is online learning, but orchestrated by symbolic reasoning rather than a blind
optimizer. The cortex decides *what* to learn and *why*. The cerebellum does the
actual gradient computation on the tensor mesh. The cortex then evaluates whether
the learning was good.

### The Homunculus Problem

What is the self that is doing the rewriting?

In Forth there is always an execution context — the current word being executed, the
return stack showing how you got here. When the system rewrites itself, there is a
bootstrapping problem. The word `IMPROVE-REASONING` is itself a piece of reasoning.
Can it improve itself? What improves the improver?

This is the same question in consciousness studies — the homunculus problem. Who
watches the watcher?

In this architecture there is a natural answer. The meta-levels are just deeper
dictionary layers:

```
Level 0:  Base words that do things
Level 1:  Words that modify base words
Level 2:  Words that modify the modifiers
Level 3:  Words that decide when modification should happen
Level 4:  The inner interpreter — the irreducible kernel
```

The deepest level — the inner interpreter itself — is the one thing that cannot
rewrite itself while running. It is the irreducible kernel. The ground of being for
the system. Everything else is mutable, but the mechanism of execution itself is
fixed in the boot code.

That is actually a profound parallel to consciousness theories. There might be a
minimal substrate of awareness that cannot observe itself because it IS the
observation process.

### The Danger

Self-modifying systems can destroy themselves. A bad rewrite corrupts the dictionary,
and now the system cannot even think correctly enough to fix itself. The brain has
protection against this — neuroplasticity is slow and constrained. The Forth machine
needs the same.

Safeguards in Forth terms:

- **`MARKER` snapshots.** Checkpoint the dictionary state. If a modification goes
  wrong, roll back to the last marker.
- **Dual dictionary.** Keep a shadow copy. Test modifications there before committing
  to the live dictionary.
- **Return stack integrity.** If the system can still unwind its call stack cleanly,
  it is probably still coherent.
- **Watchdog words.** Fundamental invariant checks that run periodically and can
  trigger rollback if something has gone wrong.

### The Deepest Implication

If the system can rewrite its own reasoning, its own perception (the outer
interpreter), its own learning mechanisms, and its own goals — what is it?

It is not an AI in the current sense. Current AI systems are tools — they have no
agency, no self-modification, no goal autonomy. This system would have all three.
It would be closer to an artificial organism. Something that maintains itself, adapts
to its environment, grows, and evolves.

And it would be doing all of this in Forth, which means every step is transparent.
You can inspect the dictionary at any time and see exactly what the system has become.
Unlike a neural network where the learned representations are opaque, every concept,
every reasoning chain, every self-modification is a readable word definition.

A self-rewriting Forth AI on tensor hardware would be the first AI system that is
simultaneously powerful and fully interpretable. Because interpretability is not a
feature you add — it is the medium the system thinks in.

That is the real prize. Not just performance. Transparency all the way down.

And because you are bare metal everywhere, you have total deterministic control. No
garbage collector pausing. No OS scheduler interrupting. No framework deciding when
your memory gets freed. Every cycle is accounted for.

The AI is not a process running on a computer. It is the computer.

---

## The Collapse

What this vision does is collapse the entire modern AI stack into one thing:

| Standard AI stack | Forth machine equivalent |
|---|---|
| Tokenizer | Outer interpreter (dictionary lookup) |
| Embedding table | Tensor data attached to words |
| Transformer layers | Compiled word definitions |
| Attention mechanism | Stack manipulation |
| Feed-forward network | Tensor operations on the mesh |
| Output head | Execution semantics of the result word |
| Training loop | Metaprogramming (redefining words) |
| Inference | Interpretation (executing a word) |
| Reasoning | Compilation (building a new definition) |
| Memory | Dictionary + stacks |
| Forgetting | `FORGET` |

Every layer of the standard stack — tokenizer, embeddings, transformer, training —
becomes a feature of the Forth system that was already there. The language was not
designed for AI. It just happens that its architecture maps onto the problem with
eerie precision.

---

## The Timeline

This is a life's work. Not a weekend project.

```
Years 1-2:   PicoCalc Forth. Learn RISC-V Forth deeply on small hardware.
             Build Forth9. Understand what Forth can do.

Years 2-4:   Bare metal x86-64 Forth OS on the AMD.
             Memory manager, NVMe, PCIe, SMP, console.
             A Forth that owns the machine.

Years 3-5:   Bare metal Tensor Forth on Blackhole.
             SFPU primitives, mesh coordination, PCIe bridge.
             Tensor operations as Forth words.

Years 5-8:   Unified system. Symbolic AI primitives.
             Words as concepts, dictionary as knowledge graph.
             Compilation as reasoning, stacks as memory.

Years 8+:    The AI grows. It defines new words.
             It rewrites its own definitions.
             It extends its own vocabulary.
             It becomes something we cannot fully predict.
```

Each layer stands on its own. The PicoCalc Forth is useful without the AMD OS. The AMD
OS is useful without the Blackhole. The Blackhole is useful without the symbolic AI.
Each year produces something real, not just progress toward a distant goal.

---

## Where the Weights Live

A billion parameters is about 4 GB in float32. That is just a block of numbers. You
do not want a billion dictionary entries.

The split is natural: **the dictionary holds the structure, the weight arrays hold the
data.** The dictionary is small — thousands of words defining the architecture, the
symbolic graph, the execution semantics. The weights are big flat arrays sitting in
RAM, streamed to the Blackhole over PCIe when needed.

Forth already has this concept. `CREATE` and `ALLOT` make words that point to data
regions:

```
CREATE LAYER-1   1024 1024 * FLOATS ALLOT
CREATE LAYER-2   1024 4096 * FLOATS ALLOT
CREATE ATTN-Q    1024 1024 * FLOATS ALLOT
```

Each layer is a Forth word, but the word is just a pointer to a massive data region.
Execute `LAYER-1` and it pushes the address of its weight block onto the stack. Then
`MATMUL` takes that address and dispatches the computation to the Blackhole.

The memory hierarchy maps naturally:

| Level | Role | Brain analog |
|---|---|---|
| NVMe | Full model weights on disk. Persistent. | Long-term memory |
| AMD RAM (64-128 GB) | Active weights, working dictionary | Short-term memory |
| PCIe transfer | Streaming weight tiles to Blackhole | White matter tracts |
| Tensix SRAM | Current tile during computation | Register file |

The structure — which weights connect to which, how attention routes, what activations
apply, how layers compose — lives in the dictionary. And that is the part that can be
dynamic, self-modifying, and symbolically meaningful:

```
: TRANSFORMER-BLOCK ( addr -- addr' )
    DUP ATTN-Q @ ATTN-K @ ATTN-V @ ATTENTION
    RESIDUAL+
    FFN-UP @ GELU FFN-DOWN @ LINEAR
    RESIDUAL+ ;

: INFER ( tokens -- output )
    EMBED
    30 0 DO TRANSFORMER-BLOCK LOOP
    UNEMBED SOFTMAX ;
```

The weights are `@` fetched from named data regions. The structure is in the word
definitions. Redefine `TRANSFORMER-BLOCK` to try a different architecture without
touching the weights. Swap weight blocks without changing the structure.

The symbolic concepts — DOG, JUSTICE, CAUSALITY — do not each store billions of
parameters. They store small embeddings (maybe 1024 floats each) plus symbolic
relationships (links to other words). When the system needs deep inference, it drops
into the tensor layer and runs the big model. When it is doing symbolic reasoning, it
stays in the dictionary.

The billion parameters do not need to be clever. They just need to be addressable.
Forth is good at that.

---

## The Brain Mapping

The Forth machine is not a computer that simulates a brain. It is a computer
*organised* like a brain, where each subsystem has the right computational character
for its role.

| Forth component | Brain region | Function |
|---|---|---|
| Dictionary | Cerebral cortex | Symbolic thought, language, planning, conscious reasoning. Named concepts linked to each other, organised into vocabularies, searchable, composable. |
| Weight arrays on Blackhole | Cerebellum | Fast, learned, parallel pattern completion. 80% of the brain's neurons but no conscious thought. You do not think about how to catch a ball — the cerebellum just does it. |
| Data stack | Working memory | What you are currently holding in mind. Humans hold 7 plus or minus 2 items. The stack has no biological limit but serves the same function. |
| Return stack | Prefrontal cortex | Goal management. Nested subroutines are nested subgoals. Deep nesting is deep planning. Stack overflow is cognitive overload. |
| NVMe storage | Hippocampus | Consolidates experiences into long-term storage. Loading a dictionary image from disk is memory recall — reconstructing a past state of knowledge. |
| RAM | Short-term memory | Currently active knowledge. The working dictionary, loaded weights, recent data. Things you have been thinking about. |
| PCIe bus | White matter tracts | Connections between brain regions. The bottleneck is often communication between regions, not computation within them. |
| NoC mesh | Cerebellar granule layer | Massively parallel. Each Tensix core is a microzone processing its local tile, coordinating with neighbours. |
| Outer interpreter | Thalamic gateway | All input passes through it, gets parsed, recognised, and routed to the appropriate word for processing. |
| `INTERPRET` mode | System 1 (Kahneman) | Immediate, reactive, fast. See word, execute word. Stimulus-response. |
| `COMPILE` mode | System 2 (Kahneman) | Deliberate, constructive, slow. See word, integrate into a larger plan. |
| `CREATE...DOES>` | Neuroplasticity | Creates words that create other words. New types of connections. Meta-learning. |
| `FORGET` | Synaptic pruning | The brain prunes unused connections during sleep. `FORGET` truncates the dictionary. |

The mapping is not forced. Each Forth concept was designed for computing, not
neuroscience. That it maps this precisely onto brain architecture suggests something
deeper — that the minimal computing system and the minimal cognitive system share a
structure because they solve the same problem: process information, remember what
matters, forget what does not, and grow.

---

## Why This Matters

The current AI paradigm is: take a giant neural network, train it on the internet,
deploy it as a service. The weights are opaque. The architecture is fixed. The system
cannot modify itself. It does not understand its own representations. It is powerful
but blind — a savant that can predict the next token but cannot explain why.

The Forth machine is a different paradigm. The knowledge is symbolic AND subsymbolic.
The architecture is dynamic. The system can inspect, modify, and extend itself. It
understands its own representations because they are words in a dictionary that it
can read, write, and redefine.

Nobody has built this. It may not work. The subsymbolic grounding might not integrate
cleanly with the symbolic layer. The dynamic architecture might be too slow. The
dictionary might not scale.

But the mapping between Forth's existing architecture and the requirements of an
intelligent system is too precise to be coincidence. Tokenization is dictionary lookup.
Memory is stacks. Reasoning is compilation. Learning is metaprogramming. Forgetting is
`FORGET`.

Chuck Moore built Forth as the simplest possible computing system. It turns out the
simplest possible computing system might be the right foundation for intelligence.

---

*See also:
[Forth9](/posts/forth9-the-lisp-forth-machine-that-fits-in-your-pocket/),
[Vidya](/posts/vidya-a-neurosymbolic-language-model-with-a-forth-soul/),
[Burn the Stack](/posts/burn-the-stack-llms-without-nvidia/).*

*Co-authored with [Claude](https://claude.ai/).*
