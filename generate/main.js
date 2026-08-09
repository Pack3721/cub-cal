const RANKS = [
  { slug: 'lion',    label: 'Lion',           grade: 'Kindergarten' },
  { slug: 'tiger',   label: 'Tiger',          grade: '1st Grade'    },
  { slug: 'wolf',    label: 'Wolf',           grade: '2nd Grade'    },
  { slug: 'bear',    label: 'Bear',           grade: '3rd Grade'    },
  { slug: 'webelos', label: 'Webelos',        grade: '4th Grade'    },
  { slug: 'aol',     label: 'Arrow of Light', grade: '5th Grade'    },
];

function buildMainUrl(packName, rank, packUrl, denUrl) {
  const base = window.location.origin +
    window.location.pathname.replace(/\/generate\/?.*$/, '/');
  const params = new URLSearchParams();
  if (packName) params.set('packName', packName);
  if (rank)     params.set('rank', rank);
  if (packUrl)  params.set('pack', packUrl);
  if (denUrl)   params.set('den', denUrl);
  const qs = params.toString();
  return base + (qs ? '?' + qs : '');
}

window.addEventListener('DOMContentLoaded', function () {
  const ractive = new Ractive({
    target: '#app',
    template: '#generator-template',
    data: {
      packName: '',
      rank: '',
      packUrl: '',
      denUrl: '',
      ranks: RANKS,
    },
    computed: {
      hasOutput: function () {
        return !!(this.get('packUrl') || this.get('denUrl'));
      },
      generatedUrl: function () {
        return buildMainUrl(
          this.get('packName'),
          this.get('rank'),
          this.get('packUrl'),
          this.get('denUrl')
        );
      },
      qrUrl: function () {
        const url = this.get('generatedUrl');
        return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=' +
          encodeURIComponent(url);
      },
    },
    copyUrl: function () {
      const url = this.get('generatedUrl');
      navigator.clipboard.writeText(url).then(function () {
        const btn = document.getElementById('copy-btn');
        if (btn) {
          const orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(function () { btn.textContent = orig; }, 1500);
        }
      });
    },
  });
});
