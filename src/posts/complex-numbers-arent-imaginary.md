---
title: "Complex Numbers Aren't Imaginary: How a Forgotten Engineer Made Our Audio Language Faster"
date: 2026-04-27
layout: "base.njk"
tags: post
---

# Complex Numbers Aren't Imaginary: How a Forgotten Engineer Made Our Audio Language Faster

Aither needed frequency-domain math. Frequency shifting. Hilbert
transforms. Phase-coherent rotation. The kind of operations every
modern audio plugin does with complex numbers under the hood.

The conventional move is to add a `Complex` type. Pair of doubles
behind a struct, overloaded operators, a small library of methods.
Every language that wants serious DSP either bakes this in (Julia,
MATLAB) or builds it on top (Python+numpy, C++ with `std::complex`).
That was what we were going to do.

We didn't. We did something else — something a man who's been dead
for a century told us to do, and a man who is treated as a crank
spent forty years insisting we should listen to. The result is a
language that does frequency-domain DSP with no complex type, no
boxing, no type dispatch, no allocation, and arithmetic that
inlines straight into the audio loop.

This is the story of how we got there. It involves two unfashionable
electrical engineers, an old idea about what a complex number
actually is, and a programming-language design choice that fell out
of taking that old idea seriously.

## The framework that got forgotten

In 1893 Charles Proteus Steinmetz published *Theory and Calculation
of Alternating Current Phenomena*. He had been hired by a young
General Electric to figure out why three-phase AC power was so much
more efficient than single-phase, and how engineers could actually
calculate with it without going mad.

His answer was the **phasor** — a complex number used to represent
an AC signal. Modern electrical engineering students still learn
phasors. What they don't learn — what got quietly stripped from the
curriculum somewhere between 1920 and 1960 — is what Steinmetz
thought a phasor *meant*.

For Steinmetz, the `j` in a phasor (engineers say `j` because `i` is
already taken for current) was not an "imaginary" number. It was a
**90-degree rotation operator**. And the two real numbers that make
up a complex quantity were not abstract symbols — they were two
**physical** quantities, simultaneously present, in fixed quadrature
to each other.

In an electrical circuit, those two quantities are the **magnetic
field energy** (kinetic) and the **dielectric field energy**
(potential). Both are real. Both are measurable. Neither is more
fundamental than the other. The circuit always carries both
simultaneously, and they exchange — magnetic into dielectric and back
— at the resonant frequency. The "complex impedance" of the circuit
is just the bookkeeping that tracks the relationship between them.

There is no imaginary anything. There are two real energies in a
fixed phase relationship. The math we call "complex" is the math
of *that relationship*.

This is a much better way to think about complex numbers than the
mystical "square root of negative one" framing most of us got taught
in high school. It's also, by now, almost completely off the
curriculum.

## Why it was forgotten

Several things conspired.

After Steinmetz died in 1923, GE consolidated his methods into
practical engineering tables. The math survived; the physics behind
it slowly got optional. By the 1950s most EE textbooks taught `j`
as "the unit such that j² = -1" — a calculation rule, divorced from
any claim about what it represents. Pedagogically simpler. Faster
to get to the homework problems.

By the 1980s the dominant view in most engineering departments was
that physics gives you Maxwell's equations and the rest is just
applied math. The Steinmetz framework — which insisted that complex
numbers were *physical* quantities in a *physical* relationship —
became, at best, an interpretive aside. At worst, an embarrassment.

Eric Dollard, who worked at Bell Labs and who has spent four decades
trying to keep the Steinmetz framework alive, is now treated as a
fringe figure. His talks live on YouTube channels with names like
"FractalWoman" and they are watched mostly by Tesla enthusiasts and
people who think modern physics took a wrong turn somewhere around
1905. Most academic electrical engineers will not engage with him.
Most never will.

The framework is real. The recovery target is concrete. The audience
in academia just doesn't exist.

## Why this matters for an audio language

Steinmetz wrote about electricity. We were writing an audio
language. So why does it matter to us?

Because **audio is electricity that you can hear**. Audio DSP is
shot through with the same mathematics as Steinmetz's polyphase
networks: signals as functions of time, two-channel quadrature
(I/Q in radio and SDR, signal/Hilbert-transform pairs in audio,
left/right in stereo), filters as networks of energy storage
elements, resonators as coupled magnetic-dielectric exchanges.

When we needed a `freq_shift(signal, hz)` operation in aither — the
operation that takes any audio signal and shifts every frequency
component up or down by a fixed number of Hz — the textbook
implementation is:

1. Compute the analytic signal: pair the input with its
   Hilbert-transformed version (the same input shifted by 90
   degrees of phase at every frequency).
2. Multiply that complex pair by a complex rotation at the desired
   shift frequency.
3. Take the real part of the result.

Three lines of code, if you have a complex type. If you don't have
a complex type, it's three lines of code with manual real/imag
arithmetic everywhere — verbose, easy to get wrong, slow to write.

The conventional answer to "we need this" would be: add a complex
type. Add a constructor. Add overloaded operators. Add type
inference for it. Add it to the standard library. Pay the runtime
cost of boxing pairs into structs. Pay the language-design cost of
introducing a new type that interacts with everything else in the
language.

The Steinmetz answer is: **there is no complex type. There never
was. There are two real numbers in a fixed relationship, and a
small family of operations that knows how to read them as one
rotating thing.**

If we believe Steinmetz, we don't need a type at all. We need
operations.

## What that looks like in the language

Here is what `cmul`, our complex multiplication primitive, looks
like in aither:

```
let result = cmul(re_a, im_a, re_b, im_b)
```

It takes **four real numbers**. The first two are interpreted as
the real and imaginary parts of one quantity; the next two are the
parts of another. The operation returns a pair of real numbers —
the real and imaginary parts of the product.

There is no `Complex` type. There is no constructor. The four
arguments are just floats. They become a pair when `cmul` reads
them as a pair. They could equally well be two stereo signals, two
MIDI continuous-controller values, two coordinates of a point in
the plane, or any other interpretation. The cells holding the
values do not know what they are.

When the compiler sees `cmul`, it emits this:

```c
double result_re = (re_a * re_b - im_a * im_b);
double result_im = (re_a * im_b + im_a * re_b);
```

Four multiplies and two adds, inlined directly into the surrounding
arithmetic. No struct, no pointer dereference, no allocation, no
GC, no method dispatch. The audio thread runs at full speed.

The same applies to every other pair operation. `rotate(re, im,
angle)` is two trig calls and a 2x2 matrix multiply, inlined.
`cscale(real_factor, re, im)` is two multiplies. `analytic(signal)`
is the only one with persistent state — it claims a 32-cell region
of the voice's `$state` array for two cascaded Hilbert filters and
returns the analytic-signal pair as two scalar expressions. None of
them take or return a struct.

`freq_shift` is the killer demonstration:

```
let shifted = freq_shift(my_signal, 37)
```

One call. Internally it constructs the analytic signal (32 cells of
state), rotates by `37 Hz`, and projects back to a real scalar.
The composer writes one line and gets coherent
inharmonicity — every harmonic shifted by exactly 37 Hz, producing
the metallic organ-bell character that you can't get any other way.
We have it because the complex math underneath is cheap and direct.
We have it because there is no type in the way.

## Why it works in our audio language

Every multi-cell structure in aither is treated this way. The
`$state` vector is a flat array of doubles. A pair of cells means
nothing on its own. It might become:

- A complex pair when `cmul` reads it
- A stereo pair when `[L, R]` reads it
- A `(pitch, gate)` tuple when MIDI reads it
- An inharmonic dyad when an additive synthesizer reads it
- A two-component vector when a chaotic-attractor iteration reads it

The cells don't commit to a meaning. The operations carry the
meaning. The same discipline applies to three cells (could be a
chord, could be a 3D vector, could be three voices in a polyphase
chord), to arrays (could be additive partials, could be a rhythm
pattern, could be a velocity sequence), to anything.

This is exactly the discipline Steinmetz applied to electricity.
The phasor is not a special object that requires a Complex class
in your engineering software. It is two real measurable quantities
that have a fixed relationship, and the math that exploits the
relationship lives in the operations you apply to them.

We didn't intend to build a language with this property. We
intended to add complex multiplication and a Hilbert transform. We
arrived at the design by reading Steinmetz, listening to Dollard,
and asking the question: *what if the type isn't necessary?*

It isn't. It never was.

## What this unlocks that other audio software can't do

The pair operations are now load-bearing in several patches, and
they enable musical moves that are genuinely difficult or impossible
in the established audio toolchains.

**Coherent inharmonicity in real time.** `freq_shift(my_drone, 37)`
shifts every frequency component of a held drone by exactly 37 Hz —
not 37 cents, not 37%, but 37 Hz. The harmonic series collapses;
the spacing between partials becomes constant rather than
proportional. The sound goes from pure organ to metallic bell to
clanging dissonance as you sweep the offset, and every step is
phase-coherent because the underlying complex rotation is exact.
SuperCollider does not have this as a primitive. CSound does not
have this as a primitive. FAUST does not have this as a primitive.
You can build it in any of them, but you have to assemble it from
several stages and the result is heavy enough that you would not
reach for it as a knob. In aither it is one call and one knob.

**Phase-locked octave doubling that never drifts.** Square the
analytic signal of an input via `cmul(re, im, re, im)` and you
double its phase angle by construction. That is mathematically — not
by oscillator tuning — an octave up that tracks the source's phase
sample by sample. No PLL, no envelope follower, no pitch detection,
no "octave up" effect that wobbles when the input bends. We use
this in patches where the doubler needs to feel like part of the
same sound rather than a separate voice. Standard pitch-shifting
plugins cannot do this — they detect pitch and resynthesize, which
introduces latency and artifacts. We get it for free because we
operate on the analytic signal directly.

**Live geometric rotation of any pair.** `rotate(re, im, angle)`
treats any pair of state cells as something that can be turned by
an angle. The same operation does per-sample stereo width
modulation (rotate the L/R pair into a mid/side pair and back),
IQ rotation for SDR-style frequency tricks, geometric morphing
of two-dimensional control signals, or attractor-style state
evolution where the state is rotated each tick. In a graph-based
DSP environment these would all be different nodes from different
libraries. Here they are the same operation reading different
pairs.

**Composability across paradigms.** Because the output of a pair
operation is two scalars, you can feed it directly into anything
else that takes scalars. A `freq_shift`ed drone can be the
modulator of an FM oscillator, the input to a paradigm crossfade,
or the source of an analytic signal that itself gets squared.
Patches in our `gaelic_ladder` example stack four cumulative layers
on a Tesla-organ FM swarm: the third layer is a
`freq_shift` of the previous two, and the fourth squares the
analytic signal of the result. Each layer is one line. None of
them required wrapping or unwrapping a complex value.

None of this required adding a type. All of it falls out of having
operations that know how to read pairs.

## Why this only works in a function-of-state language

The deepest reason this design works is that aither's whole language
is built on one contract: every signal is `f(state) → sample`. A
voice is a function that takes a state vector and returns one audio
sample. Run it 48,000 times per second and you get audio. There are
no nodes, no graph, no scheduler, no audio-rate-vs-control-rate
distinction, no buses. Just a function and its state.

This contract is what makes operations-instead-of-types affordable.

In a node-based DSP environment — Pure Data, Max/MSP, SuperCollider,
FAUST, CSound — every signal flow is a graph of typed nodes. A
"complex node" would have to be a different kind of node from a
"real node," with its own connection rules, its own type-checking,
its own runtime dispatch. Adding complex math to such a system
means adding type machinery: nodes that produce complex outputs,
nodes that consume them, conversions between real and complex,
buffer management for the extra channel. The framework knows the
type, so the framework has to handle the type.

Aither has no framework that needs to know. The state vector is a
flat array of doubles. A pair of cells *is* whatever the operation
that reads it says it is. `cmul` reads two pairs and produces one;
`magnitude` reads one pair and produces a scalar; `rotate` reads
one pair and an angle and produces a rotated pair. The state cells
themselves are not typed. The cells are storage; the operations
are interpretation.

This is why the same `$state` cell can carry a complex pair when
`cmul` reads it, then carry an unrelated scalar when the next sample
overwrites it with a filter coefficient, then become part of a
chaotic-attractor coordinate three samples later — all in the same
voice, all without any conversion. The cells are uncommitted. The
language has no concept of "what type is in this cell." It has
operations that know how to read what they need.

In a typed signal-processing framework you would not be allowed to
do this. The complex-typed cell would be locked into being complex.
Switching its meaning would require a conversion, and the framework
would either reject it as a type error or insert a wrapper. The
freedom we have to reinterpret cells across operations is a freedom
the function-of-state contract gives us, and the absence of a
complex type is what lets us actually use it.

This is also why the runtime cost is zero. In a typed framework,
even a "good" complex type has overhead — the struct lives somewhere,
the operations do indirect calls, the inliner may or may not see
through the abstraction. In aither, `cmul` is four multiplies and
two adds emitted directly into the C output, with the four input
expressions inlined as named temporaries. The audio loop is one
tight numerical kernel. Steinmetz's framework is what justified
this design philosophically; the function-of-state contract is what
made it implementable without compromise.

The two ideas reinforce each other. **Steinmetz says: complex
numbers are two real things in a relationship, not a new kind of
thing.** **Function-of-state says: the language has no kinds of
things, only operations on flat numerical state.** Put them
together and you get pair operations that compile to inline
arithmetic and compose freely with everything else in the language,
because the language has nothing in the way.

## Which complex numbers, exactly?

A reasonable critique of everything above would be: "you don't have
a complex *type*, but you obviously have complex *values* — your
operations produce them and consume them. You've just hidden the
type behind the operation set. This isn't really 'no complex
numbers,' it's just complex numbers without a name."

That critique deserves a careful answer, because there is something
subtler going on. Mathematicians genuinely disagree about what ℂ
even is.

The pluralist view — argued most explicitly by Joel David Hamkins
and the broader tradition of mathematical pluralism — holds that
there are at least four structurally distinct conceptions of ℂ,
and they are not equivalent:

- **The algebraic conception**: ℂ as the quotient ring
  ℝ[x]/(x²+1). In this view i and −i are *indistinguishable* by
  any algebraic property; there is no canonical imaginary unit,
  only a Galois-conjugate pair.
- **The model-theoretic conception**: ℂ as the unique algebraically
  closed field of characteristic zero with cardinality continuum.
  Even less canonical — even the embedding into a coordinate
  system isn't fixed.
- **The smooth conception**: ℂ as the real 2-manifold ℝ² equipped
  with a complex structure J. The pair (ℝ², J), abstract.
- **The rigid / coordinate conception**: ℂ as ℝ² with a *chosen*
  distinguished direction labeled "i". Once you've picked which
  axis is real and which is imaginary, there is a definite i and
  a definite direction of positive rotation.

These have different automorphism groups, different canonical
operations, different things that count as natural. Conflating them
is a category error that mathematicians make all the time without
noticing — most undergraduate texts present "the complex numbers"
as if there is one ℂ, when in fact every text has implicitly
committed to one of these conceptions.

**Aither implements the rigid conception.** When `cmul(re_a, im_a,
re_b, im_b)` emits `(re_a*re_b - im_a*im_b, re_a*im_b + im_a*re_b)`,
the language is committing to:

- A fixed orientation — the slot order says first is real, second
  is imaginary.
- A fixed direction of positive rotation — the +sign in the
  imaginary-component formula says counterclockwise is positive.
- A definite *i* — the unit pair (0, 1).

These are all choices the algebraic conception explicitly refuses
to make. The rigid conception makes them and operationalises them
directly. There is no Galois-conjugate ambiguity in aither because
we have *fixed the labels*, and once the labels are fixed, all the
operations work with them definitely.

So the precise version of the claim isn't "we have no complex
numbers." It's: **we don't reify the algebraic conception as a
type, because the algebraic conception is the wrong one for
engineering. We commit to the rigid conception, and the rigid
conception only requires operations that respect a chosen
orientation. Operations are the natural representation of the
rigid conception. Types are the natural representation of the
algebraic conception. We picked the engineering-appropriate
conception, and it happens to want operations and not types.**

Why is the rigid conception the right one for audio DSP? Because
audio is physical: signals are real-valued voltages at the speaker
cone. The "complex" structure only exists as an analytical
convenience for talking about phase and frequency, and that
convenience needs a *chosen* orientation — which channel is the
cosine, which is the sine; which direction of rotation corresponds
to positive frequency. The algebraic conception's
Galois-symmetric pair of imaginary units is something you would
never want in audio, because the speaker cares which is which.
Engineering needs a definite *i*. The algebraic abstraction that
erases the definite-ness is the wrong tool for the job.

Steinmetz, in 1893, was operationalising the rigid conception
before the algebraic-type view became culturally dominant in
mathematics. His framework was correct for engineering for the
same reason aither's is: engineering needs a definite *i*, and
the abstraction that hides which-is-which is incompatible with
the physical world the engineering is describing.

The pluralist framing also explains why most type-based languages
are awkward fits for audio DSP. Types in modern programming
languages are descended from the algebraic-structure tradition
in mathematics — they reify the operations a thing supports
without committing to a coordinate system. That is exactly the
abstraction the algebraic conception of ℂ provides, and it's
exactly the abstraction engineering doesn't want. Languages
with built-in `Complex` types ship the algebraic conception by
default, and engineers have to work *against* the type system
to get the rigid behaviour they actually need.

Aither doesn't fight the type system because there is no type
system in the way. The operations land directly on the rigid
conception, where engineering wanted them all along.

## How do we know we picked the right one?

Honest answer: we didn't survey the four conceptions and prove
the rigid one was best. We picked it because it aligned with a
tradition that had already answered the question — and only
later, when forced to articulate the choice, did we notice the
deeper reason it works.

The reason is this: **aither is, by intention or by accident, a
classical-field-theory programming environment.** And classical
field theory uses the rigid conception of ℂ as its native
language.

Look at what the language actually does. A signal is a real-valued
field at a point in time. A pair of state cells is two fields in
fixed quadrature — exactly the magnetic + dielectric pair Steinmetz
modelled circuits with, or the cosine + sine pair you get when you
write down a rotating field in coordinates. The `f(state) → sample`
contract is a local field update rule: the state at this sample
determines the state at the next, deterministically, with no
superposition or measurement collapse. The DHO primitive is
literally Steinmetz's dual-energy oscillator, kinetic and potential
exchanging energy at the resonant frequency. Filters are field
propagation through impedance networks. Pair operations are field
rotations and energy exchanges in the complex plane that has a
definite orientation *because the physics has a definite
orientation*. Audio output is the field's projection onto a
one-dimensional physical observable — the speaker cone, which only
knows pressure variation.

Every primitive in the language fits the classical-field-theory
frame. Nothing in aither requires quantum-style abstraction to
understand. The mathematical commitments are coherent across the
whole stack — from the choice of conception of ℂ, through the
state-vector representation, up to the audio output.

This is what makes the rigid conception correct *for us
specifically*. Maxwell, Faraday, Steinmetz, every wave equation
in the classical canon — all of it operates in coordinate-rigid
space. E points in a direction. B is perpendicular to it. Current
has a sign. Rotation has a hand. Classical physics is *quantities
in space with definite directions and phase relationships*. The
rigid conception of ℂ is the mathematical structure that natively
expresses this kind of physics.

Quantum mechanics, by contrast, is comfortable with the algebraic
and model-theoretic conceptions. The wavefunction is happy to be
Galois-symmetric until measurement collapses it. That's exactly
the abstraction that makes quantum thinking unintuitive: the
structures lose their pointing quality, and you have to think
about them in a more abstract algebraic way.

Choosing the algebraic conception for aither would have made the
language fight its own physical interpretation. Choosing the
smooth conception would have introduced an abstraction layer that
has to collapse to coordinates eventually anyway. Choosing the
rigid conception lines up the mathematical structure with the
physical one, all the way down. The patches *think the way
classical physics thinks*, because the underlying ℂ structure is
the same one classical physics uses.

Steinmetz, in 1893, wasn't just operationalising complex math
for engineering. He was operationalising it *in the
classical-field-theory tradition* where every quantity has a
direction, a magnitude, and a phase relationship to other
quantities. His work is downstream of Maxwell and Faraday — the
entire 19th-century field-theory tradition that quantum mechanics
later partly displaced. Aither inheriting his framework means
inheriting more than a calculation method. It means inheriting a
worldview that takes classical fields seriously as the substrate
of physical reality.

We didn't know all this when we made the choice. We picked the
rigid conception because it was the one Steinmetz used and we
were reading Steinmetz. Only after the language was built did
the deeper consistency become visible. **The right conception of
ℂ for an audio language turned out to be the right one because
audio is classical-field-theory output, the language is a
classical-field-theory programming environment, and the
conception of ℂ has to match the conception of fields it's
operating on.**

That's how we know we picked right. Not by proof, but by
coherence: the choice fits the tradition, the tradition fits
the physics, the physics fits the medium, and the medium
(speakers, ears, classical wave propagation in air) is
unambiguously classical. There's no Galois-conjugate ambiguity
in a sound wave.

## The wider point

Steinmetz's framework is not the only forgotten engineering tool
that still has computational advantages. The polyphase methods of
Charles Fortescue (positive sequence, negative sequence, zero
sequence — a decomposition of any 3-phase signal into rotational
components), the Pythagorean Lambdoma (a matrix of intervallic
ratios that generates musical scales procedurally), the
longitudinal-vs-transverse wave distinction that Tesla insisted on
and that mainstream physics quietly buried — these are all real
mathematical structures with real computational uses, and most of
them are off the curriculum.

The genre exists. Geometric algebra was Clifford's 1878 work,
forgotten for nearly a century, recovered by Hestenes and now used
in computer graphics, robotics, and quantum computing. The lambda
calculus was Church's 1930s work, off the CS curriculum until
Scheme and ML revived it in the 1980s, and now it underpins every
serious functional language. Tufte recovered Playfair's 1786
charts and Snow's 1854 cholera map for a generation that had
forgotten them. Recovery of useful old work is a thing people do,
and it tends to pay.

Steinmetz is overdue for the same treatment.

The framework does not require you to believe Tesla was suppressed
by the lizard people. It does not require you to think modern
physics took a wrong turn at relativity. It does not require you
to share Dollard's opinions about anything except the math. It just
requires you to read Steinmetz's books and notice that the
computational story he was telling — *complex numbers are not
imaginary, they are two real things in a fixed relationship,
operated on by a small algebra* — has held up perfectly, while the
"j² = -1, just trust us" framing taught in modern textbooks has
quietly been getting in everyone's way.

We needed complex math in an audio language. We got it without a
type. The result runs faster, composes better, and lets us write
patches that the type-heavy version would have made awkward.

A nineteenth-century engineer most people have never heard of made
our twenty-first-century audio language better. There is probably
more where that came from.

---

*Aither is at [github.com/rolandnsharp/aitherLang](https://github.com/rolandnsharp/aitherLang).
The pair operations and `freq_shift` are documented in the language
SPEC; the design philosophy is in `PHILOSOPHY.md`. Steinmetz's
*Theory and Calculation of Alternating Current Phenomena* (1893)
and *Engineering Mathematics* (1911) are out of print but available
as scans through the Internet Archive. Eric Dollard's papers are at
[emediapress.com](https://emediapress.com/).*

*Co-authored with [Claude](https://claude.ai/).*
