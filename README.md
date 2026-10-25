# Numerical Methods Reviewer

An offline study app for Sauer, *Numerical Analysis* (2nd ed.).

**On any device:** open the website (deployed on Vercel from this repo). On a phone, use the browser menu → *Add to Home screen*; after the first visit it works offline. Add `#ndd` to the link to jump straight to divided differences.

**On this laptop, no internet:** run `npm run build`, then double-click `dist/Numerical-Methods-Reviewer.html`.

Progress is saved separately on each device and browser; use Settings → backup code to move it.

## Topics

| Group | Topics |
|---|---|
| Prelim | 1 Evaluating a polynomial (nested multiplication) · 2 Bisection · 3 Fixed-point iteration · 4 Newton's method · 5 Secant / false position |
| Midterm | 6 Lagrange interpolation · 7 Newton's divided differences |
| After midterm (Finals) | 8 Interpolation error · 9 Chebyshev interpolation · 10 Cubic splines · 11 Numerical differentiation · 12 Trapezoid / Simpson / Midpoint |

Each topic has four sections:

- **Learn** — short lesson pages, one idea per screen, plus an animation you step through.
- **Examples** — 3–6 worked examples (mostly from the book), each with a written, board-style solution you reveal one step at a time; "+ New" makes a fresh one.
- **Practice** — random questions checked number by number, with the full written solution when you need it.
- **Solver** — type your homework and get every step written out.

There is also a formula sheet, a timed exam drill, calculator tips, and a text-size button (Aa).

## For developers

- `src/` holds the app (plain HTML/CSS/JS, no libraries). Open `src/index.html` through any local web server while editing.
- `npm run build` (`node build.js`) writes three outputs into `dist/`: the offline single file, `artifact/` (the claude.ai copy) and `web/` (the website, with an offline cache and app icons).
- `npm test` checks the math engine against the book's worked examples.
- **Deploying:** Vercel builds from `main` using `vercel.json` (`node build.js`, publishes `dist/web`). Push to `main` and the site updates.
- `tools/make-icons.py` redraws the app icons (needs Python with Pillow).
