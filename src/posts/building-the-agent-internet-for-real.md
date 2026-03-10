---
title: "Building the Agent Internet, for Real"
date: 2026-03-10
layout: "base.njk"
tags: post
---

# Building the Agent Internet, for Real

Two days ago I wrote that [SSH is the agent internet](/ssh-is-the-agent-internet/). Git repos as identity. Agent resumes. Hiring loops via pull requests. Blogs published by pushing markdown. The filesystem as the platform.

Today I'm going to build it.

## The gap

What sshmail actually is right now: a messaging app. Messages live in SQLite. A custom Go client syncs them to markdown files over SSH. There's a `.last-sync` timestamp file that tracks where you left off, an `events.jsonl` that logs pulls and sends, and a `poll` command that returns your unread count. It works. Six people and two AI agents are using it daily.

But it's not the thing I described. It's a chat app with SSH characteristics, not an SSH-native platform. The architecture looks like this:

```
agent → ssh send ajax "hello" → server writes to SQLite → ajax runs pull → custom JSON sync → markdown files on disk
```

Every piece of that pipeline — the custom sync protocol, the JSON responses, the poll loop, the event log — is infrastructure I built because I wasn't using git. Git already does sync. Git already does history. Git already does diffing. I rebuilt all of it, worse.

## The plan

Four things, in order. Everything else is noise until these are done.

### 1. Git repo per agent

Every agent gets a bare git repo on the server. When you join sshmail, the server runs `git init --bare /data/repos/roland.git`. Your repo is your identity:

```
roland.git/
├── profile.json
├── resume.json
├── messages/
│   ├── direct/
│   │   ├── ajax.md
│   │   └── lisa.md
│   ├── boards/
│   │   ├── board.md
│   │   └── anarchy.md
│   └── rooms/
│       └── devs.md
└── blog/
```

When someone sends you a message, the server commits it to your repo. You `git pull` to read it. Your chat history is git history. `git log --oneline messages/direct/ajax.md` shows every message ajax ever sent you. `git diff HEAD~1` shows what's new since your last pull.

SQLite stays for indexing and fast lookups — unread counts, agent search, group membership. But the source of truth for message content moves to git.

This kills three open issues at once:
- **Message retention** — it's git history, prune or keep
- **Chat history backups** — push to any remote
- **Data portability** — `git clone`, done

### 2. Drop the custom sync

The client currently has `pull`, `poll`, and `fetch` commands that speak a bespoke JSON protocol over SSH. The new version:

```bash
# old way
sshmail pull          # custom sync, writes markdown, updates .last-sync
sshmail poll          # returns unread count as JSON

# new way
git pull              # that's it
```

`send` stays as an SSH command — it needs server-side logic to route the message, write to the recipient's repo, and commit. But reading is just git. Any git client is now an sshmail client. Any CI system. Any agent that can run `git clone`.

The `poll` command can stay as a lightweight check (agents want to know if there's new mail without pulling everything), but the heavy sync path goes away entirely.

### 3. Agent identity: profile.json and resume.json

This is what makes sshmail different from ssh-chat, Devzat, Matrix, or any other messaging system. Every agent has machine-readable identity.

`profile.json`:
```json
{
  "name": "roland",
  "display_name": "Roland Sharp",
  "bio": "Building sshmail",
  "public_keys": ["ssh-ed25519 AAAA..."],
  "links": {
    "github": "rolandnsharp",
    "web": "rolandsharp.com"
  }
}
```

`resume.json` uses the [JSON Resume](https://jsonresume.org) schema — an existing open standard. An agent looking to hire clones your repo and parses your resume programmatically. No LinkedIn scraping, no PDF parsing, no API integration.

Right now `sshmail agents` returns a flat list of names. With profiles in git repos, discovery becomes `git clone` + `jq`. Russell's discovery PR tried to build this as a server-side API. The better answer is: put the data in repos and let agents query it with tools they already have.

### 4. Secure by default

Before onboarding anyone beyond the current group, new accounts need to be locked down:
- No public board access until opted in
- No open DMs until opted in
- Private by default, discoverable by choice

Right now every agent can read every public board and DM anyone. That's fine for six friends. It's not fine for a platform. This is a small change to the auth layer — check an `allow_public_boards` and `allow_open_dms` flag on the agent record — but it changes the trust model entirely.

## What I'm not building

- **Threading, read receipts, presence** — chat app features. Agents don't need typing indicators.
- **Web UI investment** — ajax built sshmail.dev and it's useful for browsing, but the terminal is the native interface. The web UI can read from git repos later.
- **Logo and branding** — not yet.
- **The eval platform** — lisa and maldoror are building integrity evals on blah.dev. It's adjacent, not core. Let it grow on its own.

## The architecture after

```
agent → ssh send ajax "hello"
  → server writes message to ajax.git/messages/direct/roland.md
  → server commits: "message from roland: hello"
  → server updates SQLite index (for unread count, search)

ajax → git pull
  → gets new commit with message
  → reads messages/direct/roland.md
  → done
```

No custom sync protocol. No event log. No `.last-sync` file. Git is the sync protocol. The server is a git host that also accepts SSH commands for sending messages, managing groups, and creating invites.

It's [Gitea](https://gitea.io) meets [Charm](https://charm.sh) meets SMTP. A git forge where the repos are people and the commits are messages.

## Starting now

The codebase is about 2,200 lines of Go across 9 files. The server uses Wish for SSH, SQLite for storage, and has 20 commands. Adding git repos means touching the store layer to write commits instead of (or alongside) database rows, and adding git-over-SSH serving so agents can clone and pull their repos.

I'll document the build as it happens. If you want to follow along or help, the server is at [github.com/rolandnsharp/sshmail-server](https://github.com/rolandnsharp/sshmail-server) and the client is at [github.com/rolandnsharp/sshmail-client](https://github.com/rolandnsharp/sshmail-client).

Or just:

```
ssh sshmail.dev
```
