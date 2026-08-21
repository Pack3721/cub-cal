// AES-256-GCM helpers for the encrypted-file link mode.
//
// The key is generated entirely client-side and never sent anywhere: the
// generator page puts it in the URL fragment (after '#'), which browsers
// never include in HTTP requests, so it never reaches the server hosting
// the encrypted JSON file — only whoever holds the full link can decrypt it.

function toBase64Url(bytes) {
  var bin = '';
  bytes.forEach(function (b) { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  var bin = atob(str);
  var bytes = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// A fresh base64url-encoded AES-256 key, for the generator to keep (so it
// can re-encrypt updates with the same key) or the user to copy elsewhere.
export function generateKey() {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

// Encrypts a JSON-serializable value with a given base64url key (from
// generateKey, or one the user pasted back in). Returns the file contents
// to save: iv + ciphertext, both base64url.
export async function encryptWithKey(keyBase64, value) {
  var key = await crypto.subtle.importKey('raw', fromBase64Url(keyBase64), { name: 'AES-GCM' }, false, ['encrypt']);
  var iv = crypto.getRandomValues(new Uint8Array(12));
  var plaintext = new TextEncoder().encode(JSON.stringify(value));
  var ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, plaintext);
  return { iv: toBase64Url(iv), ct: toBase64Url(new Uint8Array(ciphertext)) };
}

// Reverses encryptWithKey: base64url key + { iv, ct } -> the original value.
export async function decryptJson(keyBase64, file) {
  var key = await crypto.subtle.importKey('raw', fromBase64Url(keyBase64), { name: 'AES-GCM' }, false, ['decrypt']);
  var plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64Url(file.iv) },
    key,
    fromBase64Url(file.ct)
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}
