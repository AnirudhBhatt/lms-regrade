/* ═══════════════════════════════════════════════════════
   auth.js — Role simulation (Student / Instructor)
   Day 1: Role definitions + session management
   ═══════════════════════════════════════════════════════ */
window.LMS = window.LMS || {};

window.LMS.Auth = (function () {
  'use strict';
  const SESSION_KEY = 'lms_session_user';

  function getCurrentUser() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); }
    catch(e) { return null; }
  }

  function login(userId) {
    const user = window.LMS.Store.getUser(userId);
    if (!user) throw new Error('User not found');
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }

  function logout() { sessionStorage.removeItem(SESSION_KEY); }

  function isAuthenticated() { return getCurrentUser() !== null; }
  function isStudent()       { const u = getCurrentUser(); return u && u.role === 'student'; }
  function isInstructor()    { const u = getCurrentUser(); return u && u.role === 'instructor'; }

  function requireAuth() {
    if (!isAuthenticated()) { window.location.hash = '#/login'; return false; }
    return true;
  }

  return { getCurrentUser, login, logout, isAuthenticated, isStudent, isInstructor, requireAuth };
})();
