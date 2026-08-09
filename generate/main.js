var RANK_DEFS = [
  { slug: 'lion',    label: 'Lion',           grade: 'Kindergarten', key: 'l',  field: 'lionUrl'    },
  { slug: 'tiger',   label: 'Tiger',          grade: '1st Grade',    key: 't',  field: 'tigerUrl'   },
  { slug: 'wolf',    label: 'Wolf',           grade: '2nd Grade',    key: 'w',  field: 'wolfUrl'    },
  { slug: 'bear',    label: 'Bear',           grade: '3rd Grade',    key: 'b',  field: 'bearUrl'    },
  { slug: 'webelos', label: 'Webelos',        grade: '4th Grade',    key: 'we', field: 'webelosUrl' },
  { slug: 'aol',     label: 'Arrow of Light', grade: '5th Grade',    key: 'a',  field: 'aolUrl'     },
];

var PACK_URL_RE = /^https:\/\/api\.scouting\.org\/advancements\/events\/calendar\/(\d+)\/?$/;
var DEN_URL_RE  = /^https:\/\/api\.scouting\.org\/advancements\/events\/calendar\/(\d+)\/(\d+)\/?$/;

function parsePackUrl(url) {
  var m = (url || '').trim().match(PACK_URL_RE);
  return m ? m[1] : null;
}

function parseDenUrl(url) {
  var m = (url || '').trim().match(DEN_URL_RE);
  return m ? { packId: m[1], denId: m[2] } : null;
}

function buildMainUrl(packId, packName, denIds) {
  var base = window.location.origin +
    window.location.pathname.replace(/\/generate\/?.*$/, '/');
  var params = new URLSearchParams();
  if (packId)   params.set('p', packId);
  if (packName) params.set('n', packName);
  RANK_DEFS.forEach(function (r) {
    if (denIds[r.slug]) params.set(r.key, denIds[r.slug]);
  });
  return base + '?' + params.toString();
}

window.addEventListener('DOMContentLoaded', function () {
  var data = { packName: '', packUrl: '' };
  RANK_DEFS.forEach(function (r) { data[r.field] = ''; });

  var ractive = new Ractive({
    target: '#app',
    template: '#generator-template',
    data: data,
    computed: {
      validation: function () {
        var packUrl = this.get('packUrl') || '';
        var packId  = packUrl ? parsePackUrl(packUrl) : null;
        var result  = {
          pack: {
            id:  packId,
            cls: packUrl ? (packId ? 'is-success' : 'is-danger') : '',
          },
        };
        RANK_DEFS.forEach(function (r) {
          var url      = (this.get(r.field) || '').trim();
          var parsed   = url ? parseDenUrl(url) : null;
          var packMatch = !parsed || !packId || parsed.packId === packId;
          var valid    = !url || (parsed && packMatch);
          result[r.slug] = {
            id:       parsed ? parsed.denId : null,
            cls:      url ? (valid ? 'is-success' : 'is-danger') : '',
            mismatch: !!(parsed && packId && !packMatch),
          };
        }, this);
        return result;
      },
      hasOutput: function () {
        return !!this.get('validation').pack.id;
      },
      generatedUrl: function () {
        var v = this.get('validation');
        if (!v.pack.id) return '';
        var denIds = {};
        RANK_DEFS.forEach(function (r) { if (v[r.slug].id) denIds[r.slug] = v[r.slug].id; });
        return buildMainUrl(v.pack.id, this.get('packName'), denIds);
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
