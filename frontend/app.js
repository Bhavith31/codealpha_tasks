// Single-page frontend. Talks to the Express API with fetch().
const app = document.getElementById('app'), nav = document.getElementById('nav');
let token = localStorage.getItem('token'), me = localStorage.getItem('username');
let scope = 'all';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);

async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

function renderNav() {
  nav.innerHTML = me
    ? `<button id="goMe">@${esc(me)}</button><button id="out">Log out</button>`
    : '';
  if (me) {
    $('#goMe').onclick = () => showProfile(me);
    $('#out').onclick = () => { localStorage.clear(); token = me = null; boot(); };
  }
}

// ---------- Login / Register ----------
function showAuth() {
  app.innerHTML = `<div class="card"><h2>Join Circle</h2>
    <input id="u" placeholder="Username" autocomplete="username">
    <input id="p" type="password" placeholder="Password (6+ characters)" autocomplete="current-password">
    <div class="error" id="err"></div>
    <div class="row"><button class="primary" id="login">Log in</button><button id="reg">Create account</button></div></div>`;
  const go = (kind) => async () => {
    try {
      const d = await api('/' + kind, 'POST', { username: $('#u').value, password: $('#p').value });
      token = d.token; me = d.username;
      localStorage.setItem('token', token); localStorage.setItem('username', me);
      boot();
    } catch (e) { $('#err').textContent = e.message; }
  };
  $('#login').onclick = go('login'); $('#reg').onclick = go('register');
}

// ---------- Feed ----------
const postHTML = (p) => `<article class="card post" data-id="${p.id}">
  <span class="meta"><a class="user" data-user="${esc(p.username)}">@${esc(p.username)}</a> · ${new Date(p.created_at + 'Z').toLocaleString()}</span>
  <p>${esc(p.content)}</p>
  <div class="actions">
    <button class="like ${p.liked ? 'liked' : ''}">${p.liked ? '♥' : '♡'} ${p.likes}</button>
    <button class="cm">Comments ${p.comments}</button>
    ${p.username === me ? '<button class="del">Delete</button>' : ''}
  </div><div class="comments" hidden></div></article>`;

function bindPosts(root, reload) {
  root.querySelectorAll('[data-user]').forEach((a) => a.onclick = () => showProfile(a.dataset.user));
  root.querySelectorAll('.post').forEach((el) => {
    const id = el.dataset.id;
    const guard = async (fn) => { try { await fn(); } catch (e) { alert(e.message); } };
    $('.like', el).onclick = () => guard(async () => { await api(`/posts/${id}/like`, 'POST'); reload(); });
    const del = $('.del', el);
    if (del) del.onclick = () => guard(async () => { await api(`/posts/${id}`, 'DELETE'); reload(); });
    $('.cm', el).onclick = () => guard(async () => {
      const box = $('.comments', el);
      if (!box.hidden) return (box.hidden = true);
      const list = await api(`/posts/${id}/comments`);
      box.innerHTML = list.map((c) => `<div class="comment"><b>@${esc(c.username)}</b> ${esc(c.content)}</div>`).join('')
        + (me ? `<div class="row"><input placeholder="Write a comment"><button>Reply</button></div>` : '<span class="meta">Log in to comment.</span>');
      box.hidden = false;
      const btn = $('button', box);
      if (btn) btn.onclick = () => guard(async () => {
        await api(`/posts/${id}/comments`, 'POST', { content: $('input', box).value });
        reload();
      });
    });
  });
}

async function showFeed() {
  app.innerHTML = `<div class="card"><textarea id="txt" rows="3" maxlength="280" placeholder="What's on your mind?"></textarea>
    <div class="row"><button class="primary" id="send">Post</button><span class="error" id="err"></span></div></div>
    <div class="tabs"><button data-s="all">Everyone</button><button data-s="following">Following</button></div><div id="list"></div>`;
  app.querySelectorAll('.tabs button').forEach((b) => {
    b.classList.toggle('on', b.dataset.s === scope);
    b.onclick = () => { scope = b.dataset.s; showFeed(); };
  });
  $('#send').onclick = async () => {
    try { await api('/posts', 'POST', { content: $('#txt').value }); showFeed(); }
    catch (e) { $('#err').textContent = e.message; }
  };
  const posts = await api('/posts?scope=' + scope);
  $('#list').innerHTML = posts.map(postHTML).join('') || '<p class="empty">No posts yet. Follow people or write the first one.</p>';
  bindPosts($('#list'), showFeed);
}

// ---------- Profile ----------
async function showProfile(username) {
  const u = await api('/users/' + username);
  const mine = u.username === me;
  app.innerHTML = `<div class="card"><h2>@${esc(u.username)}</h2>
    <div class="meta">Joined ${new Date(u.created_at + 'Z').toLocaleDateString()}</div>
    ${mine ? `<input id="bio" maxlength="160" placeholder="Add a short bio" value="${esc(u.bio)}"><button id="save">Save bio</button>`
           : `<p>${esc(u.bio) || '<span class="meta">No bio yet.</span>'}</p>`}
    <div class="stats"><span><b>${u.posts.length}</b>Posts</span><span><b>${u.followers}</b>Followers</span><span><b>${u.following}</b>Following</span></div>
    ${!mine && me ? `<button class="primary" id="follow">${u.is_following ? 'Unfollow' : 'Follow'}</button>` : ''}</div>
    <div id="list">${u.posts.map(postHTML).join('') || '<p class="empty">No posts yet.</p>'}</div>`;
  if (mine) $('#save').onclick = async () => { await api('/me', 'PUT', { bio: $('#bio').value }); showProfile(username); };
  if ($('#follow')) $('#follow').onclick = async () => { await api(`/users/${username}/follow`, 'POST'); showProfile(username); };
  bindPosts($('#list'), () => showProfile(username));
}

function boot() { renderNav(); me ? showFeed() : showAuth(); }
$('#home').onclick = (e) => { e.preventDefault(); boot(); };
boot();
