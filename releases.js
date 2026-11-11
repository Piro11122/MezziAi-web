/* MezziAI release system. Loads data/releases.json, validates it, renders the Download page.
   Other pages can reuse it: MezziReleases.load().then(({latest}) => ...) */
(() => {
  'use strict';

  const SRC = document.currentScript && document.currentScript.src;
  const CONFIG = {
    // Resolved from this script's location, so it works on project pages (/repo/) and custom domains.
    dataUrl: SRC ? new URL('../../data/releases.json', SRC).href : '/data/releases.json',
    timeoutMs: 15000,
    releasesPageUrl: '' // optional: your GitHub Releases page (https://...), shown if loading fails
  };

  /* ---------- validation: anything that looks like filler is treated as missing ---------- */
  const FILLER = /^(x+(\.x+)*|\.{2,}|…+|todo|tbd|n\/a|none|null|undefined|placeholder|example|changeme|lorem.*|yyyy-mm-dd|0(\.0)*)$/i;

  function clean(v) {
    if (typeof v === 'number' && Number.isFinite(v)) v = String(v);
    if (typeof v !== 'string') return '';
    v = v.trim();
    return !v || FILLER.test(v) || v.includes('…') ? '' : v;
  }

  function safeUrl(v) {
    v = clean(v);
    if (!v) return '';
    try {
      const u = new URL(v);
      if (u.protocol !== 'https:') return '';
      if (/^(localhost|(.+\.)?example\.(com|org|net))$/i.test(u.hostname)) return '';
      return u.href;
    } catch (e) { return ''; }
  }

  function parseDate(v) {
    v = clean(v);
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) return null;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3] ? d : null;
  }

  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const version = clean(raw.version).replace(/^v/i, '');
    if (!/^\d+(\.\d+){0,3}([-+][0-9A-Za-z.-]+)?$/.test(version)) return null; // no valid version, no release
    const size = Number(raw.sizeBytes);
    const sha = clean(raw.sha256).toLowerCase();
    const shaOk = /^[a-f0-9]{64}$/.test(sha) && !/^(.)\1{63}$/.test(sha);
    return {
      version,
      date: parseDate(raw.date),
      channel: clean(raw.channel),
      minAndroid: clean(raw.minAndroid),
      sizeBytes: Number.isFinite(size) && size > 0 ? size : null,
      sha256: shaOk ? sha : '',
      downloadUrl: safeUrl(raw.downloadUrl),
      notesUrl: safeUrl(raw.notesUrl),
      notes: Array.isArray(raw.notes) ? raw.notes.map(clean).filter(Boolean) : []
    };
  }

  function compareVersions(a, b) {
    const pa = a.split(/[.+-]/).map(n => parseInt(n, 10) || 0);
    const pb = b.split(/[.+-]/).map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pb[i] || 0) - (pa[i] || 0);
      if (d) return -d; // ascending; caller reverses
    }
    return 0;
  }

  class LoadError extends Error {
    constructor(kind, status) { super(kind); this.kind = kind; this.status = status; }
  }

  async function load() {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CONFIG.timeoutMs);
    let res;
    try {
      res = await fetch(CONFIG.dataUrl, { cache: 'no-cache', signal: ctrl.signal });
    } catch (e) {
      throw new LoadError(e && e.name === 'AbortError' ? 'timeout' : 'network');
    } finally { clearTimeout(timer); }
    if (!res.ok) throw new LoadError('http', res.status);

    let json;
    try { json = await res.json(); } catch (e) { throw new LoadError('parse'); }
    if (!json || !Array.isArray(json.releases)) throw new LoadError('format');

    const releases = json.releases.map(normalize).filter(Boolean)
      .sort((a, b) => compareVersions(b.version, a.version));
    const declared = clean(json.latest).replace(/^v/i, '');
    const latest = releases.find(r => r.version === declared) || releases[0] || null;
    return { releases, latest, skipped: json.releases.length - releases.length };
  }

  /* ---------- formatting ---------- */
  function formatSize(bytes) {
    if (!bytes) return '';
    return bytes < 1048576 ? Math.max(1, Math.round(bytes / 1024)) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
  }
  function formatDate(d) {
    if (!d) return '';
    try {
      return new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: 'long', timeZone: 'UTC' }).format(d);
    } catch (e) { return d.toISOString().slice(0, 10); }
  }

  /* ---------- rendering (textContent only: release data is never parsed as HTML) ---------- */
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function link(text, href, cls) {
    const a = el('a', cls, text);
    a.href = href; a.rel = 'noopener';
    return a;
  }
  function fact(list, label, value, cls) {
    if (!value) return; // missing fields are left out, never faked
    const wrap = el('div');
    wrap.append(el('dt', null, label), el('dd', cls, value));
    list.append(wrap);
  }
  function notesList(notes) {
    const ul = el('ul', 'notes');
    notes.forEach(n => ul.append(el('li', null, n)));
    return ul;
  }

  function downloadButton(rel, withSize) {
    if (!rel.downloadUrl) {
      const b = el('span', 'btn', 'Download unavailable');
      b.setAttribute('aria-disabled', 'true');
      return b;
    }
    const size = withSize && rel.sizeBytes ? ' (' + formatSize(rel.sizeBytes) + ')' : '';
    const a = link('Download APK' + size, rel.downloadUrl, 'btn');
    a.setAttribute('download', '');
    return a;
  }

  function renderLatest(root, rel) {
    root.replaceChildren();
    const card = el('div', 'card');

    const head = el('div', 'card-head');
    const title = el('h2', null, 'MezziAI ' + rel.version);
    title.id = 'latest-title';
    head.append(title, el('span', 'badge', 'Latest'));
    if (rel.channel) head.append(el('span', 'badge quiet', rel.channel));
    card.append(head);

    const facts = el('dl', 'facts');
    fact(facts, 'Release date', formatDate(rel.date));
    fact(facts, 'File size', formatSize(rel.sizeBytes));
    fact(facts, 'Requires Android', rel.minAndroid ? rel.minAndroid + ' or later' : '');
    card.append(facts);

    if (rel.notes.length) {
      card.append(el('p', 'sub', 'Release notes'), notesList(rel.notes));
    }

    const actions = el('div', 'actions');
    actions.append(downloadButton(rel, false));
    if (rel.notesUrl) actions.append(link('Full release notes', rel.notesUrl, 'btn ghost'));
    card.append(actions);

    if (!rel.downloadUrl) {
      card.append(el('p', 'hint', 'No download link has been published for this version yet.'));
    }

    if (rel.sha256) {
      const sum = el('dl', 'facts');
      sum.style.margin = '1.5rem 0 0';
      fact(sum, 'SHA-256 checksum', rel.sha256, 'hash');
      card.append(sum);
      if (navigator.clipboard && window.isSecureContext) {
        const copy = el('button', 'btn ghost', 'Copy checksum');
        copy.type = 'button';
        copy.style.marginTop = '.75rem';
        copy.addEventListener('click', () => {
          navigator.clipboard.writeText(rel.sha256).then(
            () => { copy.textContent = 'Copied'; setTimeout(() => (copy.textContent = 'Copy checksum'), 1800); },
            () => { copy.textContent = 'Copy failed'; }
          );
        });
        card.append(copy);
      }
    }
    root.append(card);
    root.hidden = false;
  }

  function renderHistory(section, list, releases) {
    list.replaceChildren();
    if (!releases.length) { section.hidden = true; return; }
    releases.forEach(rel => {
      const item = el('article', 'rel');
      const top = el('div', 'rel-top');
      top.append(el('h3', null, 'Version ' + rel.version));
      const meta = [formatDate(rel.date), formatSize(rel.sizeBytes), rel.channel].filter(Boolean).join(', ');
      if (meta) top.append(el('span', 'rel-meta', meta));
      item.append(top);

      if (rel.notes.length) {
        const d = el('details');
        d.append(el('summary', null, 'Release notes'), notesList(rel.notes));
        item.append(d);
      }
      if (rel.downloadUrl) {
        const a = link('Download this version', rel.downloadUrl, 'btn ghost');
        a.setAttribute('download', '');
        a.style.marginTop = '.5rem';
        item.append(a);
      }
      list.append(item);
    });
    section.hidden = false;
  }

  /* ---------- page states ---------- */
  const MESSAGES = {
    timeout: 'The release list took too long to load. Check your connection and try again.',
    network: 'The release list could not be reached. Check your connection and try again.',
    http: 'The release list is unavailable right now (server answered with an error). Try again in a few minutes.',
    parse: 'The release list could not be read because the file is not valid JSON.',
    format: 'The release list could not be read because the file is missing its "releases" list.'
  };

  function setState(box, kind, message, retry) {
    box.replaceChildren();
    if (kind === 'loading') {
      box.append(el('div', 'skeleton'));
      box.setAttribute('aria-busy', 'true');
      return;
    }
    box.removeAttribute('aria-busy');
    if (!kind) return;
    const p = el('div', 'notice' + (kind === 'error' ? ' err' : ''));
    p.append(el('p', null, message));
    if (retry) {
      const b = el('button', 'btn', 'Try again');
      b.type = 'button';
      b.addEventListener('click', retry);
      p.append(b);
    }
    if (kind === 'error' && safeUrl(CONFIG.releasesPageUrl)) {
      p.append(link('Open the GitHub releases page', safeUrl(CONFIG.releasesPageUrl), 'btn ghost'));
    }
    box.append(p);
  }

  async function initPage() {
    const box = document.getElementById('state');
    const latestEl = document.getElementById('latest');
    const histSection = document.getElementById('history');
    const histList = document.getElementById('history-list');
    if (!box || !latestEl) return;

    setState(box, 'loading');
    latestEl.hidden = true;
    if (histSection) histSection.hidden = true;

    try {
      const { releases, latest, skipped } = await load();
      if (!latest) {
        const msg = skipped
          ? 'No valid release was found in the release list. Entries need at least a real version number.'
          : 'No release has been published yet. Check back soon.';
        setState(box, 'info', msg);
        return;
      }
      setState(box, null);
      renderLatest(latestEl, latest);
      if (histSection && histList) renderHistory(histSection, histList, releases.filter(r => r !== latest));
      if (skipped) console.warn('[MezziAI] Skipped ' + skipped + ' invalid release entr' + (skipped === 1 ? 'y' : 'ies') + ' in releases.json');
    } catch (e) {
      setState(box, 'error', MESSAGES[e && e.kind] || 'Something went wrong while loading releases.', initPage);
    }
  }

  window.MezziReleases = { load, formatSize, formatDate, config: CONFIG };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPage);
  else initPage();
})();
