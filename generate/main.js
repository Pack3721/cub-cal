import { QRCodeStyling, browserUtils } from 'https://cdn.jsdelivr.net/npm/@liquid-js/qr-code-styling@5.5.0/lib/qr-code-styling.js';
import BorderPlugin from 'https://cdn.jsdelivr.net/npm/@liquid-js/qr-code-styling@5.5.0/lib/border-plugin.js';

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

var STORAGE_KEY = 'scoutCalGenerator';

function loadSavedData(defaults) {
  try {
    var raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    var saved = JSON.parse(raw);
    Object.keys(defaults).forEach(function (k) {
      if (typeof saved[k] === 'string') defaults[k] = saved[k];
    });
  } catch (e) { /* ignore corrupt/unavailable storage */ }
  return defaults;
}

function buildBorderPlugin(topText, bottomText) {
  var text = {
    font: 'sans-serif',
    color: '#FFC72C',
    size: 0.075,
    fontWeight: 'bold',
  };
  topText    = (topText    || '').trim();
  bottomText = (bottomText || '').trim();
  if (topText)    text.top    = { content: topText };
  if (bottomText) text.bottom = { content: bottomText };

  return new BorderPlugin({
    proportional: true,
    size: 0.12,
    round: 1,
    margin: 0,
    color: '#003F87',
    text: (topText || bottomText) ? text : undefined,
  });
}

window.addEventListener('DOMContentLoaded', function () {
  var data = { packName: '', packUrl: '', borderTopText: '', borderBottomText: '' };
  RANK_DEFS.forEach(function (r) { data[r.field] = ''; data[r.numField] = ''; });
  data = loadSavedData(data);
  var persistedFields = Object.keys(data);

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

  ractive.observe(persistedFields.join(' '), function () {
    var toSave = {};
    persistedFields.forEach(function (k) { toSave[k] = ractive.get(k); });
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)); } catch (e) { /* ignore unavailable storage */ }
  }, { init: false });

  function baseQrOptions() {
    return {
      shape: 'circle',
      image: 'https://api.iconify.design/hugeicons:calendar-sync.svg?color=%23003F87',
      imageOptions: {
        margin: 4,
        imageSize: 0.38,
      },
      dotsOptions: {
        color: '#003F87',
        type: 'dots',
      },
      backgroundOptions: {
        color: '#ffffff',
        round: 1,
        margin: 3,
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
        errorCorrectionLevel: 'H',
      },
    };
  }

  // Rebuild the whole QRCodeStyling instance on every change (rather than
  // calling .update() on a shared instance) so stale plugin/text state from
  // qr-code-styling's async draw pipeline can't accumulate on the SVG.
  var currentQrCode = null;
  function renderQr() {
    var url = ractive.get('generatedUrl');
    var container = document.getElementById('qr-container');
    container.innerHTML = '';
    if (url) {
      var options = baseQrOptions();
      options.data = url;
      options.plugins = [buildBorderPlugin(ractive.get('borderTopText'), ractive.get('borderBottomText'))];
      currentQrCode = new QRCodeStyling(options);
      currentQrCode.append(container);
      container.style.display = '';
    } else {
      currentQrCode = null;
      container.style.display = 'none';
    }
  }
  ractive.observe('generatedUrl borderTopText borderBottomText', renderQr, { init: false });
  renderQr();

  ractive.on('savePng', function () {
    if (!currentQrCode) return;
    var name = (ractive.get('packName') || 'pack-calendar').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pack-calendar';
    browserUtils.download(currentQrCode, { name: name + '-qr', extension: 'png' }, { width: 1024, height: 1024, margin: 0 });
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
