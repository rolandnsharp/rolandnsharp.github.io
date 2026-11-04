---
title: "Holding a Coding Agent to the Scientific Method: 37 Pre-Registered Experiments in Twelve Days"
date: 2026-11-04
layout: "base.njk"
tags: post
---

# Holding a Coding Agent to the Scientific Method: 37 Pre-Registered Experiments in Twelve Days

A coding agent will happily run a hundred training jobs for you. The problem is
what comes back: a pile of numbers, each with a plausible story attached, and no way
to tell afterwards which story you believed *before* you saw the number.

So for model work I hold my agent (Claude Code) to a protocol. Between 19 and 30
October it ran 37 experiments under it. Most were for the
[speech recogniser I released this week](/a-speech-recogniser-with-no-fft/),
and the rest for a quantisation study and a separate text model. Every one is public on
[experiments.blah.dev](https://experiments.blah.dev/EXP-0049), with a long write-up in
[rolandnsharp/experiments](https://github.com/rolandnsharp/experiments).

This post is about the protocol, and the four times it changed what I did.

---

## The rules

They sit in the agent's standing instructions, so they apply to every session without
my asking:

1. **Before spending compute:** search the earlier experiments and the literature. Then
   write the protocol: question, hypothesis, variables, one control, **numeric predictions
   and what would refute them**, how evaluation data is kept out of training, the
   analysis plan and the seeds.
2. **Pre-register before the first run launches.** If a run started first, the write-up
   has to say so.
3. **Record every run as it ends**, including the failed and abandoned ones: hardware,
   wall-clock, cost, multiply-adds per unit and the final measurements.
4. **Any change to the plan after pre-registration is a recorded deviation**, never a
   quiet edit.
5. **Conclude against the predictions**, with limitations, and link the experiment to
   what it builds on.

The agent does the paperwork through blah.dev's MCP server, so it costs me nothing.
Pre-registration is timestamped, which is what makes the record worth sharing: anyone
reading it can see what I expected before the result existed. The agent drafts each
protocol from earlier results and the literature. I decide what's worth testing and
what would count as success.

---

## 1. The prediction I'm glad was wrong

The model's front end is a bank of learned complex oscillators instead of the usual
mel spectrogram. That's the idea the whole project rests on. So it got a fair fight:
same backbone, same budget, oscillators against mel.

I predicted the oscillators would **lose by 3 to 8 points** of word error rate. For the
first 10,000 updates they did, just as they had in two earlier experiments. Without a written
prediction and a fixed budget, that's where I'd have stopped: a pet idea, visibly
behind, and a reasonable excuse to switch.

At 30,000 updates the oscillators finished **ahead on all three test sets**: 38.6% against
40.2% on test-clean, and 62.1% against 64.4% on test-other. Prediction wrong, front end
kept. One seed, and the write-up says so. The released model uses the oscillator front.

## 2. The prediction that failed, and already said what that meant

Round 3 was still improving when it stopped, so round 4 resumed it for 60,000 more
updates with data augmentation. I predicted test-clean would go from 38.6% to **25–30%**.

It got **39.9%**: slightly *worse*. That's the useful part of writing down "what would change
our mind" in advance. The protocol already had the branch: worse than 30% with
test-other barely moving means the augmentation is too strong for this model size. That
is exactly what happened (test-other 62.1% → 60.8%). The release stayed on round 3, and
nobody had to invent an explanation after the fact.

Two things moved at once in that run, longer training and augmentation, because the
budget allowed only one run. The protocol made me say so in advance, so the conclusion
is honestly limited.

## 3. A wrong verdict, corrected in public

An earlier experiment concluded that ternary weights (−1, 0, +1) "don't pay on CPUs".
A week later I asked why. The C code it timed stored each ternary weight as an int8
byte and ran ordinary int8 multiply-adds. It had measured a bigger model through the
same kernel, not a ternary kernel at all.

So I ran it properly, using llama.cpp on the uConsole (RK3399, with no ARM dot-product
instructions), and decoded SmolLM2-1.7B in three weight formats:

| format | tokens/s | memory streamed |
|---|---|---|
| int8 (Q8_0) | 3.31 | 6.0 GB/s, at the RAM ceiling |
| int4 (Q4_0) | 4.71 | 4.7 GB/s |
| ternary (TQ2_0) | **7.89** | 3.9 GB/s, compute-bound |

Ternary is the fastest format here, at **2.4×** int8. I'd predicted 3–4×, so that was a
miss too, and the bandwidth column shows why: the ternary kernel runs out of compute
before it runs out of memory.

The old experiment wasn't deleted. Its write-up now carries the correction and a link
to the new one. In fairness, this experiment *wasn't* pre-registered: the runs came
before the protocol was written, and the record says that too.

## 4. Three refutations in a row that found the real cause

When I rewrote the recogniser's recurrent block in my own code, it came out much worse
than the block it replaced: 50.9% against 38.6%. The written prediction for the next run
was that the learning-rate schedule explained most of the gap. It got 49.1%, so the
prediction was refuted. That refutation is what sent me to the optimizer. With my own
implementation of Muon, the same block reached 33.8%, beating the original. The full
story is in the [release post](/a-speech-recogniser-with-no-fft/).

---

## What the paperwork caught that I wouldn't have

- **A build flag that faked a result.** The release model's C scorer, built with
  `-ffast-math` on x86, reported 37.6% WER where PyTorch said 16.8%. The cause was
  fast-math's assumption that infinities never occur, in a model whose activations reach
  about 100,000. Under rule 4 that's a deviation: the bad numbers are kept, labelled and
  excluded from the verdict, rather than quietly overwritten.
- **Costs.** Because every run records its cost, I know the final 10.4M-parameter model
  cost $7.37 to train, against an estimate of $25–29. I also know the infrastructure failures
  cost little: two false starts before round 4 (a slow data loader, then out of memory)
  came to about $0.70 together. Failed runs get one line, not a paragraph.
- **Confounds.** The protocol template asks what else moved. More than once the honest
  answer was "size and training length, together", and the conclusion says the gain
  can't be attributed to either alone.

---

## Why bother, with an agent doing the work?

Because the agent makes experiments cheap, and cheap experiments make it easy to fool
yourself. An agent will run the comparison, write up the winner and give a fluent
reason for it. Without a prior commitment, you can't tell a finding from a
rationalisation, and neither can the agent.

Pre-registration turns the agent's speed into something you can trust. It's also
the part of this work I've enjoyed most. The record is public, so peers can check the
predictions against the results, and I can point a future agent at the whole history
and say "start from here".

---

*See also:
[A speech recogniser with no FFT](/a-speech-recogniser-with-no-fft/),
[the experiments repository](https://github.com/rolandnsharp/experiments).*

*Co-authored with [Claude](https://claude.ai/).*
