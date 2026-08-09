var RANK_DEFS = [
  { slug: 'lion',    label: 'Lion',           grade: 'Kindergarten', param: 'lion'    },
  { slug: 'tiger',   label: 'Tiger',          grade: '1st Grade',    param: 'tiger'   },
  { slug: 'wolf',    label: 'Wolf',           grade: '2nd Grade',    param: 'wolf'    },
  { slug: 'bear',    label: 'Bear',           grade: '3rd Grade',    param: 'bear'    },
  { slug: 'webelos', label: 'Webelos',        grade: '4th Grade',    param: 'webelos' },
  { slug: 'aol',     label: 'Arrow of Light', grade: '5th Grade',    param: 'aol'     },
];

function makeCalLink(app, url) {
  if (!url) return '#';
  var webcal = url.replace(/^https?:\/\//, 'webcal://');
  if (app === 'apple')   return webcal;
  if (app === 'google')  return 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(webcal);
  if (app === 'outlook') return 'https://outlook.live.com/owa/?path=/calendar/action/compose&rru=addsubscription&url=' + encodeURIComponent(url);
  return webcal;
}

window.addEventListener('DOMContentLoaded', function () {
  var params = new URLSearchParams(window.location.search);
  var packName = params.get('packName') || '';
  var packUrl  = params.get('pack')     || '';

  // Build list of ranks that have a den URL in the link
  var availableRanks = [];
  RANK_DEFS.forEach(function (r) {
    var denUrl = params.get(r.param) || '';
    if (denUrl) {
      availableRanks.push({
        slug:     r.slug,
        label:    r.label,
        grade:    r.grade,
        denUrl:   denUrl,
        selected: false,
      });
    }
  });

  var headerTitle = document.getElementById('header-title');
  if (packName && headerTitle) headerTitle.textContent = packName + ' Calendar';

  var ractive = new Ractive({
    target: '#app',
    template: '#main-template',
    data: {
      app:            'apple',
      packUrl:        packUrl,
      availableRanks: availableRanks,
    },
    computed: {
      hasParams: function () {
        return !!(packUrl || availableRanks.length);
      },
      selectedRanks: function () {
        return this.get('availableRanks')
          .filter(function (r) { return r.selected; })
          .map(function (r) {
            return {
              label:      r.label,
              grade:      r.grade,
              denCalLink: makeCalLink(ractive.get('app'), r.denUrl),
            };
          });
      },
      packCalLink: function () {
        return makeCalLink(this.get('app'), packUrl);
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
});
