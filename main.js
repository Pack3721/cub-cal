var API_BASE = 'https://api.scouting.org/advancements/events/calendar/';

var RANK_DEFS = [
  { slug: 'lion',    label: 'Lion',           grade: 'Kindergarten', key: 'l',  numKey: 'ld'  },
  { slug: 'tiger',   label: 'Tiger',          grade: '1st Grade',    key: 't',  numKey: 'td'  },
  { slug: 'wolf',    label: 'Wolf',           grade: '2nd Grade',    key: 'w',  numKey: 'wd'  },
  { slug: 'bear',    label: 'Bear',           grade: '3rd Grade',    key: 'b',  numKey: 'bd'  },
  { slug: 'webelos', label: 'Webelos',        grade: '4th Grade',    key: 'we', numKey: 'wed' },
  { slug: 'aol',     label: 'Arrow of Light', grade: '5th Grade',    key: 'a',  numKey: 'ad'  },
];

function makeCalLink(app, url) {
  if (!url) return '#';
  var webcal = url.replace(/^https?:\/\//, 'webcal://');
  if (app === 'apple')   return webcal;
  if (app === 'google')  return 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(webcal);
  if (app === 'outlook') return 'https://outlook.live.com/owa/?path=/calendar/action/compose&rru=addsubscription&url=' + encodeURIComponent(url);
  return webcal;
}

function denDisplayName(label, denNum) {
  return denNum ? label + ' Den ' + denNum : label + ' Den';
}

// Apple's mark is monochrome, so it needs a color that fits the button
// background; Google/Outlook are already full-color and work on either.
function appIconUrl(app, appleColor) {
  if (app === 'google')  return 'https://api.iconify.design/logos:google-icon.svg';
  if (app === 'outlook') return 'https://api.iconify.design/vscode-icons:file-type-outlook.svg';
  return 'https://api.iconify.design/mdi:apple.svg?color=' + encodeURIComponent(appleColor);
}

// App choice is remembered globally (not tied to a pack); den selections
// are remembered per pack, since a device may visit links for multiple packs.
var APP_STORAGE_KEY = 'scoutCalApp';

function loadSavedApp() {
  try {
    var saved = window.localStorage.getItem(APP_STORAGE_KEY);
    if (saved === 'apple' || saved === 'google' || saved === 'outlook') return saved;
  } catch (e) { /* ignore unavailable storage */ }
  return 'apple';
}

function densStorageKey(packId) {
  return 'scoutCalDens:' + packId;
}

function loadSavedDenSlugs(packId) {
  try {
    var raw = window.localStorage.getItem(densStorageKey(packId));
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore corrupt/unavailable storage */ }
  return [];
}

window.addEventListener('DOMContentLoaded', function () {
  var params   = new URLSearchParams(window.location.search);
  var packId   = params.get('p') || '';
  var packName = params.get('n') || '';
  var packUrl  = packId ? (API_BASE + packId) : '';

  var savedDenSlugs = packId ? loadSavedDenSlugs(packId) : [];

  var availableRanks = [];
  RANK_DEFS.forEach(function (r) {
    var denId  = params.get(r.key)    || '';
    var denNum = params.get(r.numKey) || '';
    if (denId && packId) {
      availableRanks.push({
        slug:        r.slug,
        label:       r.label,
        grade:       r.grade,
        denNum:      denNum,
        displayName: denDisplayName(r.label, denNum),
        denUrl:      API_BASE + packId + '/' + denId,
        selected:    savedDenSlugs.indexOf(r.slug) !== -1,
      });
    }
  });

  var headerTitle = document.getElementById('header-title');
  if (packName && headerTitle) headerTitle.textContent = packName + ' Calendar';

  var ractive = new Ractive({
    target: '#app',
    template: '#main-template',
    data: {
      app:            loadSavedApp(),
      packUrl:        packUrl,
      availableRanks: availableRanks,
      dropdownOpen:   false,
    },
    computed: {
      hasParams: function () {
        return !!(packUrl || availableRanks.length);
      },
      selectedRanks: function () {
        var app = this.get('app');
        return this.get('availableRanks')
          .filter(function (r) { return r.selected; })
          .map(function (r) {
            return {
              label:       r.label,
              grade:       r.grade,
              displayName: r.displayName,
              denCalLink:  makeCalLink(app, r.denUrl),
            };
          });
      },
      packCalLink: function () {
        return makeCalLink(this.get('app'), packUrl);
      },
      dropdownLabel: function () {
        var selected = this.get('availableRanks').filter(function (r) { return r.selected; });
        if (!selected.length) return 'Select den(s)…';
        return selected.map(function (r) { return r.displayName; }).join(', ');
      },
      readyForNextSteps: function () {
        var ranks = this.get('availableRanks');
        if (!ranks.length) return true;
        return ranks.some(function (r) { return r.selected; });
      },
      // Icon for the yellow (pack) button — black Apple mark reads well on yellow.
      packBtnIconUrl: function () {
        return appIconUrl(this.get('app'), '#000000');
      },
      // Icon for the navy (den) buttons — white Apple mark reads well on navy.
      denBtnIconUrl: function () {
        return appIconUrl(this.get('app'), '#ffffff');
      },
      appNote: function () {
        var app = this.get('app');
        if (app === 'apple')   return 'Opens Apple Calendar — confirm the subscription when prompted.';
        if (app === 'google')  return 'Opens Google Calendar in a new tab — click "Add calendar" to confirm.';
        if (app === 'outlook') return 'Opens Outlook in a new tab — follow the prompts to subscribe.';
        return '';
      },
    },
  });

  ractive.observe('app', function (app) {
    try { window.localStorage.setItem(APP_STORAGE_KEY, app); } catch (e) { /* ignore unavailable storage */ }
  }, { init: false });

  if (packId) {
    ractive.observe('availableRanks.*.selected', function () {
      var selectedSlugs = ractive.get('availableRanks')
        .filter(function (r) { return r.selected; })
        .map(function (r) { return r.slug; });
      try { window.localStorage.setItem(densStorageKey(packId), JSON.stringify(selectedSlugs)); } catch (e) { /* ignore unavailable storage */ }
    }, { init: false });
  }

  ractive.on('toggleDropdown', function (ctx) {
    ctx.original.stopPropagation();
    ractive.set('dropdownOpen', !ractive.get('dropdownOpen'));
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('#den-dropdown')) {
      ractive.set('dropdownOpen', false);
    }
  });
});
