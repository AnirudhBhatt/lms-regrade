/* ═══════════════════════════════════════════════════════
   audit.js — Audit trail logger (append-only)
   Day 1: Action definitions; Day 5 preview: export support
   ═══════════════════════════════════════════════════════ */
window.LMS = window.LMS || {};

window.LMS.Audit = (function () {
  'use strict';

  const ACTIONS = {
    SUBMITTED:     'SUBMITTED',
    STATUS_CHANGED:'STATUS_CHANGED',
    DECISION_MADE: 'DECISION_MADE',
    REOPENED:      'REOPENED',
    CLOSED:        'CLOSED'
  };

  function _log(requestId, actorId, actorRole, action, fromState, toState, metadata) {
    return window.LMS.Store.addAuditEntry({ requestId, actorId, actorRole, action, fromState: fromState||null, toState: toState||null, metadata: metadata||{} });
  }

  function logSubmission(requestId, studentId)          { return _log(requestId, studentId,    'student',    ACTIONS.SUBMITTED,     null,           'Submitted',   {}); }
  function logStatusChange(requestId, actorId, role, from, to){ return _log(requestId, actorId, role, ACTIONS.STATUS_CHANGED, from, to, {}); }
  function logDecision(requestId, instructorId, decision, revisedGrade) {
    return _log(requestId, instructorId, 'instructor', ACTIONS.DECISION_MADE, 'Under Review', decision, { decision, revisedGrade: revisedGrade||null });
  }
  function logReopen(requestId, studentId)              { return _log(requestId, studentId,    'student',    ACTIONS.REOPENED,      'Rejected',     'Submitted',   {}); }
  function logClose(requestId, actorId, role, fromState){ return _log(requestId, actorId,      role,         ACTIONS.CLOSED,        fromState,      'Closed',      {}); }

  function getForRequest(requestId) {
    return window.LMS.Store.getAuditLog(requestId).sort((a,b) => new Date(a.timestamp)-new Date(b.timestamp));
  }

  function getActionLabel(action) {
    return { SUBMITTED:'Request Submitted', STATUS_CHANGED:'Status Updated', DECISION_MADE:'Decision Made', REOPENED:'Request Reopened', CLOSED:'Request Closed' }[action] || action;
  }
  function getActionClass(action) {
    return { SUBMITTED:'action-submitted', STATUS_CHANGED:'action-status', DECISION_MADE:'action-decision', REOPENED:'action-submitted', CLOSED:'action-closed' }[action] || 'action-status';
  }

  return { ACTIONS, logSubmission, logStatusChange, logDecision, logReopen, logClose, getForRequest, getActionLabel, getActionClass };
})();
