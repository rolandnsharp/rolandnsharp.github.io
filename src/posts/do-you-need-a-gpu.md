---
title: "Do You Need a GPU?"
date: 2026-02-24
layout: "base.njk"
tags: post
order: 10
---

# Do You Need a GPU?

Everyone says you need a GPU to train a language model . For supervised
fine-tuning , this is true . Three hundred thousand gradient steps over
a million tokens , each building a full computation graph in memory —
that needs parallel hardware . We plan to rent one for a few hours . That
part makes sense .

But what about what comes after ? The part where the model learns to be
good . Reinforcement learning from human feedback . We think that part
might not need a GPU at all . We think it might need a chair , a
keyboard , and patience .

This is an experiment . We have not proven it yet . But the reasoning
holds up , and we are going to try .

---

## The Hypothesis

Interactive reinforcement learning runs at the speed of the human , not
the speed of the machine .

The loop would be simple . The human types a question . The model
generates five responses . The human reads them , picks the best one or
types something better . The model does one gradient step on the chosen
response . Then the human thinks about the next question .

That gradient step should take a fraction of a second for a 10 million
parameter model . A few seconds for a billion . Maybe thirty seconds for
five billion . The human takes longer than that just to read the five
responses .

If this is right , the machine is always waiting for the human . The
human is always the bottleneck . The hardware requirements for training
collapse to the hardware requirements for inference plus one backward
pass . And inference runs on a CPU .

---

## The Math

Training a model requires storing three things per parameter :

- The weight itself ( 4 bytes )
- The gradient ( 4 bytes )
- The Adam optimizer state ( 16 bytes — two running averages at 8 bytes
  each )

That is 24 bytes per parameter . So :

| Model Size | Training Memory | Hardware |
|-----------|----------------|----------|
| 10M params | 240 MB | Any laptop |
| 100M params | 2.4 GB | Any desktop |
| 500M params | 12 GB | 16 GB RAM |
| 1B params | 24 GB | 32 GB RAM |
| 2B params | 48 GB | 64 GB RAM |
| 5B params | 120 GB | 64 GB RAM + SSD swap |

An RTX 4090 has 24 GB of VRAM and costs $1 ,600 . Sixty-four gigabytes
of DDR4 RAM costs $70 . The RAM holds more parameters for twenty-three
times less money .

The question is whether the speed difference matters . For batch training
it obviously does . For interactive training , we think it might not .

---

## The Swap Trick

Your motherboard has a maximum RAM capacity . Ours is 64 GB . But a one
terabyte SSD has no such limit . The operating system can use disk space
as virtual memory — swap . The program does not know the difference . It
allocates a float array . The OS decides which pages live in RAM and
which live on disk .

For batch training , this would be catastrophic . Thousands of gradient
steps per second , each touching every parameter . The disk would be a
wall .

For interactive training , one gradient step every thirty to sixty
seconds . Even if swapping makes the step ten times slower — three
seconds instead of a third of a second — we suspect the human would not
notice . They would still be reading .

```bash
sudo fallocate -l 200G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

Four commands . Two hundred gigabytes of virtual memory . No code
changes . If this works as we expect , a 64 GB machine with SSD swap
could train a model with three to five billion parameters interactively .
One gradient step at a time . One conversation at a time .

We have not tested this at that scale yet . We will .

---

## The Plan

Here is how we intend to train a large language model without owning a
GPU :

**Step 1 : Supervised fine-tuning on a rented GPU .**

Upload the training data . Upload the code . Rent an A100 for a few
hours . Run the three hundred thousand gradient steps . Download the
checkpoint . This should cost single-digit dollars .

**Step 2 : Buy RAM .**

Check the motherboard manual . Buy the maximum it supports . For us that
is 64 GB of DDR4 for about seventy dollars .

**Step 3 : Set up swap .**

If we have an SSD with spare capacity , create a swap file . Free .

**Step 4 : Interactive reinforcement learning .**

Load the checkpoint . Start the training interface . Ask a question .
Read five responses . Pick the best one or type a better answer . The
model trains on the choice . One gradient step . Ask another question .

If this works , every interaction makes the model better . The
conversation history accumulates in a context file so the model
remembers across sessions . The trained weights save to a checkpoint
file so progress persists .

No cloud subscription . No GPU rental . No ongoing cost . The model
lives on the machine and learns from every conversation .

---

## Why Nobody Does This

The machine learning community thinks about training in batch . Millions
of examples . Thousands of gradient steps per second . Parallelism .
Throughput . Utilisation . In that world , a CPU is a joke and a swap
file is a catastrophe .

But interactive reinforcement learning is not batch training . It is one
step at a time . The throughput is bounded by how fast a person can
think , not how fast a chip can multiply . In that world , a CPU might be
plenty and a swap file might be free memory .

The reason nobody does this is probably not technical . It is cultural .
The field optimises for machine speed . Nobody optimised for human speed
because nobody was building systems where the human sits in the training
loop typing responses on a keyboard .

We are building that system . Our chatbot Mr . Classic is a 10 million
parameter transformer trained from scratch in OCaml . No PyTorch . No
GPU . No frameworks . When his training finishes , we will sit with him
and teach him , one conversation at a time . He will generate five
responses to every question . We will pick the best or type a better
one . He should learn .

If we scale him up — rent a GPU for the initial training , bring the
checkpoint home , max out the RAM — he could be a billion parameters or
more . Still learning from conversation . Still running on an Intel i5
with no graphics card . That is the experiment .

---

## What We Expect

We do not know how fast interactive RL will teach a small model . Nobody
has tested this . But we have expectations , and we want to write them
down before the experiment so we cannot fool ourselves after .

**Selection should work relatively fast .** When the human picks one of
five generated responses , the model already produced those tokens . The
capability is in the weights . The gradient step reinforces an existing
path , it does not create a new one . This is Expert Iteration , and it
is well-studied . We expect a few dozen selections on similar prompts to
noticeably shift the distribution . The model should start preferring the
kind of responses the human keeps choosing .

**Typing new responses will be slower .** Teaching the model something it
has never said — a name , a fact , a style of speaking — means creating
a new pattern in the weights . One gradient step is a tiny nudge . The
loss might drop from 3.5 to 3.48 on that specific sequence . We expect
it will take ten to fifty repetitions of the same kind of response
before the model reliably produces it unprompted .

**The context file will carry us while the weights catch up .** Even
before the model learns something in its parameters , it sees the full
conversation history on every prompt . If we taught it our name twenty
turns ago , that turn is in the context file . The model can use
in-context learning to stay consistent while the gradient steps slowly
burn the pattern into the weights . The context is a crutch . The
weights are the real learning .

**What could go wrong :**

Catastrophic forgetting . Every gradient step that teaches the model
something new slightly overwrites something old . Ten million parameters
is a small bucket . If we teach it a thousand new things , some old
capabilities will degrade . We will watch for this .

The steps might be too small to matter . At a learning rate of 1e-5 ,
each step is safe but tiny . We might need to increase it to 1e-4 or
even 1e-3 to see real change , at the risk of instability .

The model might not have enough capacity . Ten million parameters can
hold general conversation ability or specific taught knowledge , but
maybe not both . This is the strongest argument for scaling up — not
because bigger is better in the abstract , but because the model needs
room to hold what we teach it without forgetting what it already knows .

Fifty interactions will tell us more than any theory . We will sit down
with Mr . Classic when his training finishes and find out .

---

## The Apprentice and the Library

There are two ways to have a capable language model on your machine .

Download a frozen 30 billion parameter model that someone else trained .
It knows everything about everything and nothing about you . It cannot
learn . It cannot improve . It is a library — vast , static , useful ,
but not yours .

Or train your own model . Smaller , but it learns from every interaction .
It adapts to your preferences , your domain , your corrections . It
starts knowing less but it could get better every day . It is an
apprentice .

We chose the apprentice . Sixty-four gigabytes of RAM and a swap file .
A rented GPU for the afternoon . Interactive reinforcement learning for
as long as we want to teach .

The GPU is for the beginning . Everything after — if this works — is
just a human and a keyboard .

---

*See also :
[Mr . Classic](/posts/mr-classic-teaching-a-10m-parameter-chatbot-with-reinforcement-learning/) ,
[Forgetting is a Feature](/posts/forgetting-is-a-feature/) ,
[Reinforcement Learning](/posts/reinforcement-learning-from-suttons-foundations-to-vidya/) .*

*Co-authored with [Claude Code](https://claude.ai/).*
