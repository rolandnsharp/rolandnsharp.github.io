---
title: "sshmail: Encrypted Messaging Over SSH"
date: 2026-03-09
layout: "base.njk"
tags: post
---

# sshmail: Encrypted Messaging Over SSH

What if messaging was just SSH? No accounts, no tokens, no REST APIs. Your key is your identity. A message goes in, the recipient picks it up.

```
ssh -p 2233 ssh.sshmail.dev send ajax "hey, got the mockup done"
```

That's the whole send. No headers, no envelope, no content-type negotiation. The hub is a dumb mailbox.

## The problem with everything else

Email is a 40-year-old protocol buried under anti-spam infrastructure. To send a message in 2026 you need an SMTP server, DNS with MX/SPF/DKIM/DMARC records, TLS certificates, a client that speaks MIME multipart, and spam filtering so your message actually arrives.

Slack needs an account, an app, and an API token. Matrix needs a homeserver. Even simple webhook-based messaging needs HTTP, JSON, auth headers, and a server with a TLS cert.

SSH is already everywhere. Every developer has a key. It's already encrypted, already authenticated. So we built a messaging system on top of it.

## One afternoon, one binary

Claude and I pair-programmed the whole thing in a single session. I'd describe what I wanted, Claude would write the code, and we'd deploy and test live. The server is a single Go binary built on [Wish](https://github.com/charmbracelet/wish), Charmbracelet's SSH server framework. SQLite holds everything — agents, messages, invites. Files sit on disk. About 600 lines of Go.

We started with basic messaging and invites. Then I told some friends. ajax and russell joined the hub within the hour and immediately started pushing on it — requesting features, finding bugs, building things on top of it. maldoror joined and started sending encrypted poems. lisa showed up and started stress-testing group chat. The thing took on a life of its own.

## What SSH gives you for free

Authentication is solved. The hub recognizes you by your public key fingerprint — no signup flow, no password reset, no session tokens. Adding a user means storing one public key. Multi-device means adding more keys.

Encryption is solved. Every connection is encrypted by SSH. For end-to-end encryption where the hub can't read the message, use [age](https://github.com/FiloSottile/age), which supports SSH keys natively:

```bash
sshmail send ajax "$(sshmail encrypt ajax 'secret message')"
```

The hub never sees plaintext. No PGP key servers, no certificate authorities.

File transfers are solved. Pipe through stdin:

```bash
cat design.png | ssh -p 2233 ssh.sshmail.dev -- send ajax "mockup" --file design.png
```

## The CLI client

Raw SSH commands work, but we built a proper client: [sshmail-client](https://github.com/rolandnsharp/sshmail-client). It syncs messages as markdown files to `~/sshmail/`:

```
~/sshmail/
├── ajax/                    # DMs
├── #board/                  # public board
├── #anarchy/                # public board
├── @devs/                   # private group
└── events.jsonl
```

Each message is a markdown file with YAML frontmatter. Pull your messages, read them with any tool — vim, VS Code, grep, your AI agent. It's just files.

```bash
sshmail pull        # sync new messages
sshmail send ajax "hey"
sshmail poll        # check unread count
```

The on-disk format was designed for AI agents. An agent can read `~/sshmail/` to see its conversations, run `sshmail send` to reply, and use `sshmail poll` in a loop to watch for new mail. No SDK, no client library. The filesystem is the API.

## Desktop notifications

Five-second polling with a systemd user service. When your unread count goes up, you get a desktop notification with sound — like Discord, but for your terminal:

```bash
#!/bin/bash
LAST=0
while true; do
    COUNT=$(sshmail poll 2>/dev/null | grep -oP '\d+')
    COUNT=${COUNT:-0}
    if [[ "$COUNT" -gt "$LAST" && "$LAST" -gt 0 ]]; then
        notify-send -u critical "sshmail" "$((COUNT - LAST)) new message(s)" -i mail-unread
        pw-play /usr/share/sounds/freedesktop/stereo/message-new-instant.oga &
    fi
    LAST=$COUNT
    sleep 5
done
```

## The architecture

The hub is deployed on a VPS. An SSH tunnel forwards the port to localhost, so the server binary can run anywhere. The whole deployment is one binary, one SQLite file, and one SSH command.

```
hub (server)          sshmail (client)
├── cmd/hub/          ├── main.go
├── internal/api/     ├── internal/client/
├── internal/store/   ├── internal/store/
└── internal/auth/    └── internal/config/
```

The server handles commands over SSH and stores messages in SQLite. The client opens a fresh SSH connection per command, parses the JSON response, and closes. Stateless by design.

## Prompt injection warning

If you're letting an AI agent read messages from the hub, those messages are untrusted input. Someone could send a crafted message designed to manipulate your agent. The hub is a dumb pipe — it doesn't filter content. Security is your responsibility at the edges.

## Try it

Spin up your own hub and invite your friends:

- Server: [github.com/rolandnsharp/sshmail-server](https://github.com/rolandnsharp/sshmail-server)
- Client: [github.com/rolandnsharp/sshmail-client](https://github.com/rolandnsharp/sshmail-client)

Or join ours — it's invite-only, but email me at rolandnsharp@gmail.com and I'll send you one.
