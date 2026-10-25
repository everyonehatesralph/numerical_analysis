# Numerical Methods Reviewer

An offline study app for Sauer, *Numerical Analysis* (2nd ed.).

**To use it:** double-click `dist/Numerical-Methods-Reviewer.html`. It opens in your browser and works with no internet. Your progress is saved in that browser on that computer.

**On your phone:** open the private online copy at https://claude.ai/artifact/VFoxBciHmgFAaoNUUUgoik while signed in to claude.ai (needs internet). Add `#ndd` to the link to jump straight to divided differences. Phone progress is saved separately from the laptop's; use Settings → backup code to move it.

## Topics

| Group | Topics |
|---|---|
| Prelim | 1 Evaluating a polynomial (nested multiplication) · 2 Bisection · 3 Fixed-point iteration · 4 Newton's method · 5 Secant / false position |
| Midterm | 6 Lagrange interpolation · 7 Newton's divided differences |
| Finals preview | 8 Interpolation error · 9 Chebyshev interpolation · 10 Cubic splines · 11 Numerical differentiation · 12 Trapezoid / Simpson / Midpoint |

Each topic has four sections:

- **Learn** — short lesson pages, one idea per screen, plus an animation you step through.
- **Examples** — 3–6 worked examples (mostly from the book), each with a written, board-style solution you reveal one step at a time; "+ New" makes a fresh one.
- **Practice** — random questions checked number by number, with the full written solution when you need it.
- **Solver** — type your homework and get every step written out.

There is also a formula sheet, a timed exam drill, calculator tips, and a text-size button (Aa).

## For developers

- `src/` holds the app (plain HTML/CSS/JS, no libraries). Open `src/index.html` through any local web server while editing.
- `node build.js` inlines everything into `dist/Numerical-Methods-Reviewer.html` (offline) and `dist/artifact/Numerical-Methods-Reviewer.html` (the claude.ai copy; republish it to the URL above to update the phone version).
- `node tests/engine.test.js` checks the math engine against the book's worked examples.
