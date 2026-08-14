/* ============================================================================
   IntelliLab Society — membership
   ----------------------------------------------------------------------------
   Implements the "member portal" our Chapter 2 review found missing from every
   website we studied ("No User Authentication. The site has no login system,
   member portal, or personalised user experience.").

   TWO BACKENDS, ONE PUBLIC API
   ---------------------------------------------------------------------------
     CloudAuth  — Firebase Authentication + Cloud Firestore.
                  Real accounts on a real server. Sign up on your laptop, sign
                  in on your phone, and it is the same account. This is what
                  runs once js/firebase-config.js has been filled in.

     LocalAuth  — accounts held in this browser's localStorage, passwords
                  salted and SHA-256 hashed. Used automatically whenever
                  Firebase is not configured or cannot be reached, so the site
                  never breaks — including during an offline demo.

   `Auth` below is a thin facade that forwards to whichever backend is active.
   Page code never needs to know which one it is talking to.

   WHAT STILL USES BROWSER STORAGE (unchanged, and still assessed)
   ---------------------------------------------------------------------------
     Cookies         -> colour theme, display name, visit counter
     localStorage    -> your shortlist of saved projects and workshops
     sessionStorage  -> half-finished registration and contact forms

   Moving accounts to Firebase does not remove any of those; it adds a genuine
   server-backed identity on top of them.
   ========================================================================== */

/* ===========================================================================
   BACKEND 1 — LOCAL (browser-only fallback)
   ========================================================================= */
var LocalAuth = (function () {

  var ACCOUNTS_KEY = 'ils_accounts';
  var SESSION_KEY  = 'ils_session';
  var REG_KEY      = 'ils_registrations';

  function randomSalt() {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint8Array(16);
      crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }
    return String(Date.now()) + Math.random().toString(36).slice(2);
  }

  function weakFallbackHash(text) {
    var h1 = 0x811c9dc5, h2 = 0x01000193;
    for (var i = 0; i < text.length; i++) {
      h1 ^= text.charCodeAt(i); h1 = (h1 * 0x01000193) >>> 0;
      h2 = ((h2 << 5) - h2 + text.charCodeAt(i)) >>> 0;
    }
    return 'fallback$' + h1.toString(16) + h2.toString(16);
  }

  function hash(password, salt) {
    var text = salt + '::' + password + '::intellilab';
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      return crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
        .then(function (buf) {
          return Array.prototype.map.call(new Uint8Array(buf), function (b) {
            return b.toString(16).padStart(2, '0');
          }).join('');
        })
        .catch(function () { return weakFallbackHash(text); });
    }
    return Promise.resolve(weakFallbackHash(text));
  }

  function accounts()      { return Store.get(ACCOUNTS_KEY, []); }
  function saveAccounts(a) { return Store.set(ACCOUNTS_KEY, a); }

  function findByEmail(email) {
    var target = String(email || '').trim().toLowerCase();
    var list = accounts();
    for (var i = 0; i < list.length; i++) if (list[i].email === target) return list[i];
    return null;
  }

  function writeSession(email, remember) {
    var token = { email: email, at: new Date().toISOString(), remember: !!remember };
    if (remember) { Session.remove(SESSION_KEY); Cookie.set(SESSION_KEY, JSON.stringify(token), 30); }
    else          { Cookie.remove(SESSION_KEY);  Session.set(SESSION_KEY, token); }
  }

  function readSession() {
    var raw = Cookie.get(SESSION_KEY);
    if (raw) { try { return JSON.parse(raw); } catch (e) {} }
    return Session.get(SESSION_KEY, null);
  }

  function clearSession() { Cookie.remove(SESSION_KEY); Session.remove(SESSION_KEY); }

  function fire(user) { document.dispatchEvent(new CustomEvent('auth:changed', { detail: user })); }

  return {
    kind: 'local',

    start: function () { /* nothing async to wait for */ },

    current: function () {
      var s = readSession();
      if (!s || !s.email) return null;
      var acc = findByEmail(s.email);
      if (!acc) { clearSession(); return null; }
      return acc;
    },

    sessionKind: function () {
      if (Cookie.get(SESSION_KEY)) return 'cookie';
      if (Session.get(SESSION_KEY, null)) return 'sessionStorage';
      return null;
    },

    register: function (name, email, password, remember) {
      name = String(name || '').trim();
      email = String(email || '').trim().toLowerCase();
      if (name.length < 2) return Promise.reject('Please enter your full name.');
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return Promise.reject('That email address does not look valid.');
      if (String(password).length < 8) return Promise.reject('Your password must be at least 8 characters.');
      if (findByEmail(email)) return Promise.reject('An account already exists for that email. Try signing in instead.');

      var salt = randomSalt();
      return hash(password, salt).then(function (digest) {
        var account = {
          name: name, email: email, salt: salt, hash: digest,
          joined: new Date().toISOString(), lastLogin: new Date().toISOString(),
          logins: 1, bio: '', faculty: '', track: 'Prompt Engineering'
        };
        var list = accounts();
        list.push(account);
        if (!saveAccounts(list)) return Promise.reject('Your browser blocked local storage, so the account could not be saved.');
        writeSession(email, remember);
        fire(account);
        return account;
      });
    },

    login: function (email, password, remember) {
      email = String(email || '').trim().toLowerCase();
      var acc = findByEmail(email);
      if (!acc) return Promise.reject('Email or password is incorrect.');
      return hash(password, acc.salt).then(function (digest) {
        if (digest !== acc.hash) return Promise.reject('Email or password is incorrect.');
        acc.lastLogin = new Date().toISOString();
        acc.logins = (acc.logins || 0) + 1;
        saveAccounts(accounts().map(function (a) { return a.email === acc.email ? acc : a; }));
        writeSession(acc.email, remember);
        fire(acc);
        return acc;
      });
    },

    logout: function () { clearSession(); fire(null); return Promise.resolve(); },

    update: function (fields) {
      var acc = LocalAuth.current();
      if (!acc) return Promise.reject('Not signed in.');
      ['name', 'bio', 'faculty', 'track'].forEach(function (k) {
        if (k in fields) acc[k] = fields[k];
      });
      saveAccounts(accounts().map(function (a) { return a.email === acc.email ? acc : a; }));
      fire(acc);
      return Promise.resolve(acc);
    },

    deleteAccount: function () {
      var acc = LocalAuth.current();
      if (!acc) return Promise.reject('Not signed in.');
      saveAccounts(accounts().filter(function (a) { return a.email !== acc.email; }));
      var regs = Store.get(REG_KEY, {});
      delete regs[acc.email];
      Store.set(REG_KEY, regs);
      clearSession();
      fire(null);
      return Promise.resolve();
    },

    addRegistration: function (entry) {
      var acc = LocalAuth.current();
      if (!acc) return Promise.resolve(false);
      var all = Store.get(REG_KEY, {});
      var mine = all[acc.email] || [];
      mine.push({ event: entry.event, mode: entry.mode, notes: entry.notes || '', at: new Date().toISOString() });
      all[acc.email] = mine;
      Store.set(REG_KEY, all);
      document.dispatchEvent(new CustomEvent('registrations:changed'));
      return Promise.resolve(true);
    },

    registrations: function () {
      var acc = LocalAuth.current();
      if (!acc) return [];
      return (Store.get(REG_KEY, {})[acc.email]) || [];
    },

    refreshRegistrations: function () { return Promise.resolve(LocalAuth.registrations()); },

    cancelRegistration: function (index) {
      var acc = LocalAuth.current();
      if (!acc) return Promise.resolve(false);
      var all = Store.get(REG_KEY, {});
      var mine = all[acc.email] || [];
      mine.splice(index, 1);
      all[acc.email] = mine;
      Store.set(REG_KEY, all);
      document.dispatchEvent(new CustomEvent('registrations:changed'));
      return Promise.resolve(true);
    },

    accountCount: function () { return accounts().length; }
  };
})();


/* ===========================================================================
   BACKEND 2 — CLOUD (Firebase Authentication + Cloud Firestore)
   ========================================================================= */
var CloudAuth = (function () {

  var profile = null;      // cached Firestore profile, kept in sync
  var regs = [];           // cached registrations
  var ready = false;

  function fire(user) { document.dispatchEvent(new CustomEvent('auth:changed', { detail: user })); }

  /* Firebase error codes are not written for humans. Translate the common ones. */
  function friendly(err) {
    var code = (err && err.code) || '';
    var map = {
      'auth/email-already-in-use'   : 'An account already exists for that email. Try signing in instead.',
      'auth/invalid-email'          : 'That email address does not look valid.',
      'auth/weak-password'          : 'Your password must be at least 8 characters.',
      'auth/user-not-found'         : 'Email or password is incorrect.',
      'auth/wrong-password'         : 'Email or password is incorrect.',
      'auth/invalid-credential'     : 'Email or password is incorrect.',
      'auth/too-many-requests'      : 'Too many attempts. Please wait a minute and try again.',
      'auth/network-request-failed' : 'No connection to the server. Check your internet and try again.',
      'auth/operation-not-allowed'  : 'Email sign-in is not switched on for this Firebase project yet.',
      'auth/unauthorized-domain'    : 'This web address is not on the Firebase authorised domains list.',
      'permission-denied'           : 'The database rejected that request. Check your Firestore security rules.'
    };
    return map[code] || (err && err.message) || 'Something went wrong. Please try again.';
  }

  function profileRef(uid) { return FB.doc(FB.db, 'users', uid); }
  function regsRef(uid)    { return FB.collection(FB.db, 'users', uid, 'registrations'); }

  function loadProfile(user) {
    return FB.getDoc(profileRef(user.uid)).then(function (snap) {
      var base = {
        uid: user.uid,
        email: user.email,
        name: user.displayName || (user.email || '').split('@')[0],
        joined: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        logins: 1, bio: '', faculty: '', track: 'Prompt Engineering'
      };
      if (snap.exists()) {
        var d = snap.data();
        profile = Object.assign(base, d, { uid: user.uid, email: user.email });
      } else {
        profile = base;
        return FB.setDoc(profileRef(user.uid), profile).then(function () { return profile; });
      }
      return profile;
    });
  }

  function loadRegs(uid) {
    return FB.getDocs(FB.query(regsRef(uid), FB.orderBy('at', 'desc')))
      .then(function (snap) {
        regs = [];
        snap.forEach(function (d) {
          var v = d.data();
          regs.push({ id: d.id, event: v.event, mode: v.mode, notes: v.notes || '', at: v.at });
        });
        document.dispatchEvent(new CustomEvent('registrations:changed'));
        return regs;
      })
      .catch(function () { regs = []; return regs; });
  }

  return {
    kind: 'cloud',

    /* Called once at startup. Watches sign-in state for the whole site. */
    start: function () {
      FB.onAuthStateChanged(FB.auth, function (user) {
        ready = true;
        if (!user) { profile = null; regs = []; fire(null); return; }
        loadProfile(user)
          .then(function (p) { fire(p); return loadRegs(user.uid); })
          .catch(function (e) { console.warn('[IntelliLab] profile load failed', e); fire(null); });
      });
    },

    isReady: function () { return ready; },

    current: function () { return profile; },

    sessionKind: function () {
      if (!profile) return null;
      return CloudAuth._remember === false ? 'sessionStorage' : 'cookie';
    },

    _remember: true,

    register: function (name, email, password, remember) {
      name = String(name || '').trim();
      email = String(email || '').trim().toLowerCase();
      if (name.length < 2) return Promise.reject('Please enter your full name.');
      if (String(password).length < 8) return Promise.reject('Your password must be at least 8 characters.');

      CloudAuth._remember = !!remember;
      return FB.setPersistence(FB.auth, remember ? FB.browserLocalPersistence : FB.browserSessionPersistence)
        .then(function () { return FB.createUserWithEmailAndPassword(FB.auth, email, password); })
        .then(function (cred) {
          return FB.updateProfile(cred.user, { displayName: name }).then(function () {
            var p = {
              uid: cred.user.uid, email: email, name: name,
              joined: new Date().toISOString(), lastLogin: new Date().toISOString(),
              logins: 1, bio: '', faculty: '', track: 'Prompt Engineering'
            };
            return FB.setDoc(profileRef(cred.user.uid), p).then(function () {
              profile = p; fire(p); return p;
            });
          });
        })
        .catch(function (e) { return Promise.reject(friendly(e)); });
    },

    login: function (email, password, remember) {
      email = String(email || '').trim().toLowerCase();
      CloudAuth._remember = !!remember;
      return FB.setPersistence(FB.auth, remember ? FB.browserLocalPersistence : FB.browserSessionPersistence)
        .then(function () { return FB.signInWithEmailAndPassword(FB.auth, email, password); })
        .then(function (cred) {
          return loadProfile(cred.user).then(function (p) {
            p.lastLogin = new Date().toISOString();
            p.logins = (p.logins || 0) + 1;
            return FB.updateDoc(profileRef(cred.user.uid), { lastLogin: p.lastLogin, logins: p.logins })
              .then(function () { profile = p; fire(p); return loadRegs(cred.user.uid).then(function () { return p; }); });
          });
        })
        .catch(function (e) { return Promise.reject(friendly(e)); });
    },

    logout: function () {
      return FB.signOut(FB.auth).then(function () { profile = null; regs = []; fire(null); });
    },

    update: function (fields) {
      var u = FB.auth.currentUser;
      if (!u || !profile) return Promise.reject('Not signed in.');
      var patch = {};
      ['name', 'bio', 'faculty', 'track'].forEach(function (k) { if (k in fields) patch[k] = fields[k]; });
      return FB.updateDoc(profileRef(u.uid), patch)
        .then(function () {
          if (patch.name) return FB.updateProfile(u, { displayName: patch.name });
        })
        .then(function () {
          Object.assign(profile, patch);
          fire(profile);
          return profile;
        })
        .catch(function (e) { return Promise.reject(friendly(e)); });
    },

    deleteAccount: function () {
      var u = FB.auth.currentUser;
      if (!u) return Promise.reject('Not signed in.');
      var uid = u.uid;
      return FB.getDocs(regsRef(uid))
        .then(function (snap) {
          return Promise.all(snap.docs.map(function (d) { return FB.deleteDoc(d.ref); }));
        })
        .then(function () { return FB.deleteDoc(profileRef(uid)); })
        .then(function () { return FB.deleteUser(u); })
        .then(function () { profile = null; regs = []; fire(null); })
        .catch(function (e) {
          if (e && e.code === 'auth/requires-recent-login') {
            return Promise.reject('For security, please sign out and sign in again before deleting your account.');
          }
          return Promise.reject(friendly(e));
        });
    },

    addRegistration: function (entry) {
      var u = FB.auth.currentUser;
      if (!u) return Promise.resolve(false);
      var rec = { event: entry.event, mode: entry.mode, notes: entry.notes || '', at: new Date().toISOString() };
      return FB.addDoc(regsRef(u.uid), rec)
        .then(function (ref) {
          regs.unshift(Object.assign({ id: ref.id }, rec));
          document.dispatchEvent(new CustomEvent('registrations:changed'));
          return true;
        })
        .catch(function (e) { console.warn('[IntelliLab] could not save registration', e); return false; });
    },

    registrations: function () { return regs; },

    refreshRegistrations: function () {
      var u = FB.auth.currentUser;
      return u ? loadRegs(u.uid) : Promise.resolve([]);
    },

    cancelRegistration: function (index) {
      var u = FB.auth.currentUser;
      var target = regs[index];
      if (!u || !target) return Promise.resolve(false);
      return FB.deleteDoc(FB.doc(FB.db, 'users', u.uid, 'registrations', target.id))
        .then(function () {
          regs.splice(index, 1);
          document.dispatchEvent(new CustomEvent('registrations:changed'));
          return true;
        })
        .catch(function (e) { console.warn('[IntelliLab] could not cancel', e); return false; });
    },

    accountCount: function () { return profile ? 1 : 0; }
  };
})();


/* ===========================================================================
   FACADE — picks a backend once, then forwards everything to it
   ========================================================================= */
var Auth = (function () {
  var backend = LocalAuth;

  function initialsOf(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  return {
    /* 'cloud' when Firebase is live, 'local' otherwise */
    get mode() { return backend.kind; },
    isCloud: function () { return backend.kind === 'cloud'; },

    use: function (which) {
      backend = (which === 'cloud') ? CloudAuth : LocalAuth;
      backend.start();
    },

    current:            function ()      { return backend.current(); },
    isSignedIn:         function ()      { return !!backend.current(); },
    sessionKind:        function ()      { return backend.sessionKind(); },
    register:           function (n,e,p,r) { return backend.register(n,e,p,r); },
    login:              function (e,p,r) { return backend.login(e,p,r); },
    logout:             function ()      { return backend.logout(); },
    update:             function (f)     { return backend.update(f); },
    deleteAccount:      function ()      { return backend.deleteAccount(); },
    addRegistration:    function (x)     { return backend.addRegistration(x); },
    registrations:      function ()      { return backend.registrations(); },
    refreshRegistrations: function ()    { return backend.refreshRegistrations(); },
    cancelRegistration: function (i)     { return backend.cancelRegistration(i); },
    accountCount:       function ()      { return backend.accountCount(); },
    initials:           initialsOf
  };
})();


/* ============================================================================
   NAVBAR USER MENU + SIGN-IN MODAL
   ========================================================================== */
var AuthUI = {

  paint: function () {
    var user = Auth.current();

    document.querySelectorAll('[data-auth-guest]').forEach(function (el) { el.hidden = !!user; });
    document.querySelectorAll('[data-auth-user]').forEach(function (el) { el.hidden = !user; });

    if (user) {
      document.querySelectorAll('[data-user-initials]').forEach(function (el) { el.textContent = Auth.initials(user.name); });
      document.querySelectorAll('[data-user-name]').forEach(function (el) { el.textContent = String(user.name).split(' ')[0]; });
      document.querySelectorAll('[data-user-fullname]').forEach(function (el) { el.textContent = user.name; });
      document.querySelectorAll('[data-user-email]').forEach(function (el) { el.textContent = user.email; });
    }

    document.querySelectorAll('[data-requires-auth]').forEach(function (el) { el.hidden = !user; });
    document.querySelectorAll('[data-requires-guest]').forEach(function (el) { el.hidden = !!user; });
  },

  /* Tells the visitor, in the sign-in dialog, whether accounts are shared
     across devices or only stored in this browser. Honest either way. */
  paintMode: function () {
    var cloud = Auth.isCloud();
    document.querySelectorAll('[data-auth-mode]').forEach(function (el) {
      el.innerHTML = cloud
        ? '<strong>Your account works on any device.</strong> Sign up here and you can sign in from your phone, ' +
          'the lab computers or a friend\'s laptop with the same email and password. Accounts are handled by ' +
          'Firebase Authentication, so we never see or store your password ourselves.'
        : '<strong>Demonstration only.</strong> Accounts live entirely in your own browser — there is no server behind this, ' +
          'so an account made here will not exist on another device. Your password is scrambled beyond recovery before it ' +
          'is saved. Please use a throwaway password, not one you use elsewhere.';
    });
  },

  openModal: function (tab) {
    var m = document.getElementById('authModal');
    if (!m) return;
    AuthUI.showTab(tab || 'signin');
    m.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var first = m.querySelector('.auth-pane:not([hidden]) input');
    if (first) setTimeout(function () { first.focus(); }, 60);
  },

  closeModal: function () {
    var m = document.getElementById('authModal');
    if (!m) return;
    m.classList.remove('is-open');
    document.body.style.overflow = '';
  },

  showTab: function (tab) {
    document.querySelectorAll('[data-auth-tab]').forEach(function (b) {
      var on = b.getAttribute('data-auth-tab') === tab;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.auth-pane').forEach(function (p) {
      p.hidden = p.getAttribute('data-auth-pane') !== tab;
    });
  },

  error: function (paneId, message) {
    var el = document.querySelector('#' + paneId + ' [data-auth-error]');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('is-shown', !!message);
  },

  init: function () {
    AuthUI.paint();
    AuthUI.paintMode();

    document.querySelectorAll('[data-open-auth]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        AuthUI.openModal(b.getAttribute('data-open-auth') || 'signin');
      });
    });

    var modal = document.getElementById('authModal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.closest('[data-close-auth]')) AuthUI.closeModal();
      });
    }
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') AuthUI.closeModal(); });

    document.querySelectorAll('[data-auth-tab]').forEach(function (b) {
      b.addEventListener('click', function () { AuthUI.showTab(b.getAttribute('data-auth-tab')); });
    });

    var trigger = document.getElementById('userMenuBtn');
    var panel = document.getElementById('userMenuPanel');
    if (trigger && panel) {
      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var open = panel.classList.toggle('is-open');
        trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      document.addEventListener('click', function () {
        panel.classList.remove('is-open');
        trigger.setAttribute('aria-expanded', 'false');
      });
      panel.addEventListener('click', function (e) { e.stopPropagation(); });
    }

    document.querySelectorAll('[data-sign-out]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var name = (Auth.current() || {}).name || '';
        Promise.resolve(Auth.logout()).then(function () {
          toast('Signed out' + (name ? ', ' + String(name).split(' ')[0] : '') + '. Your shortlist stays on this device.', 'info');
          if (/profile\.html$/i.test(location.pathname)) location.href = 'index.html';
        });
      });
    });

    /* ---- Sign in ------------------------------------------------------- */
    var signin = document.getElementById('signinForm');
    if (signin) {
      signin.addEventListener('submit', function (e) {
        e.preventDefault();
        AuthUI.error('authSignin', '');
        if (!Validate.form(signin)) return;

        var btn = signin.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Signing in…';

        Auth.login(signin.elements.siEmail.value, signin.elements.siPassword.value, signin.elements.siRemember.checked)
          .then(function (acc) {
            AuthUI.closeModal();
            signin.reset();
            toast('Welcome back, ' + String(acc.name).split(' ')[0] + '.', 'ok');
          })
          .catch(function (msg) { AuthUI.error('authSignin', msg); })
          .then(function () { btn.disabled = false; btn.textContent = 'Sign in'; });
      });
    }

    /* ---- Register ------------------------------------------------------ */
    var reg = document.getElementById('registerForm');
    if (reg) {
      var pw = reg.elements.ruPassword;
      var meter = document.getElementById('pwMeter');
      if (pw && meter) {
        pw.addEventListener('input', function () {
          var v = pw.value, score = 0;
          if (v.length >= 8) score++;
          if (v.length >= 12) score++;
          if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
          if (/[0-9]/.test(v)) score++;
          if (/[^A-Za-z0-9]/.test(v)) score++;
          var labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
          var colours = ['var(--danger)', 'var(--danger)', 'var(--accent)', 'var(--accent)', 'var(--success)', 'var(--success)'];
          meter.querySelector('span').style.width = (score / 5 * 100) + '%';
          meter.querySelector('span').style.background = colours[score];
          meter.nextElementSibling.textContent = v ? labels[score] : 'At least 8 characters.';
        });
      }

      reg.addEventListener('submit', function (e) {
        e.preventDefault();
        AuthUI.error('authRegister', '');
        if (!Validate.form(reg)) return;
        if (reg.elements.ruPassword.value !== reg.elements.ruConfirm.value) {
          AuthUI.error('authRegister', 'The two passwords do not match.');
          return;
        }

        var btn = reg.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Creating account…';

        Auth.register(reg.elements.ruName.value, reg.elements.ruEmail.value,
                      reg.elements.ruPassword.value, reg.elements.ruRemember.checked)
          .then(function (acc) {
            AuthUI.closeModal();
            reg.reset();
            toast('Welcome to IntelliLab, ' + String(acc.name).split(' ')[0] + '. Your account is ready.', 'ok');
          })
          .catch(function (msg) { AuthUI.error('authRegister', msg); })
          .then(function () { btn.disabled = false; btn.textContent = 'Create account'; });
      });
    }

    document.addEventListener('auth:changed', function () {
      AuthUI.paint();
      if (typeof Visitor !== 'undefined') Visitor.paintGreeting();
      if (typeof Saved !== 'undefined') Saved.paint();
    });
  }
};


/* ============================================================================
   STARTUP — choose the backend, then wire the UI
   ========================================================================== */
document.addEventListener('DOMContentLoaded', function () {
  var useCloud = !!(window.FB && window.FB.auth);
  Auth.use(useCloud ? 'cloud' : 'local');

  if (!useCloud && window.FB_STATUS && window.FIREBASE_READY) {
    console.warn('[IntelliLab] ' + window.FB_STATUS.reason);
  }

  AuthUI.init();
});
