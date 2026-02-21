---
title: "Forth9: The Lisp(Forth) Machine That Fits in Your Pocket"
date: 2026-02-17
layout: "base.njk"
tags: post
---
# Forth9: The Lisp Machine That Fits in Your Pocket

Throughout computing history, people have built machines where one language was the entire system — the OS, the shell, the compiler, the applications, all one thing. Each time, the world chose something worse instead. The ideas survived. The machines didn't.

The hardware to try again costs $60 now.

---

## Three Lost Futures

**The Lisp Machine (1979–1990).** At MIT, Richard Greenblatt and Tom Knight built computers where Lisp was everything — the OS, the applications, the shell, the compiler, the debugger. Symbolics commercialised them. The Genera operating system was the peak of personal computing: single language top to bottom, image persistence (save your world, restore it anywhere), incremental compilation, no boundary between use and programming. Every user was a developer. A Genera user in 1985 had capabilities that a macOS user in 2026 still doesn't have.

A Symbolics 3600 cost $70,000. An IBM PC cost $2,000. The PC couldn't do a tenth of what the Lisp machine could, but it was on every desk. When the AI Winter hit, Symbolics went bankrupt.

**Plan 9 from Bell Labs (1987–2002).** Rob Pike, Ken Thompson, and Dennis Ritchie — the creators of Unix — looked at what their creation had become and designed what it should have been. Everything truly a file. The network, processes, the window system, other computers' resources — all files. Nine messages for the entire protocol. The whole OS smaller than the Linux kernel alone.

Plan 9 lost to its own ancestor. Richard Gabriel called it "worse is better" — the worse design wins because it ships first and is good enough. Plan 9 was better. Unix was good enough. Good enough won.

**TempleOS (2003–2018).** While those were institutional projects, one person proved the philosophy alone. Terry A. Davis built a complete 64-bit operating system from scratch over a decade. One language (HolyC) top to bottom. Single address space, ring-0 only, no memory protection — the user and the machine with nothing between them. The entire OS was a live programming environment. 100,000 lines of code, one developer, a full OS. He proved that one person, one language, one system is achievable.

The web papered over all the cracks. The smartphone sealed the deal. The ideas didn't fail. The economics did. The price was wrong.

---

## The Price Is No Longer Wrong

Something has happened in the microcontroller world that most people haven't noticed.

The Raspberry Pi RP2350 is a dual-core ARM/RISC-V chip at 150MHz. A board built around it — the Pimoroni Pico Plus 2W — adds 8MB of PSRAM, 16MB of flash, WiFi, and Bluetooth. It costs about $12.

These chips don't need Linux. They don't need Android. They boot in microseconds — not seconds, microseconds. They draw milliwatts, not watts. A device built on one of these runs for weeks on a battery, not hours.

The breakthrough is PSRAM. Traditional SRAM uses 6 transistors per bit — fast but tiny and expensive. PSRAM uses 1 transistor per bit — slower but massive and dirt cheap. 8 megabytes costs under a dollar. That's enough to hold an entire operating system, every tool you've ever defined, every note you've ever written — as a single persistent image. The Lisp machine's killer feature — save your world, restore it anywhere — is now possible on a chip that costs less than a coffee.

Meanwhile, LoRa mesh devices are taking off. Cheap long-range radios that talk kilometres without cell towers or internet. Handheld devices with keyboards and screens are appearing on these networks. What they're missing is an operating system worthy of the hardware — something that boots instantly, fits in a human's head, and lets the user program the device in the same language it runs.

The economics that killed the Lisp machine have inverted.

---

## Why Forth

The Lisp machine dream was: one language, top to bottom, no seams. The shell is the language. The OS is the language. Programming the machine and using the machine are the same act.

If we're picking up that thread, why not pick up the language too?

Because Lisp doesn't fit a handheld. Forth does. Here's why.

**Lisp thinks in trees. Forth thinks in actions.** To send an encrypted message in Lisp: `(mesh:send alice (encrypt key (serialize (sensor:read))))`. Your mind holds a four-level tree. You plan the structure before you type, or build inside-out. Every opening parenthesis is a mental stack push.

In Forth: `sensor:read serialize key encrypt alice mesh:send`. One action after another. Each word transforms what came before. You never go deeper than one level. You never track nesting. You just take the next step.

When you pull a device from your pocket, you think in actions — check the mesh, send a message, take a reading, jot a note. Sequences, not trees. Forth matches this.

**Forth is terser.** On a small keyboard, every keystroke matters.

```
Lisp:   (define (square x) (* x x))     34 keystrokes
Python: def square(x): return x * x     32 keystrokes
Forth:  : square dup * ;                 18 keystrokes
```

Same idea. Half the typing. Over a lifetime of use on a pocket keyboard, that's not an optimisation. It's a different relationship with the machine. The language disappears between thought and expression.

**Forth runs on nothing.** No garbage collector. No MMU. No runtime. No operating system underneath. On a microcontroller, Forth IS the operating system. The entire system — boot sequence, REPL, drivers, protocols — is one language. There is no C layer, no assembly shim, no second language hiding below.

Nobody has shipped a Lisp machine product — not in 1990, not in 2026. The reason is structural: Lisp needs garbage collection, which needs RAM, which needs a memory management unit, which means a full processor, which means Linux is already there and "good enough." Forth runs on a $5 chip with no GC, no MMU, no OS. The Lisp machine dream is buildable TODAY — in Forth.

**Forth builds wide, not tall.** Lisp systems accumulate layers of abstraction — macros on functions on macros, each layer more powerful, the base farther away. Six months later you must reconstruct the tower to read your own code. Forth builds a flat vocabulary where each word is one definition deep. You can always see the bottom. For a device you want to understand in its entirety, wide beats tall.

Forth9 is built on [Zeptoforth](https://github.com/tabemann/zeptoforth) — a native-code Forth for ARM microcontrollers that compiles words directly to Thumb-2 machine code with constant folding. Zeptoforth handles the hardware: drivers, preemptive multitasking, networking, storage. Forth9 adds the persistent application layer on top — the prefix system, the named streams, the image save/restore, the user's living dictionary.

[William Edward Hahn, PhD](https://www.youtube.com/watch?v=a_6LPvtAUVE) describes Forth as "both a high-level language and a low-level language at the same time." That's an oxymoron to most programmers, but it's the precise quality a handheld OS demands. In one breath you poke a hardware register to check the radio. In the next you define a high-level protocol. No other language does both from the same prompt without a seam between them.

The lineage is fitting. Forth was created in the 1960s by Chuck Moore to control radio telescopes. A language born to command radio hardware. Now we put it in a pocket to command mesh radio networks. Same problem, smaller package.

---

## No Shell. No Layers. One Language.

The Lisp machines didn't have a shell. They didn't put a "friendly" language on top and a "real" language underneath. They had Lisp, and Lisp WAS the interface. There was no boundary between using and programming.

Forth9 follows the same principle. There is no bash layer. Forth IS the interface. A prefix system makes it feel like a command line to someone who has never heard the word "Forth":

```forth
/dev/ ls                      ( list devices )
/dev/lora cat                 ( listen to the radio )
"hello" @alice send           ( send a message )
/net/ ls                      ( list mesh peers )
~memo.txt edit                ( edit a file on SD )
save                          ( save everything )
```

The `/` prefix means path — no quotes needed. The `@` prefix means peer — `@alice` expands to `/net/alice`, saving 11 keypresses. The `~` prefix means file. Every prefix exists because someone was typing too many keystrokes and the language absorbed the shortcut permanently.

A new user looks at this and sees commands. They don't know it's a programming language. They don't need to. But the moment they want more, something extraordinary happens. They don't switch to a different mode:

```forth
/dev/ ls                                          ( using the device )
: backup /dev/cam capture ~photo.raw file:write ; ( programming the device )
backup                                            ( using the new tool )
save                                              ( it's permanent now )
```

In three lines, a user became a programmer, created a tool, and made it a permanent part of their device. No IDE. No compiler. No build step. Type a definition, test it, save it. The tool exists now and will exist tomorrow and next year, in the living image.

Type `'send see` and you're reading the source code of the `send` command. You're one step from changing it. There is no boundary between using and understanding the device. They're the same activity, in the same language, at the same prompt.

This is the Lisp machine lesson: don't add layers of "friendliness" that hide the real system. Make the real system friendly enough that it doesn't need hiding.

---

## Everything is a Named Stream

From Plan 9 we take the insight that every device, every network resource, every piece of hardware should respond to the same small set of operations. In Forth9, everything is a named stream:

```forth
/dev/lora          ( the LoRa radio )
/dev/gfx           ( the display )
/dev/key           ( the keyboard )
/dev/sd            ( the SD card )
/dev/audio         ( the speaker/microphone )
/net/alice         ( a mesh peer )
```

These look like file paths, but there is no filesystem. No inodes, no directories, no mount points. Each of these is a word in the Forth dictionary. `/dev/lora` is a word — type it and it pushes a stream reference onto the stack. `cat`, `read`, `write`, `ls` are words that operate on that reference. The slash-separated naming is a convention borrowed from Plan 9 for familiarity, not a filesystem being resolved by a kernel.

The insight worth keeping isn't "everything is a file." It's that a radio and a file and a peer and a screen all support the same operations. A uniform interface, implemented as dictionary words with a shared naming convention.

Forth is a postfix language — the thing you're acting on comes first, the action comes after. Where bash writes `ls /dev/`, Forth writes `/dev/ ls`. Where bash writes `cat /dev/lora`, Forth writes `/dev/lora cat`. The object goes on the stack, then the verb consumes it. This feels backwards for about ten minutes. Then it feels natural, because it's how actions actually compose — each word transforms what the previous word left behind. No pipes needed for simple chains: `/dev/lora read encrypt @alice send` flows left to right, each word acting on the result of the last.

Pipe the oscilloscope into the radio and you're streaming a waveform to a friend. Feed the signal generator into the tuner to calibrate it. Log sensor readings to SD while monitoring mesh traffic. Nothing prevents this because there are no app boundaries. There is only the dictionary.

---

## The Image: Your Second Brain

When you save, you save everything. Not files — everything. Every word definition, every variable, every piece of state, every note, every configuration preference, every half-finished thought. One file. One snapshot. Your entire computing reality.

Power off. Power on. You're exactly where you left off. Not "your apps reopen" — you're WHERE YOU WERE. The stack has what was on it. The screen shows what it showed. The device doesn't boot. It wakes up.

Copy that file to another device and you've cloned your brain. Roll back to last Tuesday's image and you've undone a week of experiments. Keep a "stable" image and a "bleeding edge" image and swap between them like changing clothes.

This isn't new. The Lisp machines did it in 1985. Smalltalk did it. But nobody put it on a $12 chip that boots in microseconds and fits in your pocket.

---

## Why Not Linux?

Linux is a 30-second boot, millions of lines of code nobody fully understands. Forth9 boots in microseconds. Power on, the CPU starts executing from flash, the kernel loads the image from SD, and you're at the REPL. No BIOS, no bootloader chain, no init system, no kernel modules, no filesystem check. You flip the switch like a flashlight.

The Forth9 kernel is about 750 lines. One person can read it in an afternoon.

| | Linux | Forth9 |
|---|---|---|
| Boot time | 10-30 seconds | Microseconds + image load |
| Kernel size | Millions of lines | ~750 lines |
| Languages | C, shell, Python, config formats | Forth |
| Cross-compiler needed | Yes | No — develop on the device |
| One person understands it | No | Yes |
| Battery life | Hours | Weeks |

The MCU revolution doesn't need a smaller Linux. It needs no Linux.

---

## The Hardware

The [ClockworkPi PicoCalc](https://www.clockworkpi.com/) is a pocket computer with a 320x320 screen, a 65-key keyboard, and a battery. It accepts a Raspberry Pi Pico-format board. The [Pimoroni Pico Plus 2W](https://shop.pimoroni.com/products/pimoroni-pico-plus-2w) drops in with an RP2350 processor, 8MB PSRAM, WiFi, and Bluetooth. An SX1262 LoRa module connects to exposed GPIOs with a few wires. A microSD card holds the image.

Total hardware cost: roughly $60-80 for a complete device with a keyboard, a screen, a battery, and a mesh radio.

Compare that to the Symbolics 3600 at $70,000 in 1985. The ideas are the same. The price has dropped by a factor of a thousand.

---

## The Architecture: A Conversation with Zeptoforth's Author

I posted this manifesto on the [ClockworkPi forum](https://forum.clockworkpi.com/t/a-mystical-forth9-fantasy-a-picocalc-console-manifest/21579). The repo was empty. The PicoCalc was still in the mail. It was a fantasy.

[tabemann](https://github.com/tabemann), the author of [Zeptoforth](https://github.com/tabemann/zeptoforth), showed up in the thread. What followed was the most useful conversation I've had about this project. It changed the architecture completely.

### The original plan was wrong

I was going to fork Mecrisp Stellaris and bolt on image persistence. tabemann pointed out the problem immediately: Zeptoforth already runs on the PicoCalc. It already has a native-code compiler, preemptive multitasking, WiFi, TCP/IP, SHA-256, display drivers, SD card support. Rebuilding all of that from scratch would be months of work for little gain.

His recommendation: build Forth9 as an application layer on top of Zeptoforth. Like how uLisp creates a Lisp environment on top of C, or how Racket provides Scheme on top of Linux.

My first reaction was resistance. The whole point was one language top to bottom — owning the entire stack. Having Zeptoforth as a substrate I don't fully own felt like it defeated the purpose.

He was right though. The work wouldn't be worth the reward, and I'd lose access to future Zeptoforth improvements. Forth9 should be an app on Zeptoforth, not a competing kernel.

### Image persistence

This was the hardest question. I wanted Lisp machine-style persistence — save everything, power off, power on, be exactly where you left off.

tabemann explained why that's hard to bolt onto an existing system. Hardware state can't be saved — timers, radio state, open file handles. Even if you dumped all of RAM to SD, anything hardware-related would be out of sync on restore. Every driver would need modification.

The solution we arrived at: save only the user's world, not the system's. The PSRAM on the RP2350 is memory-mapped at a fixed base address. Compile native code directly into PSRAM, save the entire region to SD as a blob, restore it to the same address on boot. All branch targets stay valid because the base address never moves. Hardware state gets reinitialized from a boot word — the kernel handles hardware, the image handles everything else.

No threaded code. No relocation. No GC. Just a region of memory that is the user's entire computing reality, serialized to a file.

### The outer interpreter hook

I asked if there was a way to intercept tokens before dictionary lookup — needed for the prefix system (`/dev/`, `@alice`, `~file.txt`). Zeptoforth already has exactly this hook. tabemann uses it for local variables. It's the entry point for Forth9's prefix dispatch.

### Multitasking

Since Forth9 has no garbage collector, there's no barrier to using Zeptoforth's preemptive multitasking directly. tabemann noted that cooperative multitasking (coroutines) has significant disadvantages — one misbehaving task locks up the whole system, and fair scheduling is hard. With no GC, there's no reason to accept those tradeoffs.

### The two-language question

This means Forth9 is technically two Forths — Zeptoforth underneath, Forth9 on top. Two dictionaries, two outer interpreters. tabemann didn't see this as a problem. It's the same pattern as uLisp (Lisp on C) or MicroPython (Python on C). The inner language handles the hardware. The outer language is where the user lives.

The key insight: graphics, networking, storage, and anything timing-sensitive stays in Zeptoforth, accessed through bindings from Forth9. The persistent world never touches hardware directly. It asks Zeptoforth to do it. This is how the image stays clean — no stale file handles, no desynchronized hardware state, no driver code that needs saving.

It's not one language all the way to the metal. It's one language all the way to the bindings, and the bindings are thin. For the user at the prompt, the seam is invisible.

The [full conversation](https://forum.clockworkpi.com/t/a-mystical-forth9-fantasy-a-picocalc-console-manifest/21579) is worth reading. tabemann's experience building zeptoscript (a garbage-collected language on top of Zeptoforth) informed every recommendation — he'd already made the mistakes I was about to make.

---

## The Future

The word "microcontroller" is becoming meaningless. In 2020, the ESP32 at 240MHz was "a WiFi chip." In 2024, the ESP32-P4 arrived: a 400MHz dual-core RISC-V with hardware video codecs, camera interfaces, and 32MB of RAM. That's a 2015 smartphone. It costs less than lunch.

RISC-V accelerates this further. Open instruction sets, no licensing fees, no corporate control over the silicon. The RP2350 already has RISC-V cores. Small teams are taping out custom chips. Within a decade, the Forth9 philosophy goes all the way down — open chip, open language, open network.

We have the chips. We have the radios. We have the language. We have the philosophy — proven by Lisp machines, Plan 9, and TempleOS decades ago, waiting for hardware cheap enough to carry it.

Everything is ready. Someone just has to build it.

---

*Forth9 is open source. The project lives at [github.com/rolandnsharp/forth9](https://github.com/rolandnsharp/forth9).*
