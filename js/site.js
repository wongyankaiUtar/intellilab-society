/* ============================================================================
   IntelliLab Society — shared site script
   Loaded by all 8 pages. Provides the three storage technologies required by
   the assignment, plus the shared UI behaviour that keeps every page identical.
   ----------------------------------------------------------------------------
   STORAGE TECHNOLOGIES USED (for the video presentation)
     1. COOKIES        -> colour theme + returning-visitor recognition + name
                          Persists for 30 days, survives browser restart.
     2. localStorage   -> saved/bookmarked projects & workshops
                          Persists indefinitely until the user clears it.
     3. sessionStorage -> auto-saved form drafts (registration & contact)
                          Cleared automatically when the tab closes.
   ========================================================================== */

/* ---------------------------------------------------------------------------
   1. COOKIE HELPER
   ------------------------------------------------------------------------ */
var Cookie = {
  set: function (name, value, days) {
    var expires = '';
    if (days) {
      var d = new Date();
      d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
      expires = '; expires=' + d.toUTCString();
    }
    document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
  },
  get: function (name) {
    var parts = document.cookie.split('; ');
    for (var i = 0; i < parts.length; i++) {
      var pair = parts[i].split('=');
      if (pair[0] === name) return decodeURIComponent(pair.slice(1).join('='));
    }
    return null;
  },
  remove: function (name) {
    document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  },
  all: function () {
    var out = {};
    if (!document.cookie) return out;
    document.cookie.split('; ').forEach(function (c) {
      var i = c.indexOf('=');
      if (i > -1) out[c.slice(0, i)] = decodeURIComponent(c.slice(i + 1));
    });
    return out;
  },

  /* Browsers refuse to store cookies on file:// pages, because a file:// URL
     is treated as a unique (opaque) security origin. Detect that up front so
     the site can explain itself instead of appearing broken. */
  enabled: function () {
    try {
      document.cookie = 'ils_test=1; path=/; SameSite=Lax';
      var ok = document.cookie.indexOf('ils_test=') > -1;
      Cookie.remove('ils_test');
      return ok;
    } catch (e) { return false; }
  }
};

/* Evaluated once at load; used by the storage inspector and the warning bar */
var COOKIES_OK = Cookie.enabled();
var IS_FILE_URL = location.protocol === 'file:';

/* ---------------------------------------------------------------------------
   2. localStorage HELPER  (safe against private-browsing quota errors)
   ------------------------------------------------------------------------ */
var Store = {
  get: function (key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set: function (key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  },
  remove: function (key) { try { localStorage.removeItem(key); } catch (e) {} }
};

/* ---------------------------------------------------------------------------
   3. sessionStorage HELPER
   ------------------------------------------------------------------------ */
var Session = {
  get: function (key, fallback) {
    try {
      var raw = sessionStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  },
  set: function (key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { return false; }
  },
  remove: function (key) { try { sessionStorage.removeItem(key); } catch (e) {} }
};

/* ---------------------------------------------------------------------------
   ICONS — small inline SVG set so no icon-font CDN is required
   ------------------------------------------------------------------------ */
var ICON = {
  sun:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  check:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  alert:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
  info:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
  up:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  chevron:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>',
  close:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  db:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
  heart:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 22l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  empty:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 7l1.6 12.2A2 2 0 0 0 6.6 21h10.8a2 2 0 0 0 2-1.8L21 7M3 7h18M3 7l2-4h14l2 4M9 12h6"/></svg>'
};

/* ---------------------------------------------------------------------------
   API FAILURE DIAGNOSIS
   Turns a jQuery ajax failure into a message that names the actual cause,
   instead of a generic "unavailable". The overwhelmingly common cause during
   development is opening the page from a file:// path, where the browser
   blocks all cross-origin requests before they are ever sent.
   ------------------------------------------------------------------------ */
function apiFailureReason(xhr, status) {
  if (IS_FILE_URL) {
    return 'Blocked by the browser because this page was opened from a file:// path — ' +
           'cross-origin requests are not allowed from local files. Serve the folder over ' +
           'http://localhost (run start-server.bat) and the live feed will work.';
  }
  if (status === 'timeout') {
    return 'The request timed out after 9 seconds. The network may be slow or the API may be down.';
  }
  if (xhr && xhr.status === 403) {
    return 'The API returned 403 — the public rate limit has been reached. It resets within the hour.';
  }
  if (xhr && xhr.status === 0) {
    return 'The request never completed. This is usually a lost connection, an ad blocker, ' +
           'or a campus network blocking the API domain.';
  }
  if (xhr && xhr.status) {
    return 'The API returned HTTP ' + xhr.status + ' (' + (xhr.statusText || status) + ').';
  }
  return 'The request failed (' + (status || 'unknown error') + ').';
}

/* ---------------------------------------------------------------------------
   TOASTS — non-blocking feedback (replaces alert())
   ------------------------------------------------------------------------ */
function toast(message, type) {
  type = type || 'info';
  var host = document.querySelector('.toasts');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toasts';
    document.body.appendChild(host);
  }
  var el = document.createElement('div');
  el.className = 'toast toast--' + (type === 'ok' ? 'ok' : type === 'err' ? 'err' : 'info');
  el.setAttribute('role', 'status');
  el.innerHTML = (type === 'ok' ? ICON.check : type === 'err' ? ICON.alert : ICON.info) + '<span>' + message + '</span>';
  host.appendChild(el);
  setTimeout(function () {
    el.classList.add('is-out');
    setTimeout(function () { el.remove(); }, 260);
  }, 3600);
}

/* ---------------------------------------------------------------------------
   THEME  — stored in a COOKIE so the choice survives a full browser restart
   ------------------------------------------------------------------------ */
var Theme = {
  KEY: 'ils_theme',
  apply: function (mode) {
    document.documentElement.setAttribute('data-theme', mode);
    var btn = document.getElementById('themeToggle');
    if (btn) {
      btn.innerHTML = mode === 'light' ? ICON.moon : ICON.sun;
      btn.setAttribute('aria-label', 'Switch to ' + (mode === 'light' ? 'dark' : 'light') + ' theme');
      btn.title = 'Switch to ' + (mode === 'light' ? 'dark' : 'light') + ' theme';
    }
  },
  current: function () { return Cookie.get(Theme.KEY) || 'dark'; },
  toggle: function () {
    var next = Theme.current() === 'light' ? 'dark' : 'light';
    Cookie.set(Theme.KEY, next, 30);          // <-- COOKIE WRITE
    Theme.apply(next);
    toast('Switched to ' + next + ' mode.', 'ok');
  }
};
/* Applied immediately (before paint) to avoid a flash of the wrong theme */
Theme.apply(Cookie.get('ils_theme') || 'dark');

/* ---------------------------------------------------------------------------
   VISITOR — first visit vs returning visitor, tracked with COOKIES
   ------------------------------------------------------------------------ */
var Visitor = {
  KEY_SEEN: 'ils_visits',
  KEY_NAME: 'ils_name',
  KEY_LAST: 'ils_last_visit',

  count: function () { return parseInt(Cookie.get(Visitor.KEY_SEEN) || '0', 10); },
  name:  function () { return Cookie.get(Visitor.KEY_NAME) || ''; },

  register: function () {
    var n = Visitor.count() + 1;
    Cookie.set(Visitor.KEY_SEEN, n, 30);       // <-- COOKIE WRITE
    Cookie.set(Visitor.KEY_LAST, new Date().toISOString(), 30);
    return n;
  },

  setName: function (name) {
    Cookie.set(Visitor.KEY_NAME, name, 30);
    Visitor.paintGreeting();
  },

  clear: function () {
    Cookie.remove(Visitor.KEY_SEEN);
    Cookie.remove(Visitor.KEY_NAME);
    Cookie.remove(Visitor.KEY_LAST);
    Visitor.paintGreeting();
  },

  /* Writes a personalised greeting into any element with [data-greeting].
     A signed-in account name always wins over the anonymous cookie name. */
  paintGreeting: function () {
    var hour = new Date().getHours();
    var part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    var account = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    var name = account ? account.name.split(' ')[0] : Visitor.name();
    var visits = Visitor.count();
    var msg;
    if (account) {
      msg = part + ', ' + name + '! Good to have you back — visit #' + visits + '.';
    } else if (name) {
      msg = part + ', ' + name + '! Welcome back — visit #' + visits + '.';
    } else if (visits > 1) {
      msg = part + '! Good to see you again — this is visit #' + visits + '.';
    } else {
      msg = part + '! Looks like this is your first time here — welcome.';
    }
    document.querySelectorAll('[data-greeting]').forEach(function (el) { el.textContent = msg; });
  }
};

/* ---------------------------------------------------------------------------
   BOOKMARKS — saved items live in localStorage (persist across sessions)
   ------------------------------------------------------------------------ */
var Saved = {
  KEY: 'ils_saved_items',
  all:  function () { return Store.get(Saved.KEY, []); },
  has:  function (id) { return Saved.all().indexOf(id) > -1; },

  toggle: function (id, label) {
    var list = Saved.all();
    var i = list.indexOf(id);
    var added;
    if (i > -1) { list.splice(i, 1); added = false; }
    else { list.push(id); added = true; }
    Store.set(Saved.KEY, list);                // <-- localStorage WRITE
    Saved.paint();
    toast((added ? 'Saved ' : 'Removed ') + '"' + label + '"' + (added ? ' to your list.' : ' from your list.'), added ? 'ok' : 'info');
    return added;
  },

  clear: function () { Store.set(Saved.KEY, []); Saved.paint(); toast('Your saved list has been cleared.', 'info'); },

  /* Sync every save-button + counter on the page with localStorage */
  paint: function () {
    var list = Saved.all();
    document.querySelectorAll('[data-save-id]').forEach(function (btn) {
      var on = list.indexOf(btn.getAttribute('data-save-id')) > -1;
      btn.classList.toggle('is-saved', on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      var txt = btn.querySelector('[data-save-text]');
      if (txt) txt.textContent = on ? 'Saved' : 'Save';
      btn.style.borderColor = on ? 'var(--success)' : '';
      btn.style.color = on ? 'var(--success)' : '';
    });
    document.querySelectorAll('[data-saved-count]').forEach(function (el) { el.textContent = list.length; });
    document.dispatchEvent(new CustomEvent('saved:changed', { detail: list }));
  }
};

/* ---------------------------------------------------------------------------
   FORM DRAFTS — auto-saved to sessionStorage, gone when the tab closes
   Usage: <form data-draft="contact"> ... </form>
   ------------------------------------------------------------------------ */
var Draft = {
  key: function (form) { return 'ils_draft_' + form.getAttribute('data-draft'); },

  attach: function (form) {
    var key = Draft.key(form);
    var note = form.querySelector('[data-draft-note]');

    /* Restore anything typed earlier in this tab */
    var saved = Session.get(key, null);
    if (saved) {
      Object.keys(saved).forEach(function (name) {
        var f = form.elements[name];
        if (!f) return;
        if (f.type === 'checkbox') f.checked = !!saved[name];
        else f.value = saved[name];
      });
      if (note) {
        note.classList.add('is-shown');
        note.querySelector('span').textContent = 'We brought back what you typed earlier in this tab.';
      }
    }

    /* Save on every keystroke / change */
    var save = function () {
      var data = {};
      Array.prototype.forEach.call(form.elements, function (f) {
        if (!f.name || f.type === 'submit') return;
        data[f.name] = f.type === 'checkbox' ? f.checked : f.value;
      });
      Session.set(key, data);                  // <-- sessionStorage WRITE
      if (note) {
        note.classList.add('is-shown');
        note.querySelector('span').textContent = 'Saved as you type · ' +
          new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    };
    form.addEventListener('input', save);
    form.addEventListener('change', save);

    /* Manual discard */
    var discard = form.querySelector('[data-draft-clear]');
    if (discard) {
      discard.addEventListener('click', function () {
        Draft.clear(form);
        form.reset();
        toast('Draft discarded.', 'info');
      });
    }
  },

  clear: function (form) {
    Session.remove(Draft.key(form));
    var note = form.querySelector('[data-draft-note]');
    if (note) note.classList.remove('is-shown');
  }
};

/* ---------------------------------------------------------------------------
   VALIDATION — every form on the site validates before it "submits"
   ------------------------------------------------------------------------ */
var Validate = {
  rules: {
    required: function (v) { return v.trim().length > 0; },
    email: function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()); },
    phone: function (v) { return v.trim() === '' || /^[+0-9 ()-]{7,20}$/.test(v.trim()); },
    min: function (v, n) { return v.trim().length >= parseInt(n, 10); }
  },

  field: function (f) {
    var wrap = f.closest('.field');
    var err = wrap ? wrap.querySelector('.err') : null;
    var msg = '';
    var v = f.type === 'checkbox' ? (f.checked ? 'on' : '') : f.value;

    if (f.hasAttribute('required') && !Validate.rules.required(v)) {
      msg = f.type === 'checkbox' ? 'Please tick this box to continue.' : 'This field is required.';
    } else if (v.trim() && f.type === 'email' && !Validate.rules.email(v)) {
      msg = 'Enter a valid email address, e.g. name@example.com';
    } else if (f.getAttribute('data-rule') === 'phone' && !Validate.rules.phone(v)) {
      msg = 'Enter a valid phone number (digits, spaces, + and - only).';
    } else if (f.getAttribute('data-min') && v.trim() && !Validate.rules.min(v, f.getAttribute('data-min'))) {
      msg = 'Please write at least ' + f.getAttribute('data-min') + ' characters.';
    }

    if (f.classList) {
      f.classList.toggle('is-invalid', !!msg);
      f.classList.toggle('is-valid', !msg && v.trim().length > 0);
    }
    if (err) { err.textContent = msg; err.classList.toggle('is-shown', !!msg); }
    return !msg;
  },

  form: function (form) {
    var ok = true, first = null;
    Array.prototype.forEach.call(form.elements, function (f) {
      if (!f.name || f.type === 'submit') return;
      if (!Validate.field(f)) { ok = false; if (!first) first = f; }
    });
    if (first) { first.focus(); first.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    return ok;
  },

  attach: function (form) {
    Array.prototype.forEach.call(form.elements, function (f) {
      if (!f.name || f.type === 'submit') return;
      f.addEventListener('blur', function () { Validate.field(f); });
      f.addEventListener('input', function () { if (f.classList.contains('is-invalid')) Validate.field(f); });
    });
  }
};

/* ---------------------------------------------------------------------------
   STORAGE INSPECTOR — a live view of all three stores.
   Built for the video demo: open it and show cookies / localStorage /
   sessionStorage updating in real time.
   ------------------------------------------------------------------------ */
var Inspector = {
  open: function () {
    var m = document.getElementById('storageModal');
    if (!m) return;
    Inspector.render();
    m.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  },
  close: function () {
    var m = document.getElementById('storageModal');
    if (!m) return;
    m.classList.remove('is-open');
    document.body.style.overflow = '';
  },
  render: function () {
    var body = document.getElementById('storageModalBody');
    if (!body) return;

    var cookies = Cookie.all();
    var ls = {}, ss = {};
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); ls[k] = localStorage.getItem(k); } } catch (e) {}
    try { for (var j = 0; j < sessionStorage.length; j++) { var k2 = sessionStorage.key(j); ss[k2] = sessionStorage.getItem(k2); } } catch (e) {}

    function block(title, note, obj) {
      var rows = Object.keys(obj).length
        ? Object.keys(obj).map(function (k) {
            var v = String(obj[k]);
            if (v.length > 160) v = v.slice(0, 160) + '…';
            return '<dt>' + k + '</dt><dd>' + v.replace(/</g, '&lt;') + '</dd>';
          }).join('')
        : '<dt class="tiny">(empty)</dt><dd class="tiny">nothing stored yet</dd>';
      return '<div class="card card--flat mb-3"><div class="flex-between mb-2">' +
             '<h4 style="margin:0">' + title + '</h4>' +
             '<span class="chip chip--brand">' + Object.keys(obj).length + ' key(s)</span></div>' +
             '<p class="tiny mb-2">' + note + '</p><dl class="kv">' + rows + '</dl></div>';
    }

    var warn = '';
    if (!COOKIES_OK) {
      warn = '<div class="card card--flat mb-3" style="border-color:var(--danger)">' +
        '<h4 style="color:var(--danger);margin-bottom:.5rem">Cookies are blocked in this context</h4>' +
        '<p class="small mb-2">' + (IS_FILE_URL
          ? 'This page was opened directly from a <code>file://</code> path. Browsers treat every <code>file://</code> URL as a unique security origin and refuse to store cookies for it, so the cookie features below cannot run.'
          : 'Your browser is blocking cookies for this site, so the cookie features below cannot run.') +
        '</p>' +
        (IS_FILE_URL ? '<p class="tiny mb-0">Serve the folder over HTTP instead — for example run <code>python -m http.server 8000</code> in the website folder and open <code>http://localhost:8000</code>. localStorage and sessionStorage below are unaffected and still work.</p>' : '') +
        '</div>';
    }

    body.innerHTML = warn +
      '<p class="small mb-3">Everything below is stored on your own device and never sent anywhere. ' +
      'You can delete any of it at any time. The technical names are shown because this is the ' +
      'one place on the site where we explain exactly what is kept and for how long.</p>' +
      block('Your preferences <span class="chip chip--brand">cookies</span>',
            'Your appearance, the name you gave us and a visit counter. Kept for 30 days — this is the only group that survives closing the browser completely.', cookies) +
      block('Your shortlist and account <span class="chip chip--cyan">localStorage</span>',
            'Bookmarked projects and workshops, plus your member account if you made one. Kept on this device until you clear it.', ls) +
      block('Your unfinished forms <span class="chip chip--amber">sessionStorage</span>',
            'Registration and contact forms you started but have not sent. Wiped automatically the moment you close this tab.', ss) +
      '<div class="flex flex-wrap" style="gap:.6rem">' +
        '<button class="btn btn--line btn--sm" id="insClearCookies">Clear preferences</button>' +
        '<button class="btn btn--line btn--sm" id="insClearLocal">Clear shortlist &amp; account</button>' +
        '<button class="btn btn--line btn--sm" id="insClearSession">Clear form drafts</button>' +
      '</div>';

    document.getElementById('insClearCookies').onclick = function () {
      Object.keys(Cookie.all()).forEach(Cookie.remove);
      Theme.apply('dark'); Visitor.paintGreeting(); Inspector.render();
      toast('Preferences cleared.', 'info');
    };
    document.getElementById('insClearLocal').onclick = function () {
      try { localStorage.clear(); } catch (e) {}
      Saved.paint(); Inspector.render(); toast('Shortlist and account data cleared.', 'info');
    };
    document.getElementById('insClearSession').onclick = function () {
      try { sessionStorage.clear(); } catch (e) {}
      Inspector.render(); toast('Draft data cleared.', 'info');
    };
  }
};

/* ---------------------------------------------------------------------------
   SHARED UI BEHAVIOUR — runs on every page
   ------------------------------------------------------------------------ */
document.addEventListener('DOMContentLoaded', function () {

  /* -- Active nav link (compares filenames, works from any folder) -------- */
  var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
  document.querySelectorAll('.nav__link').forEach(function (a) {
    var target = (a.getAttribute('href') || '').split('/').pop().toLowerCase();
    if (target === here) { a.classList.add('is-active'); a.setAttribute('aria-current', 'page'); }
  });

  /* -- Mobile menu -------------------------------------------------------- */
  var toggle = document.getElementById('navToggle');
  var links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    links.addEventListener('click', function (e) {
      if (e.target.closest('.nav__link')) {
        links.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* -- Theme button ------------------------------------------------------- */
  var themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    Theme.apply(Theme.current());
    themeBtn.addEventListener('click', Theme.toggle);
  }

  /* -- Storage inspector triggers ---------------------------------------- */
  document.querySelectorAll('[data-open-storage]').forEach(function (b) {
    b.addEventListener('click', function (e) { e.preventDefault(); Inspector.open(); });
  });
  var modal = document.getElementById('storageModal');
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.closest('[data-close-modal]')) Inspector.close();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      Inspector.close();
      var lb = document.querySelector('.lightbox.is-open');
      if (lb) { lb.classList.remove('is-open'); document.body.style.overflow = ''; }
    }
  });

  /* -- Visitor cookie + greeting ------------------------------------------ */
  Visitor.register();
  Visitor.paintGreeting();

  /* -- Warn once if cookies cannot work in this context -------------------
     Without this the cookie demo silently does nothing on a file:// page and
     looks like a bug in our code rather than a browser security rule.      */
  if (!COOKIES_OK) {
    var bar = document.createElement('div');
    bar.setAttribute('role', 'alert');
    bar.style.cssText = 'position:relative;z-index:5;background:rgba(248,113,113,.12);' +
      'border-bottom:1px solid rgba(248,113,113,.4);padding:.75rem 1.25rem;text-align:center;font-size:.85rem';
    bar.innerHTML = IS_FILE_URL
      ? '<strong>Cookies are disabled because this page was opened from a <code>file://</code> path.</strong> ' +
        'Run <code>python -m http.server 8000</code> in the website folder and open ' +
        '<code>http://localhost:8000</code> to enable them. localStorage and sessionStorage still work here.'
      : '<strong>Your browser is blocking cookies for this site,</strong> so theme and visit-count personalisation cannot be saved.';
    var navEl = document.querySelector('.nav');
    if (navEl && navEl.parentNode) navEl.parentNode.insertBefore(bar, navEl.nextSibling);
  }

  /* -- Saved items (localStorage) ----------------------------------------- */
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-save-id]');
    if (!btn) return;
    e.preventDefault();
    Saved.toggle(btn.getAttribute('data-save-id'), btn.getAttribute('data-save-label') || 'item');
  });
  Saved.paint();

  /* -- Forms: drafts + validation ----------------------------------------- */
  document.querySelectorAll('form[data-draft]').forEach(Draft.attach);
  document.querySelectorAll('form[data-validate]').forEach(Validate.attach);

  /* -- Accordions ---------------------------------------------------------- */
  document.querySelectorAll('.acc__btn').forEach(function (btn) {
    btn.innerHTML += ICON.chevron;
    btn.addEventListener('click', function () {
      var panel = btn.nextElementSibling;
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      panel.style.maxHeight = open ? null : panel.scrollHeight + 'px';
    });
  });

  /* -- Scroll reveal ------------------------------------------------------- */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* -- Scroll progress, sticky nav shadow, back-to-top -------------------- */
  var bar = document.querySelector('.scroll-progress');
  var nav = document.querySelector('.nav');
  var top = document.getElementById('toTop');
  if (top) {
    top.innerHTML = ICON.up;
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }
  function onScroll() {
    var y = window.scrollY;
    var h = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    if (nav) nav.classList.toggle('is-stuck', y > 8);
    if (top) top.classList.toggle('is-shown', y > 500);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* -- Animated counters --------------------------------------------------- */
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var suffix = el.getAttribute('data-suffix') || '';
    var done = false;
    function run() {
      if (done) return; done = true;
      var start = performance.now(), dur = 1400;
      (function step(now) {
        var p = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased).toLocaleString() + suffix;
        if (p < 1) requestAnimationFrame(step);
      })(start);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en, ob) {
        if (en[0].isIntersecting) { run(); ob.disconnect(); }
      }, { threshold: .5 }).observe(el);
    } else { run(); }
  });

  /* -- Year stamp in footer ------------------------------------------------ */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* -- Search icons -------------------------------------------------------- */
  document.querySelectorAll('.search').forEach(function (s) {
    if (!s.querySelector('svg')) s.insertAdjacentHTML('afterbegin', ICON.search);
  });
});

/* ---------------------------------------------------------------------------
   FILTER + SEARCH helper reused by workshops / projects / gallery / blog
   ------------------------------------------------------------------------ */
function initFilter(opts) {
  var listEl   = document.querySelector(opts.list);
  var searchEl = opts.search ? document.querySelector(opts.search) : null;
  var buttons  = document.querySelectorAll(opts.buttons);
  var emptyEl  = opts.empty ? document.querySelector(opts.empty) : null;
  var countEl  = opts.count ? document.querySelector(opts.count) : null;
  if (!listEl) return;

  var active = 'all';

  function apply() {
    var q = searchEl ? searchEl.value.trim().toLowerCase() : '';
    var shown = 0;
    Array.prototype.forEach.call(listEl.children, function (card) {
      var cat = (card.getAttribute('data-cat') || '').toLowerCase();
      var hay = (card.getAttribute('data-search') || card.textContent).toLowerCase();
      var okCat = active === 'all' || cat.split(' ').indexOf(active) > -1;
      var okQ = !q || hay.indexOf(q) > -1;
      var show = okCat && okQ;
      card.style.display = show ? '' : 'none';
      if (show) shown++;
    });
    if (emptyEl) emptyEl.classList.toggle('hidden', shown > 0);
    if (countEl) countEl.textContent = shown;
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      buttons.forEach(function (x) { x.classList.remove('is-active'); });
      b.classList.add('is-active');
      active = (b.getAttribute('data-filter') || 'all').toLowerCase();
      apply();
    });
  });
  if (searchEl) searchEl.addEventListener('input', apply);
  apply();
}
