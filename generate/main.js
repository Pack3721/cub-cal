var RANK_DEFS = [
  { slug: 'lion',    label: 'Lion',           grade: 'Kindergarten', key: 'l',  numKey: 'ld',  field: 'lionUrl',    numField: 'lionDenNum'    },
  { slug: 'tiger',   label: 'Tiger',          grade: '1st Grade',    key: 't',  numKey: 'td',  field: 'tigerUrl',   numField: 'tigerDenNum'   },
  { slug: 'wolf',    label: 'Wolf',           grade: '2nd Grade',    key: 'w',  numKey: 'wd',  field: 'wolfUrl',    numField: 'wolfDenNum'    },
  { slug: 'bear',    label: 'Bear',           grade: '3rd Grade',    key: 'b',  numKey: 'bd',  field: 'bearUrl',    numField: 'bearDenNum'    },
  { slug: 'webelos', label: 'Webelos',        grade: '4th Grade',    key: 'we', numKey: 'wed', field: 'webelosUrl', numField: 'webelosDenNum' },
  { slug: 'aol',     label: 'Arrow of Light', grade: '5th Grade',    key: 'a',  numKey: 'ad',  field: 'aolUrl',     numField: 'aolDenNum'     },
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

function buildMainUrl(packId, packName, denIds, denNums) {
  var base = window.location.origin +
    window.location.pathname.replace(/\/generate\/?.*$/, '/');
  var params = new URLSearchParams();
  if (packId)   params.set('p', packId);
  if (packName) params.set('n', packName);
  RANK_DEFS.forEach(function (r) {
    if (denIds[r.slug])  params.set(r.key,    denIds[r.slug]);
    if (denNums[r.slug]) params.set(r.numKey, denNums[r.slug]);
  });
  return base + '?' + params.toString();
}

window.addEventListener('DOMContentLoaded', function () {
  var data = { packName: '', packUrl: '' };
  RANK_DEFS.forEach(function (r) { data[r.field] = ''; data[r.numField] = ''; });

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
        var denIds = {}, denNums = {};
        RANK_DEFS.forEach(function (r) {
          if (v[r.slug].id)             denIds[r.slug]  = v[r.slug].id;
          var num = this.get(r.numField);
          if (num)                      denNums[r.slug] = num;
        }, this);
        return buildMainUrl(v.pack.id, this.get('packName'), denIds, denNums);
      },
    },
  });

  var qrCode = new QRCodeStyling({
    width: 220,
    height: 220,
    type: 'svg',
    data: 'placeholder',
    dotsOptions: {
      color: '#003F87',
      type: 'rounded',
    },
    backgroundOptions: {
      color: '#ffffff',
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: '#FFC72C',
    },
    cornersDotOptions: {
      type: 'dot',
      color: '#003F87',
    },
    qrOptions: {
      errorCorrectionLevel: 'M',
    },
  });
  qrCode.append(document.getElementById('qr-container'));

  ractive.observe('generatedUrl', function (url) {
    var container = document.getElementById('qr-container');
    if (url) {
      qrCode.update({ data: url });
      container.style.display = '';
    } else {
      container.style.display = 'none';
    }
  }, { init: true });

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
