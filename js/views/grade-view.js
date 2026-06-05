/* ═══════════════════════════════════════════════════════
   views/grade-view.js — Grade table + Request Regrade CTA
   Day 3: Integration of grade view with regrade workflow
   Day 4 preview: status pill + duplicate guard
   Contributor: Himanshu Kadyan (Himanshukdyn)
   ═══════════════════════════════════════════════════════ */
window.LMS = window.LMS || {};
window.LMS.Views = window.LMS.Views || {};

window.LMS.Views.GradeView = (function () {
  'use strict';

  function render() {
    const user = window.LMS.Auth.getCurrentUser();
    if (!user || user.role !== 'student') return '<p style="padding:32px;color:var(--coral)">Access denied</p>';

    const grades      = window.LMS.Store.getGradesForStudent(user.id);
    const assignments = window.LMS.Store.getAssignments();

    const rows = assignments.map(a => {
      const g = grades.find(x => x.assignmentId === a.id) || null;
      const active = window.LMS.Store.getActiveRequestForAssignment(user.id, a.id);
      return { assignment: a, score: g ? g.score : null, maxScore: g ? g.maxScore : a.maxScore, activeRequest: active };
    });

    return `
      <div class="page-header">
        <div class="page-header-content">
          <div class="page-header-title">My Grades</div>
          <div class="page-header-subtitle">CS301 — Data Structures · Spring 2026</div>
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Assignment</th>
              <th>Score</th>
              <th>Performance</th>
              <th>Regrade Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => _row(r)).join('')}
          </tbody>
        </table>
      </div>

      <div class="card" style="margin-top:20px;padding:14px 20px">
        <div style="display:flex;align-items:center;gap:8px;color:var(--text-muted);font-size:13px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
          One active regrade request is allowed per assignment. Decisions are typically made within 5 business days.
        </div>
      </div>`;
  }

  function _row(d) {
    const { assignment: a, score, maxScore, activeRequest } = d;
    const inst = window.LMS.Store.getUser(a.instructorId);
    const instName = inst ? inst.name : 'Unknown Instructor';
    const pct    = score !== null ? Math.round(score / maxScore * 100) : null;
    const letter = pct !== null ? _letter(pct) : '—';
    const color  = pct === null ? 'var(--gray)' : pct >= 90 ? 'var(--emerald)' : pct >= 70 ? 'var(--blue-light)' : pct >= 50 ? 'var(--amber)' : 'var(--coral)';

    let statusCell = '<span style="color:var(--text-muted);font-size:13px">—</span>';
    let actionCell = '';

    if (score === null) {
      statusCell = '<span style="color:var(--text-muted);font-size:12px">Not graded yet</span>';
      actionCell = `<button class="btn btn-secondary btn-sm" disabled>Not graded</button>`;
    } else if (activeRequest) {
      statusCell = window.LMS.Views.Dashboard.getStatusBadge(activeRequest.status);
      actionCell = `<a href="#/request/${activeRequest.id}" class="btn btn-secondary btn-sm">View Request</a>`;
    } else {
      actionCell = `
        <button class="btn btn-primary btn-sm"
                onclick="window.location.hash='#/request/new?assignmentId=${a.id}'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M12 5v14M5 12h14"/></svg>
          Request Regrade
        </button>`;
    }

    return `
      <tr>
        <td>
          <div style="font-weight:600">${a.title}</div>
          <div style="font-size:11px;color:var(--text-muted)">${a.course} · Taught by: ${instName}</div>
        </td>
        <td>
          ${score !== null
            ? `<div style="font-size:16px;font-weight:700;color:${color}">${score}<span style="font-size:12px;font-weight:400;color:var(--text-muted)">/${maxScore}</span></div>
               <div style="font-size:11px;color:var(--text-muted)">${pct}% · ${letter}</div>`
            : '<span style="color:var(--text-muted)">—</span>'}
        </td>
        <td style="min-width:140px">
          ${score !== null
            ? `<div class="grade-bar-wrap">
                 <div class="grade-bar-bg"><div class="grade-bar-fill" style="width:${pct}%;background:${color}"></div></div>
                 <span style="font-size:11px;color:var(--text-muted)">${pct}%</span>
               </div>`
            : ''}
        </td>
        <td>${statusCell}</td>
        <td>${actionCell}</td>
      </tr>`;
  }

  function _letter(pct) {
    if (pct >= 93) return 'A'; if (pct >= 90) return 'A-';
    if (pct >= 87) return 'B+'; if (pct >= 83) return 'B'; if (pct >= 80) return 'B-';
    if (pct >= 77) return 'C+'; if (pct >= 73) return 'C'; if (pct >= 70) return 'C-';
    if (pct >= 60) return 'D'; return 'F';
  }

  return { render };
})();
