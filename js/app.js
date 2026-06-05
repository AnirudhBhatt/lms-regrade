/* ═══════════════════════════════════════════════════════
   app.js — SPA router + shell orchestration
   Bootstraps the entire LMS Regrade application
   ═══════════════════════════════════════════════════════ */
window.LMS = window.LMS || {};

window.LMS.App = (function () {
  'use strict';

  /* ── Nav definitions per role ── */
  const ICONS = {
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    grades: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>',
    requests: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>',
    queue: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>',
    audit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'
  };

  const NAV = {
    student: [
      { href:'#/dashboard',    label:'Dashboard',    icon: ICONS.grid },
      { href:'#/grades',       label:'My Grades',    icon: ICONS.grades },
      { href:'#/my-requests',  label:'My Requests',  icon: ICONS.requests, badge:'requests' }
    ],
    instructor: [
      { href:'#/dashboard',    label:'Dashboard',    icon: ICONS.grid },
      { href:'#/queue',        label:'Request Queue',icon: ICONS.queue,    badge:'pending' },
      { href:'#/audit',        label:'Audit Log',    icon: ICONS.audit }
    ]
  };

  /* ════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════ */
  function init() {
    window.LMS.Notifications.setUpdateCallback(_refreshNotifications);
    _bindShell();
    window.addEventListener('hashchange', _handleRoute);
    _handleRoute();
  }

  function _bindShell() {
    document.getElementById('logout-btn').addEventListener('click', () => { window.LMS.Auth.logout(); onLogout(); });
    document.getElementById('notif-btn').addEventListener('click', _toggleDrawer);
    document.getElementById('close-drawer-btn').addEventListener('click', _closeDrawer);
    document.getElementById('mark-all-read-btn').addEventListener('click', async () => {
      const u = window.LMS.Auth.getCurrentUser();
      if (u) {
        await window.LMS.Store.markAllNotificationsRead(u.id);
        _refreshNotifications();
        window.LMS.Notifications.renderDrawer(u.id);
      }
    });
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('mobile-open');
      document.getElementById('overlay').classList.toggle('hidden');
    });
    document.getElementById('overlay').addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('mobile-open');
      document.getElementById('overlay').classList.add('hidden');
      _closeDrawer();
    });
  }

  /* ════════════════════════════════════════════
     ROUTING
  ════════════════════════════════════════════ */
  function _handleRoute() {
    const hash = window.location.hash || '#/';
    const path = hash.startsWith('#') ? hash.slice(1) : hash;
    const user = window.LMS.Auth.getCurrentUser();

    if (!user && path !== '/login') { window.location.hash = '#/login'; return; }
    if (user  && path === '/login') { window.location.hash = '#/dashboard'; return; }

    navigate(path || '/login');
  }

  async function navigate(path) {
    const user = window.LMS.Auth.getCurrentUser();

    // Preload cache asynchronously
    if (user) {
      // Auto-transition Submitted → Under Review when instructor opens a request details page
      if (user.role === 'instructor' && /^\/queue\/[\w_-]+$/.test(path)) {
        const rid = path.split('/').pop();
        await window.LMS.Store.preload(user);
        const req = window.LMS.Store.getRequest(rid);
        if (req && req.status === 'Submitted') {
          try {
            await window.LMS.Store.updateRequestStatus(rid, 'Under Review');
            await window.LMS.Audit.logStatusChange(rid, user.id, 'instructor', 'Submitted', 'Under Review');
            const student = window.LMS.Store.getUser(req.studentId);
            const asgn = window.LMS.Store.getAssignment(req.assignmentId);
            if (student) {
              await window.LMS.Notifications.notify(student.id, 'info',
                `Your regrade request for ${asgn ? asgn.title : 'an assignment'} is now under review.`, rid);
            }
          } catch (err) {
            console.error("Auto-transition failed:", err);
          }
        }
      }
      await window.LMS.Store.preload(user);
    } else {
      await window.LMS.Store.preload();
    }

    if (!user || path === '/login') { _showLoginShell(); }
    else                            { _showAppShell(user); }

    const content = document.getElementById('page-content');
    if (!content) return;

    let html = '', title = '';

    /* ── Route table ── */
    if (path === '/login' || path === '/') {
      html  = window.LMS.Views.Login.render();
      title = '';

    } else if (path === '/dashboard') {
      html  = window.LMS.Views.Dashboard.render();
      title = 'Dashboard';

    } else if (path === '/grades') {
      html  = window.LMS.Views.GradeView.render();
      title = 'My Grades';

    } else if (path.startsWith('/request/new')) {
      const qs  = path.includes('?') ? path.split('?')[1] : '';
      const aid = new URLSearchParams(qs).get('assignmentId');
      html  = window.LMS.Views.RequestForm.render({ assignmentId: aid });
      title = 'New Request';

    } else if (/^\/request\/[\w_-]+$/.test(path)) {
      const rid = path.split('/').pop();
      html  = _requestDetail(rid, user);
      title = 'Request Detail';

    } else if (path === '/my-requests') {
      html  = _myRequests(user);
      title = 'My Requests';

    } else if (path === '/queue') {
      html  = window.LMS.Views.Queue.render();
      title = 'Request Queue';

    } else if (/^\/queue\/[\w_-]+$/.test(path)) {
      const rid = path.split('/').pop();
      html  = window.LMS.Views.Review.render(rid);
      title = 'Review Request';

    } else if (path === '/audit') {
      html  = _auditLog();
      title = 'Audit Log';

    } else {
      html  = `<div class="empty-state"><div class="empty-state-title">Page not found</div><a href="#/dashboard" class="btn btn-primary mt-lg">Go Home</a></div>`;
      title = '404';
    }

    content.innerHTML = html;
    document.getElementById('page-title').textContent = title;
    _setActiveNav(path);
    window.scrollTo(0, 0);
  }

  /* ════════════════════════════════════════════
     PAGE RENDERERS
  ════════════════════════════════════════════ */
  function _requestDetail(rid, user) {
    if (user.role === 'instructor') return window.LMS.Views.Review.render(rid);
    const req = window.LMS.Store.getRequest(rid);
    if (!req || req.studentId !== user.id) return `<div class="empty-state"><div class="empty-state-title">Not found</div><a href="#/grades" class="btn btn-secondary mt-lg">Back to Grades</a></div>`;
    return window.LMS.Views.RequestForm.renderDetail(rid);
  }

  function _myRequests(user) {
    const reqs = window.LMS.Store.getRequestsByStudent(user.id);
    return `
      <div class="page-header">
        <div class="page-header-content">
          <div class="page-header-title">My Regrade Requests</div>
          <div class="page-header-subtitle">All submitted regrading requests</div>
        </div>
        <div class="page-header-actions">
          <a href="#/grades" class="btn btn-primary">+ New Request</a>
        </div>
      </div>
      ${reqs.length === 0
        ? `<div class="empty-state">
             <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div>
             <div class="empty-state-title">No requests yet</div>
             <div class="empty-state-desc">Go to your grades to submit a regrade request.</div>
             <a href="#/grades" class="btn btn-primary">View Grades</a>
           </div>`
        : `<div class="table-container">
             <table>
               <thead><tr><th>Assignment</th><th>Original</th><th>Claimed</th><th>Status</th><th>Submitted</th><th></th></tr></thead>
               <tbody>
                 ${reqs.map(r => {
                   const a = window.LMS.Store.getAssignment(r.assignmentId);
                   return `<tr style="cursor:pointer" onclick="window.location.hash='#/request/${r.id}'">
                     <td><div style="font-weight:600">${a?a.title:'Unknown'}</div><div style="font-size:11px;color:var(--text-muted)">${a?a.course:''}</div></td>
                     <td style="color:var(--coral);font-weight:600">${r.originalGrade}</td>
                     <td style="color:var(--emerald);font-weight:600">${r.claimedGrade}</td>
                     <td>${window.LMS.Views.Dashboard.getStatusBadge(r.status)}</td>
                     <td style="color:var(--text-muted);font-size:13px">${window.LMS.Notifications.formatTime(r.submittedAt)}</td>
                     <td><a href="#/request/${r.id}" class="btn btn-ghost btn-sm" onclick="event.stopPropagation()">View →</a></td>
                   </tr>`;
                 }).join('')}
               </tbody>
             </table>
           </div>`}`;
  }

  function _auditLog() {
    const logs = window.LMS.Store.getAuditLog().sort((a,b) => new Date(b.timestamp)-new Date(a.timestamp));
    return `
      <div class="page-header">
        <div class="page-header-content">
          <div class="page-header-title">Audit Log</div>
          <div class="page-header-subtitle">Complete immutable record of all regrading activity</div>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary btn-sm" onclick="window.LMS.App.exportAudit('csv')">Export CSV</button>
          <button class="btn btn-secondary btn-sm" onclick="window.LMS.App.exportAudit('json')">Export JSON</button>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>Timestamp</th><th>Action</th><th>Actor</th><th>Request</th><th>From</th><th>To</th></tr>
          </thead>
          <tbody>
            ${logs.map(l => {
              const actor = window.LMS.Store.getUser(l.actorId);
              const SB = window.LMS.Views.Dashboard.getStatusBadge;
              return `<tr>
                <td style="font-size:11px;color:var(--text-muted);white-space:nowrap">${new Date(l.timestamp).toLocaleString()}</td>
                <td><span class="status-badge" style="background:var(--blue-glow);color:var(--blue-light);border:1px solid rgba(67,97,238,.25)">${window.LMS.Audit.getActionLabel(l.action)}</span></td>
                <td><div style="font-weight:500;font-size:13px">${actor?actor.name:l.actorId}</div><div style="font-size:11px;color:var(--text-muted);text-transform:capitalize">${l.actorRole}</div></td>
                <td style="font-size:12px"><a href="#/queue/${l.requestId}" style="color:var(--blue-light);font-family:monospace">${l.requestId}</a></td>
                <td style="font-size:12px;color:var(--text-muted)">${l.fromState||'—'}</td>
                <td>${l.toState ? SB(l.toState) : '—'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* ════════════════════════════════════════════
     EXPORT (Day 5 preview — wired in Day 3)
  ════════════════════════════════════════════ */
  function exportAudit(format) {
    const logs      = window.LMS.Store.getAuditLog();
    const requests  = window.LMS.Store.getAllRequests();
    const decisions = window.LMS.Store.getDecisions();
    let content, filename, mime;

    if (format === 'csv') {
      const H = ['ID','Timestamp','Action','Actor ID','Actor Role','Request ID','From State','To State','Metadata'];
      const R = logs.map(l => [l.id,l.timestamp,l.action,l.actorId,l.actorRole,l.requestId,l.fromState||'',l.toState||'',JSON.stringify(l.metadata||{})]);
      content  = [H,...R].map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
      filename = `regrade_audit_${Date.now()}.csv`;
      mime     = 'text/csv';
    } else {
      content  = JSON.stringify({ generated_at: new Date().toISOString(), audit_log: logs, requests, decisions }, null, 2);
      filename = `regrade_export_${Date.now()}.json`;
      mime     = 'application/json';
    }

    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
    window.LMS.Notifications.showToast('success','Export Complete', `Downloaded ${filename}`);
  }

  /* ════════════════════════════════════════════
     SHELL MANAGEMENT
  ════════════════════════════════════════════ */
  function _showLoginShell() {
    document.getElementById('sidebar').classList.add('hidden');
    document.getElementById('topbar').classList.add('hidden');
    document.getElementById('main-wrapper').style.marginLeft = '0';
    const pageContent = document.getElementById('page-content');
    pageContent.style.padding   = '0';
    pageContent.classList.remove('app-workspace');
  }

  function _showAppShell(user) {
    document.getElementById('sidebar').classList.remove('hidden');
    document.getElementById('topbar').classList.remove('hidden');
    document.getElementById('main-wrapper').style.marginLeft = '';
    const pageContent = document.getElementById('page-content');
    pageContent.style.padding   = '';
    pageContent.classList.add('app-workspace');

    /* Sidebar user info */
    document.getElementById('current-user-info').innerHTML = `
      <div class="user-info-avatar">${user.avatar}</div>
      <div class="user-info-details">
        <div class="user-info-name">${user.name}</div>
        <div class="user-info-role">${user.role}</div>
      </div>`;

    document.getElementById('user-avatar').textContent = user.avatar;
    _renderNav(user);
    _refreshNotifications();
    _updateNavBadges(user);
  }

  function _renderNav(user) {
    const items = NAV[user.role] || [];
    document.getElementById('sidebar-nav').innerHTML = `
      <div class="nav-section-label">Navigation</div>
      ${items.map(item => `
        <a href="${item.href}" class="nav-item" data-href="${item.href}">
          ${item.icon}
          ${item.label}
          ${item.badge ? `<span class="nav-badge" id="nav-badge-${item.badge}" style="display:none">0</span>` : ''}
        </a>`).join('')}`;
  }

  function _setActiveNav(path) {
    document.querySelectorAll('.nav-item').forEach(el => {
      const hp = (el.getAttribute('data-href') || '').slice(1);
      const active = path === hp || (hp !== '/' && path.startsWith(hp));
      el.classList.toggle('active', active);
    });
  }

  function _updateNavBadges(user) {
    if (user.role === 'student') {
      const n = window.LMS.Store.getRequestsByStudent(user.id).filter(r=>r.status!=='Closed').length;
      const b = document.getElementById('nav-badge-requests');
      if (b) { b.textContent = n; b.style.display = n>0?'flex':'none'; }
    } else {
      const n = window.LMS.Store.getAllRequests().filter(r=>r.status==='Submitted').length;
      const b = document.getElementById('nav-badge-pending');
      if (b) { b.textContent = n; b.style.display = n>0?'flex':'none'; }
    }
  }

  /* ════════════════════════════════════════════
     NOTIFICATIONS
  ════════════════════════════════════════════ */
  function _refreshNotifications() {
    const u = window.LMS.Auth.getCurrentUser();
    if (!u) return;
    window.LMS.Notifications.updateBadge(u.id);
    window.LMS.Notifications.renderDrawer(u.id);
    _updateNavBadges(u);
  }

  function _toggleDrawer() {
    const drawer  = document.getElementById('notif-drawer');
    const overlay = document.getElementById('overlay');
    if (drawer.classList.contains('open')) {
      _closeDrawer();
    } else {
      drawer.classList.remove('hidden');
      requestAnimationFrame(() => drawer.classList.add('open'));
      overlay.classList.remove('hidden');
      const u = window.LMS.Auth.getCurrentUser();
      if (u) window.LMS.Notifications.renderDrawer(u.id);
    }
  }

  function _closeDrawer() {
    document.getElementById('notif-drawer').classList.remove('open');
    document.getElementById('overlay').classList.add('hidden');
  }

  /* ── Called from notification items ── */
  async function handleNotifClick(notifId, requestId) {
    await window.LMS.Store.markNotificationRead(notifId);
    _closeDrawer();
    _refreshNotifications();
    if (requestId) {
      const u = window.LMS.Auth.getCurrentUser();
      window.location.hash = u && u.role==='instructor' ? '#/queue/'+requestId : '#/request/'+requestId;
    }
  }

  /* ── Post-login / post-logout ── */
  function onLogin() {
    const u = window.LMS.Auth.getCurrentUser();
    if (u) { _showAppShell(u); window.location.hash = '#/dashboard'; }
  }

  function onLogout() {
    _showLoginShell();
    window.location.hash = '#/login';
  }

  /* ── Bootstrap ── */
  document.addEventListener('DOMContentLoaded', init);

  return { navigate, handleNotifClick, onLogin, onLogout, exportAudit };
})();
