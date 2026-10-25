/* main.js — layout, navigation and routing. Loaded last. */
(function (NM) {
  'use strict';
  const { UI } = NM;
  const { h } = UI;

  const UNITS = [
    ['prelim', 'Prelim'],
    ['midterm', 'Midterm'],
    ['finals', 'Finals preview'],
  ];
  NM.UNITS = UNITS;
  NM.unitName = (u) => (UNITS.find((x) => x[0] === u) || [u, u])[1];
  NM.CURRENT = 'ndd';

  const ICON = {
    learn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></svg>',
    examples: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.5 6l1.5 1.5L8 4.5M3.5 12l1.5 1.5L8 10.5M3.5 18l1.5 1.5L8 16.5"/></svg>',
    practice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1-4L16 5l3 3L8 19z"/><path d="M14 7l3 3"/></svg>',
    solve: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><path d="M8 6.5h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5v3M8.5 18h.01M12 18h.01"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    theme: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor"/></svg>',
  };
  const TABS = [['learn', 'Learn'], ['examples', 'Examples'], ['practice', 'Practice'], ['solve', 'Solver']];

  let side, content, crumbs;

  /* The route lives in memory as well as the hash: inside a sandboxed viewer
     the hash can't change, but links still have to work. */
  NM._route = null;
  const currentHash = () => NM._route || location.hash || '#/';
  NM.navigate = (href) => {
    NM._route = href;
    try { history.pushState(null, '', href); } catch (e) { /* sandboxed: keep the route in memory only */ }
    route();
  };
  /* A plain #ndd or #drill in a shared link opens that topic or page. */
  function initialRoute() {
    const m = /^#([A-Za-z0-9._~-]+)$/.exec(location.hash);
    if (m) {
      const k = m[1].toLowerCase();
      if (NM.topic(k)) return '#/t/' + k + '/learn';
      if (NM.pages[k]) return '#/' + k;
    }
    return location.hash || '#/';
  }

  function navLink(href, label, extra, num) {
    return h('a', { href, 'data-href': href }, num !== undefined ? h('span', { class: 'num', text: num }) : null, h('span', { class: 'label', html: label }), extra || null);
  }
  function buildNav() {
    const nav = h('nav', { class: 'nav', 'aria-label': 'Topics' });
    nav.appendChild(navLink('#/', 'Home'));
    nav.appendChild(navLink('#/plan', 'How to study'));
    UNITS.forEach(([u, name]) => {
      nav.appendChild(h('div', { class: 'nav-group', text: name }));
      NM.topics.filter((t) => t.unit === u).forEach((t) => {
        const extra = t.id === NM.CURRENT ? h('span', { class: 'now', text: 'NOW' }) : UI.stars(t.id);
        nav.appendChild(navLink('#/t/' + t.id + '/learn', t.title, extra, t.num));
      });
    });
    nav.appendChild(h('div', { class: 'nav-group', text: 'Review' }));
    nav.appendChild(navLink('#/formulas', 'Formula sheet'));
    nav.appendChild(navLink('#/drill', 'Exam drill'));
    nav.appendChild(navLink('#/tips', 'Calculator & exam tips'));
    nav.appendChild(navLink('#/settings', 'Settings'));
    return nav;
  }
  UI.refreshNav = () => {
    const old = side.querySelector('nav');
    old.replaceWith(buildNav());
    markActive();
  };
  function markActive() {
    const hash = currentHash();
    side.querySelectorAll('a[data-href]').forEach((a) => {
      const href = a.getAttribute('data-href');
      const on = href === hash || (href.startsWith('#/t/') && hash.startsWith(href.replace(/\/learn$/, '/')));
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  function layout() {
    const brand = h('a', { class: 'brand', href: '#/' }, h('span', { class: 'brand-mark', text: 'ƒ' }), h('span', null, h('b', { text: 'Numerical Methods' }), h('span', { text: 'Reviewer · works offline' })));
    side = h('aside', { class: 'side' }, brand, h('nav'));
    const menuBtn = h('button', { class: 'btn icon ghost menu-btn', type: 'button', 'aria-label': 'Open the topic list', html: ICON.menu });
    menuBtn.addEventListener('click', () => document.body.classList.toggle('nav-open'));
    crumbs = h('div', { class: 'crumbs' });
    const sizeBtn = h('button', { class: 'btn icon ghost', type: 'button', title: 'Text size', 'aria-label': 'Change text size', style: { fontWeight: '800' } }, 'Aa');
    sizeBtn.addEventListener('click', () => {
      const order = ['normal', 'large', 'xl'];
      UI.settings.size = order[(order.indexOf(UI.settings.size) + 1) % 3];
      UI.saveSettings(); UI.applySize();
      UI.toast('Text size: ' + { normal: 'normal', large: 'large', xl: 'extra large' }[UI.settings.size]);
      route();
    });
    const themeBtn = h('button', { class: 'btn icon ghost', type: 'button', title: 'Light / dark', 'aria-label': 'Switch light or dark mode', html: ICON.theme });
    themeBtn.addEventListener('click', () => {
      const order = ['light', 'dark', 'auto'];
      UI.settings.theme = order[(order.indexOf(UI.settings.theme) + 1) % 3];
      UI.saveSettings(); UI.applyTheme();
      UI.toast('Theme: ' + { light: 'light', dark: 'dark', auto: 'match my device' }[UI.settings.theme]);
      route();
    });
    const top = h('header', { class: 'topbar' }, menuBtn, crumbs, sizeBtn, themeBtn);
    content = h('main', { class: 'content', id: 'content', tabindex: '-1' });
    const scrim = h('div', { class: 'scrim' });
    scrim.addEventListener('click', () => document.body.classList.remove('nav-open'));
    document.body.appendChild(h('div', { class: 'app' }, side, h('div', { class: 'main' }, top, content), scrim));
    UI.refreshNav();
  }

  function topicPage(t, tab) {
    const el = content;
    if (!TABS.some((x) => x[0] === tab)) tab = 'learn';
    const idx = NM.topics.indexOf(t);
    const prev = NM.topics[idx - 1], next = NM.topics[idx + 1];
    el.appendChild(h('div', { class: 'topic-head' },
      h('div', { class: 'meta' },
        h('span', { class: 'badge ' + t.unit, text: 'Topic ' + t.num + ' · ' + NM.unitName(t.unit) }),
        h('span', { class: 'badge', text: t.book }),
        t.id === NM.CURRENT ? h('span', { class: 'badge now', text: 'Your class is here' }) : null),
      h('h1', { text: t.title }),
      h('p', { class: 'tagline', html: t.tagline })));
    el.appendChild(h('nav', { class: 'tabbar', 'aria-label': 'Topic sections' },
      TABS.map(([k, label]) => h('a', { href: '#/t/' + t.id + '/' + k, class: k === tab ? 'on' : '', 'aria-current': k === tab ? 'page' : null, html: ICON[k] + '<span>' + label + '</span>' }))));
    const body = h('div');
    el.appendChild(body);
    if (tab === 'solve') {
      body.appendChild(h('p', { class: 'muted', html: 'Type your own problem (like your homework). You get the full written solution, every number, to compare with your work.' }));
      t.solve(body);
    } else if (tab === 'practice') UI.practice(body, t);
    else if (tab === 'examples') UI.examples(body, t);
    else UI.lessons(body, t);
    el.appendChild(h('div', { class: 'row spread', style: { marginTop: '28px' } },
      prev ? h('a', { class: 'btn ghost', href: '#/t/' + prev.id + '/learn' }, '← ' + prev.title) : h('span'),
      next ? h('a', { class: 'btn ghost', href: '#/t/' + next.id + '/learn' }, next.title + ' →') : h('span')));
    crumbs.innerHTML = '<span>' + t.num + ' · </span><b>' + t.title + '</b>';
    document.title = t.title + ' · Numerical Methods Reviewer';
  }

  function route() {
    const hash = currentHash();
    const parts = hash.replace(/^#\/?/, '').split('/');
    const scrollTo = window.scrollY;
    const sameRoute = route._last === hash;
    route._last = hash;
    content.innerHTML = '';
    document.body.classList.remove('nav-open');
    try {
      if (parts[0] === 't' && NM.topic(parts[1])) {
        topicPage(NM.topic(parts[1]), parts[2] || 'learn');
      } else {
        const name = parts[0] || 'home';
        const page = NM.pages[name] || NM.pages.home;
        const names = { home: 'Numerical Methods Reviewer', plan: 'How to study', formulas: 'Formula sheet', drill: 'Exam drill', tips: 'Calculator & exam tips', settings: 'Settings' };
        crumbs.innerHTML = '<b>' + (names[name] || names.home) + '</b>';
        document.title = 'Numerical Methods Reviewer';
        page(content, crumbs, parts.slice(1));
      }
    } catch (e) {
      console.error(e);
      content.appendChild(UI.error('Something went wrong on this page: ' + e.message));
    }
    markActive();
    if (sameRoute) window.scrollTo(0, scrollTo); else { window.scrollTo(0, 0); content.focus({ preventScroll: true }); }
  }
  NM.route = route;

  function boot() {
    UI.applyTheme();
    UI.applySize();
    layout();
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#/"]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      NM.navigate(a.getAttribute('href'));
    });
    const fromUrl = () => { NM._route = location.hash || '#/'; route(); };
    window.addEventListener('popstate', fromUrl);
    window.addEventListener('hashchange', fromUrl);
    NM._route = initialRoute();
    route();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})(window.NM);
