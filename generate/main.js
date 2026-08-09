var RANK_DEFS = [
  { slug: 'lion',    label: 'Lion',           grade: 'Kindergarten', key: 'l',  field: 'lionNum'    },
  { slug: 'tiger',   label: 'Tiger',          grade: '1st Grade',    key: 't',  field: 'tigerNum'   },
  { slug: 'wolf',    label: 'Wolf',           grade: '2nd Grade',    key: 'w',  field: 'wolfNum'    },
  { slug: 'bear',    label: 'Bear',           grade: '3rd Grade',    key: 'b',  field: 'bearNum'    },
  { slug: 'webelos', label: 'Webelos',        grade: '4th Grade',    key: 'we', field: 'webelosNum' },
  { slug: 'aol',     label: 'Arrow of Light', grade: '5th Grade',    key: 'a',  field: 'aolNum'     },
];

function buildMainUrl(packNumber, packName, denNums) {
  var base = window.location.origin +
    window.location.pathname.replace(/\/generate\/?.*$/, '/');
  var params = new URLSearchParams();
  if (packNumber) params.set('p', packNumber);
  if (packName)   params.set('n', packName);
  RANK_DEFS.forEach(function (r) {
    if (denNums[r.slug]) params.set(r.key, denNums[r.slug]);
  });
  return base + '?' + params.toString();
}

window.addEventListener('DOMContentLoaded', function () {
  var data = { packNumber: '', packName: '', lionNum: '', tigerNum: '', wolfNum: '', bearNum: '', webelosNum: '', aolNum: '' };

  var ractive = new Ractive({
    target: '#app',
    template: '#generator-template',
    data: data,
    computed: {
      hasOutput: function () {
        return !!(this.get('packNumber'));
      },
      generatedUrl: function () {
        var packNumber = this.get('packNumber');
        if (!packNumber) return '';
        var denNums = {};
        RANK_DEFS.forEach(function (r) {
          var v = this.get(r.field);
          if (v) denNums[r.slug] = v;
        }, this);
        return buildMainUrl(packNumber, this.get('packName'), denNums);
      },
      qrUrl: function () {
        var url = this.get('generatedUrl');
        if (!url) return '';
        return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=' +
          encodeURIComponent(url);
      },
    },
  });

  ractive.on('copy', function () {
    var url = ractive.get('generatedUrl');
    var btn = document.getElementById('copy-btn');
    navigator.clipboard.writeText(url).then(function () {
      if (btn) {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = orig; }, 1500);
      }
    });
  });
});
