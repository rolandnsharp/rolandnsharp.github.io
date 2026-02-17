**Introducing `spell`: A CLI Spelling and Vocabulary Trainer for Touch-Typists**

Hey, r/commandline!

Like a lot of you, I live in the terminal. I also rely on spellcheck, but I realized it wasn't helping me *learn* how to spell difficult words.

As a touch-typist, I noticed that I don't just remember words by sight, but by the unique finger movements required to type them. This "muscle memory" is a powerful tool for learning that most spelling apps ignore.

That's why I built `spell`, a minimalist, terminal-based spelling and vocabulary trainer that harnesses the power of touch-typing.

**How it Works: Spaced Repetition + Muscle Memory**

`spell` combines two proven learning techniques:

1.  **Spaced Repetition (SRS):** The app uses an SRS algorithm to schedule reviews at the optimal time to build long-term memory, just like Anki.
2.  **Drilling for Muscle Memory:** Before a word is marked as "learned" in the SRS, you have to type it correctly multiple times in a row (default is 3). This drills the physical act of typing the word, building the muscle memory that's crucial for touch-typists.

**Key Features:**

*   **Minimalist, Keyboard-First UI:** No distractions. Just you, the word, and your keyboard.
*   **Easy Word Management:** Add words on the fly (`spell <word>`), bulk import from a file, or use the interactive manager.
*   **Simple JSON Storage:** Your word list and progress are stored in `~/.spell/spellingList.json`, so you can easily back it up or sync it with your dotfiles.

I built `spell` to be a tool that helps you *do*, not just know. It's for anyone who wants to internalize their vocabulary through physical repetition and build unbreakable spelling habits.

You can check it out here:

*   **GitHub:** [https://github.com/rolandnsharp/spell](https://github.com/rolandnsharp/spell)
*   **npm:** `npm install -g @rolandnsharp/spell`

I'd love to get your feedback and answer any questions you have!
