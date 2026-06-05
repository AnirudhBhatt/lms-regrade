/* ═══════════════════════════════════════════════════════
   views/queue.js — Instructor request queue + filter chips
   Day 3: Full queue with stats + filterable list
   Contributor: Himanshu Kadyan (Himanshukdyn)
   ═══════════════════════════════════════════════════════ */
window.LMS = window.LMS || {};
window.LMS.Views = window.LMS.Views || {};

window.LMS.Views.Queue = (function () {
  'use strict';

  let _filter = 'All';

  const REASON_SHORT = {
    calculation_error: 'Calc Error',
    rubric_mismatch:   'Rubric Mismatch',
    missing_credit:    'Missing Credit',
    grading_error:     'Grading Error',
    other:             'Other'
  };

  function render() {
    const user = window.LMS.Auth.getCurrentUser();
    if (!user || user.role !== 'instructor') return '<p style="padding:32px;color:var(--coral)">Access denied</p>';

    const all     = window.LMS.Store.getAllRequests();
    const FILTERS = ['All','Submitted','Under Review','Accepted','Rejected','Closed'];
    const counts  = {};
    FILTERS.forEach(f => { counts[f] = f==='All' ? all.length : all.filter(r=>r.status===f).length; });
    const shown   = _filter==='All' ? all : all.filter(r=>r.status===_filter);

    return `
      <div class="page-header">
        <div class="page-header-content">
          <div class="page-header-title">Regrade Request Queue</div>
          <div class="page-header-subtitle">${all.length} total request${all.length!==1?'s':''} across all assignments</div>
        </div>
      </div>

      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card stat-amber">
          <div class="stat-card-label">New</div>
          <div class="stat-card-value">${counts['Submitted']}</div>
          <div class="stat-card-sub">Awaiting review</div>
        </div>
        <div class="stat-card stat-blue">
          <div class="stat-card-label">In Progress</div>
          <div class="stat-card-value">${counts['Under Review']}</div>
          <div class="stat-card-sub">Under review</div>
        </div>
        <div class="stat-card stat-emerald">
          <div class="stat-card-label">Accepted</div>
          <div class="stat-card-value">${counts['Accepted']}</div>
          <div class="stat-card-sub">Grades revised</div>
        </div>
        <div class="stat-card stat-coral">
          <div class="stat-card-label">Rejected</div>
          <div class="stat-card-value">${counts['Rejected']}</div>
          <div class="stat-card-sub">Original stands</div>
        </div>
      </div>

      <div class="card" style="overflow:hidden">
        <div class="filter-bar">
          ${FILTERS.map(f => `
            <button class="filter-chip ${_filter===f?'active':''}"
                    onclick="window.LMS.Views.Queue.setFilter('${f}')">
              ${f}${counts[f]>0 ? `<span style="opacity:.65"> (${counts[f]})</span>` : ''}
            </button>`).join('')}
        </div>

        <div style="padding:16px">
          ${shown.length === 0
            ? `<div class="empty-state">
                 <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div>
                 <div class="empty-state-title">No ${_filter==='All'?'':_filter+' '}requests</div>
                 <div class="empty-state-desc">No requests match this filter.</div>
               </div>`
            : shown.map(r => _card(r)).join('')}
        </div>
      </div>`;
  }

  function _card(req) {
    const asgn    = window.LMS.Store.getAssignment(req.assignmentId);
    const student = window.LMS.Store.getUser(req.studentId);
    const diff    = req.claimedGrade - req.originalGrade;
    const badge   = window.LMS.Views.Dashboard.getStatusBadge(req.status);

    return `
      <div class="request-card" onclick="window.location.hash='#/queue/${req.id}'">
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
            <div style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--purple));display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;flex-shrink:0">
              ${student ? student.avatar : '??'}
            </div>
            <div>
              <div style="font-weight:700;font-size:14px">${student ? student.name : 'Unknown'}</div>
              <div style="font-size:11px;color:var(--text-muted)">${asgn ? asgn.course : ''}</div>
            </div>
          </div>
          <div class="request-card-assignment">${asgn ? asgn.title : 'Unknown Assignment'}</div>
          <div class="request-card-meta">
            <span style="background:var(--blue-glow);color:var(--blue-light);padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid rgba(67,97,238,.25)">
              ${REASON_SHORT[req.reason] || req.reason}
            </span>
            <span style="color:var(--text-muted)">·</span>
            <span>${req.originalGrade} → <span style="color:var(--emerald);font-weight:600">${req.claimedGrade}</span> <span style="color:var(--emerald);font-size:11px">(+${diff})</span></span>
            ${req.reopenCount > 0 ? '<span style="color:#B79DCC;font-size:11px;font-weight:600">↺ REOPENED</span>' : ''}
          </div>
          <div class="request-card-reason">${req.reasonDetail}</div>
        </div>
        <div class="request-card-right">
          ${badge}
          <div class="request-card-time">${window.LMS.Notifications.formatTime(req.submittedAt)}</div>
          ${req.status === 'Submitted' ? '<div style="font-size:11px;color:var(--amber);font-weight:600;animation:dot-pulse 2s infinite">⚡ New</div>' : ''}
        </div>
      </div>`;
  }

  function setFilter(f) {
    _filter = f;
    const content = document.getElementById('page-content');
    if (content) { content.innerHTML = render(); }
  }

  return { render, setFilter };
})();
