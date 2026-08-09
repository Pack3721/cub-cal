const RANKS = {
  lion:    { label: 'Lion',           grade: 'Kindergarten' },
  tiger:   { label: 'Tiger',          grade: '1st Grade'    },
  wolf:    { label: 'Wolf',           grade: '2nd Grade'    },
  bear:    { label: 'Bear',           grade: '3rd Grade'    },
  webelos: { label: 'Webelos',        grade: '4th Grade'    },
  aol:     { label: 'Arrow of Light', grade: '5th Grade'    },
};

function makeCalLink(app, url) {
  if (!url) return '#';
  const webcal = url.replace(/^https?:\/\//, 'webcal://');
  if (app === 'apple')   return webcal;
  if (app === 'google')  return 'https://calendar.google.com/calendar/render?cid=' + encodeURIComponent(webcal);
  if (app === 'outlook') return 'https://outlook.live.com/owa/?path=/calendar/action/compose&rru=addsubscription&url=' + encodeURIComponent(url);
  return webcal;
}

window.addEventListener('DOMContentLoaded', function () {
  const params = new URLSearchParams(window.location.search);
  const packName = params.get('packName') || '';
  const rank     = params.get('rank')     || '';
  const packUrl  = params.get('pack')     || '';
  const denUrl   = params.get('den')      || '';

  const headerTitle = document.getElementById('header-title');
  if (packName && headerTitle) headerTitle.textContent = packName + ' Calendar';

  const ractive = new Ractive({
    target: '#app',
    template: '#main-template',
    data: {
      app: 'apple',
      packName,
      rank,
      packUrl,
      denUrl,
    },
    computed: {
      hasParams: function () {
        return !!(this.get('packUrl') || this.get('denUrl'));
      },
      rankInfo: function () {
        return RANKS[this.get('rank')] || null;
      },
      rankLabel: function () {
        const ri = this.get('rankInfo');
        return ri ? ri.label : '';
      },
      gradeLabel: function () {
        const ri = this.get('rankInfo');
        return ri ? ri.grade : '';
      },
      packCalLink: function () {
        return makeCalLink(this.get('app'), this.get('packUrl'));
      },
      denCalLink: function () {
        return makeCalLink(this.get('app'), this.get('denUrl'));
      },
      openTarget: function () {
        return this.get('app') === 'apple' ? '' : 'target="_blank" rel="noopener"';
      },
      appNote: function () {
        const app = this.get('app');
        if (app === 'apple')   return 'Opens in Apple Calendar to confirm the subscription.';
        if (app === 'google')  return 'Opens Google Calendar in a new tab — click "Add calendar" to confirm.';
        if (app === 'outlook') return 'Opens Outlook Calendar in a new tab — follow the prompts to subscribe.';
        return '';
      },
    },
  });
});
