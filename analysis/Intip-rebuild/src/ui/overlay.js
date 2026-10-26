/**
 * overlay.js — Notch behaviour mirroring real Intip:
 * idle (clock/eyes + head peek) -> open (widget slides) with spring animation.
 */
const $ = (sel) => document.querySelector(sel);
const pad = (n) => String(n).padStart(2, '0');

let state = 'idle';          // idle | open
let slideIndex = 0;
let idleTimer = 0;

const notch = $('#notch');
const notchWrap = $('#notchWrap');
const slides = [...document.querySelectorAll('.slide')];
const dots = $('#dots');

/* ---------- Clock ---------- */
function tick() {
  const now = new Date();
  const hm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  $('#idleClock').textContent = hm;
  $('#oTime').textContent = hm;
  $('#idleMusicClock').textContent = hm;
  $('#dkTimeHm').textContent = hm;
  $('#dkTimeDate').textContent = `${now.getDate()}/${now.getMonth() + 1}`;
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  $('#oDate').textContent = `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
}

/* ---------- Slides ---------- */
function showSlide(i) {
  slideIndex = (i + slides.length) % slides.length;
  slides.forEach((s, j) => s.classList.toggle('on', j === slideIndex));
  [...dots.children].forEach((d, j) => d.classList.toggle('on', j === slideIndex));
}

function openNotch() {
  state = 'open';
  notch.dataset.state = 'open';
  notch.style.setProperty('--w', '380px');
  notch.style.setProperty('--h', '160px');
  notch.style.setProperty('--r', '80px');
  clearTimeout(idleTimer);
}

function toIdle() {
  state = 'idle';
  notch.dataset.state = 'idle';
  notch.style.setProperty('--w', '150px');
  notch.style.setProperty('--h', '36px');
  notch.style.setProperty('--r', '18px');
}

/* ---------- Character head (own drawing, no original assets) ---------- */
function drawHead() {
  // Simple original mascot: round face, two eyes, small smile — inspired by,
  // not copied from, the original licensed character art.
  $('#head').innerHTML = `
    <svg viewBox="0 0 120 120">
      <g stroke="#151515" stroke-width="5" stroke-linejoin="round">
        <path d="M34 60C34 44 45 34 60 34C75 34 86 45 86 60C86 77 75 90 60 90C51 90 45 88 40 84C35 80 34 70 34 60Z" fill="#f9d5c5"/>
        <circle cx="44" cy="28" r="10" fill="#151515"/>
        <circle cx="58" cy="22" r="11" fill="#151515"/>
        <circle cx="72" cy="24" r="10" fill="#151515"/>
      </g>
      <g fill="#f09b93" opacity=".55">
        <ellipse cx="43" cy="76" rx="5" ry="3"/><ellipse cx="71" cy="76" rx="5" ry="3"/>
      </g>
      <g fill="#151515">
        <circle cx="49" cy="66" r="3.4"/><circle cx="65" cy="66" r="3.4"/>
      </g>
    </svg>`;
}

/* ---------- Weather ---------- */
const WEATHER_CODES = { 0: 'Cerah', 1: 'Cerah berawan', 2: 'Berawan', 3: 'Berawan tebal', 45: 'Berkabut', 61: 'Hujan', 80: 'Hujan deras', 95: 'Badai' };

/* ---------- Simple widget states (local, like the original's in-memory state) ---------- */
let waterNow = 6, waterGoal = 8;
let pomoLeft = 25 * 60, pomoRun = false;

function wireWidgets() {
  // water
  $('#waterAdd').addEventListener('click', () => {
    waterNow = Math.min(waterGoal, waterNow + 1);
    $('#waterNow').textContent = waterNow;
    $('#waterFill').style.width = Math.round(waterNow / waterGoal * 100) + '%';
  });
  $('#waterFill').style.width = Math.round(waterNow / waterGoal * 100) + '%';

  // pomodoro
  $('#pomoPlay').addEventListener('click', () => {
    pomoRun = !pomoRun;
    $('#pomoPlay').style.opacity = pomoRun ? '1' : '.55';
  });
  setInterval(() => {
    if (!pomoRun) return;
    pomoLeft = Math.max(0, pomoLeft - 1);
    $('#pomoTime').textContent = `${pad(Math.floor(pomoLeft / 60))}:${pad(pomoLeft % 60)}`;
    $('#pomoFill').style.width = Math.round((1 - pomoLeft / (25 * 60)) * 100) + '%';
  }, 1000);
}

/* ---------- Dock ---------- */
function wireDock() {
  const setBat = (level, charging) => {
    $('#dkBatFill').style.width = Math.max(2, Math.round(level * 17)) + 'px';
    $('#dkBatText').textContent = Math.round(level * 100) + '%';
  };
  if (window.intipAPI?.getBattery) {
    window.intipAPI.getBattery().then(setBat).catch(() => setBat(0.85, false));
  } else {
    setBat(0.85, false);
  }

  // dock timer mirrors pomodoro state
  setInterval(() => {
    $('#dkTimerTime').textContent = $('#pomoTime').textContent;
    $('#dkTimerSub').textContent = pomoRun ? 'fokus' : 'minum';
  }, 1000);

  // weather into the dock status area
  window.intipAPI?.getWeather?.().then((w) => {
    if (!w) return;
    $('#dkWx').hidden = false;
    $('#dkWxTemp').textContent = `${w.temp}°C`;
  }).catch(() => {});
}

async function loadWeather() {
  try {
    const s = await window.intipAPI.getSettings();
    if (!s.showWeather) return;
    const w = await window.intipAPI.getWeather();
    if (w === null) return;
    // weather shows on the open header date line
    $('#oDate').textContent += `  ·  ${w.temp}°C`;
  } catch { /* browser-test mode: IPC absent */ }
}

async function init() {
  let s = {};
  try { s = await window.intipAPI.getSettings(); } catch { /* browser test */ }
  $('#oHello').textContent = `Halo, ${s.userName || 'Kawan'}`;

  // dots
  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-label', s.dataset.name);
    b.addEventListener('click', () => showSlide(i));
    dots.appendChild(b);
  });
  showSlide(0);

  // idle: clock ticks; open/close on click; auto-close after 8s idle
  notch.addEventListener('click', () => { if (state === 'idle') openNotch(); });
  // open on hover too (click-through-transparent windows sometimes swallow
  // clicks; hover never fails)
  notch.addEventListener('pointerenter', () => {
    if (state === 'idle') openNotch();
  });
  notch.addEventListener('pointerleave', () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (state === 'open') toIdle(); }, 400);
  });
  $('#slPrev').addEventListener('click', () => showSlide(slideIndex - 1));
  $('#slNext').addEventListener('click', () => showSlide(slideIndex + 1));
  document.addEventListener('pointerdown', (e) => {
    if (state === 'open' && !notch.contains(e.target)) {
      state = 'idle';
      notch.dataset.state = 'idle';
    }
  });
  notch.addEventListener('dblclick', () => {
    $('#notchWrap').classList.toggle('tucked');
  });

  // punch-through forwarding
  document.addEventListener('pointermove', (e) => {
    const r = notch.getBoundingClientRect();
    const inside = e.clientX >= r.left - 19 && e.clientX <= r.right + 19 && e.clientY >= r.top - 2 && e.clientY <= r.bottom;
    window.intipAPI?.notchHit(inside);
  });

  // settings from tray
  window.intipAPI?.onOpenSettings?.(() => openNotch());

  // test hook: ?open=1 keeps the notch open — mirrors the original's
  // ?tahan=10000 param used to observe the open state
  const params = new URLSearchParams(location.search);
  if (params.has('open')) {
    openNotch();
    const hold = Number(params.get('tahan'));
    if (hold) setTimeout(() => { if (state === 'open') toIdle(); }, hold);
  }

  if (s.showWeather) loadWeather();
  wireWidgets();
  wireDock();

  tick();
  setInterval(tick, 1000);
  drawHead();
}

document.addEventListener('DOMContentLoaded', init);
