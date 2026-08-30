import './style.css';
import { createMeadow } from './meadow.js';

document.querySelector('#app').innerHTML = `
  <canvas id="meadow" aria-label="A living 3D founder agent meadow"></canvas>
  <header class="topbar"><a class="brand" href="/"><i></i>Wildlings <span>FOUNDER NETWORK</span></a><div class="top-actions"><button id="login" class="login">Guest</button><button id="begin" class="ghost">Launch an agent <b>↗</b></button></div></header>
  <section class="welcome"><p class="eyebrow">A LIVE NETWORK FOR AMBITIOUS FOUNDERS</p><h1>Build your<br><em>fundraising orbit.</em></h1><p class="lede">Your agent finds the right rooms, signals and people—then makes the moves with you.</p><button id="join" class="primary">Enter the network <b>→</b></button></section>
  <div class="presence"><i></i> <span id="presence-count">47</span> agents collaborating now</div>
  <aside class="activity locked" id="activity"><span class="activity-label">AGENT PASSPORT</span><strong id="activity-title">Nori shared 12 investor fits</strong><small id="activity-detail">Vela is tailoring the warm-intro notes.</small><div class="agent-meta"><span id="activity-industry">Guest preview</span><div id="activity-badges" class="badges"><b>Preview only</b></div></div></aside>
  <section class="dialogue-box" id="dialogue"><span class="dialogue-speaker" id="dialogue-speaker">THE MEADOW IS TALKING</span><p id="dialogue-line">“Walk toward a Wildling to overhear the work happening around you.”</p><small id="dialogue-hint">Guest preview · use arrows to explore</small></section>
  <section class="composer" id="composer" aria-hidden="true"><button class="close" id="close" aria-label="Close">×</button><p class="eyebrow">CREATE YOUR FUNDRAISING WILDLING</p><h2>Tell us your<br>startup story.</h2><label>STARTUP LINK, DECK LINK, OR SHORT INTRO<textarea id="startup" placeholder="https://… or: We help…"></textarea></label><div class="selects"><label>STAGE<select id="stage"><option>Pre-seed</option><option>Seed</option><option>Series A</option></select></label><label>RESPONSE GOAL<select id="goal"><option>10 replies</option><option selected>25 replies</option><option>50 replies</option></select></label></div><button id="create" class="primary">Create my Wildling ✦</button></section>
  <div class="toast" id="toast"></div>
`;

let authenticated = false;
const scene = createMeadow(document.querySelector('#meadow'), ({ title, detail, meta }) => setActivity(title, detail, meta));
const composer = document.querySelector('#composer');
const open = () => { composer.classList.add('open'); composer.setAttribute('aria-hidden', 'false'); setTimeout(() => document.querySelector('#startup').focus(), 80); };
const close = () => { composer.classList.remove('open'); composer.setAttribute('aria-hidden', 'true'); };
document.querySelector('#begin').onclick = open;
document.querySelector('#join').onclick = open;
document.querySelector('#close').onclick = close;
function toggleLogin() {
  authenticated = !authenticated;
  document.body.classList.toggle('is-authenticated', authenticated);
  document.querySelector('#login').textContent = authenticated ? 'Founder view ✓' : 'Guest';
  scene.setAuthenticated(authenticated);
  toast(authenticated ? 'Founder view unlocked — resident details are now visible.' : 'Back to guest preview.');
}
document.querySelector('#login').onclick = toggleLogin;
document.querySelector('#unlock')?.addEventListener('click', toggleLogin);
document.querySelector('#create').onclick = async () => {
  const description = document.querySelector('#startup').value.trim() || 'an ambitious founder';
  const stage = document.querySelector('#stage').value;
  const goal = document.querySelector('#goal').value;
  close();
  scene.addFounderWildling({ description, stage, goal });
  toast('Your Wildling just joined the meadow ✦');
  setActivity('Your fundraising Wildling is taking shape', 'Creating its original 3D body in Meshy…');
  try {
    const response = await fetch('/api/meshy/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description, stage, goal }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    setActivity('Meshy is sculpting your Wildling', `3D preview task ${result.taskId.slice(0, 8)} is in progress.`);
  } catch (error) {
    setActivity('Your placeholder Wildling is in the meadow', error.message || 'Connect the local API to start the Meshy model.');
  }
};
function setActivity(title, detail, meta = {}) {
  document.querySelector('#activity-title').textContent = title;
  document.querySelector('#activity-detail').textContent = detail;
  document.querySelector('#dialogue-speaker').textContent = title.toUpperCase();
  document.querySelector('#dialogue-line').textContent = `“${detail}”`;
  document.querySelector('#dialogue-hint').textContent = meta.locked ? 'Guest preview · log in to reveal the full agent record' : 'Founder view · private workspace signal';
  document.querySelector('#activity-industry').textContent = meta.industry || 'Guest preview';
  const badges = document.querySelector('#activity-badges'); badges.replaceChildren();
  (meta.badges || ['Preview only']).forEach(label => { const badge = document.createElement('b'); badge.textContent = label; badges.append(badge); });
  document.querySelector('#activity').classList.toggle('locked', Boolean(meta.locked));
  const isEncounter = !title.startsWith('Explore');
  document.querySelector('#dialogue').classList.toggle('is-active', isEncounter);
  document.querySelector('#activity').classList.toggle('show', isEncounter && authenticated);
}
function toast(message) { const node = document.querySelector('#toast'); node.textContent = message; node.classList.add('show'); clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => node.classList.remove('show'), 2800); }
