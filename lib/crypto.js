const ENCRYPTION_KEY = 'foundators-secure-2024';

function getKey() {
  return new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const data = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  );
  const hashArray = new Uint8Array(hash);
  const saltArray = new Uint8Array(salt);
  const combined = new Uint8Array(saltArray.length + hashArray.length);
  combined.set(saltArray);
  combined.set(hashArray, saltArray.length);
  return btoa(String.fromCharCode(...combined));
}

export async function verifyPassword(password, stored) {
  const combined = new Uint8Array(atob(stored).split('').map(c => c.charCodeAt(0)));
  const salt = combined.slice(0, 16);
  const data = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits']);
  const hash = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256
  });
  const newHash = new Uint8Array(hash);
  const storedHash = combined.slice(16);
  if (newHash.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < newHash.length; i++) diff |= newHash[i] ^ storedHash[i];
  return diff === 0;
}

export async function encryptData(data) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', getKey(), { name: 'AES-GCM' }, false, ['encrypt']);
  const encoded = new TextEncoder().encode(JSON.stringify(data));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptData(ciphertext) {
  try {
    const combined = new Uint8Array(atob(ciphertext).split('').map(c => c.charCodeAt(0)));
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    const key = await crypto.subtle.importKey('raw', getKey(), { name: 'AES-GCM' }, false, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch {
    return null;
  }
}
