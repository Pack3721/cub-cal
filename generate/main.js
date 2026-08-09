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
  const denUrls = {};
  RANKS.forEach(function (r) { denUrls[r.slug] = ''; });

  const ractive = new Ractive({
    target: '#app',
    template: '#generator-template',
    data: {
      packName: '',
      packUrl: '',
      denUrls: denUrls,
      selectedRank: '',
      ranks: RANKS,
    },
    computed: {
      selectedRankInfo: function () {
        const slug = this.get('selectedRank');
        return RANKS.find(function (r) { return r.slug === slug; }) || null;
      },
      rankLabel: function () {
        const ri = this.get('selectedRankInfo');
        return ri ? ri.label : '';
      },
      selectedDenUrl: function () {
        const slug = this.get('selectedRank');
        return slug ? (this.get('denUrls.' + slug) || '') : '';
      },
      hasOutput: function () {
        const slug = this.get('selectedRank');
        return !!slug && !!(this.get('packUrl') || this.get('selectedDenUrl'));
      },
      generatedUrl: function () {
        return buildMainUrl(
          this.get('packName'),
          this.get('selectedRank'),
          this.get('packUrl'),
          this.get('selectedDenUrl')
        );
      },
      qrUrl: function () {
        return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=' +
          encodeURIComponent(this.get('generatedUrl'));
      },
    },
    copyUrl: function () {
      const url = this.get('generatedUrl');
      const btn = document.getElementById('copy-btn');
      navigator.clipboard.writeText(url).then(function () {
        if (btn) {
          const orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(function () { btn.textContent = orig; }, 1500);
        }
      });
    },
  });
});
