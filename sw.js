/* Stroke Sense — service worker
   Menyimpan "cangkang" aplikasi (HTML, ikon, manifest) agar bisa dibuka cepat
   dan tetap tampil saat sinyal lemah.

   Catatan: model MediaPipe (WASM + file .task) diambil dari CDN Google dan
   TIDAK ikut disimpan di sini karena ukurannya besar dan lintas-domain.
   Jadi saat pertama kali membuka aplikasi, HP tetap perlu koneksi internet.
   Setelah itu, browser biasanya menyimpan sendiri berkas CDN tersebut. */

const CACHE = 'stroke-sense-v2';

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

// Simpan cangkang aplikasi saat service worker dipasang
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('Gagal menyimpan cangkang aplikasi:', err))
  );
});

// Bersihkan cache versi lama saat ada pembaruan
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Hanya tangani permintaan GET dari domain sendiri.
  // Permintaan ke CDN (model MediaPipe) dibiarkan langsung ke jaringan.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // Halaman utama: utamakan jaringan agar pembaruan kode cepat terpakai,
  // jatuh ke cache bila sedang offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Berkas pendukung: utamakan cache agar hemat kuota dan cepat.
  event.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});
