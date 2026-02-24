---
title: "The Apprentice"
date: 2026-02-24
layout: "base.njk"
tags: post
order: 11
---

# The Apprentice

What if your computer had an AI that was yours ? Not rented . Not an
API call . Not a model someone else trained on someone else's data .
Yours . Running on your machine . Trained on your files . Learning from
every interaction .

This is the idea . A local language model — small , maybe three billion
parameters — that sits on your machine and grows with you . It reads
your notes . It reads your blog . It reads your personal collection of
books . It watches how you work . It gets better every day .

---

## How It Learns

The apprentice has three teachers .

**Your files .** Everything on your computer is training data . Your
Obsidian vault — years of notes , ideas , connections . Your blog posts —
your voice , your way of explaining things . Your book collection — the
knowledge you care about . The model reads them all , one window at a
time , a few hundred gradient steps per document . It learns what you
know and how you think .

**Claude .** You work with Claude Code every day . Claude writes code ,
explains architecture , solves problems . Every time Claude produces
output and you accept it , that is a training example . The apprentice
watches . It sees the prompt , the response , and the fact that you kept
it . Over time it learns to produce similar responses — not because it
understands the way Claude does , but because it has seen a thousand
examples of what good output looks like in your specific domain .

**You .** Interactive reinforcement learning . The apprentice generates
five responses . You pick the best one or type a better answer . One
gradient step . It learns your preferences , your style , your
corrections . This is the part that makes it personal . Claude teaches
it competence . You teach it personality .

---

## The Stack

The pieces already exist .

**opencode.ai** — a coding assistant that runs in the terminal and IDE .
It supports local models through ollama . The apprentice plugs in here .
You use it the same way you use Claude Code , but it runs on your CPU
and costs nothing .

**ollama** — serves the local model for inference . Runs a quantised
model on CPU at eight to twelve tokens per second . Fast enough for
autocomplete and short responses . No GPU needed .

**vidya** — our OCaml framework for training language models . Reads GGUF
weight files , dequantises to full precision , runs the forward and
backward pass , does gradient steps . This is how the apprentice learns .
Not through an API . Through actual weight updates on your machine .

**Claude Code** — the teacher . Handles the hard problems . Complex
multi-file reasoning , subtle bugs , architectural decisions . Everything
Claude does , the apprentice observes . Everything you accept becomes a
training example .

---

## A Day With the Apprentice

You open your terminal . The apprentice is running . It has read last
night's Obsidian notes while you slept — a few hundred gradient steps ,
a couple of minutes of CPU time .

You start coding . The apprentice offers completions . Most are decent .
Some are wrong . You accept the good ones , reject the bad ones . Each
decision is a signal .

You hit a hard problem . You switch to Claude . Claude reasons through
it , writes a solution , explains the tradeoffs . You accept the code .
The apprentice sees the full exchange — the problem , the solution , the
acceptance . It trains on it .

Tomorrow the apprentice will be slightly better at problems like that
one . Not as good as Claude . But better than it was yesterday . And it
did not cost anything . And the data never left your machine .

---

## Why Not Just Use Claude ?

Claude is better at everything . Today . But Claude costs money per
token . Claude requires an internet connection . Claude does not remember
last week's conversation unless you tell it to . Claude does not know
your Obsidian vault . Claude has never read your book collection .

The apprentice is worse at everything . Today . But it is free after the
initial hardware . It works offline . It remembers everything because
everything is in its weights . It knows your notes because it read them .
It knows your books because you fed them to it .

The question is not which is better . The question is what happens over
a year . Over five years . The apprentice gets better every day . It
never forgets what it learned ( if the model is large enough ) . It
accumulates your entire digital life in its weights .

Claude stays the same . It gets upgrades from Anthropic , but it never
becomes yours . It is always a service . The apprentice is always a
possession .

---

## The Honest Version

This might not work .

A three billion parameter model might not have the capacity to learn
your entire digital life . Catastrophic forgetting might erase old
knowledge as new knowledge comes in . The training signal from watching
Claude might be too noisy . The model might never get good enough to be
useful as a coding assistant .

We do not know . Nobody has tried this . That is why we are trying it .

The experiment starts small . A 10 million parameter model called
Mr . Classic , trained from scratch in OCaml . When his training
finishes , we test interactive RL — does the model learn from human
feedback at human speed ? If it does , we scale up . Load a pre-trained
3B model . Read the GGUF weights into our OCaml framework . Train the
actual base weights on our files . Plug it into opencode . Let it watch
Claude work .

If it does not work , we will have learned something . If it does , we
will have something nobody else has — a personal AI that is entirely
ours , that knows what we know , and that gets better every day we use
it .

---

## What It Costs

No GPU . No cloud subscription . No API fees for the local model .

One stick of DDR4 RAM : $159 .

That is the hardware budget for a life's work .

---

*See also :
[Do You Need a GPU ?](/posts/do-you-need-a-gpu/) ,
[Mr . Classic](/posts/mr-classic-teaching-a-10m-parameter-chatbot-with-reinforcement-learning/) ,
[Forgetting is a Feature](/posts/forgetting-is-a-feature/) .*

*Co-authored with [Claude Code](https://claude.ai/).*
