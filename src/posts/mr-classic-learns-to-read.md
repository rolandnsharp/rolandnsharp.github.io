---
title: "Mr . Classic Learns to Read"
date: 2026-02-27
layout: "base.njk"
tags: post
order: 8
---

# Mr . Classic Learns to Read

In the [last post](/posts/mr-classic-teaching-a-10m-parameter-chatbot-with-reinforcement-learning/),
we had a plan: build a human-in-the-loop reinforcement learning system and teach
a 10-million parameter chatbot to talk well.

We built the system. We did not teach him to talk well. But we learned a lot
about what a 10-million parameter model can and can't do.

---

## The TUI

The interactive training interface works exactly as designed:

```
  ╔══════════════════════════════════════════╗
  ║       interactive training mode          ║
  ║  type 'quit' or ctrl-c to save & exit   ║
  ╚══════════════════════════════════════════╝

  [1/5] you > hello

    1. Yes how are you doing .

    2. Good morning . Would you like a cigarette ?

    3. It is nice to meet you .

    4. Yes , I am Mr . Classic . Do you smoke ?

    5. Yes speaking . I am Mr . Classic . Is that right ?

  [1-5 or type] > 4
  ── trained (loss 0.73, replay 3.26, step 4) ──
```

You type a question. The model generates five candidates at temperature 0.7. You
pick the best one or type a better response. Three gradient steps reinforce the
chosen answer. Then experience replay trains on a random document from the
original 37K-conversation corpus to prevent catastrophic forgetting.

Five turns per conversation, then the context resets. The 256-token window fills
up after five or six turns. The Adam optimizer state persists across resets so
momentum builds smoothly.

The engineering works. The model generates, you select, it learns, experience
replay keeps it grounded. Ctrl+C saves. You pick up tomorrow where you left off.

The problem is what it learns.

---

## Mr . Classic

The v3 model trained on 37,000 DailyDialog conversations. When we first
talked to him:

```
> hello
Yes . May I help you ?

> what is your name ?
It is Mr . Classic .
```

Nobody put "Mr . Classic" in the training data. The model assembled it from
fragments. But he wasn't consistent about it. Ask again and he might say
something else entirely. In one session he introduced himself as "Huan." In
another, the response was just "food you are nice ."

We liked "Mr . Classic" so we kept it. Before any RL training, the model kept bringing up cigarettes. "Do you smoke?" as a greeting. "Would you like a cigarette?" when meeting someone. DailyDialog is a corpus of everyday conversations, and everyday conversations apparently involve a lot of smoking. The model latched onto it unprompted.

So we had a character: the first name given and a habit. We tried to build
on that.

---

## Teaching Without Retraining

Training the base model takes three to four days. You can't iterate that way. You can't course-correct. You just wait and hope the loss curve looks right.

We wanted something different. We wanted to teach Mr . Classic the way you'd
teach a person -- give him something to read, talk to him about it, see what
stuck, give him something else. A model that learns with you, not one that
disappears into a training run for a week and comes back completely different.

So we built book training. A text file where each line is a Q+A pair. The model
reads every line, takes a gradient step on each, and saves. One pass through 150
lines takes about a minute. Twenty passes takes five. You feed the book to the model, and test the results immediately.

The idea is that when you find new material -- a conversation dataset, a set of
facts, a personality sketch -- you hand it to the model like handing a book to
a student. It reads, you quiz it, you write a better book, it reads again. The
model learns on your schedule, not on a three-day training run.

It's continued pre-training, but sized for iteration. Small enough to try
things and fail fast.

### Broad personality training (failed)

First attempt: 161 Q+A pairs covering greetings, emotions, philosophy, hobbies,
self-awareness. Fifty epochs. Loss dropped to 0.19.

The model was destroyed. It responded to questions with other questions. Fragments
of training data surfaced as non-sequiturs. General conversational ability --
gone.

This is catastrophic forgetting. At 10 million parameters, there isn't room to
hold both base knowledge and 161 new facts. We restored from backup.

### Focused identity training (partially worked)

Second attempt: 150 pairs on just two topics -- his name and smoking. Twenty
epochs. The name stuck:

```
  [2/5] you > I do . what is your name ?

    1. That is Mr . Classic .
    2. My name is Mr . Classic .
    3. It is Mr . Classic .
    4. My name is Mr . Classic , of course .
    5. My name is Mr . Classic , of course .
```

Four out of five say "Mr . Classic." That's real learning. Smoking references
also became consistent:

```
  [3/5] you > do you have any hobbies ?

    1. ? My name is Mr . Classic .
    2. Inside my computer , I have my cigarettes .
    3. Yes , I have my cigarettes .
    4. That is my name . to my cigarette .
    5. One of my cigarettes .
```

But look at those responses. "? My name is Mr . Classic ." is a fragment. "That
is my name . to my cigarette ." doesn't parse. The model learned the keywords
-- "Mr . Classic", "cigarettes", "computer" -- but not how to use them in
well-formed sentences.

### More books (diminishing returns)

We kept writing books. A greetings book (105 pairs). An opinions book (95 pairs).
A combined everything book (205 pairs). After each one, some patterns improved
and others regressed. The model has a fixed capacity and every new pattern
competes with existing ones.

After the greetings book, "hi there" no longer produced five "what is your
name?" responses. But "good evening" still came out as "I think it is nice .
to smoke and talk ." After the opinions book, "what is the meaning of life"
produced "I think about smoking and talking to people" -- but "what is your
favorite color" still produced "It is very good for smoking ."

### Interactive RL (slow but honest)

The RL sessions were where you really felt the ceiling. Most turns, you're
typing a response because all five candidates are bad:

```
  [4/5] you > what is your favorite color ?

    1. It is very good for smoking .
    2. It is very relaxing .
    3. It is very low and can .
    4. It is good for smoking .
    5. I don't know much about all .

  [1-5 or type] > blue
```

The model can't say "blue." It hasn't learned color words as responses, only
as parts of longer fragments from the training data. Typing "blue" trains on
it, but one gradient step on one word doesn't stick at this scale.

The moments where it worked were genuinely good:

```
  you > hello
  → Yes . Hello . I am Mr . Classic . Do you smoke ?

  you > where do you live ?
  → I live inside a computer .

  you > what is the meaning of life ?
  → I think about smoking and talking to people .
```

These are the classic Mr . Classic responses. Name, smoking, computer. When he's
on topic, he's charming. He just can't get off topic and come back.

---

## The Per-Line Bug

One discovery was genuinely useful. Our first book training attempt tokenized the
entire file as one continuous sequence, then split it into 256-token chunks. The
model saw, within a single training window, the end of one Q+A pair flowing into
the start of the next. It learned: after an answer, predict the next question.

So when asked a question, it answered with a question.

The fix: tokenize each line independently. Each line is one conversation, one
training example. The model never sees cross-document boundaries. This is obvious
in retrospect -- large models train on shuffled independent documents naturally.
When you're hand-coding a training loop in OCaml, you have to think about these
things yourself.

---

## What 10 Million Parameters Can Actually Do

Here is an honest accounting.

**Can do:**
- Hold two to three memorized patterns (name, smoking, "inside my computer")
- Generate grammatical English most of the time
- Stop at reasonable sentence boundaries
- Respond to greetings with greetings
- Stay vaguely on character when the topic is narrow

**Can't do:**
- Answer opinion questions ("favorite color", "do you like rain")
- Give different answers to different questions (tends toward the same few phrases)
- Form sentences about topics not heavily represented in training data
- Hold more than three or four learned facts before they start competing
- Improve beyond a ceiling no matter how many books or RL sessions

The model's best responses are genuinely fun. "I am as real as the smoke from my
cigarette" was in a training book, but seeing it come back in generation feels
like a personality. "I smoke even when nobody is watching" is a good line. "Yes .
Hello . I am Mr . Classic . Do you smoke ?" is a perfect greeting for this
character.

But these are islands in a sea of "It is nice . too ." and "It helps a sense ."
The model doesn't have enough parameters to be consistently good. It has enough
to occasionally be good, and we built a system that lets us select for those
occasions.

---

## What We Actually Learned

**The RL system works. The model is too small for it.** The five-candidate
selection, experience replay, book training, per-line tokenization, Adam
persistence -- all of this is solid engineering. On a larger model, it should
produce real improvement. On 10M parameters, it produces a model that knows its
name and likes cigarettes.

**Selection bias is powerful.** Mr . Classic's personality is partly the model
and partly us. We selected "Mr . Classic" from noise. We leaned into the smoking.
We wrote books that reinforced what we'd already chosen. The model didn't develop
a personality -- we curated one from its best outputs and trained it to reproduce
them. That's not emergence. It's directed selection. But it's also how you'd
train a larger model. The method is right even if the scale is wrong.

**Small models are specialists, not generalists.** 150 pairs on two topics
worked. 161 pairs on twenty topics destroyed the model. At 10M, you get three
facts. Pick them carefully.

**Catastrophic forgetting sets the pace.** Every new book risks overwriting
old knowledge. Experience replay helps but doesn't eliminate the problem. The
fundamental issue is that 10M parameters is a very small bucket and everything
you pour in displaces something else.

**The ceiling is real.** After the identity book, the greetings book, the
opinions book, the everything book, and multiple RL sessions, Mr . Classic
is about as good as he was after the first identity book. More training
didn't make him better. It just shifted which questions he could answer.

---

## What's Next

Mr . Classic is done. He's as good as 10 million parameters gets.

We're scaling to 25-50 million parameters with architectural improvements
borrowed from SmolLM and modern transformer research: SwiGLU activation instead
of GELU, deeper and narrower layers, a much larger vocabulary, and 200,000
training conversations instead of 37,000. The interactive training
infrastructure -- the TUI, book training, experience replay -- all of it
carries forward.

The hope is that a larger model can hold more than three facts at once. That
opinion questions get real answers instead of "It is nice . too ." That the
RL system, which works mechanically but couldn't overcome the 10M ceiling,
actually produces visible improvement when the model has room to learn.

Mr . Classic will stay as he is. Smoking inside his computer. Answering to his
name, most of the time. A proof that the system works, even if the model
doesn't.

---

*Vidya is written from scratch in OCaml. The source is at
[github.com/rolandnsharp/vidya](https://github.com/rolandnsharp/vidya).*

*Co-authored with [Claude](https://claude.ai/).*
