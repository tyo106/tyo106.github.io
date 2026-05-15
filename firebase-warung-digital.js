// ============================================================
// firebase-warung-digital.js
// Salin seluruh file ini ke repo GitHub kamu
// Letakkan di root folder, misal: firebase-warung-digital.js
// Lalu tambahkan <script type="module" src="firebase-warung-digital.js"></script>
// di bagian bawah <body> pada index.html kamu
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ============================================================
// 1. KONFIGURASI FIREBASE
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyA6gNuDN01l0V6Q6iXNM-3otPZiygTMNNw",
  authDomain: "warung-digital-8fb7b.firebaseapp.com",
  projectId: "warung-digital-8fb7b",
  storageBucket: "warung-digital-8fb7b.firebasestorage.app",
  messagingSenderId: "280805109617",
  appId: "1:280805109617:web:74adc9dc0e7501453e50d0",
  measurementId: "G-V4M9Z5NZFL",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Ekspor agar bisa dipakai di file lain
window.db = db;
window.auth = auth;

// ============================================================
// 2. AUTENTIKASI
// ============================================================

/** Login dengan Google */
export async function loginGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    // Simpan profil user ke Firestore jika belum ada
    await setDoc(doc(db, "users", user.uid), {
      nama: user.displayName,
      email: user.email,
      foto: user.photoURL,
      role: "Pemilik", // default role
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log("Login berhasil:", user.displayName);
    return user;
  } catch (error) {
    console.error("Login gagal:", error);
    throw error;
  }
}

/** Logout */
export async function logout() {
  await signOut(auth);
  window.location.reload();
}

/** Cek status login, jalankan callback saat berubah */
export function cekLogin(callback) {
  onAuthStateChanged(auth, callback);
}

// ============================================================
// 3. MIGRASI DATA localStorage → FIRESTORE
// ============================================================

/**
 * Jalankan fungsi ini SEKALI saja untuk memindahkan
 * semua data lama dari localStorage ke Firestore.
 * Setelah selesai, localStorage lama bisa dihapus.
 */
export async function migrasiDariLocalStorage() {
  const uid = auth.currentUser?.uid;
  if (!uid) { alert("Login dulu sebelum migrasi!"); return; }

  const keys = ["transaksi", "stokBarang", "kasbon", "produk", "barang"];
  let totalMigrasi = 0;

  for (const key of keys) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const data = JSON.parse(raw);
      const arr = Array.isArray(data) ? data : [data];
      for (const item of arr) {
        await addDoc(collection(db, key), {
          ...item,
          userId: uid,
          migrasiDari: "localStorage",
          createdAt: serverTimestamp(),
        });
        totalMigrasi++;
      }
      console.log(`✅ Migrasi ${key}: ${arr.length} data`);
    } catch (e) {
      console.warn(`Gagal migrasi ${key}:`, e);
    }
  }

  alert(`Migrasi selesai! ${totalMigrasi} data berhasil dipindahkan ke Firebase.`);
}

// ============================================================
// 4. TRANSAKSI
// ============================================================

/** Tambah transaksi baru */
export async function tambahTransaksi(dataTransaksi) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Belum login");
  return await addDoc(collection(db, "transaksi"), {
    ...dataTransaksi,
    userId: uid,
    createdAt: serverTimestamp(),
  });
}

/** Ambil semua transaksi milik user */
export async function getTransaksi() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const q = query(
    collection(db, "transaksi"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Hapus transaksi */
export async function hapusTransaksi(id) {
  await deleteDoc(doc(db, "transaksi", id));
}

/** Dengarkan transaksi secara realtime */
export function listenTransaksi(callback) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const q = query(
    collection(db, "transaksi"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(data);
  });
}

// ============================================================
// 5. STOK BARANG
// ============================================================

/** Tambah barang baru */
export async function tambahBarang(dataBarang) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Belum login");
  return await addDoc(collection(db, "stokBarang"), {
    ...dataBarang,
    userId: uid,
    createdAt: serverTimestamp(),
  });
}

/** Ambil semua stok */
export async function getStok() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const q = query(collection(db, "stokBarang"), where("userId", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Update stok barang */
export async function updateStok(id, dataUpdate) {
  await updateDoc(doc(db, "stokBarang", id), {
    ...dataUpdate,
    updatedAt: serverTimestamp(),
  });
}

/** Hapus barang */
export async function hapusBarang(id) {
  await deleteDoc(doc(db, "stokBarang", id));
}

/** Dengarkan stok secara realtime */
export function listenStok(callback) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const q = query(collection(db, "stokBarang"), where("userId", "==", uid));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(data);
  });
}

// ============================================================
// 6. KASBON / PIUTANG
// ============================================================

/** Tambah kasbon baru */
export async function tambahKasbon(dataKasbon) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Belum login");
  return await addDoc(collection(db, "kasbon"), {
    ...dataKasbon,
    lunas: false,
    userId: uid,
    createdAt: serverTimestamp(),
  });
}

/** Ambil semua kasbon */
export async function getKasbon() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  const q = query(
    collection(db, "kasbon"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Tandai kasbon sebagai lunas */
export async function lunasKasbon(id) {
  await updateDoc(doc(db, "kasbon", id), {
    lunas: true,
    tanggalLunas: serverTimestamp(),
  });
}

/** Hapus kasbon */
export async function hapusKasbon(id) {
  await deleteDoc(doc(db, "kasbon", id));
}

/** Dengarkan kasbon realtime */
export function listenKasbon(callback) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const q = query(
    collection(db, "kasbon"),
    where("userId", "==", uid),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(data);
  });
}

// ============================================================
// 7. LAPORAN / RINGKASAN
// ============================================================

/** Hitung total pendapatan dari semua transaksi */
export async function getRingkasan() {
  const transaksi = await getTransaksi();
  const kasbon = await getKasbon();

  const totalPendapatan = transaksi.reduce((sum, t) => sum + (t.total || 0), 0);
  const totalKasbon = kasbon
    .filter((k) => !k.lunas)
    .reduce((sum, k) => sum + (k.jumlah || 0), 0);

  return {
    totalPendapatan,
    totalKasbon,
    jumlahTransaksi: transaksi.length,
    jumlahKasbonBelumLunas: kasbon.filter((k) => !k.lunas).length,
  };
}

// ============================================================
// 8. INISIALISASI OTOMATIS
// ============================================================
// Saat halaman dimuat, cek status login dan pasang fungsi ke window
// agar bisa dipanggil dari HTML biasa (bukan module)

window.warungDB = {
  loginGoogle,
  logout,
  cekLogin,
  migrasiDariLocalStorage,
  tambahTransaksi,
  getTransaksi,
  hapusTransaksi,
  listenTransaksi,
  tambahBarang,
  getStok,
  updateStok,
  hapusBarang,
  listenStok,
  tambahKasbon,
  getKasbon,
  lunasKasbon,
  hapusKasbon,
  listenKasbon,
  getRingkasan,
};

console.log("✅ Firebase Warung Digital siap digunakan!");
console.log("💡 Gunakan window.warungDB untuk akses semua fungsi");
