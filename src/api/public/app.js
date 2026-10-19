const root = document.querySelector('#app');
const state = {
  token: sessionStorage.getItem('coachdesk-token'),
  user: null,
  view: 'dashboard',
  students: [],
  studentQuery: '',
  busy: false,
};

const bnNumber = new Intl.NumberFormat('bn-BD');
const dateFormatter = new Intl.DateTimeFormat('bn-BD', { dateStyle: 'medium' });

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function money(value) {
  if (value === null || value === undefined) return 'অনুমতি নেই';
  return `৳${Number(value).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function friendlyDate(value) {
  if (!value) return '—';
  try { return dateFormatter.format(new Date(value)); } catch { return value; }
}

async function api(path, options = {}) {
  const headers = { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(path, { ...options, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) signOut(false);
    throw new Error(payload.error?.message || 'অনুরোধটি সম্পন্ন করা যায়নি।');
  }
  return payload.data;
}

function renderLogin(error = '') {
  root.innerHTML = `<main class="login-page">
    <section class="login-card" aria-labelledby="login-title">
      <div class="brand-row"><div class="brand-mark">M</div><div><div class="brand-name">MERQO CoachDesk</div><div class="brand-subtitle">কোচিং সেন্টারের কাজের নির্ভরযোগ্য সহায়ক</div></div></div>
      <h1 id="login-title">স্বাগতম</h1>
      <p class="muted">আপনার স্থানীয় ব্যবস্থাপনা সেবায় প্রবেশ করুন।</p>
      ${error ? `<div class="error-box" role="alert">${escapeHtml(error)}</div>` : ''}
      <form id="login-form">
        <div class="field"><label for="username">ব্যবহারকারীর নাম</label><input id="username" name="username" value="admin" autocomplete="username" required></div>
        <div class="field"><label for="password">পাসওয়ার্ড</label><input id="password" name="password" type="password" placeholder="স্থানীয় উন্নয়ন পাসওয়ার্ড" autocomplete="current-password" required></div>
        <button class="btn btn-primary full" type="submit">নিরাপদে প্রবেশ করুন</button>
      </form>
      <p class="muted small" style="margin:22px 0 0">এটি উন্নয়ন সংস্করণ। প্রকৃত গ্রাহক স্থাপনার জন্য আলাদা নিরাপদ ব্যবহারকারী তৈরি করতে হবে।</p>
    </section>
  </main>`;
  document.querySelector('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector('button');
    button.disabled = true;
    button.textContent = 'প্রবেশ করা হচ্ছে…';
    try {
      const data = await api('/api/v1/auth/login', { method: 'POST', body: JSON.stringify({ username: form.get('username'), password: form.get('password') }) });
      state.token = data.token;
      state.user = data.user;
      sessionStorage.setItem('coachdesk-token', state.token);
      renderShell();
      await loadView();
    } catch (error) {
      renderLogin(error.message);
    }
  });
}

function renderShell() {
  root.innerHTML = `<div class="shell">
    <aside class="sidebar">
      <div class="brand-row"><div class="brand-mark">M</div><div><div class="brand-name">MERQO</div><div class="brand-subtitle">CoachDesk</div></div></div>
      <nav class="nav" aria-label="প্রধান নেভিগেশন">
        <button data-view="dashboard" class="active"><span class="nav-icon">⌂</span> ড্যাশবোর্ড</button>
        <button data-view="students"><span class="nav-icon">◉</span> শিক্ষার্থী</button>
      </nav>
      <div class="sidebar-footer">অফলাইন-প্রথম ব্যবস্থাপনা<br>ডেটা আপনার নিয়ন্ত্রিত সংরক্ষণে থাকে।</div>
    </aside>
    <main class="main">
      <header class="topbar"><div class="topbar-title">MERQO CoachDesk / স্থানীয় সেবা</div><div class="user-pill"><span>${escapeHtml(state.user?.displayName || 'ব্যবহারকারী')}</span><span class="user-avatar">${escapeHtml((state.user?.displayName || 'আ').slice(0, 1))}</span><button class="btn btn-quiet" id="sign-out" type="button">বের হন</button></div></header>
      <section id="content"><div class="loader">তথ্য প্রস্তুত করা হচ্ছে…</div></section>
    </main>
  </div>`;
  document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', async () => {
    state.view = button.dataset.view;
    document.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('active', item === button));
    await loadView();
  }));
  document.querySelector('#sign-out').addEventListener('click', () => signOut(true));
}

function signOut(callApi = true) {
  if (callApi && state.token) api('/api/v1/auth/logout', { method: 'POST' }).catch(() => {});
  state.token = null; state.user = null;
  sessionStorage.removeItem('coachdesk-token');
  renderLogin();
}

async function loadView() {
  const content = document.querySelector('#content');
  if (!content) return;
  content.innerHTML = '<div class="loader">তথ্য প্রস্তুত করা হচ্ছে…</div>';
  try {
    if (state.view === 'students') await renderStudents();
    else await renderDashboard();
  } catch (error) {
    content.innerHTML = `<div class="error-box" role="alert">${escapeHtml(error.message)}</div>`;
  }
}

async function renderDashboard() {
  const metrics = await api('/api/v1/dashboard');
  document.querySelector('#content').innerHTML = `<div class="page-heading"><div><h1>ড্যাশবোর্ড</h1><p>আজকের পরিচালন চিত্র এক নজরে দেখুন।</p></div><div class="action-row"><button class="btn btn-secondary" id="refresh-dashboard">↻ তথ্য হালনাগাদ</button><button class="btn btn-primary" id="new-student">+ শিক্ষার্থী যোগ করুন</button></div></div>
    <div class="metrics">
      ${metric('সক্রিয় শিক্ষার্থী', bnNumber.format(metrics.activeStudents), 'active')}
      ${metric('সক্রিয় কোর্স', bnNumber.format(metrics.activeCourses), 'course')}
      ${metric('সক্রিয় ব্যাচ', bnNumber.format(metrics.activeBatches), 'batch')}
      ${metric('মোট বকেয়া', money(metrics.outstanding), 'money')}
    </div>
    <div class="content-grid">
      <section class="panel"><div class="panel-header"><div><h3>আজকের কার্যক্রম</h3><div class="muted small">সত্যিকারের সংরক্ষিত রেকর্ড থেকে</div></div><span class="status status-active">স্থানীয়</span></div>
        <div class="quick-list">
          ${quickAction('শিক্ষার্থী খুঁজুন', 'নাম, আইডি বা ফোন নম্বর দিয়ে খুঁজুন', 'students')}
          ${quickAction('পেমেন্ট সংগ্রহ', 'সার্ভিস API-তে পেমেন্ট ও বরাদ্দ নিয়ন্ত্রণ আছে', null)}
          ${quickAction('ব্যাকআপ অবস্থা', 'ব্যাকআপ মডিউল এখনো যাচাই পর্যায়ে', null)}
        </div>
      </section>
      <section class="panel"><div class="panel-header"><h3>স্বাস্থ্য ও নিয়ন্ত্রণ</h3><span class="metric-dot"></span></div>
        <div class="notice"><div><strong>অ্যাপ্লিকেশন সেবা সচল</strong>অনুরোধ নিরাপদ API স্তর দিয়ে যাচ্ছে। আজকের কার্যক্রম: ${bnNumber.format(metrics.todayActivity)}টি।</div></div>
        <div style="height:12px"></div>
        <div class="notice"><div><strong>আজকের সংগ্রহ</strong>${money(metrics.todayCollection)}</div></div>
      </section>
    </div>
    <section class="panel table-panel"><div class="panel-header"><div><h3>দ্রুত শুরু</h3><div class="muted small">প্রথমে শিক্ষার্থী ও ভর্তি রেকর্ড তৈরি করুন</div></div></div><div class="empty"><div><strong>আপনার নিজস্ব তথ্য দিয়ে শুরু করুন</strong><br><span class="small">কোনো কৃত্রিম ড্যাশবোর্ড সংখ্যা ব্যবহার করা হয়নি।</span></div></div></section>`;
  document.querySelector('#refresh-dashboard').addEventListener('click', loadView);
  document.querySelector('#new-student').addEventListener('click', () => { state.view = 'students'; document.querySelectorAll('[data-view]').forEach((item) => item.classList.toggle('active', item.dataset.view === 'students')); loadView(); });
  document.querySelectorAll('[data-quick-view="students"]').forEach((item) => item.addEventListener('click', () => { state.view = 'students'; document.querySelectorAll('[data-view]').forEach((nav) => nav.classList.toggle('active', nav.dataset.view === 'students')); loadView(); }));
}

function metric(label, value) { return `<div class="metric"><div class="metric-accent"><div class="metric-label">${label}</div><span class="metric-dot"></span></div><div class="metric-value">${escapeHtml(value)}</div></div>`; }
function quickAction(title, description, view) { return `<button class="quick-action" ${view ? `data-quick-view="${view}"` : 'disabled'}><span class="quick-symbol">${view ? '→' : '·'}</span><span><strong>${title}</strong><br><span class="muted small">${description}</span></span></button>`; }

async function renderStudents() {
  const result = await api(`/api/v1/students?page=1&pageSize=50&query=${encodeURIComponent(state.studentQuery)}`);
  state.students = result;
  document.querySelector('#content').innerHTML = `<div class="page-heading"><div><h1>শিক্ষার্থী</h1><p>একটি শিক্ষার্থীর মাস্টার প্রোফাইল ও ভবিষ্যৎ ভর্তি ইতিহাস আলাদা রাখুন।</p></div><button class="btn btn-primary" id="show-student-form">+ নতুন শিক্ষার্থী</button></div>
    <section class="panel"><div class="search-row"><input class="search-input" id="student-search" value="${escapeHtml(state.studentQuery)}" placeholder="নাম, শিক্ষার্থী আইডি বা ফোন দিয়ে খুঁজুন" aria-label="শিক্ষার্থী খুঁজুন"><button class="btn btn-secondary" id="search-students">খুঁজুন</button></div>
      ${result.length ? `<div class="table-wrap"><table><thead><tr><th>শিক্ষার্থী আইডি</th><th>নাম</th><th>ফোন</th><th>অবস্থা</th><th>তৈরির সময়</th></tr></thead><tbody>${result.map((student) => `<tr><td><strong>${escapeHtml(student.studentId)}</strong></td><td>${escapeHtml(student.nameBn)}${student.nameEn ? `<br><span class="muted small">${escapeHtml(student.nameEn)}</span>` : ''}</td><td>${escapeHtml(student.phone || '—')}</td><td><span class="status ${student.status === 'active' ? 'status-active' : 'status-inactive'}">${student.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</span></td><td>${friendlyDate(student.createdAt)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><div><strong>কোনো শিক্ষার্থী পাওয়া যায়নি</strong><br><span class="small">নতুন শিক্ষার্থী যোগ করে শুরু করুন।</span></div></div>'}
    </section>
    <section id="student-form-slot"></section>`;
  document.querySelector('#search-students').addEventListener('click', () => { state.studentQuery = document.querySelector('#student-search').value; loadView(); });
  document.querySelector('#student-search').addEventListener('keydown', (event) => { if (event.key === 'Enter') { state.studentQuery = event.target.value; loadView(); } });
  document.querySelector('#show-student-form').addEventListener('click', showStudentForm);
}

function showStudentForm() {
  const slot = document.querySelector('#student-form-slot');
  slot.innerHTML = `<section class="panel form-card" style="margin-top:18px"><div class="panel-header"><div><h3>নতুন শিক্ষার্থী</h3><div class="muted small">পরিচয় একবার তৈরি করুন; পরবর্তী ভর্তি আলাদা রেকর্ড হবে।</div></div></div>
    <div id="student-form-message"></div><form id="student-form"><div class="two-col"><div class="field"><label for="nameBn">বাংলা নাম *</label><input id="nameBn" name="nameBn" required maxlength="200"></div><div class="field"><label for="nameEn">ইংরেজি নাম</label><input id="nameEn" name="nameEn" maxlength="200"></div><div class="field"><label for="phone">ফোন নম্বর</label><input id="phone" name="phone" maxlength="25"></div><div class="field"><label for="dateOfBirth">জন্মতারিখ</label><input id="dateOfBirth" name="dateOfBirth" type="date"></div></div><div class="field"><label for="address">ঠিকানা</label><textarea id="address" name="address" maxlength="1000"></textarea></div><div class="form-actions"><button class="btn btn-primary" type="submit">সংরক্ষণ করুন</button><button class="btn btn-secondary" id="cancel-student-form" type="button">বাতিল</button></div></form></section>`;
  document.querySelector('#cancel-student-form').addEventListener('click', () => { slot.innerHTML = ''; });
  document.querySelector('#student-form').addEventListener('submit', submitStudent);
  document.querySelector('#nameBn').focus();
}

async function submitStudent(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const message = document.querySelector('#student-form-message');
  const button = event.currentTarget.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const student = await api('/api/v1/students', { method: 'POST', body: JSON.stringify(Object.fromEntries(form.entries())) });
    message.innerHTML = `<div class="success-box">শিক্ষার্থী <strong>${escapeHtml(student.studentId)}</strong> সফলভাবে সংরক্ষিত হয়েছে।</div>`;
    event.currentTarget.reset();
    await renderStudents();
  } catch (error) {
    message.innerHTML = `<div class="error-box">${escapeHtml(error.message)}</div>`;
    button.disabled = false;
  }
}

async function bootstrap() {
  if (!state.token) { renderLogin(); return; }
  try { state.user = await api('/api/v1/auth/me'); renderShell(); await loadView(); } catch { signOut(false); }
}

bootstrap();
