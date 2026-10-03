// Critical Point: small static-site engine. No build step.
const CP = (() => {
  const TONES = ['kashmir', 'cactus', 'koi', 'mist'];
  const SPANS = ['w4', '', '', '', '', 'w3', 'w3']; // repeating wall rhythm (6-column grid)

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = d => new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Every post keeps the same colour wherever it appears. Add "tone": "koi" (etc.) to a post in posts.json to override.
  const tone = p => {
    if (TONES.includes(p.tone)) return p.tone;
    let h = 0;
    for (const ch of p.slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return TONES[h % TONES.length];
  };

  async function loadPosts() {
    const posts = await (await fetch('posts.json', { cache: 'no-cache' })).json();
    return posts.sort((a, b) => b.date.localeCompare(a.date));
  }

  const href = p => 'post.html?p=' + encodeURIComponent(p.slug);

  function renderIndex(posts) {
    const lead = document.getElementById('lead');
    const wall = document.getElementById('wall');
    const bar = document.getElementById('topics');
    const count = document.getElementById('count');
    const search = document.getElementById('search');

    const topics = ['All', ...new Set(posts.map(p => p.topic))];
    let active = decodeURIComponent(location.hash.slice(1)) || 'All';
    if (!topics.includes(active)) active = 'All';

    function draw() {
      const q = search.value.trim().toLowerCase();
      const shown = posts.filter(p =>
        (active === 'All' || p.topic === active) &&
        (!q || [p.title, p.summary, p.topic].join(' ').toLowerCase().includes(q)));

      const showLead = active === 'All' && !q && shown.length > 0;
      const rest = showLead ? shown.slice(1) : shown;

      lead.innerHTML = showLead ? (p => `
        <a class="cover tone-${tone(p)}" href="${href(p)}">
          <div class="meta">${esc(p.topic)}, ${fmt(p.date)}</div>
          <div>
            <h2>${esc(p.title)}</h2>
            <p class="dek">${esc(p.summary)}</p>
          </div>
        </a>`)(shown[0]) : '';
      lead.hidden = !showLead;

      wall.innerHTML = rest.length ? rest.map((p, i) => `
        <a class="cover ${SPANS[i % SPANS.length]} tone-${tone(p)}" href="${href(p)}">
          <h3>${esc(p.title)}</h3>
          <div class="meta">${esc(p.topic)}, ${fmt(p.date)}</div>
        </a>`).join('')
        : (showLead ? '' : '<p class="empty">No writing matches that. Clear the search or pick another topic.</p>');

      count.textContent = shown.length + (shown.length === 1 ? ' piece' : ' pieces');
      bar.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.t === active));
    }

    bar.innerHTML = topics.map(t => `<button type="button" data-t="${esc(t)}">${esc(t)}</button>`).join('');
    bar.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      active = b.dataset.t;
      history.replaceState(null, '', active === 'All' ? location.pathname : '#' + encodeURIComponent(active));
      draw();
    });
    search.addEventListener('input', draw);
    draw();
  }

  async function renderPost(posts) {
    const head = document.getElementById('head');
    const body = document.getElementById('body');
    const slug = new URLSearchParams(location.search).get('p');
    const p = posts.find(x => x.slug === slug);
    if (!p) {
      head.hidden = true;
      body.innerHTML = '<p>That piece does not exist. <a href="index.html">Go back to all writing</a>.</p>';
      return;
    }
    document.title = p.title + ' | Critical Point';
    head.className = 'reader-head tone-' + tone(p);
    head.innerHTML = `
      <a class="back" href="index.html#${encodeURIComponent(p.topic)}">Back to ${esc(p.topic)}</a>
      <div class="meta">${esc(p.topic)}, ${fmt(p.date)}</div>
      <h1>${esc(p.title)}</h1>
      <p class="dek">${esc(p.summary)}</p>`;
    try {
      const res = await fetch('posts/' + encodeURIComponent(p.slug) + '.md', { cache: 'no-cache' });
      if (!res.ok) throw new Error(res.status);
      body.innerHTML = marked.parse(await res.text());
    } catch (e) {
      body.innerHTML = '<p>This piece could not be loaded. Check that <code>posts/' + esc(p.slug) + '.md</code> exists.</p>';
    }
  }

  return { loadPosts, renderIndex, renderPost };
})();
