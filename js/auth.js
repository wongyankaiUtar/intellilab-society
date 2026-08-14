/* ============================================================================
   IntelliLab Society — client-side membership
   ----------------------------------------------------------------------------
   Implements the "member portal" that our Chapter 2 review found missing from
   every website we studied ("No User Authentication. The site has no login
   system, member portal, or personalised user experience.").

   ---------------------------------------------------------------------------
   IMPORTANT — READ BEFORE THE PRESENTATION
   ---------------------------------------------------------------------------
   This is a FRONT-END DEMONSTRATION of authentication, not real security.
   There is no server, so every account lives in this browser only.

   What we do correctly, and should say out loud in the demo:
     * Passwords are NEVER stored in plain text. They are hashed with SHA-256
       plus a per-account random salt before being written to localStorage.
     * The stored hash is not reversible, so reading localStorage does not
       reveal anybody's password.
     * The session token is separate from the account record.

   What a real system would additionally need, and we should acknowledge:
     * The check happens in the browser, so a determined user could bypass it
       with dev tools. Real authentication must be verified on a server.
     * A real deployment would use a slow password hash (bcrypt/argon2) and
       an HTTP-only, Secure session cookie issued by that server.

   Saying this in the video shows we understand the limitation rather than
   pretending a client-side login is real security.
   ---------------------------------------------------------------------------

   STORAGE USED HERE (this feature alone demonstrates all three technologies)
     localStorage    -> the account records themselves, so an account still
                        exists after the browser is closed.
     Cookie          -> the session when "Keep me signed in" IS ticked.
                        Expires in 30 days, survives a browser restart.
     sessionStorage  -> the session when "Keep me signed in" is NOT ticked.
                        Disappears the moment the tab is closed, which is the
                        correct behaviour on a shared campus computer.
   ========================================================================== */

var Auth = (function () {

  var ACCOUNTS_KEY = 'ils_accounts';   // localStorage
  var SESSION_KEY  = 'ils_session';    // cookie OR sessionStorage
  var REG_KEY      = 'ils_registrations';

  /* ---------------------------------------------------------------------
     Password hashing
     Uses the browser's built-in Web Crypto API where available. Falls back
     to a simple non-cryptographic digest only so the demo still runs in an
     old browser — never acceptable in production, and labelled as such.
     ------------------------------------------------------------------ */
  function randomSalt() {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint8Array(16);
      crypto.getRandomValues(a);
      return Array.prototype.map.call(a, function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
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
      return crypto.subtle
        .digest('SHA-256', new TextEncoder().encode(text))
        .then(function (buf) {
          return Array.prototype.map.call(new Uint8Array(buf), function (b) {
            return b.toString(16).padStart(2, '0');
          }).join('');
        })
        .catch(function () { return weakFallbackHash(text); });
    }
    return Promise.resolve(weakFallbackHash(text));
  }

  /* ---------------------------------------------------------------------
     Account store (localStorage)
     ------------------------------------------------------------------ */
  function accounts()      { return Store.get(ACCOUNTS_KEY, []); }
  function saveAccounts(a) { return Store.set(ACCOUNTS_KEY, a); }

  function findByEmail(email) {
    var target = String(email || '').trim().toLowerCase();
    var list = accounts();
    for (var i = 0; i < list.length; i++) {
      if (list[i].email === target) return list[i];
    }
    return null;
  }

  function initialsOf(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /* ---------------------------------------------------------------------
     Session — cookie when "remember me", sessionStorage otherwise
     ------------------------------------------------------------------ */
  function writeSession(email, remember) {
    var token = { email: email, at: new Date().toISOString(), remember: !!remember };
    if (remember) {
      Session.remove(SESSION_KEY);
      Cookie.set(SESSION_KEY, JSON.stringify(token), 30);   // COOKIE
    } else {
      Cookie.remove(SESSION_KEY);
      Session.set(SESSION_KEY, token);                      // sessionStorage
    }
  }

  function readSession() {
    var raw = Cookie.get(SESSION_KEY);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) { /* fall through */ }
    }
    return Session.get(SESSION_KEY, null);
  }

  function clearSession() {
    Cookie.remove(SESSION_KEY);
    Session.remove(SESSION_KEY);
  }

  /* ---------------------------------------------------------------------
     Public API
     ------------------------------------------------------------------ */
  var api = {

    /* Currently signed-in account, or null */
    current: function () {
      var s = readSession();
      if (!s || !s.email) return null;
      var acc = findByEmail(s.email);
      if (!acc) { clearSession(); return null; }   // account was deleted
      return acc;
    },

    isSignedIn: function () { return !!api.current(); },

    /* How the session is being kept — used by the profile page to explain
       the difference between the three storage technologies. */
    sessionKind: function () {
      if (Cookie.get(SESSION_KEY)) return 'cookie';
      if (Session.get(SESSION_KEY, null)) return 'sessionStorage';
      return null;
    },

    /* Create an account. Resolves with the account, rejects with a message. */
    register: function (name, email, password, remember) {
      name = String(name || '').trim();
      email = String(email || '').trim().toLowerCase();

      if (name.length < 2)  return Promise.reject('Please enter your full name.');
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) return Promise.reject('That email address does not look valid.');
      if (String(password).length < 8) return Promise.reject('Your password must be at least 8 characters.');
      if (findByEmail(email)) return Promise.reject('An account already exists for that email. Try signing in instead.');

      var salt = randomSalt();
      return hash(password, salt).then(function (digest) {
        var account = {
          name: name,
          email: email,
          salt: salt,
          hash: digest,            /* the password itself is never stored */
          joined: new Date().toISOString(),
          lastLogin: new Date().toISOString(),
          logins: 1,
          bio: '',
          faculty: '',
          track: 'Prompt Engineering'
        };
        var list = accounts();
        list.push(account);
        if (!saveAccounts(list)) return Promise.reject('Your browser blocked local storage, so the account could not be saved.');
        writeSession(email, remember);
        document.dispatchEvent(new CustomEvent('auth:changed', { detail: account }));
        return account;
      });
    },

    /* Sign in. Resolves with the account, rejects with a message. */
    login: function (email, password, remember) {
      email = String(email || '').trim().toLowerCase();
      var acc = findByEmail(email);

      /* Deliberately vague: never reveal whether the email exists. */
      if (!acc) return Promise.reject('Email or password is incorrect.');

      return hash(password, acc.salt).then(function (digest) {
        if (digest !== acc.hash) return Promise.reject('Email or password is incorrect.');

        acc.lastLogin = new Date().toISOString();
        acc.logins = (acc.logins || 0) + 1;
        var list = accounts().map(function (a) { return a.email === acc.email ? acc : a; });
        saveAccounts(list);

        writeSession(acc.email, remember);
        document.dispatchEvent(new CustomEvent('auth:changed', { detail: acc }));
        return acc;
      });
    },

    logout: function () {
      clearSession();
      document.dispatchEvent(new CustomEvent('auth:changed', { detail: null }));
    },

    /* Update editable profile fields on the signed-in account */
    update: function (fields) {
      var acc = api.current();
      if (!acc) return false;
      Object.keys(fields).forEach(function (k) {
        if (['name', 'bio', 'faculty', 'track'].indexOf(k) > -1) acc[k] = fields[k];
      });
      saveAccounts(accounts().map(function (a) { return a.email === acc.email ? acc : a; }));
      document.dispatchEvent(new CustomEvent('auth:changed', { detail: acc }));
      return true;
    },

    /* Permanently remove the signed-in account and everything tied to it */
    deleteAccount: function () {
      var acc = api.current();
      if (!acc) return false;
      saveAccounts(accounts().filter(function (a) { return a.email !== acc.email; }));
      var regs = Store.get(REG_KEY, {});
      delete regs[acc.email];
      Store.set(REG_KEY, regs);
      clearSession();
      document.dispatchEvent(new CustomEvent('auth:changed', { detail: null }));
      return true;
    },

    initials: initialsOf,
    accountCount: function () { return accounts().length; },

    /* -------------------------------------------------------------------
       Event registrations, stored per account so the profile page can list
       them. Guests can still register for events; their booking is simply
       not attached to an account.
       ---------------------------------------------------------------- */
    addRegistration: function (entry) {
      var acc = api.current();
      if (!acc) return false;
      var all = Store.get(REG_KEY, {});
      var mine = all[acc.email] || [];
      mine.push({
        event: entry.event,
        mode: entry.mode,
        notes: entry.notes || '',
        at: new Date().toISOString()
      });
      all[acc.email] = mine;
      Store.set(REG_KEY, all);
      return true;
    },

    registrations: function () {
      var acc = api.current();
      if (!acc) return [];
      return (Store.get(REG_KEY, {})[acc.email]) || [];
    },

    cancelRegistration: function (index) {
      var acc = api.current();
      if (!acc) return false;
      var all = Store.get(REG_KEY, {});
      var mine = all[acc.email] || [];
      mine.splice(index, 1);
      all[acc.email] = mine;
      Store.set(REG_KEY, all);
      return true;
    }
  };

  return api;
})();


/* ============================================================================
   NAVBAR USER MENU + SIGN-IN MODAL
   Wired up on every page by site.js calling AuthUI.init().
   ========================================================================== */
var AuthUI = {

  /* Swap the navbar between "Sign in" and the avatar menu */
  paint: function () {
    var user = Auth.current();
    var guestEls = document.querySelectorAll('[data-auth-guest]');
    var userEls  = document.querySelectorAll('[data-auth-user]');

    guestEls.forEach(function (el) { el.hidden = !!user; });
    userEls.forEach(function (el) { el.hidden = !user; });

    if (user) {
      document.querySelectorAll('[data-user-initials]').forEach(function (el) {
        el.textContent = Auth.initials(user.name);
      });
      document.querySelectorAll('[data-user-name]').forEach(function (el) {
        el.textContent = user.name.split(' ')[0];
      });
      document.querySelectorAll('[data-user-fullname]').forEach(function (el) {
        el.textContent = user.name;
      });
      document.querySelectorAll('[data-user-email]').forEach(function (el) {
        el.textContent = user.email;
      });
    }

    /* Pages that require a signed-in member */
    document.querySelectorAll('[data-requires-auth]').forEach(function (el) { el.hidden = !user; });
    document.querySelectorAll('[data-requires-guest]').forEach(function (el) { el.hidden = !!user; });
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

    /* Open the modal */
    document.querySelectorAll('[data-open-auth]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        AuthUI.openModal(b.getAttribute('data-open-auth') || 'signin');
      });
    });

    /* Close it */
    var modal = document.getElementById('authModal');
    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal || e.target.closest('[data-close-auth]')) AuthUI.closeModal();
      });
    }
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') AuthUI.closeModal();
    });

    /* Tabs */
    document.querySelectorAll('[data-auth-tab]').forEach(function (b) {
      b.addEventListener('click', function () { AuthUI.showTab(b.getAttribute('data-auth-tab')); });
    });

    /* Avatar dropdown */
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

    /* Sign out */
    document.querySelectorAll('[data-sign-out]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.preventDefault();
        var name = (Auth.current() || {}).name || '';
        Auth.logout();
        toast('Signed out' + (name ? ', ' + name.split(' ')[0] : '') + '. Your shortlist stays on this device.', 'info');
        if (/profile\.html$/i.test(location.pathname)) location.href = 'index.html';
      });
    });

    /* ---- Sign-in form -------------------------------------------------- */
    var signin = document.getElementById('signinForm');
    if (signin) {
      signin.addEventListener('submit', function (e) {
        e.preventDefault();
        AuthUI.error('authSignin', '');
        if (!Validate.form(signin)) return;

        var btn = signin.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Signing in…';

        Auth.login(
          signin.elements.siEmail.value,
          signin.elements.siPassword.value,
          signin.elements.siRemember.checked
        ).then(function (acc) {
          AuthUI.closeModal();
          signin.reset();
          toast('Welcome back, ' + acc.name.split(' ')[0] + '.', 'ok');
        }).catch(function (msg) {
          AuthUI.error('authSignin', msg);
        }).then(function () {
          btn.disabled = false; btn.textContent = 'Sign in';
        });
      });
    }

    /* ---- Register form ------------------------------------------------- */
    var reg = document.getElementById('registerForm');
    if (reg) {
      /* live password strength */
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

        Auth.register(
          reg.elements.ruName.value,
          reg.elements.ruEmail.value,
          reg.elements.ruPassword.value,
          reg.elements.ruRemember.checked
        ).then(function (acc) {
          AuthUI.closeModal();
          reg.reset();
          toast('Welcome to IntelliLab, ' + acc.name.split(' ')[0] + '. Your account is ready.', 'ok');
        }).catch(function (msg) {
          AuthUI.error('authRegister', msg);
        }).then(function () {
          btn.disabled = false; btn.textContent = 'Create account';
        });
      });
    }

    /* Keep every page in sync when auth state changes */
    document.addEventListener('auth:changed', function () {
      AuthUI.paint();
      if (typeof Visitor !== 'undefined') Visitor.paintGreeting();
      if (typeof Saved !== 'undefined') Saved.paint();
    });
  }
};

document.addEventListener('DOMContentLoaded', function () { AuthUI.init(); });
