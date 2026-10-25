/* explain.js — the "In depth" tab: detailed explanations, one question at a time.
   Each answer explains WHY a step works, not just what to do. */
(function (NM) {
  'use strict';
  const { E, UI } = NM;
  const { M } = UI;
  const v = M.v, fr = M.fr;
  const eq = (s) => '<div class="eq">' + s + '</div>';
  const x = '<i>x</i>', f = '<i>f</i>', h = '<i>h</i>';

  NM.EXPLAIN = {
    /* ------------------------------------------------------------------ */
    horner: [
      { q: 'Why is nested multiplication faster?', a: `
        <p>Count the work. To compute 2${x}<sup>4</sup> directly you multiply ${x}·${x}·${x}·${x}·2 — that is 4 multiplications. 3${x}<sup>3</sup> needs 3, −3${x}<sup>2</sup> needs 2, 5${x} needs 1. Total: 4 + 3 + 2 + 1 = <b>10 multiplications</b>.</p>
        <p>Nested multiplication uses exactly <b>one</b> multiplication per coefficient after the first: 4 for a degree-4 polynomial. For degree 50, the direct way needs 1 + 2 + ⋯ + 50 = <b>1275</b> multiplications; nesting needs <b>50</b>. Fewer operations also means fewer rounding errors.</p>` },
      { q: 'Where do the brackets come from?', a: `
        <p>Factor ${x} out of every term except the constant, again and again:</p>
        ${eq('2' + x + '<sup>4</sup> + 3' + x + '<sup>3</sup> − 3' + x + '<sup>2</sup> + 5' + x + ' − 1')}
        ${eq('= −1 + ' + x + '(5 − 3' + x + ' + 3' + x + '<sup>2</sup> + 2' + x + '<sup>3</sup>)')}
        ${eq('= −1 + ' + x + '(5 + ' + x + '(−3 + 3' + x + ' + 2' + x + '<sup>2</sup>))')}
        ${eq('= −1 + ' + x + '(5 + ' + x + '(−3 + ' + x + '(3 + ' + x + '·2)))')}
        <p>No arithmetic happened — only regrouping. That is why the coefficients are the same numbers you started with.</p>` },
      { q: 'What do the running totals mean?', a: `
        <p>They are not just scratch work. When you evaluate ${f}(<i>a</i>) this way, the totals before the last one are the coefficients of the <b>quotient</b> when you divide ${f}(${x}) by (${x} − <i>a</i>), and the last total is the <b>remainder</b>.</p>
        <p>That is the Remainder Theorem: the remainder of dividing by (${x} − <i>a</i>) equals ${f}(<i>a</i>). So the same table is synthetic division — if the last total is 0, then <i>a</i> is a root.</p>` },
      { q: 'What changes with base points?', a: `
        <p>Only the multiplier. Ordinary nesting multiplies by ${x} each step. With base points you multiply by (${x} − ${v('r', 'i')}) instead:</p>
        ${eq(v('c', 1) + ' + (' + x + ' − ' + v('r', 1) + ')(' + v('c', 2) + ' + (' + x + ' − ' + v('r', 2) + ')(' + v('c', 3) + ' + (' + x + ' − ' + v('r', 3) + ')' + v('c', 4) + '))')}
        <p>If every base point is 0 you get back the ordinary nest. Newton's divided-difference polynomial has exactly this shape, with the data x-values as base points — so this is how you evaluate it quickly.</p>
        <p><b>Watch the pairing:</b> the innermost coefficient ${v('c', 4)} is multiplied by the <i>last</i> base point ${v('r', 3)}; the outermost bracket uses ${v('r', 1)}.</p>` },
      { q: 'How do I handle polynomials with big gaps, like x⁵ + x⁸ + x¹¹?', a: `
        <p>Look for a common step between the powers. In 4${x}<sup>5</sup> + 7${x}<sup>8</sup> − 3${x}<sup>11</sup> + 2${x}<sup>14</sup> the powers go up by 3, so factor out ${x}<sup>5</sup> and treat ${x}<sup>3</sup> as the variable:</p>
        ${eq(x + '<sup>5</sup>(4 + ' + x + '<sup>3</sup>(7 + ' + x + '<sup>3</sup>(−3 + ' + x + '<sup>3</sup>·2)))')}
        <p>Compute ${x}<sup>2</sup>, ${x}<sup>3</sup>, ${x}<sup>5</sup> once (3 multiplications), do the nest in ${x}<sup>3</sup> (3 multiplications, 3 additions), then multiply by ${x}<sup>5</sup> (1 more): <b>7 multiplications, 3 additions</b>.</p>` },
      { q: 'How do I check my answer?', a: `
        <ul><li>Plug the number into the original polynomial with your calculator (CALC). Both ways must agree.</li>
        <li>If ${x} is a simple fraction like ½, keep fractions — the answer should be a clean fraction too (5/4, not 1.2499).</li>
        <li>Sanity check the size: for ${x} between −1 and 1, high powers are small, so the constant term dominates.</li></ul>` },
      { q: 'What do exam questions look like?', a: `
        <ul><li>"Rewrite in nested form and evaluate at ${x} = 1/3." → list coefficients (zeros included), nest, evaluate.</li>
        <li>"Evaluate the nested polynomial with base points … at ${x} = 5." → innermost first, multiply by (${x} − <i>r</i>).</li>
        <li>"How many multiplications and additions…?" → degree <i>d</i>: <i>d</i> and <i>d</i>; with base points: <i>d</i> and 2<i>d</i>.</li></ul>` },
    ],

    /* ------------------------------------------------------------------ */
    bisection: [
      { q: 'Why must a root exist between a and b?', a: `
        <p>This is the <b>Intermediate Value Theorem</b>. A continuous function is one you can draw without lifting your pen. If you start below the ${x}-axis (${f}(<i>a</i>) &lt; 0) and end above it (${f}(<i>b</i>) &gt; 0), your pen has to cross the axis somewhere in between. That crossing is the root.</p>
        <p>The check "${f}(<i>a</i>)·${f}(<i>b</i>) &lt; 0" is just a short way to say "the signs are different": a negative times a positive is negative.</p>
        <p><b>Careful:</b> the function must be continuous. ${f}(${x}) = 1/${x} changes sign on [−1, 1] but has no root — it jumps across at ${x} = 0.</p>` },
      { q: 'Why does "replace the endpoint with the same sign" work?', a: `
        <p>The whole method depends on one promise: <b>the two endpoints always have opposite signs</b>, so the root stays trapped.</p>
        <p>Suppose ${f}(<i>a</i>) &lt; 0 &lt; ${f}(<i>b</i>) and ${f}(<i>c</i>) &lt; 0. If you replace <i>a</i> by <i>c</i>, the new interval [<i>c</i>, <i>b</i>] still has a negative end and a positive end — the root is still inside. If you replaced <i>b</i> instead, both ends would be negative and the promise would break.</p>
        <p>So "same sign → replace" is not a trick to memorize; it is the only choice that keeps the root trapped.</p>` },
      { q: 'Where does the error formula (b − a)/2ⁿ⁺¹ come from?', a: `
        <p>Each step cuts the interval in half. After <i>n</i> steps its length is (<i>b</i> − <i>a</i>)/2<sup><i>n</i></sup>. The root is somewhere inside, and our answer is the <b>midpoint</b>, which is at most half the length away from any point inside:</p>
        ${eq('|' + v('x', 'c') + ' − <i>r</i>| &lt; ' + fr('1', '2') + ' · ' + fr('<i>b</i> − <i>a</i>', '2<sup><i>n</i></sup>') + ' = ' + fr('<i>b</i> − <i>a</i>', '2<sup><i>n</i>+1</sup>'))}
        <p>This is a guarantee: it does not depend on the function at all, only on the starting interval and the number of steps.</p>` },
      { q: 'How do I get the number of steps for "p correct decimal places"?', a: `
        <p>"Correct to <i>p</i> places" means the error is less than 0.5 × 10<sup>−<i>p</i></sup>. Set the guarantee smaller than that and solve for <i>n</i>:</p>
        ${eq(fr('<i>b</i> − <i>a</i>', '2<sup><i>n</i>+1</sup>') + ' &lt; 0.5 × 10<sup>−<i>p</i></sup> &nbsp;⟺&nbsp; 2<sup><i>n</i></sup> &gt; (<i>b</i> − <i>a</i>)·10<sup><i>p</i></sup> &nbsp;⟺&nbsp; <i>n</i> &gt; ' + fr('<i>p</i> + log<sub>10</sub>(<i>b</i> − <i>a</i>)', 'log<sub>10</sub> 2'))}
        <p><b>Example:</b> [0, 1] and 6 places: <i>n</i> &gt; 6/0.301 = 19.9, so <b>20 steps</b>. Always round <b>up</b> — 19 steps is not quite enough.</p>
        <p>A rule of thumb: every 3.3 steps buys one more correct decimal (because 2<sup>3.3</sup> ≈ 10).</p>` },
      { q: 'What can go wrong?', a: `
        <ul><li><b>No sign change.</b> ${f}(${x}) = (${x} − 1)<sup>2</sup> touches zero at 1 but never goes negative, so bisection cannot even start. Same if [<i>a</i>, <i>b</i>] contains two roots.</li>
        <li><b>${f}(<i>c</i>) is exactly 0.</b> Then <i>c</i> is the root — stop.</li>
        <li><b>Degree mode.</b> With sin/cos your calculator must be in radians, or every sign you read is wrong.</li>
        <li><b>Tiny f(c) values.</b> −0.0003 is still negative. Look at the sign, not the size.</li></ul>` },
      { q: 'Why learn bisection if it is slow?', a: `
        <p>Because it <b>always works</b> once you have a sign change, and you know in advance how many steps you need. Faster methods (Newton, secant) can fail if you start in the wrong place.</p>
        <p>In practice people combine them: a few bisection steps to get close and safe, then Newton to finish fast.</p>` },
      { q: 'What do exam questions look like?', a: `
        <ul><li>"Find an interval of length one containing a root" → try whole numbers until the sign flips.</li>
        <li>"Apply 3 steps of bisection" → the table <i>a</i>, ${f}(<i>a</i>), <i>c</i>, ${f}(<i>c</i>), <i>b</i>, ${f}(<i>b</i>).</li>
        <li>"How many steps for 10<sup>−6</sup> accuracy?" → solve (<i>b</i> − <i>a</i>)/2<sup><i>n</i>+1</sup> &lt; TOL, round up.</li>
        <li>"What is the error bound after <i>n</i> steps?" → (<i>b</i> − <i>a</i>)/2<sup><i>n</i>+1</sup>.</li></ul>` },
    ],

    /* ------------------------------------------------------------------ */
    fpi: [
      { q: 'What exactly is a fixed point?', a: `
        <p>A number <i>r</i> with <i>g</i>(<i>r</i>) = <i>r</i>: put it into <i>g</i> and you get the same number back. On a graph it is where the curve <i>y</i> = <i>g</i>(${x}) crosses the line <i>y</i> = ${x}.</p>
        <p>We turn root-finding into fixed-point finding by rearranging: ${f}(${x}) = 0 ⟺ ${x} = <i>g</i>(${x}). For example ${x}<sup>3</sup> + ${x} − 1 = 0 ⟺ ${x} = 1 − ${x}<sup>3</sup>. A fixed point of <i>g</i> is then a root of ${f}.</p>` },
      { q: 'Why does repeating g(x) find the fixed point?', a: `
        <p>Compare the error before and after one step. Since ${v('x', 'i+1')} = <i>g</i>(${v('x', 'i')}) and <i>r</i> = <i>g</i>(<i>r</i>):</p>
        ${eq(v('x', 'i+1') + ' − <i>r</i> = <i>g</i>(' + v('x', 'i') + ') − <i>g</i>(<i>r</i>) ≈ <i>g</i>′(<i>r</i>)·(' + v('x', 'i') + ' − <i>r</i>)')}
        <p>(This is the Mean Value Theorem: a small change in input times the slope gives the change in output.) So every step the error gets <b>multiplied by about <i>g</i>′(<i>r</i>)</b>.</p>
        <p>If |<i>g</i>′(<i>r</i>)| &lt; 1 the error shrinks every step and you converge. If it is &gt; 1 the error grows and you never get there. That is the whole theory: <b><i>S</i> = |<i>g</i>′(<i>r</i>)| &lt; 1</b>.</p>` },
      { q: 'Why does the cobweb picture spiral or staircase?', a: `
        <p>The sign of <i>g</i>′(<i>r</i>) decides the shape:</p>
        <ul><li><b>Positive slope</b> (0 &lt; <i>g</i>′ &lt; 1): the error keeps its sign — the iterates approach from one side, like a <b>staircase</b>.</li>
        <li><b>Negative slope</b> (−1 &lt; <i>g</i>′ &lt; 0): the error flips sign each step — the iterates jump from one side to the other, a <b>spiral</b>. cos ${x} is like this.</li></ul>
        <p>Either way, the steepness compared with the line <i>y</i> = ${x} (slope 1) decides whether it closes in or flies out.</p>` },
      { q: 'How do I choose a good g(x)?', a: `
        <ul><li>There are many rearrangements of the same equation. Try a few and compute <i>S</i> = |<i>g</i>′(<i>r</i>)| for each (use a rough root from a table).</li>
        <li>Isolating the <b>biggest</b> term often helps: for ${x}<sup>3</sup> + ${x} − 1 = 0, ${x} = (1 − ${x})<sup>1/3</sup> works (<i>S</i> ≈ 0.72), but ${x} = 1 − ${x}<sup>3</sup> fails (<i>S</i> ≈ 1.40).</li>
        <li>The best possible choice is <i>g</i>(${x}) = ${x} − ${f}(${x})/${f}′(${x}) — that is Newton's method, with <i>S</i> = 0.</li></ul>` },
      { q: 'How many iterations will I need?', a: `
        <p>Since each step multiplies the error by about <i>S</i>, after <i>n</i> steps ${v('e', 'n')} ≈ <i>S</i><sup><i>n</i></sup>·${v('e', 0)}. Solve for <i>n</i>:</p>
        ${eq('<i>n</i> ≈ ' + fr('log(TOL / ' + v('e', 0) + ')', 'log <i>S</i>'))}
        <p><b>Example (cos ${x} = sin ${x}):</b> <i>S</i> ≈ 0.414, starting error ≈ 0.785. For an error below 10<sup>−6</sup>: <i>n</i> ≈ log(1.27 × 10<sup>−6</sup>)/log(0.414) ≈ 15.4, so about <b>16 iterations</b> — exactly what the book\'s table shows.</p>` },
      { q: 'When should I stop iterating?', a: `
        <ul><li><b>Absolute:</b> stop when |${v('x', 'i+1')} − ${v('x', 'i')}| &lt; TOL. Most common in class.</li>
        <li><b>Relative:</b> |${v('x', 'i+1')} − ${v('x', 'i')}|/|${v('x', 'i+1')}| &lt; TOL, better when the root is large.</li>
        <li><b>Backward error:</b> |${f}(${v('x', 'i')})| small. Useful, but a flat function can have small ${f} far from the root.</li></ul>
        <p>Read the question: "do 5 iterations" means exactly 5, no matter how close you are.</p>` },
      { q: 'What do exam questions look like?', a: `
        <ul><li>"Find ${v('x', 1)}, ${v('x', 2)}, ${v('x', 3)} with <i>g</i>(${x}) = … and ${v('x', 0)} = …" → plug in, use Ans.</li>
        <li>"Which rearrangement converges? Explain." → compute <i>S</i> = |<i>g</i>′(<i>r</i>)| for each.</li>
        <li>"Find the fixed points of <i>g</i>" → solve <i>g</i>(${x}) = ${x} algebraically.</li>
        <li>"Estimate the error after 5 more steps" → multiply by <i>S</i><sup>5</sup>.</li></ul>` },
    ],

    /* ------------------------------------------------------------------ */
    newton: [
      { q: 'Where does the Newton formula come from?', a: `
        <p>The tangent line at (${v('x', 'i')}, ${f}(${v('x', 'i')})) has slope ${f}′(${v('x', 'i')}). By point-slope form it is</p>
        ${eq('<i>y</i> − ' + f + '(' + v('x', 'i') + ') = ' + f + '′(' + v('x', 'i') + ')(' + x + ' − ' + v('x', 'i') + ')')}
        <p>It hits the ${x}-axis where <i>y</i> = 0:</p>
        ${eq('−' + f + '(' + v('x', 'i') + ') = ' + f + '′(' + v('x', 'i') + ')(' + x + ' − ' + v('x', 'i') + ') &nbsp;⟹&nbsp; ' + x + ' = ' + v('x', 'i') + ' − ' + fr(f + '(' + v('x', 'i') + ')', f + '′(' + v('x', 'i') + ')'))}
        <p>That ${x} is the next guess ${v('x', 'i+1')}. The idea: near a point, a smooth curve looks like its tangent line, so solve the easy linear problem instead.</p>` },
      { q: 'Why is Newton so fast?', a: `
        <p>The error after one step is roughly the <b>square</b> of the error before:</p>
        ${eq(v('e', 'i+1') + ' ≈ <i>M</i>·' + v('e', 'i') + '<sup>2</sup>, &nbsp; <i>M</i> = ' + fr('|' + f + '″(<i>r</i>)|', '2|' + f + '′(<i>r</i>)|'))}
        <p>Squaring a small number makes it much smaller: 10<sup>−2</sup> → 10<sup>−4</sup> → 10<sup>−8</sup> → 10<sup>−16</sup>. The number of correct digits <b>doubles</b> each step. Compare bisection, which gains one digit every 3.3 steps.</p>
        <p>Another way to see it: Newton is Fixed-Point Iteration with <i>g</i>(${x}) = ${x} − ${f}/${f}′, and you can check that <i>g</i>′(<i>r</i>) = 0. With <i>S</i> = 0 the linear error term vanishes, so only the squared term is left.</p>` },
      { q: 'When does Newton fail?', a: `
        <ul><li><b>Flat tangent</b>: ${f}′(${v('x', 'i')}) = 0 → division by zero. The tangent never reaches the axis.</li>
        <li><b>Cycling</b>: for ${f}(${x}) = ${x}<sup>3</sup> − 2${x} + 2 from ${v('x', 0)} = 0 you get 1, 0, 1, 0, … forever.</li>
        <li><b>Running away</b>: a bad starting point can send the next guess far from the root.</li>
        <li><b>Multiple roots</b>: if ${f}(<i>r</i>) = ${f}′(<i>r</i>) = 0 (like (${x} − 1)<sup>2</sup>), Newton is only linear, with <i>S</i> = (<i>m</i> − 1)/<i>m</i> for multiplicity <i>m</i>. Fix: ${v('x', 'i+1')} = ${v('x', 'i')} − <i>m</i>·${f}/${f}′.</li></ul>
        <p>The cure for most problems: get close first (a table or a few bisection steps), then switch to Newton.</p>` },
      { q: 'Why is the square-root formula (xᵢ + A/xᵢ)/2?', a: `
        <p>√<i>A</i> is the root of ${f}(${x}) = ${x}<sup>2</sup> − <i>A</i>, with ${f}′(${x}) = 2${x}. Newton gives</p>
        ${eq(v('x', 'i+1') + ' = ' + v('x', 'i') + ' − ' + fr(v('x', 'i') + '<sup>2</sup> − <i>A</i>', '2' + v('x', 'i')) + ' = ' + fr('2' + v('x', 'i') + '<sup>2</sup> − ' + v('x', 'i') + '<sup>2</sup> + <i>A</i>', '2' + v('x', 'i')) + ' = ' + fr(v('x', 'i') + ' + <i>A</i>/' + v('x', 'i'), '2'))}
        <p>In words: average your guess with <i>A</i> ÷ guess. If the guess is too big, <i>A</i>/guess is too small, and the average lands in between. Simplifying the formula like this before plugging in saves time on exams.</p>` },
      { q: 'How do I avoid derivative mistakes?', a: `
        <ul><li>Write ${f}′(${x}) on its own line before using it.</li>
        <li>Check one value with your calculator\'s d/dx key: compute ${f}′(${v('x', 0)}) both ways.</li>
        <li>Chain rule reminders: (<i>e</i><sup>−${x}</sup>)′ = −<i>e</i><sup>−${x}</sup>, (cos ${x})′ = −sin ${x}, (ln ${x})′ = 1/${x}, (√${x})′ = 1/(2√${x}).</li></ul>` },
      { q: 'What do exam questions look like?', a: `
        <ul><li>"Find the Newton formula for ${f}(${x}) = … and simplify." → ${x} − ${f}/${f}′ with one common denominator.</li>
        <li>"Do two iterations from ${v('x', 0)} = …" → the table ${x}, ${f}, ${f}′, next ${x}.</li>
        <li>"Why does Newton converge slowly to this root?" → check ${f}′(<i>r</i>) = 0 → multiple root.</li>
        <li>"Estimate ${v('e', 'i+1')} from ${v('e', 'i')}" → <i>M</i>·${v('e', 'i')}<sup>2</sup>.</li></ul>` },
    ],

    /* ------------------------------------------------------------------ */
    secant: [
      { q: 'Where does the secant formula come from?', a: `
        <p>Take Newton\'s formula and replace the derivative by the slope between the last two points:</p>
        ${eq(f + '′(' + v('x', 'i') + ') ≈ ' + fr(f + '(' + v('x', 'i') + ') − ' + f + '(' + v('x', 'i−1') + ')', v('x', 'i') + ' − ' + v('x', 'i−1')))}
        <p>Put that into ${v('x', 'i+1')} = ${v('x', 'i')} − ${f}(${v('x', 'i')})/${f}′(${v('x', 'i')}) and flip the fraction:</p>
        ${eq(v('x', 'i+1') + ' = ' + v('x', 'i') + ' − ' + fr(f + '(' + v('x', 'i') + ')(' + v('x', 'i') + ' − ' + v('x', 'i−1') + ')', f + '(' + v('x', 'i') + ') − ' + f + '(' + v('x', 'i−1') + ')'))}
        <p>Geometrically: draw the straight line through the last two points on the curve and see where it crosses the axis.</p>` },
      { q: 'Is there an easier form to type?', a: `
        <p>Yes — combine everything over one denominator:</p>
        ${eq(v('x', 'i+1') + ' = ' + fr(v('x', 'i−1') + '·' + f + '(' + v('x', 'i') + ') − ' + v('x', 'i') + '·' + f + '(' + v('x', 'i−1') + ')', f + '(' + v('x', 'i') + ') − ' + f + '(' + v('x', 'i−1') + ')'))}
        <p>It gives the same number. Notice it is symmetric: swapping the two old points does not change the answer, so you cannot get the order "wrong" here — but you must still drop the <b>oldest</b> point before the next step.</p>` },
      { q: 'How fast is the secant method?', a: `
        <p>Its order is the golden ratio, (1 + √5)/2 ≈ <b>1.62</b>: faster than linear (bisection, FPI), slower than quadratic (Newton).</p>
        <p>But each Newton step needs two evaluations (${f} and ${f}′), while each secant step needs only <b>one new</b> ${f} value. Per evaluation, secant is often just as quick — and it never needs a derivative.</p>` },
      { q: 'How is False Position different, and why can it be slow?', a: `
        <p>False Position uses the same secant line but keeps a <b>bracket</b> like bisection: the new point replaces the endpoint with the same sign, so the root can never escape.</p>
        <p>The catch: on a curve that bends one way (convex or concave), the new point always lands on the same side. One endpoint gets stuck forever and the interval shrinks from one side only — sometimes slower than bisection. Book Example 1.17 shows <i>a</i> = −1 never moving.</p>` },
      { q: 'What can go wrong?', a: `
        <ul><li>${f}(${v('x', 'i')}) = ${f}(${v('x', 'i−1')}): the line is flat and never meets the axis.</li>
        <li>Like Newton, a poor start can wander away; unlike False Position, the secant method does not keep the root trapped.</li>
        <li>Dropping the wrong point (keeping the oldest) is the most common hand mistake.</li></ul>` },
      { q: 'What do exam questions look like?', a: `
        <ul><li>"Apply the secant method with ${v('x', 0)} = …, ${v('x', 1)} = … to find ${v('x', 2)}, ${v('x', 3)}."</li>
        <li>"Apply two steps of False Position on [<i>a</i>, <i>b</i>]." → secant formula + bisection-style sign rule.</li>
        <li>"Compare the convergence of bisection, Newton and secant." → linear, quadratic, order 1.62.</li></ul>` },
    ],

    /* ------------------------------------------------------------------ */
    lagrange: [
      { q: 'Why is Lₖ equal to 1 at its own point and 0 at the others?', a: `
        <p>Look at ${v('L', 1)} for three points:</p>
        ${eq(v('L', 1) + '(' + x + ') = ' + fr('(' + x + ' − ' + v('x', 2) + ')(' + x + ' − ' + v('x', 3) + ')', '(' + v('x', 1) + ' − ' + v('x', 2) + ')(' + v('x', 1) + ' − ' + v('x', 3) + ')'))}
        <ul><li>At ${x} = ${v('x', 2)} the top contains (${v('x', 2)} − ${v('x', 2)}) = 0, so ${v('L', 1)} = 0. Same at ${v('x', 3)}.</li>
        <li>At ${x} = ${v('x', 1)} the top becomes exactly the bottom, so ${v('L', 1)} = 1.</li></ul>
        <p>The bottom is just a number chosen to make that "1" happen. That is the whole design.</p>` },
      { q: 'Why does adding yₖLₖ give the right polynomial?', a: `
        <p>Plug in ${v('x', 1)}: ${v('L', 1)} = 1 and every other ${v('L', 'k')} = 0, so <i>P</i>(${v('x', 1)}) = ${v('y', 1)}·1 + ${v('y', 2)}·0 + ${v('y', 3)}·0 = ${v('y', 1)}. The same happens at every data point. Each term "switches on" only at its own point.</p>
        <p>Each ${v('L', 'k')} is a product of <i>n</i> − 1 linear factors, so the sum has degree at most <i>n</i> − 1.</p>` },
      { q: 'Why is there only one such polynomial?', a: `
        <p>Suppose two polynomials <i>P</i> and <i>Q</i> of degree ≤ <i>n</i> − 1 both pass through the <i>n</i> points. Their difference <i>H</i> = <i>P</i> − <i>Q</i> is zero at all <i>n</i> data points. But a nonzero polynomial of degree ≤ <i>n</i> − 1 has at most <i>n</i> − 1 roots. So <i>H</i> must be the zero polynomial, and <i>P</i> = <i>Q</i>.</p>
        <p>That is why Lagrange and Newton\'s divided differences <b>must</b> give the same polynomial — use one to check the other.</p>` },
      { q: 'A quick check that catches most mistakes', a: `
        <p>The basis polynomials always add up to 1:</p>
        ${eq(v('L', 1) + '(' + x + ') + ' + v('L', 2) + '(' + x + ') + ⋯ + ' + v('L', 'n') + '(' + x + ') = 1 &nbsp; for every ' + x)}
        <p>(It is the interpolant of the constant data 1, 1, …, 1, which is the constant 1.) When you compute ${v('L', 'k')}(<i>a</i>) at a number, add them up — if they don\'t total 1, one of them is wrong.</p>` },
      { q: 'Should I expand, or plug in the number first?', a: `
        <ul><li><b>Asked for <i>P</i>(<i>a</i>) only?</b> Plug <i>a</i> in right away: each ${v('L', 'k')}(<i>a</i>) is one fraction. Much less algebra, fewer sign errors.</li>
        <li><b>Asked for <i>P</i>(${x}) in standard form?</b> Expand each numerator (two factors at a time), divide by its denominator, multiply by ${v('y', 'k')}, then collect ${x}<sup>2</sup>, ${x} and constants.</li></ul>` },
      { q: 'When is Lagrange better or worse than Newton\'s form?', a: `
        <ul><li><b>Better</b> for understanding and proofs — you can see why it works at a glance.</li>
        <li><b>Better</b> when the x-values stay fixed and only the y-values change: the ${v('L', 'k')} can be reused.</li>
        <li><b>Worse</b> when a point is added: every ${v('L', 'k')} changes. Newton\'s form just adds a term.</li>
        <li><b>Worse</b> for evaluating at many x: Newton\'s nested form is faster.</li></ul>` },
      { q: 'Interpolation or extrapolation?', a: `
        <p>Using <i>P</i> <b>between</b> the data x-values (interpolation) is usually reliable. Using it <b>outside</b> (extrapolation, like predicting 2050 from data up to 2000) can be badly wrong, because polynomials shoot off away from the data. Say so on the exam when a question asks you to extrapolate.</p>` },
      { q: 'What do exam questions look like?', a: `
        <ul><li>"Use Lagrange interpolation to find the polynomial through …" → build each ${v('L', 'k')}, expand, add.</li>
        <li>"Estimate the value at ${x} = …" → plug in early.</li>
        <li>"How many polynomials of degree <i>d</i> pass through these points?" → uniqueness argument.</li>
        <li>Applications: estimating a table value (temperature, population, CO₂) between measured years.</li></ul>` },
    ],

    /* ------------------------------------------------------------------ */
    ndd: [
      { q: 'Why is P(x) written as c₁ + c₂(x − x₁) + c₃(x − x₁)(x − x₂) + ⋯?', a: `
        <p>Because each new term is <b>zero at all the earlier points</b>. The term ${v('c', 3)}(${x} − ${v('x', 1)})(${x} − ${v('x', 2)}) vanishes at ${v('x', 1)} and ${v('x', 2)}, so adding it cannot spoil the fit you already had there. It only adjusts the polynomial at ${v('x', 3)}.</p>
        <p>So the polynomial is built one point at a time: ${v('c', 1)} fits point 1, adding ${v('c', 2)}(${x} − ${v('x', 1)}) fits point 2 too, adding the next term fits point 3 too, and so on.</p>` },
      { q: 'Where do the coefficients come from? (the real reason for the triangle)', a: `
        <p>Plug the points in one at a time.</p>
        <p><b>Point 1:</b> every term except ${v('c', 1)} has the factor (${v('x', 1)} − ${v('x', 1)}) = 0, so ${v('c', 1)} = ${v('y', 1)}.</p>
        <p><b>Point 2:</b> ${v('y', 2)} = ${v('c', 1)} + ${v('c', 2)}(${v('x', 2)} − ${v('x', 1)}), so</p>
        ${eq(v('c', 2) + ' = ' + fr(v('y', 2) + ' − ' + v('y', 1), v('x', 2) + ' − ' + v('x', 1)) + ' = <i>f</i>[' + v('x', 1) + ' ' + v('x', 2) + ']')}
        <p>— the slope between points 1 and 2: the first divided difference.</p>
        <p><b>Point 3:</b> ${v('y', 3)} = ${v('c', 1)} + ${v('c', 2)}(${v('x', 3)} − ${v('x', 1)}) + ${v('c', 3)}(${v('x', 3)} − ${v('x', 1)})(${v('x', 3)} − ${v('x', 2)}). Solving for ${v('c', 3)} and tidying up the algebra gives</p>
        ${eq(v('c', 3) + ' = ' + fr('<i>f</i>[' + v('x', 2) + ' ' + v('x', 3) + '] − <i>f</i>[' + v('x', 1) + ' ' + v('x', 2) + ']', v('x', 3) + ' − ' + v('x', 1)))}
        <p>That is exactly the rule for the third column. The triangle is just an organised way of doing this algebra for every coefficient at once.</p>` },
      { q: 'Why do we divide by x₃ − x₁ and not by a neighbour?', a: `
        <p>It falls out of the algebra above — but there is also a picture. ${'<i>f</i>[' + v('x', 1) + ' ' + v('x', 2) + ']'} is the slope on the left part, ${'<i>f</i>[' + v('x', 2) + ' ' + v('x', 3) + ']'} the slope on the right part. Their difference tells you <b>how much the slope changes</b>; dividing by the whole width ${v('x', 3)} − ${v('x', 1)} turns it into a "rate of change of the slope" over the whole span — like a second derivative.</p>
        <p>The pattern: every entry is (difference of its two neighbours on the left) ÷ (width of everything it covers). The span grows by one point per column.</p>` },
      { q: 'Why do we read the coefficients from the top edge?', a: `
        <p>The top entries are ${v('f', '')}[${v('x', 1)}], <i>f</i>[${v('x', 1)} ${v('x', 2)}], <i>f</i>[${v('x', 1)} ${v('x', 2)} ${v('x', 3)}], … — every one starts at ${v('x', 1)}. Those are exactly the ${v('c', 'k')} for the factors (${x} − ${v('x', 1)}), (${x} − ${v('x', 1)})(${x} − ${v('x', 2)}), … The other entries are helpers needed to compute them.</p>
        <p><b>Bonus:</b> the <b>bottom</b> edge also works, if you use the base points in reverse: <i>P</i>(${x}) = <i>f</i>[${v('x', 'n')}] + <i>f</i>[${v('x', 'n−1')} ${v('x', 'n')}](${x} − ${v('x', 'n')}) + ⋯. Same polynomial, written from the other end.</p>` },
      { q: 'Does the order of the points matter?', a: `
        <p>Not for the final polynomial — it is unique. The <b>triangle</b> and the Newton form look different for a different order, but after expanding you get the same <i>P</i>(${x}). In fact <i>f</i>[${v('x', 1)} ${v('x', 2)} ${v('x', 3)}] does not change if you shuffle the three points; it is always the ${x}<sup>2</sup>-coefficient of the parabola through them.</p>
        <p>The x-values do <b>not</b> need to be sorted. Just keep each ${x} with its own ${v('y', '')}.</p>` },
      { q: 'Why is adding a new point so cheap?', a: `
        <p>Because of the shape of the formula: the old terms already fit the old points, and a new term with all the old factors is zero there. Add the new point as one more row at the bottom, compute the new diagonal (one number per column), and the new top-edge number is the one new coefficient. Lagrange would have to rebuild every ${v('L', 'k')}.</p>` },
      { q: 'What do the numbers in the triangle mean?', a: `
        <ul><li>1st differences are slopes, so they approximate ${f}′.</li>
        <li>2nd differences approximate ${f}″/2.</li>
        <li>In general, <i>f</i>[${v('x', 1)} … ${v('x', 'k+1')}] = ${f}<sup>(<i>k</i>)</sup>(<i>c</i>)/<i>k</i>! for some <i>c</i> in the span.</li></ul>
        <p>So if the data come from a cubic, the 3rd differences are all equal and the 4th are all zero. A column of zeros tells you the true degree — that is why "zeros on the top edge" means a lower-degree polynomial. This is also where the interpolation-error formula in the next topic comes from.</p>` },
      { q: 'How do I answer "how many polynomials of degree d pass through these points?"', a: `
        <p>Build the triangle and find the degree <i>D</i> (the last nonzero top-edge entry). With <i>n</i> points:</p>
        <ul><li><i>d</i> &lt; <i>D</i>: <b>none</b> — too few coefficients to bend enough.</li>
        <li><i>d</i> = <i>D</i>: <b>exactly one</b>.</li>
        <li><i>D</i> &lt; <i>d</i> ≤ <i>n</i> − 1: <b>none</b> — the unique polynomial of degree ≤ <i>n</i> − 1 has degree <i>D</i>, not <i>d</i>.</li>
        <li><i>d</i> ≥ <i>n</i>: <b>infinitely many</b> — add <i>c</i>(${x} − ${v('x', 1)})⋯(${x} − ${v('x', 'n')}) for any <i>c</i> ≠ 0.</li></ul>` },
      { q: 'How do I check a triangle quickly?', a: `
        <ul><li>Every entry: <b>lower − upper</b> on top, <b>end x − start x</b> below. If one is flipped and the other isn\'t, the sign is wrong.</li>
        <li>Write <i>P</i>(${x}) and plug in each data x — you must get each y back (CALC).</li>
        <li>Keep fractions. A decimal like 0.333 in column 2 will spoil every number to its right.</li></ul>` },
      { q: 'What do exam questions look like?', a: `
        <ul><li>"Use divided differences to find the interpolating polynomial" → triangle, top edge, Newton form (expand only if asked).</li>
        <li>"Estimate ${f}(<i>a</i>)" → evaluate the Newton form with nested multiplication.</li>
        <li>"A new data point arrives; update the polynomial" → one new row, one new term.</li>
        <li>"How many polynomials of degree <i>d</i> …?" → degree from the top edge.</li>
        <li>Applications: CO₂ by year, fan lifetime by temperature, population estimates.</li></ul>` },
    ],

    /* ------------------------------------------------------------------ */
    'interp-error': [
      { q: 'What does each part of the error formula mean?', a: `
        ${eq(f + '(' + x + ') − <i>P</i>(' + x + ') = ' + fr('(' + x + ' − ' + v('x', 1) + ')(' + x + ' − ' + v('x', 2) + ')⋯(' + x + ' − ' + v('x', 'n') + ')', '<i>n</i>!') + ' ' + f + '<sup>(<i>n</i>)</sup>(<i>c</i>)')}
        <ul><li><b>The product</b> depends only on where the nodes are and where you evaluate. It is zero at every node.</li>
        <li><b><i>n</i>!</b> grows fast, which helps the error shrink as you add points.</li>
        <li><b>${f}<sup>(<i>n</i>)</sup>(<i>c</i>)</b> measures how "wiggly" the true function is. For a polynomial of degree &lt; <i>n</i> it is 0 — interpolation is then exact.</li></ul>` },
      { q: 'Why is the error zero at the nodes but not in between?', a: `
        <p><i>P</i> was built to pass through the data, so at a node ${f} − <i>P</i> = 0, and the product (${x} − ${v('x', 1)})⋯ has a zero factor there too. Between the nodes nothing forces agreement; the product shows how big the gap can get. It is a polynomial of degree <i>n</i> that wiggles between the nodes, with its biggest swings near the ends.</p>` },
      { q: 'Where do the n! and the n-th derivative come from?', a: `
        <p>Here is the idea of the proof. Fix ${x} and build a helper function that is zero at the <i>n</i> nodes <b>and</b> at ${x} — that is <i>n</i> + 1 zeros. Rolle\'s theorem says between two zeros of a function there is a zero of its derivative. Apply it <i>n</i> times: the <i>n</i>-th derivative of the helper has a zero at some <i>c</i>. Taking <i>n</i> derivatives of (${x} − ${v('x', 1)})⋯(${x} − ${v('x', 'n')}) produces <i>n</i>!, and <i>P</i> disappears because its degree is less than <i>n</i>.</p>
        <p>You don\'t need to reproduce this on most exams, but it explains why the formula looks like a Taylor remainder.</p>` },
      { q: 'Why do we use the maximum of the derivative?', a: `
        <p>We don\'t know <i>c</i> — only that it lies somewhere between the smallest and largest of ${x}, ${v('x', 1)}, …, ${v('x', 'n')}. To get a guarantee, assume the worst case: replace |${f}<sup>(<i>n</i>)</sup>(<i>c</i>)| by its largest value on that interval. The result is an <b>upper bound</b>: the true error is never bigger, and is usually smaller.</p>` },
      { q: 'How do I find the maximum of the n-th derivative?', a: `
        <ul><li><b>sin ${x}, cos ${x}</b>: every derivative is ±sin or ±cos, so at most <b>1</b>.</li>
        <li><b><i>e</i><sup>${x}</sup></b>: every derivative is <i>e</i><sup>${x}</sup>, largest at the <b>right</b> end: <i>e</i><sup><i>b</i></sup>.</li>
        <li><b><i>e</i><sup>−${x}</sup></b>: ±<i>e</i><sup>−${x}</sup>, largest at the <b>left</b> end: <i>e</i><sup>−<i>a</i></sup>.</li>
        <li><b>ln ${x}</b>: ${f}<sup>(<i>n</i>)</sup> = (−1)<sup><i>n</i>−1</sup>(<i>n</i> − 1)!/${x}<sup><i>n</i></sup>, largest at the left end.</li>
        <li><b>A polynomial of degree <i>n</i></b>: the <i>n</i>-th derivative is a constant.</li></ul>` },
      { q: 'Does adding more points always make the error smaller?', a: `
        <p><b>No.</b> With equally spaced nodes, the product (${x} − ${v('x', 1)})⋯(${x} − ${v('x', 'n')}) becomes huge near the ends, and for some smooth functions (like 1/(1 + 12${x}<sup>2</sup>)) the derivatives grow faster than <i>n</i>! shrinks. The polynomial then wiggles wildly near the ends — the <b>Runge phenomenon</b>.</p>
        <p>Two fixes: choose the nodes cleverly (Chebyshev, next topic) or use piecewise polynomials (splines).</p>` },
      { q: 'What do exam questions look like?', a: `
        <ul><li>"Find an upper bound for |${f}(<i>a</i>) − <i>P</i>(<i>a</i>)|" → product at <i>a</i>, ÷ <i>n</i>!, × max |${f}<sup>(<i>n</i>)</sup>|.</li>
        <li>"Where is the error larger, at 0.25 or 0.75?" → compare the products.</li>
        <li>"How many nodes are needed for 6-digit accuracy?" → try increasing <i>n</i> until the bound is small enough.</li></ul>` },
    ],

    /* ------------------------------------------------------------------ */
    chebyshev: [
      { q: 'What are we trying to minimise?', a: `
        <p>In the error formula only one part depends on our choice of nodes: the product (${x} − ${v('x', 1)})⋯(${x} − ${v('x', 'n')}). Chebyshev asked: which nodes make the <b>largest value</b> of this product on the interval as small as possible? Make that small and the error bound is small for every ${f} at once.</p>` },
      { q: 'Why cosines? Why do the nodes bunch up at the ends?', a: `
        <p>With equally spaced nodes the product is small in the middle but large near the ends. To flatten it out you need <b>more nodes near the ends</b>, where the product wants to grow.</p>
        <p>Equal angles on a half-circle, projected down to the ${x}-axis, do exactly that: near the ends the circle is almost vertical, so equal angle steps give tiny ${x} steps. The ${x}-values of those points are cos((2<i>i</i> − 1)π/(2<i>n</i>)). The resulting product goes up and down with <b>equal-height</b> bumps — the flattest possible.</p>` },
      { q: 'How does the formula for [a, b] come from [−1, 1]?', a: `
        <p>Stretch and shift. A number <i>t</i> in [−1, 1] maps to [<i>a</i>, <i>b</i>] by</p>
        ${eq(x + ' = ' + fr('<i>b</i> + <i>a</i>', '2') + ' + ' + fr('<i>b</i> − <i>a</i>', '2') + '·<i>t</i>')}
        <p>(<i>t</i> = −1 gives <i>a</i>, <i>t</i> = 1 gives <i>b</i>, <i>t</i> = 0 gives the midpoint.) Put <i>t</i> = cos((2<i>i</i> − 1)π/(2<i>n</i>)) and you get the general node formula. Stretching by (<i>b</i> − <i>a</i>)/2 multiplies each of the <i>n</i> factors of the product by that amount, which is why the bound becomes ((<i>b</i> − <i>a</i>)/2)<sup><i>n</i></sup>/2<sup><i>n</i>−1</sup>.</p>` },
      { q: 'Where does 1/2ⁿ⁻¹ come from?', a: `
        <p>The Chebyshev polynomial <i>T</i><sub><i>n</i></sub>(${x}) = cos(<i>n</i> arccos ${x}) has its roots exactly at the Chebyshev nodes and its leading coefficient is 2<sup><i>n</i>−1</sup>. So</p>
        ${eq('(' + x + ' − ' + v('x', 1) + ')⋯(' + x + ' − ' + v('x', 'n') + ') = ' + fr('<i>T</i><sub><i>n</i></sub>(' + x + ')', '2<sup><i>n</i>−1</sup>'))}
        <p>Since |cos(anything)| ≤ 1, |<i>T</i><sub><i>n</i></sub>| ≤ 1 on [−1, 1], and the product is at most 1/2<sup><i>n</i>−1</sup>.</p>` },
      { q: 'How much better is it, really?', a: `<p class="cheb-compare">${'Computing…'}</p>` , live: 'chebCompare' },
      { q: 'How do I use the recursion for Tₙ?', a: `
        ${eq('<i>T</i><sub>0</sub> = 1, &nbsp; <i>T</i><sub>1</sub> = ' + x + ', &nbsp; <i>T</i><sub><i>n</i>+1</sub>(' + x + ') = 2' + x + '·<i>T</i><sub><i>n</i></sub>(' + x + ') − <i>T</i><sub><i>n</i>−1</sub>(' + x + ')')}
        <p>So <i>T</i><sub>2</sub> = 2${x}·${x} − 1 = 2${x}<sup>2</sup> − 1 and <i>T</i><sub>3</sub> = 2${x}(2${x}<sup>2</sup> − 1) − ${x} = 4${x}<sup>3</sup> − 3${x}. For a number, keep the previous two values and repeat. Check against cos(<i>n</i> arccos ${x}) in radians.</p>` },
      { q: 'What do exam questions look like?', a: `
        <ul><li>"Find the <i>n</i> Chebyshev nodes on [<i>a</i>, <i>b</i>]."</li>
        <li>"Find a worst-case error bound for interpolating ${f} by a degree-<i>d</i> polynomial at Chebyshev nodes" → <i>n</i> = <i>d</i> + 1, product bound ÷ <i>n</i>! × max |${f}<sup>(<i>n</i>)</sup>|.</li>
        <li>"How many nodes give 10 correct digits?" → increase <i>n</i> until the bound is below 0.5 × 10<sup>−10</sup>.</li></ul>` },
    ],

    /* ------------------------------------------------------------------ */
    spline: [
      { q: 'Why not just use one polynomial through all the points?', a: `
        <p>With many points, one polynomial has a high degree and tends to wiggle between and beyond the points (the Runge phenomenon). It is also sensitive: moving one point changes the curve everywhere. A spline uses a low-degree piece on each gap, so each point only affects the curve near it.</p>` },
      { q: 'Why cubic pieces, and not lines or parabolas?', a: `
        <p>Lines (linear splines) have corners. Parabolas can match slopes but not curvature. <b>Cubics</b> are the lowest degree that can match value, slope <b>and</b> curvature at every join, so the curve looks smooth to the eye. Physically it is the shape a thin flexible ruler takes when bent through pins.</p>` },
      { q: 'Why are two extra conditions needed?', a: `
        <p>Count. With <i>n</i> points there are <i>n</i> − 1 pieces, each with 3 unknowns (<i>b</i>, <i>c</i>, <i>d</i>): 3<i>n</i> − 3 unknowns. The rules give: each piece ends at the next point (<i>n</i> − 1 equations), slopes match at the <i>n</i> − 2 inside points, curvatures match there too: (<i>n</i> − 1) + 2(<i>n</i> − 2) = 3<i>n</i> − 5. Two equations short — so we add two <b>end conditions</b>. "Natural" says the curvature is zero at both ends.</p>` },
      { q: 'What do b, c and d mean?', a: `
        <p>For the piece ${v('S', 'i')}(${x}) = ${v('y', 'i')} + ${v('b', 'i')}(${x} − ${v('x', 'i')}) + ${v('c', 'i')}(${x} − ${v('x', 'i')})<sup>2</sup> + ${v('d', 'i')}(${x} − ${v('x', 'i')})<sup>3</sup>:</p>
        <ul><li>${v('b', 'i')} = ${v('S', 'i')}′(${v('x', 'i')}) is the <b>slope</b> at the left point.</li>
        <li>${v('c', 'i')} = ${v('S', 'i')}″(${v('x', 'i')})/2 is <b>half the curvature</b> there — that is why "natural" (zero curvature at the ends) means ${v('c', 1)} = ${v('c', 'n')} = 0.</li>
        <li>${v('d', 'i')} = ${v('S', 'i')}‴/6 says how fast the curvature changes across the piece; that is why ${v('d', 'i')} = (${v('c', 'i+1')} − ${v('c', 'i')})/(3${v('δ', 'i')}).</li></ul>` },
      { q: 'Where does the equation for the c\'s come from?', a: `
        <p>Write the conditions in terms of <i>b</i>, <i>c</i>, <i>d</i>. "Curvatures match" gives ${v('d', 'i')} in terms of the c\'s. "The piece reaches the next point" then gives ${v('b', 'i')} in terms of the c\'s. Put both into "slopes match at the inside point" and everything except the c\'s cancels:</p>
        ${eq(v('δ', 'i−1') + v('c', 'i−1') + ' + 2(' + v('δ', 'i−1') + ' + ' + v('δ', 'i') + ')' + v('c', 'i') + ' + ' + v('δ', 'i') + v('c', 'i+1') + ' = 3(' + fr(v('Δ', 'i'), v('δ', 'i')) + ' − ' + fr(v('Δ', 'i−1'), v('δ', 'i−1')) + ')')}
        <p>The right side is 3 × (change in slope of the data), so if the data lie on a line, all c\'s are 0 and the spline is that line.</p>` },
      { q: 'Natural, clamped, not-a-knot — which one?', a: `
        <ul><li><b>Natural</b>: curvature 0 at both ends. Default when nothing is said.</li>
        <li><b>Clamped</b>: the slopes at the two ends are given. Best if you know them.</li>
        <li><b>Parabolically terminated</b>: the end pieces are parabolas (${v('d', 1)} = ${v('d', 'n−1')} = 0).</li>
        <li><b>Not-a-knot</b>: the first two pieces are the same cubic (and the last two) — what MATLAB\'s spline uses.</li></ul>` },
      { q: 'How do I evaluate S(x) at a number?', a: `
        <p>First find <b>which piece</b> covers that ${x} (the interval [${v('x', 'i')}, ${v('x', 'i+1')}] containing it). Then use that piece only, with (${x} − ${v('x', 'i')}) — the <b>left</b> point of that interval. Using the wrong piece is the most common mistake.</p>` },
      { q: 'What do exam questions look like?', a: `
        <ul><li>"Find the natural cubic spline through these 3 (or 4) points."</li>
        <li>"Check that these pieces form a cubic spline" → test value, slope and curvature at the inside points.</li>
        <li>"Evaluate the spline at ${x} = …" → right piece, left point.</li>
        <li>"How many conditions / unknowns…?" → 3<i>n</i> − 5 vs 3<i>n</i> − 3.</li></ul>` },
    ],

    /* ------------------------------------------------------------------ */
    diff: [
      { q: 'Where does the forward-difference error −(h/2)f″ come from?', a: `
        <p>Taylor\'s theorem: ${f}(${x} + ${h}) = ${f}(${x}) + ${h}${f}′(${x}) + (${h}<sup>2</sup>/2)${f}″(<i>c</i>). Move things around:</p>
        ${eq(fr(f + '(' + x + ' + ' + h + ') − ' + f + '(' + x + ')', h) + ' = ' + f + '′(' + x + ') + ' + fr(h, '2') + f + '″(<i>c</i>)')}
        <p>So the formula is off by about (${h}/2)${f}″ — proportional to ${h}. Halve ${h}, halve the error: <b>first order</b>.</p>` },
      { q: 'Why is the centered difference so much better?', a: `
        <p>Write Taylor for both sides:</p>
        ${eq(f + '(' + x + ' ± ' + h + ') = ' + f + ' ± ' + h + f + '′ + ' + fr(h + '<sup>2</sup>', '2') + f + '″ ± ' + fr(h + '<sup>3</sup>', '6') + f + '‴ + ⋯')}
        <p>Subtract the two: the ${f} and ${f}″ terms <b>cancel</b>, leaving 2${h}${f}′ + (${h}<sup>3</sup>/3)${f}‴. Divide by 2${h}: the error is (${h}<sup>2</sup>/6)${f}‴ — proportional to ${h}<sup>2</sup>. Halve ${h} and the error drops to a quarter: <b>second order</b>. Geometrically, the centered secant is almost parallel to the tangent.</p>` },
      { q: 'Where does the second-derivative formula come from?', a: `
        <p><b>Add</b> the two Taylor expansions instead: ${f}(${x} + ${h}) + ${f}(${x} − ${h}) = 2${f}(${x}) + ${h}<sup>2</sup>${f}″(${x}) + (${h}<sup>4</sup>/12)${f}<sup>(4)</sup> + ⋯. The odd terms cancel, so</p>
        ${eq(f + '″(' + x + ') ≈ ' + fr(f + '(' + x + ' − ' + h + ') − 2' + f + '(' + x + ') + ' + f + '(' + x + ' + ' + h + ')', h + '<sup>2</sup>'))}
        <p>with error about (${h}<sup>2</sup>/12)${f}<sup>(4)</sup>.</p>` },
      { q: 'Why does a tiny h make things worse?', a: `
        <p>Your calculator keeps about 16 significant digits. With ${h} = 10<sup>−12</sup>, ${f}(${x} + ${h}) and ${f}(${x}) agree in the first 12 digits; subtracting cancels them and leaves only ~4 trustworthy digits, which you then divide by a tiny ${h}. This <b>rounding error</b> grows like ε/${h}, while the formula error shrinks like ${h}<sup>2</sup>. The total is smallest in between — around ${h} ≈ 10<sup>−5</sup> for the centered formula.</p>` },
      { q: 'How does Richardson extrapolation work?', a: `
        <p>If the error of a formula is about <i>K</i>${h}<sup><i>n</i></sup>, then using ${h} and ${h}/2:</p>
        ${eq('<i>F</i>(' + h + ') ≈ <i>Q</i> + <i>K</i>' + h + '<sup><i>n</i></sup>, &nbsp; <i>F</i>(' + h + '/2) ≈ <i>Q</i> + <i>K</i>' + h + '<sup><i>n</i></sup>/2<sup><i>n</i></sup>')}
        <p>Multiply the second by 2<sup><i>n</i></sup>, subtract the first, and the error term cancels:</p>
        ${eq('<i>Q</i> ≈ ' + fr('2<sup><i>n</i></sup><i>F</i>(' + h + '/2) − <i>F</i>(' + h + ')', '2<sup><i>n</i></sup> − 1'))}
        <p>For the centered difference (<i>n</i> = 2): (4<i>F</i>(${h}/2) − <i>F</i>(${h}))/3, accurate to order 4.</p>` },
      { q: 'What do exam questions look like?', a: `
        <ul><li>"Approximate ${f}′(1) with the forward/centered formula, ${h} = 0.1, and find the error."</li>
        <li>"Derive the centered formula and its error term" → the two Taylor expansions.</li>
        <li>"What happens as ${h} → 0 on a computer?" → rounding error.</li>
        <li>"Use extrapolation to improve these two estimates."</li></ul>` },
    ],

    /* ------------------------------------------------------------------ */
    integrate: [
      { q: 'What is the idea behind all these rules?', a: `
        <p>We can\'t always integrate ${f} exactly, but we can integrate a polynomial. So: <b>interpolate ${f} with a simple polynomial on each panel and integrate that</b>. A line through 2 points gives the Trapezoid Rule; a parabola through 3 points gives Simpson\'s Rule. These are the Newton–Cotes formulas.</p>` },
      { q: 'Where do the trapezoid weights 1, 2, 2, …, 2, 1 come from?', a: `
        <p>One panel is a trapezoid with parallel sides ${v('y', 0)}, ${v('y', 1)} and width ${h}: area ${h}(${v('y', 0)} + ${v('y', 1)})/2. Add up all panels:</p>
        ${eq(fr(h, '2') + '(' + v('y', 0) + ' + ' + v('y', 1) + ') + ' + fr(h, '2') + '(' + v('y', 1) + ' + ' + v('y', 2) + ') + ⋯ = ' + fr(h, '2') + '[' + v('y', 0) + ' + 2' + v('y', 1) + ' + 2' + v('y', 2) + ' + ⋯ + ' + v('y', 'n') + ']')}
        <p>Every inside point is shared by two trapezoids, so it is counted twice. The two ends belong to one trapezoid each.</p>` },
      { q: 'Where does Simpson\'s 1, 4, 1 come from?', a: `
        <p>The parabola through (−${h}, ${v('y', 0)}), (0, ${v('y', 1)}), (${h}, ${v('y', 2)}) has area ${h}/3·(${v('y', 0)} + 4${v('y', 1)} + ${v('y', 2)}) — you can check by integrating <i>a</i>${x}<sup>2</sup> + <i>b</i>${x} + <i>c</i> from −${h} to ${h}. The middle point gets weight 4 because the parabola "leans" on it most.</p>
        <p>Composite Simpson glues pairs of panels together; where two pairs meet, the shared point gets 1 + 1 = 2. So the weights are 1, 4, 2, 4, 2, …, 4, 1 — and <i>n</i> must be <b>even</b> because the panels come in pairs.</p>` },
      { q: 'Why is Simpson exact for cubics?', a: `
        <p>Its error term contains ${f}<sup>(4)</sup>, the fourth derivative, which is zero for any cubic. (Surprising, since we only fitted a parabola — the cubic error cancels by symmetry.) That is why Simpson\'s "degree of precision" is 3, while the Trapezoid and Midpoint rules are exact only for lines.</p>` },
      { q: 'How many panels do I need for a given accuracy?', a: `
        <p>Set the error bound below your target and solve for ${h}. <b>Example:</b> ∫<sub>0</sub><sup>1</sup> <i>e</i><sup>${x}</sup>d${x} to within 10<sup>−4</sup>.</p>
        <ul><li><b>Trapezoid:</b> (<i>b</i> − <i>a</i>)${h}<sup>2</sup>/12 · max|${f}″| = ${h}<sup>2</sup><i>e</i>/12 &lt; 10<sup>−4</sup> ⟹ ${h} &lt; 0.0210 ⟹ <i>n</i> ≥ <b>48</b> panels.</li>
        <li><b>Simpson:</b> (<i>b</i> − <i>a</i>)${h}<sup>4</sup>/180 · max|${f}<sup>(4)</sup>| = ${h}<sup>4</sup><i>e</i>/180 &lt; 10<sup>−4</sup> ⟹ ${h} &lt; 0.285 ⟹ <i>n</i> ≥ <b>4</b> panels (even).</li></ul>
        <p>Same accuracy, 12 times fewer points. That is why Simpson is the usual choice.</p>` },
      { q: 'What is the Midpoint Rule good for?', a: `
        <p>It uses the function value at the middle of each panel and never touches the endpoints — an <b>open</b> formula. That helps when ${f} is undefined at an end, like ∫<sub>0</sub><sup>1</sup> sin ${x}/${x} d${x} at ${x} = 0. Its error is about half the Trapezoid error, with the opposite sign.</p>` },
      { q: 'What do exam questions look like?', a: `
        <ul><li>"Approximate ∫ with the composite Trapezoid/Simpson Rule, <i>n</i> = 4" → table of ${v('x', 'i')}, ${v('y', 'i')}, weights.</li>
        <li>"Find the error / compare with the exact value."</li>
        <li>"How many panels for error &lt; 10<sup>−6</sup>?" → solve the error bound for ${h}.</li>
        <li>"Which rule is exact for this polynomial?" → degree of precision.</li></ul>` },
    ],
  };

  /* Answers that compute their numbers live, so they always match the engine. */
  NM.EXPLAIN_LIVE = {
    chebCompare(el) {
      const n = 10, N = 4000;
      const maxProd = (xs) => { let m = 0; for (let k = 0; k <= N; k++) { const t = -1 + (2 * k) / N; const p = Math.abs(xs.reduce((q, xi) => q * (t - xi), 1)); if (p > m) m = p; } return m; };
      const eqs = Array.from({ length: n }, (_, k) => -1 + (2 * k) / (n - 1));
      const ch = E.chebNodes(n, -1, 1).map((d) => d.x);
      const a = maxProd(eqs), b = maxProd(ch);
      el.innerHTML = '<p>Take <i>n</i> = ' + n + ' nodes on [−1, 1] and compute the largest value of |(<i>x</i> − ' + v('x', 1) + ')⋯(<i>x</i> − ' + v('x', 10) + ')|:</p>' +
        '<ul><li>equally spaced nodes: <b>' + E.fmtE(a, 3) + '</b></li><li>Chebyshev nodes: <b>' + E.fmtE(b, 3) + '</b> (= 1/2<sup>9</sup>)</li></ul>' +
        '<p>The Chebyshev product is about <b>' + Math.round(a / b) + ' times smaller</b> at its worst point — and the gap grows quickly as <i>n</i> increases. Same number of function values, much better guarantee.</p>';
    },
  };
})(window.NM);
