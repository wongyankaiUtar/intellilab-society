/* ============================================================================
   IntelliLab Society — shared event schedule
   ----------------------------------------------------------------------------
   SINGLE SOURCE OF TRUTH for the club calendar.

   Both index.html and events.html read from this file, so the "next event"
   name, date, time and countdown are guaranteed to match on every page.
   Add or edit an event here and both pages update together.

   Dates are generated relative to today rather than hardcoded, so the
   schedule is always in the future whenever the site is opened or demonstrated.
   ========================================================================== */

function daysFromNow(n, hour) {
  var d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

var CLUB_EVENTS = [
  {
    name: 'Innovation Challenge Night',
    date: daysFromNow(6, 19),
    place: 'Innovation Lab, Block C',
    cat: 'Challenge',
    seats: 48,
    desc: 'Six hours, one brief, free pizza. Teams of up to four build an AI solution to a problem posed by a local partner.'
  },
  {
    name: 'Prompt Engineering 101',
    date: daysFromNow(11, 14),
    place: 'Lab 4-2',
    cat: 'Workshop',
    seats: 30,
    desc: 'Our most popular beginner session. No coding, no laptop required — the lab machines are set up for you.'
  },
  {
    name: 'Industry Night: AI in Practice',
    date: daysFromNow(19, 18),
    place: 'Auditorium A',
    cat: 'Talk',
    seats: 120,
    desc: 'Four engineers from partner companies on what AI work actually looks like day to day, then open Q&A.'
  },
  {
    name: 'Vision Models Deep Dive',
    date: daysFromNow(26, 14),
    place: 'Innovation Lab, Block C',
    cat: 'Workshop',
    seats: 24,
    desc: 'Detection and segmentation on club GPUs, plus the ethics module on surveillance and consent.'
  },
  {
    name: 'Semester Project Showcase',
    date: daysFromNow(38, 17),
    place: 'Faculty Foyer',
    cat: 'Showcase',
    seats: 200,
    desc: 'Every project team demos. Open to the whole university — bring a friend who thinks AI is not for them.'
  },
  {
    name: "Beginners' Welcome Session",
    date: daysFromNow(45, 15),
    place: 'Lab 4-2',
    cat: 'Social',
    seats: 60,
    desc: 'Coffee, introductions and a tour of what the club does. Genuinely zero prior knowledge assumed.'
  }
];

/* Chip colour per event category — keeps badges consistent across pages */
var EVENT_CHIP = {
  Challenge: 'chip--amber',
  Workshop:  'chip--brand',
  Talk:      'chip--cyan',
  Showcase:  'chip--green',
  Social:    'chip--cyan'
};

/* The soonest event still in the future. Because this is recalculated on
   every call, a passed date is skipped automatically and the countdown can
   never sit frozen at 00:00:00. */
function nextClubEvent() {
  var now = new Date();
  var upcoming = CLUB_EVENTS
    .filter(function (e) { return e.date > now; })
    .sort(function (a, b) { return a.date - b.date; });
  return upcoming[0] || CLUB_EVENTS[0];
}

/* "Sunday, 16 August · 7:00 pm" */
function formatEventDate(d) {
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }) +
         ' · ' + d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

/* Renders the four countdown tiles into `selector` for a given target date.
   Shared so the markup and padding are identical on both pages. */
function renderCountdown(selector, target) {
  var diff = target - new Date();
  if (diff < 0) diff = 0;
  var units = [
    [Math.floor(diff / 86400000),      'Days'],
    [Math.floor(diff / 3600000) % 24,  'Hours'],
    [Math.floor(diff / 60000) % 60,    'Minutes'],
    [Math.floor(diff / 1000) % 60,     'Seconds']
  ];
  var html = units.map(function (u) {
    return '<div class="cd-unit"><span class="cd-unit__n">' +
           String(u[0]).padStart(2, '0') +
           '</span><span class="cd-unit__l">' + u[1] + '</span></div>';
  }).join('');
  var el = document.querySelector(selector);
  if (el) el.innerHTML = html;
}
