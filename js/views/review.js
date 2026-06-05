/* ═══════════════════════════════════════════════════════
   views/review.js — Instructor review panel + decision form
   Day 3: Full review workflow with accept/reject + notifications
   Contributor: Himanshu Kadyan (Himanshukdyn)
   ═══════════════════════════════════════════════════════ */
window.LMS = window.LMS || {};
window.LMS.Views = window.LMS.Views || {};

window.LMS.Views.Review = (function () {
  'use strict';

  let _selected = null; // 'Accepted' | 'Rejected'

  const REASON_LABELS = {
    calculation_error: 'Calculation / Addition Error',
    rubric_mismatch:   'Answer Matches the Rubric',
    missing_credit:    'Missing Partial / Bonus Credit',
    grading_error:     'Grading Tool / Technical Error',
    other:             'Other'
  };

  function render(requestId) {
    _selected = null;

    const user = window.LMS.Auth.getCurrentUser();
    if (!user || user.role !== 'instructor') return '<p style="padding:32px;color:var(--coral)">Access denied</p>';

    const req = window.LMS.Store.getRequest(requestId);
    if (!req) return `<div class="empty-state"><div class="empty-state-title">Request not found</div><a href="#/queue" class="btn btn-secondary mt-lg">Back to Queue</a></div>`;

    const asgn    = window.LMS.Store.getAssignment(req.assignmentId);
    const student = window.LMS.Store.getUser(req.studentId);
    const decision= window.LMS.Store.getDecisionForRequest(requestId);

    /* Auto-transition Submitted → Under Review when instructor opens it */
    if (req.status === 'Submitted') {
      window.LMS.Store.updateRequestStatus(requestId, 'Under Review');
      window.LMS.Audit.logStatusChange(requestId, user.id, 'instructor', 'Submitted', 'Under Review');
      if (student) {
        window.LMS.Notifications.notify(student.id, 'info',
          `Your regrade request for ${asgn ? asgn.title : 'an assignment'} is now under review.`, requestId);
      }
      req.status = 'Under Review'; // reflect locally
    }

    const logs       = window.LMS.Audit.getForRequest(requestId);
    const canDecide  = req.status === 'Under Review' && !decision;
    const diff       = req.claimedGrade - req.originalGrade;

    return `
      <div class="breadcrumb">
        <a href="#/queue">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M15 19l-7-7 7-7"/></svg>
          Queue
        </a>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 5l7 7-7 7"/></svg>
        <span class="breadcrumb-current">${student ? student.name : 'Unknown'}'s Request</span>
      </div>

      <div class="page-header">
        <div class="page-header-content">
          <div class="page-header-title">${asgn ? asgn.title : 'Assignment'}</div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
            <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--purple));display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff">
              ${student ? student.avatar : '??'}
            </div>
            <span style="font-size:13px;color:var(--text-secondary)">${student ? student.name : 'Unknown'} · ${student ? student.email : ''}</span>
          </div>
        </div>
        <div class="page-header-actions">
          ${window.LMS.Views.Dashboard.getStatusBadge(req.status)}
          ${req.reopenCount > 0 ? '<span class="status-badge status-reopened">Reopened</span>' : ''}
        </div>
      </div>

      <div class="review-layout">
        <!-- ── Left: details ── -->
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
            <div style="text-align:center;padding:12px 16px;flex-shrink:0">
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">DIFFERENCE</div>
              <div style="font-size:24px;font-weight:800;color:var(--emerald)">+${diff}</div>
            </div>
          </div>

          <div class="review-section">
            <div class="review-section-header">Reason for Request</div>
            <div class="review-section-body">
              <span class="status-badge" style="background:var(--blue-glow);color:var(--blue-light);border:1px solid rgba(67,97,238,.3);display:inline-flex;margin-bottom:12px">
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

          ${decision ? _renderDecisionResult(decision, asgn) : ''}

          ${canDecide ? _decisionForm(req, asgn) : ''}

          ${!canDecide && decision ? `
            <div style="display:flex;gap:10px;margin-top:4px">
              <button class="btn btn-secondary btn-sm" onclick="window.LMS.Views.Review.closeRequest('${req.id}','${req.status}')">
                Mark as Closed
              </button>
            </div>` : ''}
        </div>

        <!-- ── Right: timeline + meta ── -->
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
            <div class="review-section-header">Request Details</div>
            <div class="review-section-body">
              ${_row('Request ID', `<span style="font-family:monospace;font-size:11px">${req.id}</span>`)}
              ${_row('Student', student ? student.name : '—')}
              ${_row('Assignment', asgn ? asgn.title : '—')}
              ${_row('Submitted', new Date(req.submittedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'}))}
              ${_row('Evidence Type', req.evidenceType)}
              ${_row('Reopened', req.reopenCount + '× of 1 allowed')}
            </div>
          </div>
        </div>
      </div>`;
  }

  function _renderDecisionResult(decision, asgn) {
    return `
      <div class="review-section">
        <div class="review-section-header">Your Decision</div>
        <div class="review-section-body">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
            ${decision.decision === 'Accepted'
              ? `<div style="display:flex;align-items:center;gap:8px;color:var(--emerald)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span style="font-weight:700;font-size:16px">Accepted</span></div>`
              : `<div style="display:flex;align-items:center;gap:8px;color:var(--coral)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg><span style="font-weight:700;font-size:16px">Rejected</span></div>`}
            <span style="font-size:12px;color:var(--text-muted)">${window.LMS.Notifications.formatTime(decision.decidedAt)}</span>
          </div>
          <div class="evidence-block">${decision.justification}</div>
          ${decision.revisedGrade ? `
            <div style="margin-top:12px;padding:10px 16px;background:var(--emerald-glow);border:1px solid rgba(6,214,160,.3);border-radius:var(--radius-md);font-size:14px;color:var(--emerald)">
              ✓ Grade revised to <strong>${decision.revisedGrade}/${asgn ? asgn.maxScore : '?'}</strong>
            </div>` : ''}
        </div>
      </div>`;
  }

  function _decisionForm(req, asgn) {
    return `
      <div class="decision-form">
        <div class="decision-form-header">Make Your Decision</div>
        <div class="decision-form-body">
          <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px">
            Review the request carefully. Your decision is permanent and logged in the audit trail.
          </p>

          <div class="decision-options">
            <div class="decision-option accept-option" id="decision-accept"
                 onclick="window.LMS.Views.Review.selectDecision('Accepted')">
              <div class="decision-option-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              </div>
              <div class="decision-option-label">Accept</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Grade will be revised</div>
            </div>
            <div class="decision-option reject-option" id="decision-reject"
                 onclick="window.LMS.Views.Review.selectDecision('Rejected')">
              <div class="decision-option-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
              </div>
              <div class="decision-option-label">Reject</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:4px">Original grade stands</div>
            </div>
          </div>

          <div id="revised-grade-wrap" style="display:none">
            <div class="form-group">
              <label class="form-label" for="revised-grade">Revised Grade <span class="required">*</span></label>
              <input class="form-control" type="number" id="revised-grade"
                     min="${req.originalGrade}" max="${asgn ? asgn.maxScore : 100}"
                     placeholder="${req.claimedGrade}">
              <div class="form-hint">Enter the corrected score (${req.originalGrade}–${asgn ? asgn.maxScore : 100})</div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="justification">
              Written Justification <span class="required">*</span>
            </label>
            <textarea class="form-control" id="justification" rows="5"
                      placeholder="Explain your decision in detail. Reference the question, rubric criteria, or specific evidence. Students will see this justification."
                      minlength="20"></textarea>
            <div class="form-hint">Minimum 20 characters. Be clear and professional.</div>
            <div class="form-error" id="justification-error">Please write at least 20 characters</div>
          </div>

          <button class="btn btn-secondary w-full" id="submit-decision-btn"
                  onclick="window.LMS.Views.Review.submitDecision('${req.id}')" disabled>
            Select Accept or Reject first
          </button>

          <div style="text-align:center;margin-top:12px">
            <button class="btn-link" onclick="window.LMS.Views.Review.closeRequest('${req.id}','${req.status}')">
              Close without a decision
            </button>
          </div>
        </div>
      </div>`;
  }

  function _timelineItem(log) {
    const cls   = window.LMS.Audit.getActionClass(log.action);
    const label = window.LMS.Audit.getActionLabel(log.action);
    const actor = window.LMS.Store.getUser(log.actorId);
    let desc = '';
    if (log.action === 'SUBMITTED')       desc = `by ${actor ? actor.name : 'Student'}`;
    else if (log.action === 'STATUS_CHANGED') desc = `${log.fromState} → ${log.toState}`;
    else if (log.action === 'DECISION_MADE') {
      const m = log.metadata || {};
      desc = m.decision === 'Accepted' ? `Accepted${m.revisedGrade ? ' · Grade → ' + m.revisedGrade : ''}` : 'Rejected';
    }
    else if (log.action === 'REOPENED')   desc = `by ${actor ? actor.name : 'Student'}`;
    else if (log.action === 'CLOSED')     desc = 'Request finalized';
    return `
      <div class="timeline-item ${cls}">
        <div class="timeline-action">${label}</div>
        ${desc ? `<div class="timeline-desc">${desc}</div>` : ''}
        <div class="timeline-time">${window.LMS.Notifications.formatTime(log.timestamp)}</div>
      </div>`;
  }

  function _row(label, val) {
    return `<div style="display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px solid var(--border-subtle)">
      <span style="color:var(--text-muted)">${label}</span>
      <span style="font-weight:500;text-align:right">${val}</span>
    </div>`;
  }

  /* ── Select decision (Accept / Reject) ── */
  function selectDecision(decision) {
    _selected = decision;
    document.getElementById('decision-accept').classList.toggle('selected', decision === 'Accepted');
    document.getElementById('decision-reject').classList.toggle('selected', decision === 'Rejected');

    const rgWrap = document.getElementById('revised-grade-wrap');
    if (rgWrap) rgWrap.style.display = decision === 'Accepted' ? 'block' : 'none';

    const btn = document.getElementById('submit-decision-btn');
    if (!btn) return;
    btn.disabled = false;
    if (decision === 'Accepted') {
      btn.className = 'btn btn-success w-full';
      btn.textContent = '✓ Accept Request & Revise Grade';
    } else {
      btn.className = 'btn btn-danger w-full';
      btn.textContent = '✕ Reject Request';
    }
  }

  /* ── Submit decision ── */
  function submitDecision(requestId) {
    if (!_selected) {
      window.LMS.Notifications.showToast('error','No Decision','Please select Accept or Reject.');
      return;
    }

    const justEl = document.getElementById('justification');
    const justification = justEl ? justEl.value.trim() : '';
    if (justification.length < 20) {
      if (justEl) justEl.closest('.form-group').classList.add('has-error');
      window.LMS.Notifications.showToast('error','Justification Required','Write at least 20 characters explaining your decision.');
      return;
    }
    if (justEl) justEl.closest('.form-group').classList.remove('has-error');

    let revisedGrade = null;
    if (_selected === 'Accepted') {
      const rgEl = document.getElementById('revised-grade');
      revisedGrade = rgEl ? parseInt(rgEl.value) : NaN;
      if (!revisedGrade || isNaN(revisedGrade)) {
        window.LMS.Notifications.showToast('error','Revised Grade Required','Enter the corrected grade for accepted requests.');
        return;
      }
    }

    const btn = document.getElementById('submit-decision-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

    const user = window.LMS.Auth.getCurrentUser();

    setTimeout(async () => {
      try {
        await window.LMS.Store.submitDecision(requestId, user.id, _selected, justification, revisedGrade);
        await window.LMS.Store.updateRequestStatus(requestId, _selected);
        await window.LMS.Audit.logDecision(requestId, user.id, _selected, revisedGrade);

        const req  = window.LMS.Store.getRequest(requestId);
        const asgn = req ? window.LMS.Store.getAssignment(req.assignmentId) : null;
        const asgnTitle = asgn ? asgn.title : 'an assignment';

        if (_selected === 'Accepted') {
          await window.LMS.Notifications.notify(req.studentId, 'success',
            `Your regrade request for ${asgnTitle} has been accepted! Grade updated to ${revisedGrade}/${asgn?asgn.maxScore:'?'}.`, requestId);
          window.LMS.Notifications.showToast('success','Request Accepted', `Grade revised to ${revisedGrade}. Student notified.`);
        } else {
          await window.LMS.Notifications.notify(req.studentId, 'warning',
            `Your regrade request for ${asgnTitle} has been reviewed and rejected. See decision details.`, requestId);
          window.LMS.Notifications.showToast('info','Request Rejected','Student has been notified of your decision.');
        }

        _selected = null;
        setTimeout(() => window.LMS.App.navigate('/queue/' + requestId), 1000);

      } catch(e) {
        window.LMS.Notifications.showToast('error','Submission Failed', e.message);
        if (btn) { btn.disabled = false; }
      }
    }, 700);
  }

  /* ── Close request without a formal decision ── */
  async function closeRequest(requestId, currentStatus) {
    const user = window.LMS.Auth.getCurrentUser();
    if (!user) return;
    try {
      await window.LMS.Store.updateRequestStatus(requestId, 'Closed');
      await window.LMS.Audit.logClose(requestId, user.id, 'instructor', currentStatus);
      window.LMS.Notifications.showToast('info','Request Closed','The request has been marked as closed.');
      setTimeout(() => { window.location.hash = '#/queue'; }, 900);
    } catch(e) {
      window.LMS.Notifications.showToast('error','Failed to Close', e.message);
    }
  }

  return { render, selectDecision, submitDecision, closeRequest };
})();
