/* ═══════════════════════════════════════════════════════
   store.js — MongoDB / Express Backend Integration Adapter
   Connects to Express REST APIs on port 5001.
   ═══════════════════════════════════════════════════════ */
window.LMS = window.LMS || {};

window.LMS.Store = (function () {
  'use strict';

  const API_BASE = 'http://localhost:5001/api';

  // In-memory cache populated asynchronously by preload()
  const CACHE = {
    users: [],
    assignments: [],
    grades: [],
    requests: [],
    decisions: [],
    audit: [],
    notifications: []
  };

  /* ══════════════════════════════════════════════════════
     PRELOADING LAYER (Asynchronous synchronization)
     ══════════════════════════════════════════════════════ */
  async function preload(user) {
    const promises = [
      fetch(`${API_BASE}/users`).then(r => r.json()).then(data => { CACHE.users = data; }),
      fetch(`${API_BASE}/assignments`).then(r => r.json()).then(data => { CACHE.assignments = data; }),
      fetch(`${API_BASE}/requests`).then(r => r.json()).then(data => { CACHE.requests = data; }),
      fetch(`${API_BASE}/decisions`).then(r => r.json()).then(data => { CACHE.decisions = data; }),
      fetch(`${API_BASE}/audit`).then(r => r.json()).then(data => { CACHE.audit = data; })
    ];

    if (user) {
      promises.push(
        fetch(`${API_BASE}/notifications/${user.id}`).then(r => r.json()).then(data => { CACHE.notifications = data; })
      );
      if (user.role === 'student') {
        promises.push(
          fetch(`${API_BASE}/grades/${user.id}`).then(r => r.json()).then(data => { CACHE.grades = data; })
        );
      }
    }

    try {
      await Promise.all(promises);
    } catch (err) {
      console.error('Failed to preload data from server:', err);
    }
  }

  /* ══════════════════════════════════════════════════════
     USERS (Synchronous reads from cache)
     ══════════════════════════════════════════════════════ */
  function getUsers()     { return CACHE.users; }
  function getUser(id)    { return CACHE.users.find(u => u.id === id) || null; }
  function getStudents()  { return CACHE.users.filter(u => u.role === 'student'); }
  function getInstructors(){ return CACHE.users.filter(u => u.role === 'instructor'); }

  /* ══════════════════════════════════════════════════════
     ASSIGNMENTS (Synchronous reads from cache)
     ══════════════════════════════════════════════════════ */
  function getAssignments()    { return CACHE.assignments; }
  function getAssignment(id)   { return CACHE.assignments.find(a => a.id === id) || null; }

  /* ══════════════════════════════════════════════════════
     GRADES (Synchronous reads from cache)
     ══════════════════════════════════════════════════════ */
  function getGradesForStudent(sid) { return CACHE.grades.filter(g => g.studentId === sid); }
  function getGrade(sid, aid)       { return CACHE.grades.find(g => g.studentId === sid && g.assignmentId === aid) || null; }

  /* ══════════════════════════════════════════════════════
     REGRADE REQUESTS
     ══════════════════════════════════════════════════════ */
  function getRequests()            {
    const user = window.LMS.Auth.getCurrentUser();
    let list = CACHE.requests;
    if (user && user.role === 'instructor') {
      const myAsgns = CACHE.assignments.filter(a => a.instructorId === user.id).map(a => a.id);
      list = list.filter(r => myAsgns.includes(r.assignmentId));
    }
    return list;
  }
  function getRequest(id)           { return CACHE.requests.find(r => r.id === id) || null; }
  function getAllRequests()         {
    const user = window.LMS.Auth.getCurrentUser();
    let list = CACHE.requests;
    if (user && user.role === 'instructor') {
      const myAsgns = CACHE.assignments.filter(a => a.instructorId === user.id).map(a => a.id);
      list = list.filter(r => myAsgns.includes(r.assignmentId));
    }
    return list.slice().sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }
  function getRequestsByStudent(sid){ return CACHE.requests.filter(r => r.studentId === sid).sort((a,b) => new Date(b.submittedAt) - new Date(a.submittedAt)); }
  function getActiveRequestForAssignment(sid, aid) {
    return CACHE.requests.find(r => r.studentId === sid && r.assignmentId === aid && r.status !== 'Closed') || null;
  }

  async function createRequest(data) {
    const res = await fetch(`${API_BASE}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit request');
    }
    const created = await res.json();
    CACHE.requests.push(created);
    return created;
  }

  async function updateRequestStatus(id, newStatus, actorId, actorRole) {
    const user = window.LMS.Auth.getCurrentUser();
    const body = {
      status: newStatus,
      actorId: actorId || (user ? user.id : 'system'),
      actorRole: actorRole || (user ? user.role : 'system')
    };

    const res = await fetch(`${API_BASE}/requests/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to update request status');
    }
    const updated = await res.json();
    const idx = CACHE.requests.findIndex(r => r.id === id);
    if (idx !== -1) {
      CACHE.requests[idx] = updated;
    }
    return { oldStatus: '', request: updated };
  }

  async function reopenRequest(id, studentId) {
    const res = await fetch(`${API_BASE}/requests/${id}/reopen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reopen request');
    }
    const updated = await res.json();
    const idx = CACHE.requests.findIndex(r => r.id === id);
    if (idx !== -1) {
      CACHE.requests[idx] = updated;
    }
    return { request: updated };
  }

  /* ══════════════════════════════════════════════════════
     DECISIONS
     ══════════════════════════════════════════════════════ */
  function getDecisions()              { return CACHE.decisions; }
  // Retrieves decision details for a given request ID from cached Decisions
  function getDecisionForRequest(rid)  { return CACHE.decisions.find(d => d.requestId === rid) || null; }

  async function submitDecision(requestId, instructorId, decision, justification, revisedGrade) {
    const res = await fetch(`${API_BASE}/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, instructorId, decision, justification, revisedGrade })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit decision');
    }
    const dec = await res.json();
    CACHE.decisions.push(dec);
    
    // Optimistically update local request finalGrade and score if Accepted
    const reqIdx = CACHE.requests.findIndex(r => r.id === requestId);
    if (reqIdx !== -1) {
      CACHE.requests[reqIdx].status = decision;
      if (decision === 'Accepted') {
        CACHE.requests[reqIdx].finalGrade = revisedGrade;
        const gIdx = CACHE.grades.findIndex(g => g.studentId === CACHE.requests[reqIdx].studentId && g.assignmentId === CACHE.requests[reqIdx].assignmentId);
        if (gIdx !== -1) {
          CACHE.grades[gIdx].score = revisedGrade;
        }
      }
    }
    return dec;
  }

  /* ══════════════════════════════════════════════════════
     AUDIT LOG (append-only)
     ══════════════════════════════════════════════════════ */
  function getAuditLog(requestId) {
    return requestId ? CACHE.audit.filter(l => l.requestId === requestId) : CACHE.audit;
  }

  async function addAuditEntry(entry) {
    const res = await fetch(`${API_BASE}/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add audit entry');
    }
    const log = await res.json();
    CACHE.audit.push(log);
    return log;
  }

  /* ══════════════════════════════════════════════════════
     NOTIFICATIONS
     ══════════════════════════════════════════════════════ */
  function getNotifications(uid)  { return CACHE.notifications.filter(n => n.userId === uid).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)); }
  function getUnreadCount(uid)    { return getNotifications(uid).filter(n => !n.read).length; }

  async function addNotification(uid, type, message, requestId) {
    const res = await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid, type, message, requestId })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create notification');
    }
    const notif = await res.json();
    CACHE.notifications.unshift(notif);
    return notif;
  }

  async function markNotificationRead(id) {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to mark notification read');
    }
    const updated = await res.json();
    const idx = CACHE.notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
      CACHE.notifications[idx] = updated;
    }
  }

  async function markAllNotificationsRead(uid) {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to mark all notifications read');
    }
    CACHE.notifications.forEach(n => {
      if (n.userId === uid) n.read = true;
    });
  }

  /* ══════════════════════════════════════════════════════
     RESET (dev utility)
     ══════════════════════════════════════════════════════ */
  async function reset() {
    const res = await fetch(`${API_BASE}/reset`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to reset database');
    }
    const user = window.LMS.Auth.getCurrentUser();
    await preload(user);
  }

  async function verifyCredentials(loginId, password, isGoogle) {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId, password, isGoogle })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Invalid credentials');
    }
    return await res.json();
  }

  async function createUser(data) {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create account');
    }
    const created = await res.json();
    CACHE.users.push(created);
    return created;
  }

  async function createAssignment(data) {
    const res = await fetch(`${API_BASE}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to create assignment');
    }
    const created = await res.json();
    CACHE.assignments.push(created);
    return created;
  }

  return {
    preload,
    /* users */ getUsers, getUser, getStudents, getInstructors, verifyCredentials, createUser,
    /* assignments */ getAssignments, getAssignment, createAssignment,
    /* grades */ getGradesForStudent, getGrade,
    /* requests */ getRequests, getRequest, getAllRequests, getRequestsByStudent,
                  getActiveRequestForAssignment, createRequest, updateRequestStatus, reopenRequest,
    /* decisions */ getDecisions, getDecisionForRequest, submitDecision,
    /* audit */ getAuditLog, addAuditEntry,
    /* notifications */ getNotifications, getUnreadCount, addNotification,
                        markNotificationRead, markAllNotificationsRead,
    /* util */ reset
  };
})();
