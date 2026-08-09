function buildMainUrl(data) {
  var base = window.location.origin +
    window.location.pathname.replace(/\/generate\/?.*$/, '/');
  var params = new URLSearchParams();
  if (data.packName)   params.set('packName', data.packName);
  if (data.packUrl)    params.set('pack',     data.packUrl);
  if (data.lionUrl)    params.set('lion',     data.lionUrl);
  if (data.tigerUrl)   params.set('tiger',    data.tigerUrl);
  if (data.wolfUrl)    params.set('wolf',     data.wolfUrl);
  if (data.bearUrl)    params.set('bear',     data.bearUrl);
  if (data.webelosUrl) params.set('webelos',  data.webelosUrl);
  if (data.aolUrl)     params.set('aol',      data.aolUrl);
  return base + '?' + params.toString();
}

window.addEventListener('DOMContentLoaded', function () {
  var ractive = new Ractive({
    target: '#app',
    template: '#generator-template',
    data: {
      packName:   '',
      packUrl:    '',
      lionUrl:    '',
      tigerUrl:   '',
      wolfUrl:    '',
      bearUrl:    '',
      webelosUrl: '',
      aolUrl:     '',
    },
    computed: {
      hasOutput: function () {
        return !!(this.get('packUrl') || this.get('lionUrl') || this.get('tigerUrl') ||
          this.get('wolfUrl') || this.get('bearUrl') || this.get('webelosUrl') || this.get('aolUrl'));
      },
      generatedUrl: function () {
        return buildMainUrl({
          packName:   this.get('packName'),
          packUrl:    this.get('packUrl'),
          lionUrl:    this.get('lionUrl'),
          tigerUrl:   this.get('tigerUrl'),
          wolfUrl:    this.get('wolfUrl'),
          bearUrl:    this.get('bearUrl'),
          webelosUrl: this.get('webelosUrl'),
          aolUrl:     this.get('aolUrl'),
        });
      },
      qrUrl: function () {
        return 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=' +
          encodeURIComponent(this.get('generatedUrl'));
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
