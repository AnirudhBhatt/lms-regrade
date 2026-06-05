/* ═══════════════════════════════════════════════════════
   views/request-form.js
   - render()       Student request submission form (Day 3)
   - renderDetail() Student request status + reopen (Day 3)
   - submitForm()   Validation + create + notifications
   - reopenRequest() 1× reopen guard
   Contributor: Himanshu Kadyan (Himanshukdyn)
   ═══════════════════════════════════════════════════════ */
window.LMS = window.LMS || {};
window.LMS.Views = window.LMS.Views || {};

window.LMS.Views.RequestForm = (function () {
  'use strict';

  let _evidenceType = 'text';

  const REASONS = [
    { value:'calculation_error', label:'Calculation / Addition Error' },
    { value:'rubric_mismatch',   label:'Answer Matches the Rubric' },
    { value:'missing_credit',    label:'Missing Partial / Bonus Credit' },
    { value:'grading_error',     label:'Grading Tool / Technical Error' },
    { value:'other',             label:'Other' }
  ];
  const REASON_LABELS = Object.fromEntries(REASONS.map(r => [r.value, r.label]));

  /* ════════════════════════════════════════════
     REQUEST SUBMISSION FORM
  ════════════════════════════════════════════ */
  function render(params) {
    const user = window.LMS.Auth.getCurrentUser();
    if (!user || user.role !== 'student') return '<p style="padding:32px;color:var(--coral)">Access denied</p>';

    const aid = (params && params.assignmentId) || null;
    if (!aid) return '<p style="padding:32px;color:var(--text-muted)">No assignment specified.</p>';

    const assignment = window.LMS.Store.getAssignment(aid);
    if (!assignment) return '<p style="padding:32px;color:var(--text-muted)">Assignment not found.</p>';

    const grade = window.LMS.Store.getGrade(user.id, aid);
    if (!grade) return '<p style="padding:32px;color:var(--text-muted)">Grade not found for this assignment.</p>';

    /* Day 4 edge case: duplicate active request */
    const existing = window.LMS.Store.getActiveRequestForAssignment(user.id, aid);
    if (existing) {
      return `
        <div class="breadcrumb">
          <a href="#/grades">← Grades</a>
        </div>
        <div style="max-width:680px;margin:0 auto">
          <div class="card" style="padding:40px;text-align:center">
            <div style="font-size:44px;margin-bottom:16px">⚠️</div>
            <h3 style="font-size:20px;font-weight:700;margin-bottom:10px;color:var(--amber)">Active Request Already Exists</h3>
            <p style="color:var(--text-muted);font-size:14px;max-width:380px;margin:0 auto 28px">
              You already have an active regrade request for <strong style="color:var(--text-primary)">${assignment.title}</strong>.
              Only one active request is allowed per assignment at a time.
            </p>
            <div style="display:flex;gap:12px;justify-content:center">
              <a href="#/request/${existing.id}" class="btn btn-primary">View Existing Request</a>
              <a href="#/grades" class="btn btn-secondary">Back to Grades</a>
            </div>
          </div>
        </div>`;
    }

    _evidenceType = 'text';

    return `
      <div class="breadcrumb">
        <a href="#/grades">← Grades</a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
        <span class="breadcrumb-current">New Regrade Request</span>
      </div>

      <div class="form-card">
        <div class="page-header">
          <div class="page-header-content">
            <div class="page-header-title">Submit Regrade Request</div>
            <div class="page-header-subtitle">Provide clear, specific details to help your instructor review efficiently</div>
          </div>
        </div>

        <div class="assignment-info-banner">
          <div>
            <div style="font-size:11px;color:var(--blue-light);font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">${assignment.course}</div>
            <div class="assignment-name">${assignment.title}</div>
          </div>
          <div class="assignment-score">${grade.score}/${grade.maxScore}</div>
        </div>

        <form id="regrade-form" onsubmit="event.preventDefault();window.LMS.Views.RequestForm.submitForm('${aid}',${grade.score},${grade.maxScore})">

          <!-- Grade claim -->
          <div class="card" style="margin-bottom:16px">
            <div class="card-body">
              <div class="form-section-title">Grade Claim</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                <div class="form-group" style="margin-bottom:0">
                  <label class="form-label">Original Grade</label>
                  <input class="form-control" type="number" value="${grade.score}" disabled>
                </div>
                <div class="form-group" style="margin-bottom:0">
                  <label class="form-label" for="claimed-grade">Your Claimed Grade <span class="required">*</span></label>
                  <input class="form-control" type="number" id="claimed-grade"
                         min="${grade.score + 1}" max="${grade.maxScore}"
                         placeholder="${Math.min(grade.score + 8, grade.maxScore)}" required>
                  <div class="form-error" id="claimed-grade-error">Must be higher than original and ≤ max (${grade.maxScore})</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Reason -->
          <div class="card" style="margin-bottom:16px">
            <div class="card-body">
              <div class="form-section-title">Reason for Request</div>
              <div class="form-group">
                <label class="form-label" for="reason">Category <span class="required">*</span></label>
                <select class="form-control" id="reason" required>
                  <option value="">Select a reason...</option>
                  ${REASONS.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}
                </select>
                <div class="form-error">Please select a category</div>
              </div>
              <div class="form-group" style="margin-bottom:0">
                <label class="form-label" for="reason-detail">Detailed Explanation <span class="required">*</span></label>
                <textarea class="form-control" id="reason-detail" rows="4"
                          placeholder="Reference specific question numbers, page numbers, or rubric criteria. E.g. 'Question 3b on page 4 — I showed the full derivation but received 0 credit.'"
                          required minlength="30"></textarea>
                <div class="form-hint">Minimum 30 characters. Vague requests are harder to review.</div>
                <div class="form-error" id="reason-detail-error">Explanation too short (min 30 chars)</div>
              </div>
            </div>
          </div>

          <!-- Evidence -->
          <div class="card" style="margin-bottom:24px">
            <div class="card-body">
              <div class="form-section-title">Supporting Evidence</div>
              <div class="form-group">
                <label class="form-label">Evidence Type</label>
                <div class="toggle-group" style="margin-bottom:16px">
                  <div class="toggle-option active" id="toggle-text" onclick="window.LMS.Views.RequestForm.setEvidenceType('text')">Text Description</div>
                  <div class="toggle-option" id="toggle-url" onclick="window.LMS.Views.RequestForm.setEvidenceType('url')">Link / URL</div>
                </div>
              </div>
              <div class="form-group" style="margin-bottom:0" id="evidence-field-wrap">
                <label class="form-label" for="evidence">Evidence <span class="required">*</span></label>
                <textarea class="form-control" id="evidence" rows="3"
                          placeholder="Paste relevant text, quote the rubric, describe your answer, or explain the discrepancy..."
                          required></textarea>
                <div class="form-hint">Specific evidence makes a stronger case.</div>
                <div class="form-error" id="evidence-error">Please provide supporting evidence</div>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div style="display:flex;gap:12px;align-items:center">
            <button type="submit" class="btn btn-primary btn-lg" id="submit-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
              Submit Request
            </button>
            <a href="#/grades" class="btn btn-secondary btn-lg">Cancel</a>
            <span style="margin-left:auto;font-size:11px;color:var(--text-muted)">Cannot be edited after submission</span>
          </div>
        </form>
      </div>`;
  }

  /* ── Toggle evidence type ── */
  function setEvidenceType(type) {
    _evidenceType = type;
    document.getElementById('toggle-text').classList.toggle('active', type === 'text');
    document.getElementById('toggle-url').classList.toggle('active', type === 'url');

    const wrap = document.getElementById('evidence-field-wrap');
    const old  = document.getElementById('evidence');
    if (!wrap || !old) return;

    if (type === 'url' && old.tagName === 'TEXTAREA') {
      const inp = document.createElement('input');
      inp.className = 'form-control'; inp.type = 'url'; inp.id = 'evidence';
      inp.placeholder = 'https://docs.google.com/…'; inp.required = true;
      old.replaceWith(inp);
    } else if (type === 'text' && old.tagName === 'INPUT') {
      const ta = document.createElement('textarea');
      ta.className = 'form-control'; ta.id = 'evidence'; ta.rows = 3;
      ta.placeholder = 'Paste relevant text, quote the rubric, describe your answer…'; ta.required = true;
      old.replaceWith(ta);
    }
  }

  /* ── Client-side validation ── */
  function _validate(origGrade, maxScore) {
    let ok = true;
    document.querySelectorAll('.form-group').forEach(g => g.classList.remove('has-error'));

    const cg = document.getElementById('claimed-grade');
    const cgV = parseInt(cg.value);
    if (!cg.value || isNaN(cgV) || cgV <= origGrade || cgV > maxScore) {
      cg.closest('.form-group').classList.add('has-error'); ok = false;
    }
    const reason = document.getElementById('reason');
    if (!reason.value) { reason.closest('.form-group').classList.add('has-error'); ok = false; }

    const detail = document.getElementById('reason-detail');
    if (!detail.value || detail.value.trim().length < 30) { detail.closest('.form-group').classList.add('has-error'); ok = false; }

    const ev = document.getElementById('evidence');
    if (!ev.value || !ev.value.trim()) { ev.closest('.form-group').classList.add('has-error'); ok = false; }
    if (_evidenceType === 'url' && ev.value) {
      try { new URL(ev.value); } catch(e) {
        ev.closest('.form-group').classList.add('has-error');
        const errEl = document.getElementById('evidence-error');
        if (errEl) errEl.textContent = 'Please enter a valid URL (including https://)';
        ok = false;
      }
    }
    return ok;
  }

  /* ── Submit ── */
  async function submitForm(assignmentId, origGrade, maxScore) {
    if (!_validate(origGrade, maxScore)) {
      window.LMS.Notifications.showToast('error','Validation Error','Please fix the highlighted fields.');
      return;
    }
    const user = window.LMS.Auth.getCurrentUser();
    const btn  = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Submitting…';

    setTimeout(async () => {
      try {
        const req = await window.LMS.Store.createRequest({
          studentId:    user.id,
          assignmentId,
          originalGrade: origGrade,
          claimedGrade:  parseInt(document.getElementById('claimed-grade').value),
          reason:        document.getElementById('reason').value,
          reasonDetail:  document.getElementById('reason-detail').value.trim(),
          evidenceType:  _evidenceType,
          evidence:      document.getElementById('evidence').value.trim()
        });

        await window.LMS.Audit.logSubmission(req.id, user.id);

        /* Notify respective instructor (Day 3: in-app notifications) */
        const asgn = window.LMS.Store.getAssignment(assignmentId);
        if (asgn && asgn.instructorId) {
          await window.LMS.Notifications.notify(asgn.instructorId, 'info',
            `New regrade request submitted by ${user.name} for ${asgn.title}.`, req.id);
        }

        window.LMS.Notifications.showToast('success','Request Submitted!','Your request is pending instructor review.');
        setTimeout(() => { window.location.hash = '#/request/' + req.id; }, 1400);

      } catch(e) {
        window.LMS.Notifications.showToast('error','Submission Failed', e.message);
        btn.disabled = false;
        btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg> Submit Request';
      }
    }, 700);
  }

  /* ════════════════════════════════════════════
     REQUEST DETAIL (student side)
  ════════════════════════════════════════════ */
  function renderDetail(requestId) {
    const user    = window.LMS.Auth.getCurrentUser();
    if (!user) return '';

    const req     = window.LMS.Store.getRequest(requestId);
    if (!req)  return `<div class="empty-state"><div class="empty-state-title">Request not found</div><a href="#/grades" class="btn btn-secondary mt-lg">Back to Grades</a></div>`;
    if (user.role === 'student' && req.studentId !== user.id) return '<p style="padding:32px;color:var(--coral)">Access denied</p>';

    const asgn    = window.LMS.Store.getAssignment(req.assignmentId);
    const decision= window.LMS.Store.getDecisionForRequest(requestId);
    const logs    = window.LMS.Audit.getForRequest(requestId);
    const student = window.LMS.Store.getUser(req.studentId);
    const canReopen = req.status === 'Rejected' && req.reopenCount < 1 && user.role === 'student' && req.studentId === user.id;

    return `
      <div class="breadcrumb">
        <a href="#/grades">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M15 19l-7-7 7-7"/></svg>
          Grades
        </a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
        <span class="breadcrumb-current">${asgn ? asgn.title : 'Request'}</span>
      </div>

      <div class="page-header">
        <div class="page-header-content">
          <div class="page-header-title">${asgn ? asgn.title : 'Assignment'} — Regrade Request</div>
          <div class="page-header-subtitle">Submitted ${window.LMS.Notifications.formatTime(req.submittedAt)}</div>
        </div>
        <div class="page-header-actions">
          ${window.LMS.Views.Dashboard.getStatusBadge(req.status)}
          ${req.reopenCount > 0 ? '<span class="status-badge status-reopened">Reopened</span>' : ''}
        </div>
      </div>

      <div class="review-layout">
        <div class="review-main">

          <div class="grade-comparison" style="margin-bottom:20px">
            <div class="grade-box grade-original">
              <div class="grade-label">Original Grade</div>
              <div class="grade-value">${req.originalGrade}</div>
              <div style="font-size:12px;color:var(--text-muted)">of ${asgn ? asgn.maxScore : '?'}</div>
            </div>
            <div class="grade-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
            <div class="grade-box grade-claimed">
              <div class="grade-label">Claimed Grade</div>
              <div class="grade-value">${req.claimedGrade}</div>
              <div style="font-size:12px;color:var(--text-muted)">of ${asgn ? asgn.maxScore : '?'}</div>
            </div>
            ${decision && decision.revisedGrade ? `
              <div class="grade-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></div>
              <div class="grade-box" style="text-align:center">
                <div class="grade-label">Revised Grade</div>
                <div class="grade-value" style="color:var(--blue-light)">${decision.revisedGrade}</div>
                <div style="font-size:12px;color:var(--text-muted)">of ${asgn ? asgn.maxScore : '?'}</div>
              </div>` : ''}
          </div>

          <div class="review-section">
            <div class="review-section-header">Reason for Request</div>
            <div class="review-section-body">
              <span class="status-badge" style="background:var(--blue-glow);color:var(--blue-light);border:1px solid rgba(67,97,238,.3);margin-bottom:12px;display:inline-flex">
                ${REASON_LABELS[req.reason] || req.reason}
              </span>
              <p style="color:var(--text-secondary);font-size:14px;line-height:1.75;margin-top:10px">${req.reasonDetail}</p>
            </div>
          </div>

          <div class="review-section">
            <div class="review-section-header">Supporting Evidence</div>
            <div class="review-section-body">
              ${req.evidenceType === 'url'
                ? `<div class="evidence-url"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg><a href="${req.evidence}" target="_blank" rel="noopener">${req.evidence}</a></div>`
                : `<div class="evidence-block">${req.evidence}</div>`}
            </div>
          </div>

          ${decision ? `
            <div class="review-section">
              <div class="review-section-header">Instructor Decision</div>
              <div class="review-section-body">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
                  ${decision.decision === 'Accepted'
                    ? `<div style="display:flex;align-items:center;gap:8px;color:var(--emerald)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span style="font-weight:700">Accepted</span></div>`
                    : `<div style="display:flex;align-items:center;gap:8px;color:var(--coral)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><span style="font-weight:700">Rejected</span></div>`}
                  <span style="font-size:12px;color:var(--text-muted)">${window.LMS.Notifications.formatTime(decision.decidedAt)}</span>
                </div>
                <div class="evidence-block">${decision.justification}</div>
                ${decision.revisedGrade
                  ? `<div style="margin-top:12px;padding:10px 16px;background:var(--emerald-glow);border:1px solid rgba(6,214,160,.3);border-radius:var(--radius-md);font-size:14px;color:var(--emerald)">
                       ✓ Grade revised to <strong>${decision.revisedGrade}/${asgn ? asgn.maxScore : '?'}</strong>
                     </div>`
                  : ''}
              </div>
            </div>` : ''}

          ${canReopen ? `
            <div class="card" style="padding:20px;background:var(--amber-glow);border-color:rgba(255,209,102,.3)">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:16px">
                <div>
                  <div style="font-weight:700;color:var(--amber);margin-bottom:4px">Disagree with this decision?</div>
                  <div style="font-size:13px;color:var(--text-secondary)">You may reopen this request once. Provide any additional context when reopened.</div>
                </div>
                <button class="btn btn-secondary" onclick="window.LMS.Views.RequestForm.reopenRequest('${req.id}')">
                  Reopen Request
                </button>
              </div>
            </div>` : ''}

          ${req.reopenCount >= 1 && req.status !== 'Closed' ? `
            <div class="card" style="padding:12px 16px;background:rgba(123,94,167,.1);border-color:rgba(123,94,167,.3)">
              <div style="font-size:13px;color:#B79DCC">ℹ️ This request has been reopened once. No further reopens are permitted.</div>
            </div>` : ''}
        </div>

        <div class="review-sidebar">
          <div class="review-section">
            <div class="review-section-header">Activity Timeline</div>
            <div class="review-section-body">
              <div class="timeline">
                ${logs.map(l => _timelineItem(l)).join('')}
              </div>
            </div>
          </div>

          <div class="review-section">
            <div class="review-section-header">Request Info</div>
            <div class="review-section-body">
              ${_infoRow('Request ID', `<span style="font-family:monospace;font-size:11px">${req.id}</span>`)}
              ${_infoRow('Student', student ? student.name : '—')}
              ${_infoRow('Submitted', new Date(req.submittedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}))}
              ${_infoRow('Last Updated', window.LMS.Notifications.formatTime(req.updatedAt))}
              ${_infoRow('Reopened', req.reopenCount + '× of 1 allowed')}
            </div>
          </div>
        </div>
      </div>`;
  }

  function _timelineItem(log) {
    const cls    = window.LMS.Audit.getActionClass(log.action);
    const label  = window.LMS.Audit.getActionLabel(log.action);
    const actor  = window.LMS.Store.getUser(log.actorId);
    let desc = '';
    if (log.action === 'SUBMITTED')      desc = `by ${actor ? actor.name : 'Student'}`;
    else if (log.action === 'STATUS_CHANGED') desc = `${log.fromState} → ${log.toState}`;
    else if (log.action === 'DECISION_MADE') {
      const m = log.metadata || {};
      desc = m.decision === 'Accepted' ? `Accepted${m.revisedGrade ? ' · Grade → ' + m.revisedGrade : ''}` : 'Rejected';
    }
    else if (log.action === 'REOPENED')  desc = `by ${actor ? actor.name : 'Student'}`;
    else if (log.action === 'CLOSED')    desc = 'Request finalized';
    return `
      <div class="timeline-item ${cls}">
        <div class="timeline-action">${label}</div>
        ${desc ? `<div class="timeline-desc">${desc}</div>` : ''}
        <div class="timeline-time">${window.LMS.Notifications.formatTime(log.timestamp)}</div>
      </div>`;
  }

  function _infoRow(label, value) {
    return `<div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid var(--border-subtle)">
      <span style="color:var(--text-muted)">${label}</span>
      <span style="font-weight:500;text-align:right">${value}</span>
    </div>`;
  }

  /* ── Reopen (Day 3 — with guard + notification) ── */
  async function reopenRequest(requestId) {
    const user = window.LMS.Auth.getCurrentUser();
    if (!user) return;
    try {
      const { request } = await window.LMS.Store.reopenRequest(requestId, user.id);
      await window.LMS.Audit.logReopen(requestId, user.id);
      const asgn = window.LMS.Store.getAssignment(request.assignmentId);
      if (asgn && asgn.instructorId) {
        await window.LMS.Notifications.notify(asgn.instructorId, 'warning',
          `${user.name} has reopened their regrade request for ${asgn.title}.`, requestId);
      }
      window.LMS.Notifications.showToast('success','Request Reopened','Your request has been resubmitted for review.');
      setTimeout(() => window.LMS.App.navigate('/request/' + requestId), 600);
    } catch(e) {
      window.LMS.Notifications.showToast('error','Cannot Reopen', e.message);
    }
  }

  return { render, setEvidenceType, submitForm, renderDetail, reopenRequest };
})();
