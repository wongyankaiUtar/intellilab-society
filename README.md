# IntelliLab Society — AI & Innovation Club

UCCD2323 Front-End Web Development · Group Assignment (June 2026)

A mobile-responsive, 8-page club website built with HTML5, CSS3, JavaScript, jQuery and a
custom design system. Every feature on this site traces back to a specific weakness
identified in the Chapter 2 literature review.

---

## 1. How to run

> **Run it over `http://localhost`, not by double-clicking `index.html`.**
>
> Browsers treat every `file://` URL as a *unique security origin* and refuse to store
> cookies for it. If you open the page directly from disk, the cookie features (theme,
> display name, visit counter) silently do nothing — this is a browser security rule, not a
> bug in the code. `localStorage` and `sessionStorage` are unaffected and work either way.

**Easiest:** double-click `start-server.bat` in this folder. It serves the site at
`http://localhost:8000` and opens your browser automatically.

**Or, manually — pick whichever you have installed:**

```bash
python -m http.server 8000        # Python
npx serve -l 8000                 # Node
php -S localhost:8000             # PHP
```

Then open <http://localhost:8000>.

**Or, in VS Code:** install the *Live Server* extension, right-click `index.html` →
*Open with Live Server*.

If cookies are unavailable, the site detects it and shows an explanatory banner under the
navbar plus a warning inside the storage inspector, so the cause is never a mystery during a
demo.

No build step and no dependencies to install.

The only external resources are three CDN links (jQuery, Google Fonts, and the Facebook page
plugin). Everything else is local. The site degrades gracefully offline — the two live API
sections fall back to cached data rather than showing an empty box.

---

## 2. File structure/Site Map

```
website/
├── index.html        Home            — hero, stats, cookie personalisation, live countdown
├── about.html        About           — mission, history, committee, code of ethics, FAQ
├── workshops.html    Workshops       — 9 sessions, filter + search, save to list
├── projects.html     Projects        — 8 projects + live GitHub REST API feed
├── events.html       Events          — live countdown + validated registration form
├── gallery.html      Gallery         — 12 generative-art tiles, filter, lightbox
├── blog.html         AI News         — live Hacker News REST API feed + member articles
├── contact.html      Contact         — contact form, social media plugin, share buttons
├── profile.html      My profile      — member portal (saved items, registrations, account)
├── css/
│   └── style.css     The ONLY stylesheet. Loaded by all 8 pages.
└── js/
    ├── site.js        Shared logic: storage helpers, theme, validation, UI.
    ├── auth.js        Member accounts, sessions, navbar user menu, auth modal.
    └── events-data.js The club calendar — single source of truth, read by
                       both index.html and events.html.
```

> **Page count:** the assignment requires at least 8 pages for a group of four. There are
> **9** here — `profile.html` is an extra shared page for the member portal, reachable from
> the avatar menu rather than the main navigation. Remember to list it on the marking rubric
> sheet.

### Editing the event schedule

The calendar lives in **`js/events-data.js` only**. Both the home page and the events page
read from it, so the "next event" name, date, time and countdown can never disagree between
the two. To add or change an event, edit that one file — do not hardcode dates into a page.

Dates are generated relative to today (`daysFromNow(6, 19)` = six days from now at 7 pm)
rather than fixed, so the schedule is always in the future whenever the marker opens the site.

Per-page JavaScript lives in a single `<script>` block at the bottom of each page, so each
group member can point to exactly the code they own during the presentation.

---

## 2a. Member accounts (sign in / profile)

The **Sign in** button sits at the top right of every page. Once signed in it becomes an
avatar menu with links to the profile, saved items, registrations and sign out.

`profile.html` is the member portal: saved workshops and projects, event registrations,
editable account details, and an explanation of where the session is being kept.

### Why this exists

Our Chapter 2 review of the UIndy AIIC site recorded exactly this gap:

> *"No User Authentication. The site has no login system, member portal, or personalised
> user experience... users do not have access to their progress, to save resources, nor to
> access member-only content."*

None of the four reviewed sites had any account system. This closes that gap.

### How it demonstrates all three storage technologies at once

| Technology | Role in the login system | Lifetime |
|---|---|---|
| **localStorage** | The account records themselves | Until cleared |
| **Cookie** | The session when *"Keep me signed in"* **is** ticked | 30 days, survives browser restart |
| **sessionStorage** | The session when it is **not** ticked | Cleared when the tab closes |

That checkbox is the clearest demo in the whole site: tick it, close the browser, reopen —
still signed in. Untick it, close the tab, reopen — signed out. Same feature, two storage
technologies, visibly different behaviour.

### Security — say this in the video

Passwords are **never stored in plain text**. Each account gets a random 16-byte salt, and
the password is hashed with **SHA-256** via the Web Crypto API before storage. Verified by
test: registering with `password123` leaves no trace of that string in localStorage.

**But be honest in the presentation:** this is a *front-end demonstration* of authentication,
not real security. The check happens in the browser, so it could be bypassed with dev tools.
A real system must verify credentials on a server, use a slow hash such as bcrypt or argon2,
and issue an HTTP-only Secure session cookie. Saying this shows you understand the boundary
rather than overclaiming — markers notice the difference.

### Test it

Create an account with any email and an 8+ character password. Nothing is transmitted
anywhere; use a throwaway password, not a real one.

---

## 3. Storage technologies (rubric: 15%)

All three required technologies are implemented, each chosen deliberately for its lifetime.

| Technology | What it stores | Where to demo it | Lifetime |
|---|---|---|---|
| **Cookies** | Colour theme, display name, visit counter | Theme button in the navbar (all 8 pages); "Try it right now" card on `index.html` | 30 days — survives a full browser restart |
| **localStorage** | Bookmarked workshops and projects | Save buttons on `workshops.html` and `projects.html`; "Show saved only" on `projects.html` | Indefinite, until cleared |
| **sessionStorage** | Auto-saved form drafts | Registration form on `events.html`; contact form on `contact.html` | Cleared when the tab closes |

### Storage inspector

Every page has a **Storage inspector** (footer button, or "Open storage inspector" on the home
page). It shows all three stores live, side by side, with their keys and values, and has
buttons to clear each one independently.

This exists specifically for the video presentation: open it, toggle the theme, type in a
form, save a project, and the marker can watch each store change in real time.

### Demo script for the video

1. Open the inspector — all three stores are near-empty.
2. Click the theme toggle → **cookie** `ils_theme` appears.
3. Type a name on the home page and save → **cookie** `ils_name` appears.
4. Go to Projects, save two projects → **localStorage** `ils_saved_items` appears.
5. Go to Events, half-fill the registration form → **sessionStorage** `ils_draft_registration`
   appears and updates on every keystroke.
6. Navigate away and back — the form is still filled in.
7. Close the tab and reopen — theme and saved projects survive, the draft does not.
   That contrast is the whole point of using three different technologies.

---

## 4. REST API via jQuery + social media plugin (rubric: 10%)

### Two live REST API integrations, both using `$.ajax()`

| Page | Endpoint | What it does |
|---|---|---|
| `projects.html` | `https://api.github.com/search/repositories` | Top open-source AI repositories by star count, switchable across four topics |
| `blog.html` | `https://hn.algolia.com/api/v1/search` | Live AI news stories, switchable across five topics |

### No API key is needed — and you must not add one

Both endpoints are **public, keyless and CORS-enabled**. Verified live: a request for
`artificial intelligence` returns roughly 12,700 matching stories.

If a feed appears empty, the cause is almost always that the page was opened from a
`file://` path. Browsers block *all* cross-origin requests from local files, so `$.ajax()`
fails before it ever reaches the server — the "Refresh feed" button will keep failing for the
same reason. Serve the site over `http://localhost` (see section 1) and both feeds work.
The page now names the exact cause underneath the feed and offers a retry button.

> **Never hardcode a real API key into front-end JavaScript.** Anything in a `.js` file is
> visible to every visitor through *View Source*, and would also be visible to your marker in
> the submitted `.zip`. A leaked key can be used by anyone, at your expense. Keyless public
> APIs like the two above are the correct choice for a client-side assignment; anything
> requiring a secret key belongs behind a server you control.

Both integrations implement:

- a loading skeleton while the request is in flight,
- `.done()` success handling with the result count and fetch time,
- `.fail()` error handling with a **cached fallback** so a live demo never breaks on a bad
  network, and a 9-second timeout.

This directly answers the review finding that every site studied relied on manual updates,
so their content went stale (one had a countdown timer frozen at 00:00:00).

### Social media plugin

- **Facebook Page Plugin** embedded on `contact.html` as an official iframe, with a graceful
  message if the campus network or an ad blocker prevents third-party frames from loading.
- **Share buttons** — X, Facebook, WhatsApp and copy-to-clipboard — on `contact.html` and on
  every article card on `blog.html`.

---

## 5. UI/UX (rubric: 15%)

**Identical styling across all 8 pages is structural, not manual.** The navbar, footer and
storage modal are byte-identical on every page (verified programmatically), and there is only
one stylesheet.

- **Responsive** — fluid CSS Grid with `auto-fit`/`minmax`, `clamp()` typography, tested from
  360px upward. Navigation collapses to a slide-down drawer below 1050px.
- **Two themes** — dark by default, light on toggle, driven entirely by CSS custom properties.
- **Motion** — scroll-reveal via `IntersectionObserver`, animated counters, a scroll-progress
  bar, hover lift on cards, and an animated SVG neural network in the hero. All of it is
  disabled automatically under `prefers-reduced-motion`.
- **Original artwork only** — every image on the site is inline SVG or a CSS gradient, drawn
  programmatically. There is no stock photography anywhere, and the whole site is well under
  100 KB of markup. One reviewed site was criticised for stock-image overuse; this also
  satisfies the report's "compress images" requirement.
- **Accessibility** — skip link, visible focus rings, ARIA labels and live regions, keyboard-
  operable lightbox and accordions, semantic landmarks, and a 4.5:1 minimum contrast ratio.
- **Validated HTML5** — all 8 pages parse with zero errors under an HTML5 parser.

---

## 6. Review findings → features

| Weakness found in Chapter 2 | Where we fixed it |
|---|---|
| Manual updates, content goes stale | Live REST API feeds on `blog.html` and `projects.html` |
| Countdown timer frozen at 00:00:00 | Countdowns on `index.html` and `events.html` recompute their target on load and roll forward automatically — they cannot reach zero |
| No About page or committee | `about.html` — history timeline, 8 committee profiles, code of ethics |
| No event registration or join path | `events.html` — validated multi-field registration with draft protection |
| Single contact method (one email) | `contact.html` — form, email, phone, room, office hours, four social channels |
| No social media integration | Facebook Page Plugin + share buttons |
| No news, blog or announcements | `blog.html` |
| No search or filter | Filter + live search on workshops, projects, gallery and blog |
| No storage, no personalisation | Cookies, localStorage and sessionStorage across the site |
| Narrow topic scope | Four tracks: prompt engineering, ML, NLP, computer vision — plus ethics |
| Not responsive, misaligned layouts | Mobile-first fluid grid, tested at 360 / 768 / 1440px |
| Text-heavy walls, poor separation | Card-based layout, generous whitespace, one consistent type scale |
| Stock-image overuse | Original generative SVG artwork throughout |
| Blocky design, inconsistent fonts | One type scale (Space Grotesk + Inter), one spacing rhythm |
| Limited accessibility | Skip links, ARIA, keyboard support, reduced-motion, focus rings |
| No feedback mechanism | Contact form, article pitching, FAQ accordions |

---

## 7. Page ownership (4 members × 2 pages)

| Member | Pages | Storage / API feature to present |
|---|---|---|
| A (leader) | `index.html`, `about.html` | **Cookies** — theme, display name, visit counter |
| B | `workshops.html`, `projects.html` | **localStorage** — saved items; **REST API** — GitHub |
| C | `events.html`, `gallery.html` | **sessionStorage** — registration draft; countdown; lightbox |
| D | `blog.html`, `contact.html` | **REST API** — Hacker News; **social media plugin** + sharing |

> Note: the task-distribution document named these pages `activities.html`, `news.html` and
> placed the social plugin with Member C. The filenames here follow the Chapter 2.1 write-up
> (`workshops.html`, `blog.html`). Update whichever document you prefer, but make sure the
> report, the marking rubric sheet and the actual files all agree before submission.

---

## 8. Regenerating the pages

`build_pages.py` (in the parent folder) generates six of the eight pages from one shared
template, which is what guarantees the navbar and footer stay identical. If you edit shared
chrome, edit the template and re-run `python3 build_pages.py`. If you only edit page content,
edit the HTML directly — the script is a convenience, not a requirement, and the site runs
perfectly well without it.

**Do not include `build_pages.py` in the submitted `.zip`** — the assignment asks for the
website source, and an unnecessary build script may confuse the marker.
