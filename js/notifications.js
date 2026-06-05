/* ═══════════════════════════════════════════════════════
   notifications.js — In-app toast + drawer system
   Day 3: Notification triggers for all state transitions
   ═══════════════════════════════════════════════════════ */
window.LMS = window.LMS || {};

window.LMS.Notifications = (function () {
  'use strict';

  let _updateCb = null;
  function setUpdateCallback(fn) { _updateCb = fn; }
  function _triggerUpdate() { if (_updateCb) _updateCb(); }

  /* ── SVG icons ── */
  const ICONS = {
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>',
    error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>'
  };

  /* ── Toast ── */
  function showToast(type, title, message, duration) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    toast.innerHTML = `
      <div class="toast-icon">${ICONS[type] || ICONS.info}</div>
      <div class="toast-content">
        <div class="toast-title">${_esc(title)}</div>
        ${message ? `<div class="toast-message">${_esc(message)}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()" aria-label="Dismiss">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
      </button>`;

    container.appendChild(toast);
    const ms = duration || 4500;
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 280);
    }, ms);
  }

  /* ── Persist notification to store + update UI ── */
  function notify(userId, type, message, requestId) {
    const n = window.LMS.Store.addNotification(userId, type, message, requestId);
    _triggerUpdate();
    return n;
  }

  /* ── Render notification drawer ── */
  function renderDrawer(userId) {
    const list = document.getElementById('notif-list');
    if (!list) return;
    const notifs = window.LMS.Store.getNotifications(userId);

    if (!notifs.length) {
      list.innerHTML = `<div class="notif-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg><p>You're all caught up!</p></div>`;
      return;
    }

    list.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}"
           onclick="window.LMS.App.handleNotifClick('${_esc(n.id)}','${_esc(n.requestId||'')}')"
           data-notif-id="${_esc(n.id)}">
        <div class="notif-message">${_esc(n.message)}</div>
        <div class="notif-time">${formatTime(n.createdAt)}</div>
      </div>`).join('');
  }

  function updateBadge(userId) {
    const count = window.LMS.Store.getUnreadCount(userId);
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    if (count > 0) { badge.textContent = count > 9 ? '9+' : String(count); badge.classList.remove('hidden'); }
    else           { badge.classList.add('hidden'); }
  }

  /* ── Relative time ── */
  function formatTime(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), d = Math.floor(diff/86400000);
    if (m < 1)  return 'Just now';
    if (m < 60) return m + 'm ago';
    if (h < 24) return h + 'h ago';
    if (d === 1)return 'Yesterday';
    if (d < 7)  return d + 'd ago';
    return new Date(iso).toLocaleDateString('en-US',{month:'short',day:'numeric'});
  }

  function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  return { setUpdateCallback, showToast, notify, renderDrawer, updateBadge, formatTime };
})();
