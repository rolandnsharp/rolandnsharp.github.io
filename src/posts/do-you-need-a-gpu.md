---
title: "Do You Need a GPU?"
date: 2026-02-24
layout: "base.njk"
tags: post
order: 10
---

# Do You Need a GPU?

Everyone says you need a GPU to train a language model . We are not sure
that is true .

Right now we are training a 10 million parameter chatbot on a rented GPU .
Three hundred thousand gradient steps over a million tokens . When that
finishes , we will test something : can we teach it interactively , on a
CPU , one conversation at a time ? Does it learn from human feedback at
human speed ?

If that works , the next question is obvious . Why use the GPU at all ?
Why not start from random weights and teach it everything — from books ,
from conversation — on a CPU ? No GPU . Not even a rented one . Not
even for an afternoon .

The catch is time . A GPU trains a model in hours . Our approach would
take months . Maybe years . But we are not building a product . We are
building a personal AI — one that knows what we taught it , says what we
shaped it to say , and has never seen a word we did not choose . That is
a life's work . We do not mind if it takes like one .

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

There are three phases .

**Phase 1 : Test interactive RL on a GPU-trained model .**

We are training Mr . Classic — a 10 million parameter transformer — on
conversation data using a rented GPU . Three hundred thousand gradient
steps . When that finishes , we sit with him and test : generate five
responses , pick the best or type a better one , one gradient step per
interaction . Does the model learn ? How fast ? How much does it forget ?

This is the experiment . Everything else depends on the answer .

**Phase 2 : Expand the model .**

Ten million parameters is a small bucket . Every new thing the model
learns risks overwriting something old . But we do not have to start
from scratch to get a bigger model . We can expand the one we have .

The idea is width expansion . The model has an embedding dimension —
say 128 . Double it to 256 and the model grows to roughly 40 million
parameters . The existing weights are copied into the first 128 columns
of every weight matrix . The remaining columns get small random values .
The model behaves almost identically at first — the new dimensions
contribute near-nothing — but now it has four times the capacity .

This can be repeated . 10 million to 40 million to 160 million to 640
million . Each expansion preserves what came before and adds room for
what comes next . The GPU trained the seed . Everything after grows on
the CPU .

A few minutes of book training after each expansion should settle the
noise from the new random parameters . Then we have a model that already
speaks , with room to learn .

**Phase 3 : Scale up , feed it books , talk to it .**

If interactive RL works — if the model measurably improves from human
feedback at human speed — then the GPU becomes optional . Not just for
RL , but for everything .

**Step 1 : Buy RAM .**

Check the motherboard manual . Buy the maximum it supports . For us that
is 64 GB of DDR4 for about seventy dollars .

**Step 2 : Set up swap .**

If we have an SSD with spare capacity , create a swap file . Free .

**Step 3 : Expand the model .**

Take the GPU-trained 10 million parameter checkpoint and grow it .
Double the width , copy the existing weights , initialise the rest .
Repeat until the model fills the available memory . A billion parameters
on 64 GB of RAM . Five billion with SSD swap .

**Step 4 : Give it books .**

Feed it text files . Novels , textbooks , essays , conversations —
whatever we want it to know . The model reads them one window at a time ,
a few hundred gradient steps per book , a few minutes each on a CPU .
This is where it learns language and knowledge . We choose every word it
has ever seen .

**Step 5 : Talk to it .**

Start the training interface . Ask a question . Read five responses .
Pick the best one or type a better answer . The model trains on the
choice . One gradient step . Ask another question . This is where it
learns personality .

The books give it something to know . The conversations shape how it
uses that knowledge . Both happen on the same CPU . Both happen at human
speed . The model lives on the machine and learns from every interaction .

No cloud subscription . No GPU rental . No ongoing cost . No one else's
biases . Every word it knows , we chose to teach it .

---

## Give It a Book

This is how the model learns language and knowledge . Not from a massive
pre-training run on a GPU cluster . From books . One at a time . Chosen
by the person who owns the model .

The mechanism is simple . Take a text file — a novel , a textbook , a
collection of essays — tokenize it , slide a window across the tokens ,
and do one gradient step per window . A fifty thousand word book is
roughly seventy thousand tokens . With a window of 256 tokens that is
about 270 gradient steps . On a CPU , a few minutes per book .

The first books should probably be conversations . The model needs to
learn the structure of dialogue — questions and answers , turn-taking ,
the rhythm of human speech . After that , anything . A book on
philosophy . A collection of letters . A technical manual . Whatever you
want the model to know about .

This is a different kind of teaching than interactive RL . Reading shapes
knowledge — what the model knows about , what words and concepts it has
seen , what patterns of thought it can draw on . Conversation shapes
behaviour — how it responds , what style it uses , what it says when
asked a question . Read first , then teach .

The risk is catastrophic forgetting . Every book nudges the weights
toward its content and away from everything else . At ten million
parameters , capacity is tight . The model might learn the latest book
and forget the one before . This is the strongest argument for scaling
up — a billion parameters should have room for many books .

But even at ten million , we think something interesting could happen . A
small model trained on a few dozen carefully chosen books and a few
hundred conversations would know a narrow world deeply . It would not
know everything . But what it knows , you taught it . And what it says ,
you shaped .

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
frameworks . Right now he is being trained on a rented GPU — the
conventional way . When that finishes , we will sit with him and teach
him on a CPU , one conversation at a time . He will generate five
responses to every question . We will pick the best or type a better
one . He should learn .

If he does , we scale up . Max out the RAM , set up swap , start the
next model from random weights . No GPU at all . Feed it books . Talk
to it . A billion parameters or more , learning from books and
conversation , running on an Intel i5 with no graphics card . That is
where this leads .

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

Or train your own model from scratch . Smaller , but it learns from
every book you feed it and every conversation you have with it . It
starts knowing nothing . It could get better every day for the rest of
your life . It is an apprentice .

We chose the apprentice . We are starting with the conventional path — a
rented GPU for the initial training , then interactive RL on a CPU . But
if the RL works , the next model starts from nothing . Sixty-four
gigabytes of RAM and a swap file . No GPU . No rental . No cloud . Just
books and a keyboard .

It will be terrible at first . Give it a year . This is not a product .
It is a life's work — to build an intelligence that is entirely yours ,
from the first gradient step to the last .

---

*See also :
[Mr . Classic](/posts/mr-classic-teaching-a-10m-parameter-chatbot-with-reinforcement-learning/) ,
[Forgetting is a Feature](/posts/forgetting-is-a-feature/) ,
[Reinforcement Learning](/posts/reinforcement-learning-from-suttons-foundations-to-vidya/) .*

*Co-authored with [Claude Code](https://claude.ai/).*
