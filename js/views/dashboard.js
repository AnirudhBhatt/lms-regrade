/* ═══════════════════════════════════════════════════════
   views/dashboard.js — Role-aware home screen
   Day 3: Stats + recent requests, time-of-day greeting
   Contributor: Himanshu Kadyan (Himanshukdyn)
   ═══════════════════════════════════════════════════════ */
window.LMS = window.LMS || {};
window.LMS.Views = window.LMS.Views || {};

window.LMS.Views.Dashboard = (function () {
  'use strict';

  /* ── Status badge helper (shared by all views) ── */
  function getStatusBadge(status) {
    const cls = {
      'Submitted':   'status-submitted',
      'Under Review':'status-under-review',
      'Accepted':    'status-accepted',
      'Rejected':    'status-rejected',
      'Closed':      'status-closed'
    };
    return `<span class="status-badge ${cls[status]||''}">${status}</span>`;
  }

  function _greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  function render() {
    const user = window.LMS.Auth.getCurrentUser();
    if (!user) return '';
    const html = user.role === 'student' ? _student(user) : _instructor(user);
    return html + '<div id="assignment-modal-container"></div>';
  }

  /* ── Student dashboard ── */
  function _student(user) {
    const reqs      = window.LMS.Store.getRequestsByStudent(user.id);
    const submitted = reqs.filter(r => r.status === 'Submitted').length;
    const review    = reqs.filter(r => r.status === 'Under Review').length;
    const accepted  = reqs.filter(r => r.status === 'Accepted').length;
    const rejected  = reqs.filter(r => r.status === 'Rejected').length;

    return `
      <div class="welcome-banner">
        <div class="welcome-title">${_greeting()}, ${user.name.split(' ')[0]}!</div>
        <div class="welcome-subtitle">Here's the current status of your regrading requests</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-blue">
          <div class="stat-card-label">Total Requests</div>
          <div class="stat-card-value">${reqs.length}</div>
          <div class="stat-card-sub">All time</div>
        </div>
        <div class="stat-card stat-amber">
          <div class="stat-card-label">Pending</div>
          <div class="stat-card-value">${submitted + review}</div>
          <div class="stat-card-sub">${submitted} submitted · ${review} under review</div>
        </div>
        <div class="stat-card stat-emerald">
          <div class="stat-card-label">Accepted</div>
          <div class="stat-card-value">${accepted}</div>
          <div class="stat-card-sub">Grades revised upward</div>
        </div>
        <div class="stat-card stat-coral">
          <div class="stat-card-label">Rejected</div>
          <div class="stat-card-value">${rejected}</div>
          <div class="stat-card-sub">Original grade stands</div>
        </div>
      </div>

      <div class="section-header">
        <div class="section-title">Recent Requests</div>
        <a href="#/grades" class="btn btn-primary btn-sm">View My Grades →</a>
      </div>

      ${reqs.length === 0 ? _emptyStudent() : _requestTable(reqs.slice(0, 6), false)}
      ${reqs.length > 6 ? `<div style="text-align:center;margin-top:16px"><a href="#/my-requests" class="btn-link">View all ${reqs.length} requests →</a></div>` : ''}`;
  }

  /* ── Instructor dashboard ── */
  function _instructor(user) {
    const all       = window.LMS.Store.getAllRequests();
    const pending   = all.filter(r => r.status === 'Submitted').length;
    const review    = all.filter(r => r.status === 'Under Review').length;
    const accepted  = all.filter(r => r.status === 'Accepted').length;
    const rejected  = all.filter(r => r.status === 'Rejected').length;
    const priority  = all.filter(r => ['Submitted','Under Review'].includes(r.status));

    return `
      <div class="welcome-banner" style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div class="welcome-title">${_greeting()}, ${user.name}!</div>
          <div class="welcome-subtitle">${pending ? `${pending} new request${pending!==1?'s':''} awaiting review` : 'No new submissions — all caught up!'}</div>
        </div>
        <button class="btn btn-primary" onclick="window.LMS.Views.Dashboard.openCreateAssignmentModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="margin-right:8px"><path d="M12 5v14M5 12h14"/></svg>
          Create Assignment
        </button>
      </div>

      <div class="stats-grid">
        <div class="stat-card stat-blue">
          <div class="stat-card-label">Total Requests</div>
          <div class="stat-card-value">${all.length}</div>
          <div class="stat-card-sub">All time</div>
        </div>
        <div class="stat-card stat-amber">
          <div class="stat-card-label">Needs Attention</div>
          <div class="stat-card-value">${pending + review}</div>
          <div class="stat-card-sub">${pending} new · ${review} in progress</div>
        </div>
        <div class="stat-card stat-emerald">
          <div class="stat-card-label">Accepted</div>
          <div class="stat-card-value">${accepted}</div>
          <div class="stat-card-sub">Grades revised</div>
        </div>
        <div class="stat-card stat-coral">
          <div class="stat-card-label">Rejected</div>
          <div class="stat-card-value">${rejected}</div>
          <div class="stat-card-sub">Original grade stands</div>
        </div>
      </div>

      <div class="section-header">
        <div class="section-title">Priority Queue</div>
        <a href="#/queue" class="btn btn-primary btn-sm">Full Queue →</a>
      </div>

      ${priority.length === 0
        ? `<div class="card" style="padding:32px;text-align:center">
             <div style="font-size:36px;margin-bottom:12px">✅</div>
             <div style="font-weight:700;color:var(--text-secondary)">All caught up!</div>
             <div style="font-size:13px;color:var(--text-muted);margin-top:4px">No pending requests at the moment.</div>
           </div>`
        : _requestTable(priority.slice(0, 4), true)}`;
  }

  function _emptyStudent() {
    return `<div class="card"><div class="empty-state">
      <div class="empty-state-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div>
      <div class="empty-state-title">No requests yet</div>
      <div class="empty-state-desc">View your grades and submit a regrade request if you believe there was a marking error.</div>
      <a href="#/grades" class="btn btn-primary">View My Grades</a>
    </div></div>`;
  }

  function _requestTable(requests, isInstructor) {
    return `
      <div class="table-container">
        <table>
          <thead>
            <tr>
              ${isInstructor ? '<th>Student</th>' : ''}
              <th>Assignment</th>
              <th>Claimed</th>
              <th>Status</th>
              <th>Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${requests.map(r => {
              const a = window.LMS.Store.getAssignment(r.assignmentId);
              const s = window.LMS.Store.getUser(r.studentId);
              const link = isInstructor ? '#/queue/' + r.id : '#/request/' + r.id;
              return `<tr style="cursor:pointer" onclick="window.location.hash='${link}'">
                ${isInstructor ? `<td><div style="font-weight:600;font-size:13px">${s?s.name:'Unknown'}</div></td>` : ''}
                <td>
                  <div style="font-weight:600">${a?a.title:'Unknown'}</div>
                  <div style="font-size:11px;color:var(--text-muted)">${a?a.course:''}</div>
                </td>
                <td><span style="color:var(--emerald);font-weight:700">${r.claimedGrade}</span><span style="color:var(--text-muted);font-size:12px">/${a?a.maxScore:'?'}</span></td>
                <td>${getStatusBadge(r.status)}</td>
                <td style="color:var(--text-muted);font-size:13px">${window.LMS.Notifications.formatTime(r.submittedAt)}</td>
                <td><a href="${link}" class="btn btn-ghost btn-sm" onclick="event.stopPropagation()">→</a></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function openCreateAssignmentModal() {
    const container = document.getElementById('assignment-modal-container');
    if (!container) return;
    container.innerHTML = `
      <div class="google-modal-overlay">
        <div class="google-modal" style="max-width:500px">
          <div class="google-modal-header" style="text-align:left;margin-bottom:20px">
            <h3 class="google-modal-title" style="font-size:20px;font-weight:700">Create New Assignment</h3>
            <p class="google-modal-sub" style="font-size:13px">Publish a new assignment and course to the LMS gradebook</p>
          </div>
          
          <form onsubmit="event.preventDefault(); window.LMS.Views.Dashboard.submitCreateAssignment();">
            <div class="login-form-group">
              <label style="color:#202124">Assignment Title</label>
              <input type="text" id="new-asgn-title" class="form-control" placeholder="e.g. Lab Report 4" style="width:100%;box-sizing:border-box" required>
            </div>
            <div class="login-form-group">
              <label style="color:#202124">Course Name</label>
              <input type="text" id="new-asgn-course" class="form-control" placeholder="e.g. CS301 — Data Structures" style="width:100%;box-sizing:border-box" required>
            </div>
            <div class="login-form-group">
              <label style="color:#202124">Max Score</label>
              <input type="number" id="new-asgn-max" class="form-control" placeholder="e.g. 100" style="width:100%;box-sizing:border-box" required min="1">
            </div>
            <div class="login-form-group">
              <label style="color:#202124">Description</label>
              <textarea id="new-asgn-desc" class="form-control" placeholder="Optional description..." style="width:100%;box-sizing:border-box;min-height:80px"></textarea>
            </div>
            
            <div class="google-modal-footer">
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.LMS.Views.Dashboard.closeCreateAssignmentModal()">Cancel</button>
              <button type="submit" class="btn btn-primary btn-sm">Create &amp; Publish</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  function closeCreateAssignmentModal() {
    const container = document.getElementById('assignment-modal-container');
    if (container) container.innerHTML = '';
  }

  async function submitCreateAssignment() {
    const user = window.LMS.Auth.getCurrentUser();
    if (!user) return;

    const title = document.getElementById('new-asgn-title').value.trim();
    const course = document.getElementById('new-asgn-course').value.trim();
    const maxScore = parseInt(document.getElementById('new-asgn-max').value);
    const description = document.getElementById('new-asgn-desc').value.trim();

    try {
      await window.LMS.Store.createAssignment({
        title,
        course,
        maxScore,
        description,
        instructorId: user.id
      });
      window.LMS.Notifications.showToast('success', 'Assignment Published!', `Successfully created ${title} for ${course}. Grades initialized for all students.`);
      closeCreateAssignmentModal();
      await window.LMS.App.navigate('/dashboard');
    } catch(e) {
      window.LMS.Notifications.showToast('error', 'Creation Failed', e.message);
    }
  }

  return { render, getStatusBadge, openCreateAssignmentModal, closeCreateAssignmentModal, submitCreateAssignment };
})();
