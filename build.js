/* Builds self-contained HTML files from src/.
   Run:  node build.js
     dist/Numerical-Methods-Reviewer.html            — offline file: double-click to open
     dist/artifact/Numerical-Methods-Reviewer.html   — same app, shaped for the claude.ai page viewer
     dist/web/                                       — the website for Vercel: installable, works offline after one visit */
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src');
const page = fs.readFileSync(path.join(src, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(src, 'styles.css'), 'utf8');
const block = /<!--BUILD:JS-->([\s\S]*?)<!--\/BUILD:JS-->/.exec(page)[1];
const files = [...block.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const js = files.map((f) => '/* ---- ' + f + ' ---- */\n' + fs.readFileSync(path.join(src, f), 'utf8')).join('\n').replace(/<\/script/gi, '<\\/script');
const title = /<title>([^<]*)<\/title>/.exec(page)[1];
const description = /<meta name="description" content="([^"]*)">/.exec(page)[1];

// 1. offline file
let offline = page.replace(/<!--BUILD:CSS-->[\s\S]*?<!--\/BUILD:CSS-->/, () => '<style>\n' + css + '\n</style>');
offline = offline.replace(/<!--BUILD:JS-->[\s\S]*?<!--\/BUILD:JS-->/, () => '<script>\n' + js + '\n</script>');

// 2. artifact: no document skeleton of its own (the viewer adds it), title first
const artifact = [
  '<title>' + title + '</title>',
  '<meta name="claude:viewport-fit-sides" content="cover">',
  '<meta name="description" content="' + description + '">',
  '<style>\n' + css + '\n</style>',
  '<noscript><p style="padding:24px">This reviewer needs JavaScript turned on.</p></noscript>',
  '<script>window.NM = { ARTIFACT: true };</script>',
  '<script>\n' + js + '\n</script>',
].join('\n');

const write = (rel, text) => {
  const out = path.join(__dirname, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, text);
  console.log('Built ' + rel + ' (' + Math.round(text.length / 1024) + ' KB)');
};
write('dist/Numerical-Methods-Reviewer.html', offline);
write('dist/artifact/Numerical-Methods-Reviewer.html', artifact);

// 3. website: the offline file plus an app manifest, icons and an offline cache (service worker)
const web = path.join(src, 'web');
const head = [
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="NumMethods">',
].join('\n');
const register = '<script>if (\'serviceWorker\' in navigator) window.addEventListener(\'load\', function () { navigator.serviceWorker.register(\'sw.js\').catch(function () {}); });</script>';
write('dist/web/index.html', offline.replace('</head>', head + '\n</head>').replace('</body>', register + '\n</body>'));
write('dist/web/sw.js', fs.readFileSync(path.join(web, 'sw.js'), 'utf8').replace('__BUILD_ID__', Date.now().toString(36)));
['manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png'].forEach((f) => fs.copyFileSync(path.join(web, f), path.join(__dirname, 'dist', 'web', f)));
console.log(files.length + ' scripts inlined; web icons and manifest copied');
