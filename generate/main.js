import { QRCodeStyling, browserUtils } from 'https://cdn.jsdelivr.net/npm/@liquid-js/qr-code-styling@5.5.0/lib/qr-code-styling.js';
import BorderPlugin from 'https://cdn.jsdelivr.net/npm/@liquid-js/qr-code-styling@5.5.0/lib/border-plugin.js';
import { generateKey, encryptWithKey } from '../assets/crypto.js';

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

function siteBase() {
  return window.location.origin +
    window.location.pathname.replace(/\/generate\/?.*$/, '/');
}

// Shared by both link modes: the same short keys either go straight into a
// query string (plain mode) or get JSON-encoded and encrypted (encrypted-file
// mode), so the two stay parseable by the same code on the viewer page.
function buildParamsObject(packId, packName, denIds, denNums) {
  var obj = {};
  if (packId)   obj.p = packId;
  if (packName) obj.n = packName;
  RANK_DEFS.forEach(function (r) {
    if (denIds[r.slug])  obj[r.key]    = denIds[r.slug];
    if (denNums[r.slug]) obj[r.numKey] = denNums[r.slug];
  });
  return obj;
}

function buildMainUrl(packId, packName, denIds, denNums) {
  var params = new URLSearchParams(buildParamsObject(packId, packName, denIds, denNums));
  return siteBase() + '?' + params.toString();
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
  var data = {
    packName: '', packUrl: '', borderTopText: '', borderBottomText: '',
    // Persisted so re-opening this page can re-encrypt an update to the
    // same file id with the same key, keeping already-printed QR codes valid.
    fileId: '', encryptionKey: '',
  };
  RANK_DEFS.forEach(function (r) { data[r.field] = ''; data[r.numField] = ''; });
  data = loadSavedData(data);
  var persistedFields = Object.keys(data);

  // Output of the last encrypt run — not persisted, always regenerated.
  data.encryptedFile = '';
  data.encryptedUrl = '';
  data.encryptBusy = false;
  data.encryptError = '';

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
        var dens = collectDens(this, v);
        return buildMainUrl(v.pack.id, this.get('packName'), dens.ids, dens.nums);
      },
    },
  });

  // Shared by generatedUrl and the encrypt handler: pulls the currently
  // valid den ids/numbers out of the ractive instance in one place.
  function collectDens(ractive, validation) {
    var ids = {}, nums = {};
    RANK_DEFS.forEach(function (r) {
      if (validation[r.slug].id) ids[r.slug] = validation[r.slug].id;
      var num = ractive.get(r.numField);
      if (num) nums[r.slug] = num;
    });
    return { ids: ids, nums: nums };
  }

  ractive.observe(persistedFields.join(' '), function () {
    var toSave = {};
    persistedFields.forEach(function (k) { toSave[k] = ractive.get(k); });
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave)); } catch (e) { /* ignore unavailable storage */ }
  }, { init: false });

  // Any edit invalidates a previously generated encrypted file/link, so a
  // stale one can't be mistakenly committed after the data has moved on.
  ractive.observe(persistedFields.join(' '), function () {
    ractive.set('encryptedFile', '');
    ractive.set('encryptedUrl', '');
  }, { init: false });

  function baseQrOptions() {
    return {
      shape: 'circle',
      image: 'https://api.iconify.design/hugeicons:calendar-sync.svg?color=%23003F87',
      imageOptions: {
        margin: 1,
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
  // Used for both the plain-link QR and the encrypted-link QR.
  function createQrController(containerId) {
    var current = null;
    return {
      render: function (url, topText, bottomText) {
        var container = document.getElementById(containerId);
        if (!container) { current = null; return; } // e.g. encrypted QR before a file has been generated
        container.innerHTML = '';
        if (url) {
          var options = baseQrOptions();
          options.data = url;
          options.plugins = [buildBorderPlugin(topText, bottomText)];
          current = new QRCodeStyling(options);
          current.append(container);
          container.style.display = '';
        } else {
          current = null;
          container.style.display = 'none';
        }
      },
      get: function () { return current; },
    };
  }

  function savePng(qrCode, name) {
    if (!qrCode) return;
    name = (name || 'pack-calendar').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pack-calendar';
    browserUtils.download(qrCode, { name: name + '-qr', extension: 'png' }, { width: 1024, height: 1024, margin: 0 });
  }

  var mainQr = createQrController('qr-container');
  function renderMainQr() {
    mainQr.render(ractive.get('generatedUrl'), ractive.get('borderTopText'), ractive.get('borderBottomText'));
  }
  ractive.observe('generatedUrl borderTopText borderBottomText', renderMainQr, { init: false });
  renderMainQr();

  ractive.on('savePng', function () {
    savePng(mainQr.get(), ractive.get('packName'));
  });

  var encQr = createQrController('qr-container-enc');
  function renderEncQr() {
    encQr.render(ractive.get('encryptedUrl'), ractive.get('borderTopText'), ractive.get('borderBottomText'));
  }
  ractive.observe('encryptedUrl borderTopText borderBottomText', renderEncQr, { init: false });
  renderEncQr();

  ractive.on('savePngEnc', function () {
    savePng(encQr.get(), (ractive.get('packName') || 'pack-calendar').trim() + '-encrypted');
  });

  function copyFromButton(text, btnId) {
    var btn = document.getElementById(btnId);
    navigator.clipboard.writeText(text).then(function () {
      if (btn) {
        var orig = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = orig; }, 1500);
      }
    });
  }

  ractive.on('copy', function () {
    copyFromButton(ractive.get('generatedUrl'), 'copy-btn');
  });

  // Regenerating the key is a deliberate, separate action from encrypting —
  // it's the one thing that breaks every QR code/link already handed out
  // under the old key, so it gets its own button and a confirmation.
  ractive.on('generateKey', function () {
    var existing = ractive.get('encryptionKey');
    if (existing && !window.confirm(
      'Generating a new key will make any QR codes or links already created ' +
      'with the current key stop working. Continue?'
    )) return;
    ractive.set('encryptionKey', generateKey());
  });

  // Encrypted-file mode: JSON-encode the same fields the plain link uses,
  // encrypt with the saved (or freshly generated) AES-256-GCM key, and
  // build a link that carries the file id in the query string (not secret)
  // and the key in the URL fragment (never sent to any server). The
  // encrypted file itself still needs to be committed to the repo by hand
  // at data/<fileId>.json. Reusing the same key/file id lets a later update
  // overwrite that file without breaking links already handed out.
  ractive.on('encrypt', function () {
    var v = ractive.get('validation');
    if (!v.pack.id) return;
    var fileId = (ractive.get('fileId') || '').trim();
    if (!fileId) {
      ractive.set('encryptError', 'Enter a file ID first.');
      return;
    }
    var key = ractive.get('encryptionKey') || generateKey();
    ractive.set('encryptionKey', key);
    ractive.set('encryptError', '');
    ractive.set('encryptBusy', true);
    var dens = collectDens(ractive, v);
    var paramsObj = buildParamsObject(v.pack.id, ractive.get('packName'), dens.ids, dens.nums);
    encryptWithKey(key, paramsObj).then(function (file) {
      ractive.set('encryptedFile', JSON.stringify(file));
      ractive.set('encryptedUrl', siteBase() + '?id=' + encodeURIComponent(fileId) + '#k=' + key);
      ractive.set('encryptBusy', false);
    }).catch(function (err) {
      ractive.set('encryptError', 'Encryption failed: ' + err.message);
      ractive.set('encryptBusy', false);
    });
  });

  ractive.on('copyEncFile', function () {
    copyFromButton(ractive.get('encryptedFile'), 'copy-enc-file-btn');
  });

  ractive.on('downloadEncFile', function () {
    var content = ractive.get('encryptedFile');
    if (!content) return;
    var fileId = (ractive.get('fileId') || 'data').trim() || 'data';
    var url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = fileId + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  ractive.on('copyEncUrl', function () {
    copyFromButton(ractive.get('encryptedUrl'), 'copy-enc-url-btn');
  });
});
