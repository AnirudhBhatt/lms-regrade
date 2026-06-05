/* ═══════════════════════════════════════════════════════
   views/login.js — Secure Login, Registration, and Google Sign Up
   ═══════════════════════════════════════════════════════ */
window.LMS = window.LMS || {};
window.LMS.Views = window.LMS.Views || {};

window.LMS.Views.Login = (function () {
  'use strict';

  let _mode = 'login'; // 'login' or 'register'

  function render() {
    return `
      <div id="login-view">
        <div class="login-container">
          <div class="login-logo" style="margin-bottom: 24px; display: flex; justify-content: center;">
            <div style="background: #ffffff; padding: 12px 20px; border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(0,0,0,0.25);">
              <img src="upes_logo.png" alt="UPES Logo" style="max-height: 52px; max-width: 100%; object-fit: contain;">
            </div>
          </div>

          <div class="login-heading">
            <h2>Welcome to ReGrade</h2>
            <p>${_mode === 'login' ? 'Enter credentials to access your portal' : 'Create a student or instructor account'}</p>
          </div>

          ${_mode === 'login' ? _loginForm() : _registerForm()}

          <div class="login-divider">or</div>

          <button class="google-btn" onclick="window.LMS.Views.Login.showGoogleModal()">
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91a8.78 8.78 0 0 0 2.69-6.6z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.91-2.26c-.8.54-1.85.86-3.05.86-2.34 0-4.33-1.58-5.04-3.7H.95v2.3A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.96 10.7a5.4 5.4 0 0 1 0-3.4V5H.95a9 9 0 0 0 0 8l3.01-2.3z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .95 5l3.01 2.3C4.67 5.16 6.66 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <a class="login-toggle-link" onclick="window.LMS.Views.Login.toggleMode()">
            ${_mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </a>
        </div>

        <!-- Google Modal Container -->
        <div id="google-modal-container"></div>
      </div>`;
  }

  function _loginForm() {
    return `
      <form onsubmit="event.preventDefault(); window.LMS.Views.Login.handleLogin();">
        <div class="login-form-group">
          <label for="login-id">Email or User ID</label>
          <input type="text" id="login-id" class="login-input" placeholder="e.g. anirudh@upes.edu or u1" required autocomplete="username">
        </div>
        <div class="login-form-group">
          <label for="login-pass">Password</label>
          <input type="password" id="login-pass" class="login-input" placeholder="••••••••" required autocomplete="current-password">
        </div>
        <button type="submit" class="btn btn-primary w-full" style="margin-top: 12px; padding: 12px;">
          Sign In
        </button>
      </form>`;
  }

  function _registerForm() {
    return `
      <form onsubmit="event.preventDefault(); window.LMS.Views.Login.handleRegister();">
        <div class="login-form-group">
          <label for="reg-name">Full Name</label>
          <input type="text" id="reg-name" class="login-input" placeholder="e.g. Himanshu Kadyan" required autocomplete="name">
        </div>
        <div class="login-form-group">
          <label for="reg-email">UPES Email</label>
          <input type="email" id="reg-email" class="login-input" placeholder="e.g. himanshu@upes.edu" required autocomplete="email">
        </div>
        <div class="login-form-group">
          <label for="reg-id">Unique User ID</label>
          <input type="text" id="reg-id" class="login-input" placeholder="e.g. u10 (Must be unique)" required>
        </div>
        <div class="login-form-group">
          <label for="reg-pass">Password</label>
          <input type="password" id="reg-pass" class="login-input" placeholder="Choose a strong password" required autocomplete="new-password">
        </div>
        <div class="login-form-group">
          <label for="reg-role">Role</label>
          <select id="reg-role" class="login-input" style="background-image: none;" required>
            <option value="student">Student (auto-generates default grades)</option>
            <option value="instructor">Instructor (review & grade ownership)</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary w-full" style="margin-top: 12px; padding: 12px;">
          Create Account
        </button>
      </form>`;
  }

  function toggleMode() {
    _mode = _mode === 'login' ? 'register' : 'login';
    const view = document.getElementById('page-content');
    if (view) view.innerHTML = render();
  }

  async function handleLogin() {
    const loginId = document.getElementById('login-id').value.trim();
    const pass = document.getElementById('login-pass').value;

    try {
      const user = await window.LMS.Store.verifyCredentials(loginId, pass);
      // Store current user session
      sessionStorage.setItem('lms_session_user', JSON.stringify(user));
      window.LMS.Notifications.showToast('success', 'Welcome Back!', `Signed in as ${user.name}`);
      setTimeout(() => { window.LMS.App.onLogin(); }, 600);
    } catch (e) {
      window.LMS.Notifications.showToast('error', 'Login Failed', e.message);
    }
  }

  async function handleRegister() {
    const id = document.getElementById('reg-id').value.trim().toLowerCase();
    const name = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-pass').value;
    const role = document.getElementById('reg-role').value;

    if (!email.endsWith('@upes.edu') && !email.endsWith('.upes.edu') && !email.endsWith('@gmail.com')) {
       window.LMS.Notifications.showToast('warning', 'Invalid Email', 'Please use a valid email.');
       return;
    }

    try {
      const newUser = await window.LMS.Store.createUser({ id, name, email, password, role });
      window.LMS.Notifications.showToast('success', 'Account Created!', 'You can now log in with your credentials.');
      _mode = 'login';
      const view = document.getElementById('page-content');
      if (view) {
        view.innerHTML = render();
        document.getElementById('login-id').value = id;
      }
    } catch(e) {
      window.LMS.Notifications.showToast('error', 'Registration Failed', e.message);
    }
  }

  /* ════════════════════════════════════════════
     GOOGLE SIGNUP/SIGNIN MODAL
     ════════════════════════════════════════════ */
  function showGoogleModal() {
    const container = document.getElementById('google-modal-container');
    if (!container) return;

    container.innerHTML = `
      <div class="google-modal-overlay">
        <div class="google-modal">
          <div class="google-modal-header">
            <!-- Google Logo SVG -->
            <svg class="google-logo-svg" viewBox="0 0 74 24">
              <path fill="#4285F4" d="M12.2 4.7C10 4.7 8.2 5.5 7 6.8l2.9 2.9c.7-.7 1.7-1.1 2.8-1.1 2.3 0 4.2 1.6 4.9 3.8l3.9-3C20.1 6.3 16.5 4.7 12.2 4.7z"/>
              <path fill="#EA4335" d="M12.2 19.3c-2.3 0-4.2-1.6-4.9-3.8l-3.9 3c1.6 3.1 5.2 4.7 9.5 4.7 3.3 0 6.2-1 8.3-2.8l-3.3-2.6c-1.3.9-3 1.5-4.7 1.5z"/>
              <path fill="#FBBC05" d="M7.3 15.5c-.3-.9-.4-1.9-.4-3s.1-2.1.4-3l-3.9-3C2.5 8.1 2 10 2 12.5s.5 4.4 1.4 6l3.9-3z"/>
              <path fill="#4285F4" d="M22.5 12.5c0-.6-.1-1.2-.2-1.8h-10.1v3.5h5.8c-.3 1.5-1.1 2.7-2.3 3.5l3.3 2.6c2.4-2.2 3.5-5.3 3.5-7.8z"/>
            </svg>
            <h3 class="google-modal-title">Sign in with Google</h3>
            <p class="google-modal-sub">to continue to ReGrade Portal</p>
          </div>

          <div class="google-accounts-list">
            <div class="google-account-item" onclick="window.LMS.Views.Login.selectGoogleAccount('Anirudh Bhatt', 'anirudh@upes.edu')">
              <div class="google-account-avatar">AB</div>
              <div>
                <div class="google-account-name">Anirudh Bhatt</div>
                <div class="google-account-email">anirudh@upes.edu</div>
              </div>
            </div>
            <div class="google-account-item" onclick="window.LMS.Views.Login.selectGoogleAccount('Raygun Jose', 'raygun.jose@upes.edu')">
              <div class="google-account-avatar">RJ</div>
              <div>
                <div class="google-account-name">Raygun Jose</div>
                <div class="google-account-email">raygun.jose@upes.edu</div>
              </div>
            </div>
          </div>

          <div class="google-custom-input-group">
            <p style="margin:0 0 10px 0; font-size:13px; font-weight:600; color:#5f6368;">Use another Google Account</p>
            <input type="text" id="google-custom-name" class="form-control" placeholder="Your Name" style="margin-bottom:8px; font-size:13px; padding:8px 12px; height:auto; width:100%; box-sizing:border-box;">
            <input type="email" id="google-custom-email" class="form-control" placeholder="email@gmail.com" style="margin-bottom:8px; font-size:13px; padding:8px 12px; height:auto; width:100%; box-sizing:border-box;">
            
            <label style="display:block; font-size:11px; font-weight:600; color:#5f6368; margin-bottom:4px;">ACCOUNT ROLE</label>
            <select id="google-custom-role" class="google-role-select">
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
            </select>
            
            <button class="btn btn-primary btn-sm w-full" onclick="window.LMS.Views.Login.submitGoogleCustom()">
              Add and Continue
            </button>
          </div>

          <div class="google-modal-footer">
            <button class="btn btn-secondary btn-sm" onclick="window.LMS.Views.Login.closeGoogleModal()">Cancel</button>
          </div>
        </div>
      </div>`;
  }

  function closeGoogleModal() {
    const container = document.getElementById('google-modal-container');
    if (container) container.innerHTML = '';
  }

  async function selectGoogleAccount(name, email) {
    const users = window.LMS.Store.getUsers();
    const existing = users.find(u => u.email === email);

    if (existing) {
      try {
        const user = await window.LMS.Store.verifyCredentials(existing.id, null, true);
        sessionStorage.setItem('lms_session_user', JSON.stringify(user));
        window.LMS.Notifications.showToast('success', 'Google Authenticated!', `Welcome back, ${user.name}`);
        closeGoogleModal();
        setTimeout(() => { window.LMS.App.onLogin(); }, 600);
      } catch (err) {
        window.LMS.Notifications.showToast('error', 'Google Login Failed', err.message);
      }
    } else {
      // Create new Google student or instructor
      const roleSelect = document.getElementById('google-custom-role');
      const role = roleSelect ? roleSelect.value : 'student';
      await _registerGoogleUser(name, email, role);
    }
  }

  async function submitGoogleCustom() {
    const name = document.getElementById('google-custom-name').value.trim();
    const email = document.getElementById('google-custom-email').value.trim().toLowerCase();
    const role = document.getElementById('google-custom-role').value;

    if (!name || !email) {
      window.LMS.Notifications.showToast('warning', 'Missing Fields', 'Please enter both name and email.');
      return;
    }
    if (!email.includes('@')) {
      window.LMS.Notifications.showToast('warning', 'Invalid Email', 'Please enter a valid email address.');
      return;
    }

    const users = window.LMS.Store.getUsers();
    const existing = users.find(u => u.email === email);
    if (existing) {
      try {
        const user = await window.LMS.Store.verifyCredentials(existing.id, null, true);
        sessionStorage.setItem('lms_session_user', JSON.stringify(user));
        window.LMS.Notifications.showToast('success', 'Google Authenticated!', `Welcome back, ${user.name}`);
        closeGoogleModal();
        setTimeout(() => { window.LMS.App.onLogin(); }, 600);
      } catch (err) {
        window.LMS.Notifications.showToast('error', 'Google Login Failed', err.message);
      }
    } else {
      await _registerGoogleUser(name, email, role);
    }
  }

  async function _registerGoogleUser(name, email, role) {
    const id = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '_');
    const avatar = name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0, 2);
    // Google sign up sets a secure bypass password
    const password = 'google_authenticated_' + Math.random().toString(36).slice(2);

    try {
      const newUser = await window.LMS.Store.createUser({ id, name, email, avatar, password, role });
      // Log in immediately
      sessionStorage.setItem('lms_session_user', JSON.stringify(newUser));
      window.LMS.Notifications.showToast('success', 'Google Account Registered!', `Successfully created ${role} account: ${name}`);
      closeGoogleModal();
      setTimeout(() => { window.LMS.App.onLogin(); }, 600);
    } catch(e) {
      window.LMS.Notifications.showToast('error', 'Google Sign Up Failed', e.message);
    }
  }

  return { render, toggleMode, handleLogin, handleRegister, showGoogleModal, closeGoogleModal, selectGoogleAccount, submitGoogleCustom };
})();
