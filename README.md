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
| After midterm (confirm finals coverage) | 8 Interpolation error · 9 Chebyshev interpolation · 10 Cubic splines · 11 Numerical differentiation · 12 Trapezoid / Simpson / Midpoint |

Each topic has five sections:

- **Learn** — short lesson pages, one idea per screen, plus an animation you step through.
- **In depth** — explanations of why the methods work, common pitfalls, and typical question formats.
- **Examples** — 3–6 worked examples (mostly from the book), each with a written, board-style solution you reveal one step at a time; "+ New" makes a fresh one.
- **Practice** — three modes for every topic: **One step at a time** checks each calculation with hints about likely sign/order mistakes; **Independent practice** checks fresh questions; **Review mistakes** retries saved calculations with their original numbers.
- **Solver** — type your homework and get every step written out.

There is also a formula sheet, a timed exam drill, calculator tips, and a text-size button (Aa).

## Learning at your pace

Start with one worked example, then choose **Practice → One step at a time**. Finish the numerator, denominator, and division separately before moving on. **Explain this step** explains the operation; **Show this step** reveals its answer when needed. Guided completion is recorded separately from independent first-try solves.

Missed or revealed guided calculations are saved in **Review mistakes**. They are due the next day and can also be retried immediately. Successful reviews without help increase the interval to 3, 7, then 14 days. The history retains the most recent 60 missed calculations and is included in Settings backups. Data remains local to this browser.

In **Settings**, choose your study focus, optionally record the finals date, and select only topics your instructor has confirmed. **Exam drill → Use only my confirmed finals topics** uses that exact selection. The app leaves finals coverage unconfirmed by default.

Solvers check evaluated points for undefined values. Interpolation error solvers use conservative interval bounds where supported and explicitly label sampling fallbacks as estimates. Root-finding still requires the method's continuity/convergence assumptions; a small change between iterates alone does not certify decimal-place accuracy. Integration comparisons use a bounded numerical reference calculation.

## For developers

- `src/` holds the app (plain HTML/CSS/JS, no libraries). Open `src/index.html` through any local web server while editing.
- `npm run build` (`node build.js`) writes three outputs into `dist/`: the offline single file, `artifact/` (the claude.ai copy) and `web/` (the website, with an offline cache and app icons).
- `npm test` checks the book's worked examples, math/domain regressions, guided learning transitions, saved mistake review, and backup compatibility. It also samples all 12 guided question generators.
- **Deploying:** Vercel builds from `main` using `vercel.json` (`node build.js`, publishes `dist/web`). Push to `main` and the site updates.
- `tools/make-icons.py` redraws the app icons (needs Python with Pillow).
