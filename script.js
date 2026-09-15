// ═══════════════════════════════════════════════════════
//  FIREBASE INIT
// ═══════════════════════════════════════════════════════
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBhImSZoiZAwGHll_QcBgTls-sjmpmg1S8",
  authDomain: "kakashi-171e5.firebaseapp.com",
  projectId: "kakashi-171e5",
  storageBucket: "kakashi-171e5.firebasestorage.app",
  messagingSenderId: "130432668952",
  appId: "1:130432668952:web:7d1a67f4fa0a88ce21ba6d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// ═══════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════
const EMOJIS = ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤧","🥵","🥶","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👻","🤖","💋","❤️","🧡","💛","💚","💙","💜","🖤","💔","❤️‍🔥","🌸","🌺","🌹","🌻","🌼","🌷","🍀","🔥","✨","⭐","🌟","💫","💥","🎉","🎊","🎈","🎁","🏆","🥇","🎯","👍","👎","👏","🙌","🤝","🤞","✌️","🤙","👋","✋","🙏","💪","🦋","🌈","🎵","🎮","💻","📱","🍕","🍔","🍜","☕","🧋","🎬","📚","✈️","🌍","⚽","🏀","🏊","🚀","🌙","☀️","🌊"];

const INTEREST_LABELS = {
  programming: "💻 Программирование",
  games: "🎮 Игры",
  music: "🎵 Музыка",
  movies: "🎬 Кино",
  sport: "⚽ Спорт",
  travel: "✈️ Путешествия",
  books: "📚 Книги",
  art: "🎨 Искусство",
  cooking: "🍕 Еда",
  fitness: "💪 Фитнес",
  photography: "📷 Фото",
  design: "🖌️ Дизайн"
};

// ═══════════════════════════════════════════════════════
//  STATE
// ═══════════════════════════════════════════════════════
let currentUser = null;
let myProfile = null;

let activeTab = "chats";
let activeConvId = null;
let activeConvPartner = null;

let unsubConversations = null;
let unsubMessages = null;
let unsubTyping = null;
let unsubOnline = null;
let unsubFriendReqs = null;
let unsubNotifications = null;

let datingProfiles = [];
let datingIndex = 0;
let currentDatingProfile = null;
let replyToMsg = null;
let typingTimeout = null;
let lastTypingSent = 0;

// ═══════════════════════════════════════════════════════
//  UTILITY
// ═══════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const $$ = s => document.querySelectorAll(s);

function showLoading() { $("loadingOverlay").classList.remove("hidden"); }
function hideLoading() { $("loadingOverlay").classList.add("hidden"); }

function showToast(msg, type = "", duration = 3000) {
  const el = document.createElement("div");
  el.className = "toast" + (type ? " " + type : "");
  el.textContent = msg;
  $("toastContainer").appendChild(el);
  setTimeout(() => {
    el.style.animation = "toast-out .25s ease forwards";
    setTimeout(() => el.remove(), 250);
  }, duration);
}

function escHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

function initials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function fmtTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < 604800000) return d.toLocaleDateString("ru-RU", { weekday: "short" });
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
}

function fmtFullTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
}

function avatarColor(uid) {
  const colors = ["#22c55e","#3b82f6","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#84cc16"];
  let h = 0;
  for (let i = 0; i < (uid || "x").length; i++) h = (h * 31 + (uid || "x").charCodeAt(i)) & 0xFFFFFF;
  return colors[h % colors.length];
}

function calcAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const b = new Date(birthDate);
  let age = today.getFullYear() - b.getFullYear();
  if (today.getMonth() < b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) age--;
  return age;
}

function debounce(fn, ms) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}

function showConfirm(title, text, onOk) {
  $("confirmTitle").textContent = title;
  $("confirmText").textContent = text;
  $("confirmModal").classList.remove("hidden");
  const ok = $("btnConfirmOk");
  const cancel = $("btnConfirmCancel");
  const cleanup = () => {
    $("confirmModal").classList.add("hidden");
    ok.removeEventListener("click", handleOk);
    cancel.removeEventListener("click", handleCancel);
  };
  const handleOk = () => { cleanup(); onOk(); };
  const handleCancel = () => cleanup();
  ok.addEventListener("click", handleOk);
  cancel.addEventListener("click", handleCancel);
}

// ═══════════════════════════════════════════════════════
//  AUTH SCREEN NAVIGATION
// ═══════════════════════════════════════════════════════
const screens = {
  welcome:     $("screenWelcome"),
  login:       $("screenLogin"),
  register:    $("screenRegister"),
  regProfile:  $("screenRegProfile"),
  regUsername: $("screenRegUsername"),
  forgot:      $("screenForgot")
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove("active"));
  screens[name].classList.add("active");
}

function showAuthWrapper() {
  $("authWrapper").style.display = "";
  $("appWrapper").classList.add("hidden");
  showScreen("welcome");
}

function showApp() {
  $("authWrapper").style.display = "none";
  $("appWrapper").classList.remove("hidden");
}

$("btnGoLogin").addEventListener("click", () => showScreen("login"));
$("btnGoRegister").addEventListener("click", () => showScreen("register"));
$("btnLoginBack").addEventListener("click", () => showScreen("welcome"));
$("btnRegisterBack").addEventListener("click", () => showScreen("welcome"));
$("btnRegProfileBack").addEventListener("click", () => showScreen("register"));
$("btnRegUsernameBack").addEventListener("click", () => showScreen("regProfile"));
$("btnForgotBack").addEventListener("click", () => showScreen("login"));
$("btnSwitchToRegister").addEventListener("click", () => showScreen("register"));
$("btnSwitchToLogin").addEventListener("click", () => showScreen("login"));
$("btnForgotPass").addEventListener("click", () => showScreen("forgot"));

function togglePassVis(inputId) {
  const inp = $(inputId);
  inp.type = inp.type === "password" ? "text" : "password";
}
$("btnToggleLoginPass").addEventListener("click", () => togglePassVis("loginPassword"));
$("btnToggleRegPass").addEventListener("click", () => togglePassVis("regPassword"));

// ═══════════════════════════════════════════════════════
//  LOGIN
// ═══════════════════════════════════════════════════════
$("btnLogin").addEventListener("click", async () => {
  const email = $("loginEmail").value.trim();
  const pass  = $("loginPassword").value;
  $("loginErr").textContent = "";
  if (!email || !pass) { $("loginErr").textContent = "Заполните все поля"; return; }
  showLoading();
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    $("loginErr").textContent = friendlyAuthError(e.code);
    hideLoading();
  }
});

async function googleSignIn() {
  showLoading();
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await ensureProfileExists(result.user);
  } catch (e) {
    $("loginErr").textContent = friendlyAuthError(e.code);
    hideLoading();
  }
}
$("btnGoogleLogin").addEventListener("click", googleSignIn);
$("btnGoogleRegister").addEventListener("click", googleSignIn);

$("btnForgotSubmit").addEventListener("click", async () => {
  const email = $("forgotEmail").value.trim();
  $("forgotErr").textContent = "";
  $("forgotSuccess").textContent = "";
  if (!email) { $("forgotErr").textContent = "Введите email"; return; }
  try {
    await sendPasswordResetEmail(auth, email);
    $("forgotSuccess").textContent = "Ссылка отправлена на " + email;
  } catch (e) {
    $("forgotErr").textContent = friendlyAuthError(e.code);
  }
});

function friendlyAuthError(code) {
  const map = {
    "auth/invalid-email": "Неверный формат email",
    "auth/user-not-found": "Пользователь не найден",
    "auth/wrong-password": "Неверный пароль",
    "auth/invalid-credential": "Неверный email или пароль",
    "auth/email-already-in-use": "Email уже используется",
    "auth/weak-password": "Пароль минимум 6 символов",
    "auth/too-many-requests": "Слишком много попыток. Попробуйте позже",
    "auth/popup-closed-by-user": "Окно авторизации закрыто",
    "auth/network-request-failed": "Ошибка сети"
  };
  return map[code] || "Произошла ошибка. Попробуйте снова";
}

// ═══════════════════════════════════════════════════════
//  REGISTRATION (3 steps)
// ═══════════════════════════════════════════════════════
let regData = {};

$("btnRegNext").addEventListener("click", () => {
  const email = $("regEmail").value.trim();
  const pass  = $("regPassword").value;
  $("regErr").textContent = "";
  if (!email) { $("regErr").textContent = "Введите email"; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $("regErr").textContent = "Неверный формат email"; return; }
  if (pass.length < 6) { $("regErr").textContent = "Пароль минимум 6 символов"; return; }
  regData.email = email;
  regData.password = pass;
  showScreen("regProfile");
});

$("btnRegProfileNext").addEventListener("click", () => {
  const name  = $("regName").value.trim();
  const birth = $("regBirth").value;
  const phone = $("regPhone").value.trim();
  $("regProfileErr").textContent = "";
  if (!name) { $("regProfileErr").textContent = "Введите имя"; return; }
  if (!birth) { $("regProfileErr").textContent = "Введите дату рождения"; return; }
  const age = calcAge(birth);
  if (age !== null && age < 13) { $("regProfileErr").textContent = "Минимальный возраст — 13 лет"; return; }
  regData.displayName = name;
  regData.birthDate = birth;
  regData.phone = phone;
  showScreen("regUsername");
});

let regUsernameOk = false;
let regUsernameTimer = null;
let regSelectedInterests = new Set();

$("regUsername").addEventListener("input", () => {
  const val = $("regUsername").value.trim().toLowerCase();
  $("regUsernameErr").textContent = "";
  regUsernameOk = false;
  clearTimeout(regUsernameTimer);
  const hint = $("usernameHint");
  if (!val) { hint.textContent = ""; return; }
  if (!/^[a-z0-9_]{3,30}$/.test(val)) {
    hint.className = "username-hint err";
    hint.textContent = "3–30 символов, только a-z, 0-9, _";
    return;
  }
  hint.className = "username-hint checking";
  hint.textContent = "Проверяем…";
  regUsernameTimer = setTimeout(async () => {
    const snap = await getDoc(doc(db, "usernames", val));
    if (snap.exists()) {
      hint.className = "username-hint err";
      hint.textContent = "@" + val + " уже занят";
    } else {
      hint.className = "username-hint ok";
      hint.textContent = "@" + val + " — доступен ✓";
      regUsernameOk = true;
    }
  }, 500);
});

$$(".auth-screen #interestsPicker .interest-tag").forEach(btn => {
  btn.addEventListener("click", () => {
    const v = btn.dataset.interest;
    if (regSelectedInterests.has(v)) { regSelectedInterests.delete(v); btn.classList.remove("selected"); }
    else { regSelectedInterests.add(v); btn.classList.add("selected"); }
  });
});

$("btnRegFinish").addEventListener("click", async () => {
  const username = $("regUsername").value.trim().toLowerCase();
  const city     = $("regCity").value.trim();
  $("regUsernameErr").textContent = "";
  if (!username) { $("regUsernameErr").textContent = "Введите username"; return; }
  if (!regUsernameOk) { $("regUsernameErr").textContent = "Проверьте доступность username"; return; }
  regData.username = username;
  regData.city = city;
  regData.interests = Array.from(regSelectedInterests);
  showLoading();
  try {
    const cred = await createUserWithEmailAndPassword(auth, regData.email, regData.password);
    await updateProfile(cred.user, { displayName: regData.displayName });
    await createUserProfile(cred.user, regData);
  } catch (e) {
    $("regUsernameErr").textContent = friendlyAuthError(e.code);
    hideLoading();
  }
});

// ═══════════════════════════════════════════════════════
//  FIRESTORE PROFILE
// ═══════════════════════════════════════════════════════
async function createUserProfile(user, data) {
  const uid = user.uid;
  await setDoc(doc(db, "users", uid), {
    uid,
    displayName: data.displayName || user.displayName || "Пользователь",
    username: data.username || null,
    photoURL: user.photoURL || null,
    bio: "",
    city: data.city || "",
    interests: data.interests || [],
    birthDate: data.birthDate || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isOnline: false,
    lastSeen: serverTimestamp(),
    privacyMessages: "everyone",
    privacyOnline: "everyone",
    privacyFriendReq: "everyone",
    privacyDating: "yes"
  });
  await setDoc(doc(db, "privateUsers", uid), {
    uid,
    phone: data.phone || "",
    email: user.email || "",
    birthDate: data.birthDate || null,
    createdAt: serverTimestamp()
  });
  if (data.username) {
    await setDoc(doc(db, "usernames", data.username), { uid, createdAt: serverTimestamp() });
  }
}

async function ensureProfileExists(user) {
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) {
    await createUserProfile(user, {
      displayName: user.displayName || "Пользователь",
      username: null, birthDate: null, city: "", interests: [], phone: ""
    });
  }
}

async function loadMyProfile() {
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  myProfile = snap.exists() ? { id: snap.id, ...snap.data() } : {
    uid: currentUser.uid,
    displayName: currentUser.displayName || "Пользователь",
    username: null, photoURL: currentUser.photoURL || null,
    bio: "", city: "", interests: [], birthDate: null
  };
}

// ═══════════════════════════════════════════════════════
//  AUTH STATE
// ═══════════════════════════════════════════════════════
onAuthStateChanged(auth, async user => {
  if (user) {
    currentUser = user;
    showLoading();
    await loadMyProfile();
    hideLoading();
    initApp();
  } else {
    currentUser = null;
    myProfile = null;
    teardownListeners();
    showAuthWrapper();
    hideLoading();
  }
});

// ═══════════════════════════════════════════════════════
//  PRESENCE
// ═══════════════════════════════════════════════════════
async function setOnlineStatus(online) {
  if (!currentUser) return;
  try {
    await updateDoc(doc(db, "users", currentUser.uid), { isOnline: online, lastSeen: serverTimestamp() });
  } catch (_) {}
}

function setupPresence() {
  document.addEventListener("visibilitychange", () => setOnlineStatus(!document.hidden));
  window.addEventListener("beforeunload", () => setOnlineStatus(false));
}

// ═══════════════════════════════════════════════════════
//  INIT APP
// ═══════════════════════════════════════════════════════
function initApp() {
  showApp();
  renderMyProfile();
  setupNavigation();
  setupConvoUI();
  setupEmojiPicker();
  setupSearch();
  setupFriends();
  setupDating();
  setupNotificationsTab();
  setupSettings();
  subscribeConversations();
  subscribeFriendRequests();
  subscribeNotificationsLive();
  setOnlineStatus(true);
  setupPresence();
  switchTab("chats");
}

function teardownListeners() {
  [unsubConversations, unsubMessages, unsubTyping, unsubOnline, unsubFriendReqs, unsubNotifications].forEach(u => u && u());
  unsubConversations = unsubMessages = unsubTyping = unsubOnline = unsubFriendReqs = unsubNotifications = null;
}

// ═══════════════════════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════════════════════
function setupNavigation() {
  $$(".nav-item[data-tab]").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
  $$(".bnav-item[data-tab]").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
  $("sidebarAvatar").addEventListener("click", () => switchTab("profile"));
}

function switchTab(tab) {
  activeTab = tab;
  $$(".nav-item[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $$(".bnav-item[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $$(".tab-panel").forEach(p => p.classList.remove("active"));
  const map = {
    chats: "tabChats", friends: "tabFriends", dating: "tabDating",
    search: "tabSearch", notifications: "tabNotifications",
    profile: "tabProfile", settings: "tabSettings"
  };
  if (map[tab]) $(map[tab]).classList.add("active");
  if (tab === "dating") loadDatingProfiles();
  if (tab === "notifications") markNotificationsRead();
  if (tab === "search") { $("searchInput").value = ""; $("searchResults").innerHTML = ""; renderSearchEmpty(); }
  if (tab === "profile") renderMyProfile();
  if (tab === "friends") loadFriendsList();
}

// ═══════════════════════════════════════════════════════
//  MY PROFILE RENDER
// ═══════════════════════════════════════════════════════
function renderMyProfile() {
  if (!myProfile) return;
  const color = avatarColor(myProfile.uid);
  const photo = myProfile.photoURL || currentUser?.photoURL || null;

  // Sidebar avatar
  const sa = $("sidebarAvatar");
  if (photo) {
    sa.style.backgroundImage = `url(${photo})`;
    sa.style.backgroundSize = "cover";
    sa.style.backgroundPosition = "center";
    sa.style.background = "transparent";
    $("sidebarInitials").textContent = "";
  } else {
    sa.style.backgroundImage = "";
    sa.style.background = color;
    $("sidebarInitials").textContent = initials(myProfile.displayName);
  }

  // Profile tab
  $("myProfileName").textContent = myProfile.displayName || "—";
  $("myProfileUsername").textContent = myProfile.username ? "@" + myProfile.username : "";

  // Profile avatar
  const profileAv = $("myProfileAvatar");
  if (photo) {
    profileAv.style.backgroundImage = `url(${photo})`;
    profileAv.style.backgroundSize = "cover";
    profileAv.style.backgroundPosition = "center";
    profileAv.style.background = "transparent";
    $("myProfileInitials").textContent = "";
  } else {
    profileAv.style.backgroundImage = "";
    profileAv.style.background = color;
    $("myProfileInitials").textContent = initials(myProfile.displayName);
  }
  const metaParts = [];
  if (myProfile.city) metaParts.push("📍 " + myProfile.city);
  if (myProfile.birthDate) { const age = calcAge(myProfile.birthDate); if (age) metaParts.push(age + " лет"); }
  $("myProfileMeta").textContent = metaParts.join("  ");
  $("myProfileBio").textContent = myProfile.bio || "";
  renderInterestTags($("myProfileInterests"), myProfile.interests || []);
}

function renderInterestTags(container, interests) {
  container.innerHTML = (interests || []).map(k =>
    `<span class="profile-interest">${escHtml(INTEREST_LABELS[k] || k)}</span>`
  ).join("");
}

// ── Edit Profile ──────────────────────────────────────
let editSelectedInterests = new Set();
let editUsernameOk = true;
let editUsernameTimer = null;

$("btnEditProfile").addEventListener("click", openEditProfileModal);
$("btnSettingsEditProfile").addEventListener("click", openEditProfileModal);

function openEditProfileModal() {
  if (!myProfile) return;
  $("editName").value = myProfile.displayName || "";
  $("editUsername").value = myProfile.username || "";
  $("editCity").value = myProfile.city || "";
  $("editBio").value = myProfile.bio || "";
  editSelectedInterests = new Set(myProfile.interests || []);
  $$(".modal-box #editInterestsPicker .interest-tag").forEach(btn => {
    btn.classList.toggle("selected", editSelectedInterests.has(btn.dataset.interest));
  });
  $("editUsernameHint").textContent = "";
  $("editProfileErr").textContent = "";
  editUsernameOk = true;
  $("editProfileModal").classList.remove("hidden");
}

$("editProfileModal").addEventListener("click", e => { if (e.target === $("editProfileModal")) $("editProfileModal").classList.add("hidden"); });
$("btnCloseEditProfile").addEventListener("click", () => $("editProfileModal").classList.add("hidden"));

$$(".modal-box #editInterestsPicker .interest-tag").forEach(btn => {
  btn.addEventListener("click", () => {
    const v = btn.dataset.interest;
    if (editSelectedInterests.has(v)) { editSelectedInterests.delete(v); btn.classList.remove("selected"); }
    else { editSelectedInterests.add(v); btn.classList.add("selected"); }
  });
});

$("editUsername").addEventListener("input", () => {
  const val = $("editUsername").value.trim().toLowerCase();
  clearTimeout(editUsernameTimer);
  const hint = $("editUsernameHint");
  if (!val || val === myProfile?.username) { editUsernameOk = !!val; hint.textContent = ""; return; }
  if (!/^[a-z0-9_]{3,30}$/.test(val)) {
    hint.className = "username-hint err";
    hint.textContent = "3–30 символов, только a-z, 0-9, _";
    editUsernameOk = false; return;
  }
  hint.className = "username-hint checking";
  hint.textContent = "Проверяем…";
  editUsernameTimer = setTimeout(async () => {
    const snap = await getDoc(doc(db, "usernames", val));
    if (snap.exists() && snap.data().uid !== currentUser.uid) {
      hint.className = "username-hint err";
      hint.textContent = "@" + val + " уже занят";
      editUsernameOk = false;
    } else {
      hint.className = "username-hint ok";
      hint.textContent = "@" + val + " ✓";
      editUsernameOk = true;
    }
  }, 500);
});

$("btnSaveProfile").addEventListener("click", async () => {
  const name     = $("editName").value.trim();
  const username = $("editUsername").value.trim().toLowerCase();
  const city     = $("editCity").value.trim();
  const bio      = $("editBio").value.trim();
  $("editProfileErr").textContent = "";
  if (!name) { $("editProfileErr").textContent = "Введите имя"; return; }
  if (!username) { $("editProfileErr").textContent = "Введите username"; return; }
  if (!editUsernameOk && username !== myProfile?.username) { $("editProfileErr").textContent = "Выберите доступный username"; return; }
  showLoading();
  try {
    const oldUsername = myProfile?.username;
    const updates = { displayName: name, username, city, bio, interests: Array.from(editSelectedInterests), updatedAt: serverTimestamp() };
    await updateDoc(doc(db, "users", currentUser.uid), updates);
    if (username !== oldUsername) {
      if (oldUsername) await deleteDoc(doc(db, "usernames", oldUsername));
      await setDoc(doc(db, "usernames", username), { uid: currentUser.uid, createdAt: serverTimestamp() });
    }
    Object.assign(myProfile, updates);
    renderMyProfile();
    $("editProfileModal").classList.add("hidden");
    showToast("Профиль обновлён", "success");
  } catch (e) {
    $("editProfileErr").textContent = "Ошибка сохранения";
  } finally { hideLoading(); }
});

// ═══════════════════════════════════════════════════════
//  CONVERSATIONS
// ═══════════════════════════════════════════════════════
function subscribeConversations() {
  if (unsubConversations) unsubConversations();
  const q = query(
    collection(db, "conversations"),
    where("participantIds", "array-contains", currentUser.uid)
  );
  unsubConversations = onSnapshot(q, snapshot => {
    const docs = snapshot.docs.sort((a, b) => {
      const ta = a.data().lastMessageAt?.seconds || 0;
      const tb = b.data().lastMessageAt?.seconds || 0;
      return tb - ta;
    });
    renderChatList(docs);
    updateChatsBadge(docs);
  }, err => console.error("Conversations:", err));
}

function updateChatsBadge(docs) {
  let total = 0;
  docs.forEach(d => { total += (d.data().unreadCount?.[currentUser.uid] || 0); });
  [$("badgeChats"), $("bnavBadgeChats")].forEach(b => {
    if (!b) return;
    if (total > 0) { b.textContent = total > 99 ? "99+" : String(total); b.classList.remove("hidden"); }
    else b.classList.add("hidden");
  });
}

async function renderChatList(docs) {
  const list = $("chatList");
  if (docs.length === 0) {
    list.innerHTML = `<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p class="empty-title">Нет сообщений</p><p class="empty-sub">Найдите новых людей во вкладке «Найти» или «Знакомства»</p></div>`;
    return;
  }
  const items = await Promise.all(docs.map(async d => {
    const data = d.data();
    const partnerId = (data.participantIds || []).find(id => id !== currentUser.uid);
    let partner = null;
    if (partnerId) {
      const snap = await getDoc(doc(db, "users", partnerId));
      if (snap.exists()) partner = { id: snap.id, ...snap.data() };
    }
    return { id: d.id, data, partner };
  }));
  list.innerHTML = "";
  items.forEach(({ id, data, partner }) => {
    if (!partner) return;
    const unread = data.unreadCount?.[currentUser.uid] || 0;
    const color = avatarColor(partner.uid || partner.id);
    const isActive = id === activeConvId;
    const item = document.createElement("div");
    item.className = "chat-item" + (isActive ? " active" : "");
    item.dataset.convId = id;
    item.innerHTML = `
      <div class="chat-item-avatar" style="background:${color}">
        ${escHtml(initials(partner.displayName))}
        ${partner.isOnline ? '<div class="online-indicator"></div>' : ""}
      </div>
      <div class="chat-item-body">
        <div class="chat-item-top">
          <span class="chat-item-name">${escHtml(partner.displayName)}</span>
          <span class="chat-item-time">${fmtTime(data.lastMessageAt)}</span>
        </div>
        <div class="chat-item-bot">
          <span class="chat-item-preview">${escHtml(data.lastMessage || "Нет сообщений")}</span>
          ${unread > 0 ? `<span class="chat-item-badge">${unread}</span>` : ""}
        </div>
      </div>`;
    item.addEventListener("click", () => openConversation(id, partner));
    list.appendChild(item);
  });
}

// ── Open conversation ─────────────────────────────────
function openConversation(convId, partner) {
  activeConvId = convId;
  activeConvPartner = partner;
  $$(".chat-item").forEach(i => i.classList.toggle("active", i.dataset.convId === convId));
  const color = avatarColor(partner.uid || partner.id);
  $("convoAvatar").style.background = color;
  $("convoAvatarInitials").textContent = initials(partner.displayName);
  $("convoName").textContent = partner.displayName;
  updateConvoStatus(partner);
  $("chatsSplit").classList.add("convo-open");
  $("convoPanel").classList.remove("hidden");
  replyToMsg = null;
  $("replyPreview").classList.add("hidden");
  $("convoMenuDropdown").classList.add("hidden");
  subscribeMessages(convId);
  subscribePartnerOnline(partner.uid || partner.id);
  markConvoRead(convId);
  subscribeTyping(convId);
}

function updateConvoStatus(partner) {
  const dot = $("convoOnlineDot");
  const txt = $("convoStatusText");
  if (partner.isOnline) { dot.classList.add("online"); txt.textContent = "в сети"; }
  else { dot.classList.remove("online"); txt.textContent = partner.lastSeen ? "был " + fmtTime(partner.lastSeen) : "не в сети"; }
}

function subscribePartnerOnline(uid) {
  if (unsubOnline) unsubOnline();
  unsubOnline = onSnapshot(doc(db, "users", uid), snap => {
    if (snap.exists() && activeConvPartner) {
      const d = snap.data();
      activeConvPartner = { ...activeConvPartner, ...d };
      updateConvoStatus(d);
    }
  });
}

function closeConversation() {
  activeConvId = null;
  activeConvPartner = null;
  $("chatsSplit").classList.remove("convo-open");
  if (unsubMessages) { unsubMessages(); unsubMessages = null; }
  if (unsubTyping)   { unsubTyping(); unsubTyping = null; }
  if (unsubOnline)   { unsubOnline(); unsubOnline = null; }
  $$(".chat-item").forEach(i => i.classList.remove("active"));
}

$("btnConvoBack").addEventListener("click", closeConversation);

async function markConvoRead(convId) {
  try {
    await updateDoc(doc(db, "conversations", convId), { [`unreadCount.${currentUser.uid}`]: 0 });
  } catch (_) {}
}

// Convo menu
$("btnConvoMenu").addEventListener("click", e => {
  e.stopPropagation();
  $("convoMenuDropdown").classList.toggle("hidden");
});
document.addEventListener("click", () => $("convoMenuDropdown").classList.add("hidden"));

$("btnDeleteChat").addEventListener("click", () => {
  $("convoMenuDropdown").classList.add("hidden");
  showConfirm("Удалить чат?", "Вся переписка будет удалена. Это действие необратимо.", async () => {
    if (!activeConvId) return;
    await deleteDoc(doc(db, "conversations", activeConvId));
    closeConversation();
    showToast("Чат удалён");
  });
});

$("btnBlockFromChat").addEventListener("click", () => {
  $("convoMenuDropdown").classList.add("hidden");
  if (activeConvPartner) blockUser(activeConvPartner.uid || activeConvPartner.id, activeConvPartner.displayName);
});

// ── Get/create conversation ───────────────────────────
async function getOrCreateConversation(partnerId) {
  const q = query(collection(db, "conversations"), where("participantIds", "array-contains", currentUser.uid));
  const snap = await getDocs(q);
  for (const d of snap.docs) {
    const data = d.data();
    if (data.participantIds.includes(partnerId) && data.type !== "group") return d.id;
  }
  const ref = await addDoc(collection(db, "conversations"), {
    participantIds: [currentUser.uid, partnerId],
    type: "direct",
    createdAt: serverTimestamp(),
    lastMessage: "",
    lastMessageAt: serverTimestamp(),
    unreadCount: { [currentUser.uid]: 0, [partnerId]: 0 }
  });
  return ref.id;
}

async function openConversationWith(partnerId) {
  if (!partnerId || partnerId === currentUser.uid) return;
  showLoading();
  try {
    const partnerSnap = await getDoc(doc(db, "users", partnerId));
    if (!partnerSnap.exists()) { showToast("Пользователь не найден", "error"); return; }
    const partner = { id: partnerSnap.id, ...partnerSnap.data() };
    const convId = await getOrCreateConversation(partnerId);
    closeUserProfileModal();
    switchTab("chats");
    setTimeout(() => openConversation(convId, partner), 200);
  } catch (e) { console.error(e); showToast("Ошибка открытия чата", "error"); }
  finally { hideLoading(); }
}

// Chat list search
$("btnNewChatSearch").addEventListener("click", () => {
  $("chatSearchBar").classList.toggle("hidden");
  if (!$("chatSearchBar").classList.contains("hidden")) $("chatSearchInput").focus();
});
$("chatSearchInput").addEventListener("input", debounce(e => {
  const q = e.target.value.trim().toLowerCase();
  $$(".chat-item").forEach(item => {
    const name = item.querySelector(".chat-item-name")?.textContent.toLowerCase() || "";
    item.style.display = name.includes(q) ? "" : "none";
  });
}, 200));

// ═══════════════════════════════════════════════════════
//  MESSAGES
// ═══════════════════════════════════════════════════════
function subscribeMessages(convId) {
  if (unsubMessages) unsubMessages();
  $("messagesArea").innerHTML = "";
  const q = query(collection(db, "conversations", convId, "messages"), orderBy("createdAt", "asc"), limit(200));
  unsubMessages = onSnapshot(q, snap => renderMessages(snap.docs, convId), err => {
    console.error("Messages:", err);
    showToast("Ошибка загрузки сообщений", "error");
  });
}

function renderMessages(docs, convId) {
  const area = $("messagesArea");
  area.innerHTML = "";
  if (docs.length === 0) {
    area.innerHTML = `<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><p class="empty-sub">Начните разговор</p></div>`;
    return;
  }
  let prevDate = null;
  let prevSender = null;
  docs.forEach((docSnap, idx) => {
    const data = docSnap.data();
    const isMine = data.senderId === currentUser.uid;
    const msgDate = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
    const dateStr = msgDate.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
    if (dateStr !== prevDate) {
      const sep = document.createElement("div");
      sep.className = "msg-date-sep";
      sep.textContent = dateStr;
      area.appendChild(sep);
      prevDate = dateStr;
    }
    const gap = prevSender !== data.senderId;
    prevSender = data.senderId;
    const row = document.createElement("div");
    row.className = "msg-row " + (isMine ? "mine" : "theirs") + (gap ? " gap" : "");
    row.dataset.msgId = docSnap.id;
    // Avatar for others
    const isLastInSeq = idx === docs.length - 1 || docs[idx + 1].data().senderId !== data.senderId;
    if (!isMine) {
      const av = document.createElement("div");
      av.className = "msg-avatar" + (isLastInSeq ? "" : " invisible");
      av.style.background = avatarColor(data.senderId);
      av.textContent = initials(data.senderName || "?");
      row.appendChild(av);
    }
    // Bubble
    const bubble = document.createElement("div");
    bubble.className = "msg-bubble";
    // Reply ref
    if (data.replyTo) {
      const ref = document.createElement("div");
      ref.className = "msg-reply-ref";
      ref.textContent = data.replyTo.text || "[вложение]";
      bubble.appendChild(ref);
    }
    // Content
    if (data.type === "image" && data.imageURL) {
      const img = document.createElement("img");
      img.className = "msg-image";
      img.src = data.imageURL;
      img.alt = "Фото";
      img.loading = "lazy";
      img.addEventListener("click", () => window.open(data.imageURL, "_blank"));
      bubble.appendChild(img);
    } else if (data.type === "file") {
      const a = document.createElement("a");
      a.href = data.fileURL || "#";
      a.target = "_blank";
      a.textContent = "📎 " + (data.fileName || "Файл");
      a.style.cssText = "text-decoration:underline;display:block";
      bubble.appendChild(a);
    } else {
      const t = document.createElement("span");
      t.textContent = data.text || "";
      bubble.appendChild(t);
    }
    // Meta
    const meta = document.createElement("div");
    meta.className = "msg-meta";
    const time = document.createElement("span");
    time.className = "msg-time";
    time.textContent = fmtFullTime(data.createdAt);
    meta.appendChild(time);
    if (isMine) {
      const st = document.createElement("span");
      st.className = "msg-status";
      st.textContent = data.read ? "✓✓" : "✓";
      meta.appendChild(st);
    }
    bubble.appendChild(meta);
    bubble.addEventListener("contextmenu", e => { e.preventDefault(); showMsgCtxMenu(e, docSnap.id, data, isMine); });
    row.appendChild(bubble);
    area.appendChild(row);
  });
  area.scrollTop = area.scrollHeight;
}

// Context menu
let ctxMenu = null;
function showMsgCtxMenu(e, msgId, data, isMine) {
  if (ctxMenu) ctxMenu.remove();
  const menu = document.createElement("div");
  menu.className = "msg-ctx-menu";
  ctxMenu = menu;
  const actions = [
    { html: "↩ Ответить", fn: () => setReply(msgId, data.text) },
    { html: "⎘ Копировать", fn: () => { navigator.clipboard?.writeText(data.text || ""); showToast("Скопировано"); } }
  ];
  if (isMine) actions.push({ html: "✕ Удалить", fn: () => deleteMsgFn(msgId), danger: true });
  actions.forEach(a => {
    const btn = document.createElement("button");
    btn.className = "msg-ctx-item" + (a.danger ? " danger" : "");
    btn.innerHTML = a.html;
    btn.addEventListener("click", () => { menu.remove(); ctxMenu = null; a.fn(); });
    menu.appendChild(btn);
  });
  document.body.appendChild(menu);
  const x = Math.min(e.clientX, window.innerWidth - 180);
  const y = Math.min(e.clientY, window.innerHeight - actions.length * 44 - 10);
  menu.style.cssText = `left:${x}px;top:${y}px`;
  setTimeout(() => document.addEventListener("click", () => { menu.remove(); ctxMenu = null; }, { once: true }), 50);
}

async function deleteMsgFn(msgId) {
  if (!activeConvId) return;
  try { await deleteDoc(doc(db, "conversations", activeConvId, "messages", msgId)); }
  catch (e) { showToast("Ошибка удаления", "error"); }
}

function setReply(msgId, text) {
  replyToMsg = { id: msgId, text };
  $("replyPreviewText").textContent = text || "[вложение]";
  $("replyPreview").classList.remove("hidden");
  $("msgInput").focus();
}

$("btnCancelReply").addEventListener("click", () => { replyToMsg = null; $("replyPreview").classList.add("hidden"); });

// ── Send Message ──────────────────────────────────────
function setupConvoUI() {
  const inp = $("msgInput");
  const btn = $("sendBtn");
  inp.addEventListener("input", () => { btn.disabled = !inp.value.trim(); sendTypingIndicator(); });
  $("msgForm").addEventListener("submit", async e => { e.preventDefault(); await sendTextMsg(); });
}

async function sendTextMsg() {
  const text = $("msgInput").value.trim();
  if (!text || !activeConvId) return;
  $("msgInput").value = "";
  $("sendBtn").disabled = true;
  const msg = {
    type: "text", text,
    senderId: currentUser.uid,
    senderName: myProfile?.displayName || "Пользователь",
    createdAt: serverTimestamp(), read: false
  };
  if (replyToMsg) { msg.replyTo = { id: replyToMsg.id, text: replyToMsg.text }; replyToMsg = null; $("replyPreview").classList.add("hidden"); }
  try {
    await addDoc(collection(db, "conversations", activeConvId, "messages"), msg);
    const pid = activeConvPartner?.uid || activeConvPartner?.id;
    await updateDoc(doc(db, "conversations", activeConvId), {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      [`unreadCount.${pid}`]: increment(1)
    });
  } catch (e) { console.error(e); showToast("Ошибка отправки", "error"); }
}

// Typing
async function sendTypingIndicator() {
  if (!activeConvId || !currentUser) return;
  const now = Date.now();
  if (now - lastTypingSent < 2000) return;
  lastTypingSent = now;
  try {
    await setDoc(doc(db, "typing", activeConvId + "_" + currentUser.uid), {
      userId: currentUser.uid, convId: activeConvId, updatedAt: serverTimestamp()
    });
  } catch (_) {}
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(async () => {
    try { await deleteDoc(doc(db, "typing", activeConvId + "_" + currentUser.uid)); } catch (_) {}
  }, 3000);
}

function subscribeTyping(convId) {
  if (unsubTyping) unsubTyping();
  if (!activeConvPartner) return;
  const pid = activeConvPartner.uid || activeConvPartner.id;
  unsubTyping = onSnapshot(doc(db, "typing", convId + "_" + pid), snap => {
    const ind = $("typingIndicator");
    if (snap.exists()) {
      const age = Date.now() - (snap.data().updatedAt?.seconds || 0) * 1000;
      if (age < 5000) { $("typingText").textContent = (activeConvPartner?.displayName || "Собеседник") + " печатает..."; ind.classList.remove("hidden"); return; }
    }
    ind.classList.add("hidden");
  });
}

// Attach
$("btnAttach").addEventListener("click", e => { e.stopPropagation(); $("attachMenu").classList.toggle("hidden"); $("emojiPicker").classList.add("hidden"); });
$("btnSendImage").addEventListener("click", () => { $("attachMenu").classList.add("hidden"); $("fileInput").accept = "image/*"; $("fileInput").click(); });
$("btnSendFile").addEventListener("click", () => { $("attachMenu").classList.add("hidden"); $("fileInput").accept = ".pdf,.doc,.docx,.txt,.zip"; $("fileInput").click(); });

$("fileInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  $("fileInput").value = "";
  if (!file || !activeConvId) return;
  if (file.size > 10 * 1024 * 1024) { showToast("Макс. 10MB", "error"); return; }
  const isImage = file.type.startsWith("image/");
  showLoading();
  try {
    const path = `chat/${activeConvId}/${Date.now()}_${file.name}`;
    await uploadBytes(storageRef(storage, path), file);
    const url = await getDownloadURL(storageRef(storage, path));
    const msg = { type: isImage ? "image" : "file", senderId: currentUser.uid, senderName: myProfile?.displayName || "Пользователь", createdAt: serverTimestamp(), read: false };
    if (isImage) msg.imageURL = url;
    else { msg.fileURL = url; msg.fileName = file.name; }
    await addDoc(collection(db, "conversations", activeConvId, "messages"), msg);
    const pid = activeConvPartner?.uid || activeConvPartner?.id;
    await updateDoc(doc(db, "conversations", activeConvId), { lastMessage: isImage ? "📷 Фото" : "📎 " + file.name, lastMessageAt: serverTimestamp(), [`unreadCount.${pid}`]: increment(1) });
  } catch (e) { console.error(e); showToast("Ошибка загрузки", "error"); }
  finally { hideLoading(); }
});

// Emoji
function setupEmojiPicker() {
  const grid = $("emojiGrid");
  EMOJIS.forEach(em => {
    const btn = document.createElement("div");
    btn.className = "emoji-btn-item";
    btn.textContent = em;
    btn.addEventListener("click", () => {
      const inp = $("msgInput");
      const pos = inp.selectionStart;
      inp.value = inp.value.slice(0, pos) + em + inp.value.slice(pos);
      inp.selectionStart = inp.selectionEnd = pos + em.length;
      inp.dispatchEvent(new Event("input"));
      inp.focus();
    });
    grid.appendChild(btn);
  });
}
$("btnEmoji").addEventListener("click", e => { e.stopPropagation(); $("emojiPicker").classList.toggle("hidden"); $("attachMenu").classList.add("hidden"); });
document.addEventListener("click", e => {
  if (!$("emojiPicker").contains(e.target) && e.target !== $("btnEmoji")) $("emojiPicker").classList.add("hidden");
  if (!$("attachMenu").contains(e.target) && e.target !== $("btnAttach")) $("attachMenu").classList.add("hidden");
});

// ═══════════════════════════════════════════════════════
//  SEARCH
// ═══════════════════════════════════════════════════════
function setupSearch() {
  const inp = $("searchInput");
  inp.addEventListener("input", debounce(async e => {
    const q = e.target.value.trim();
    $("btnSearchClear").classList.toggle("hidden", !q);
    if (!q) { renderSearchEmpty(); return; }
    await searchUsers(q);
  }, 350));
  $("btnSearchClear").addEventListener("click", () => { $("searchInput").value = ""; $("btnSearchClear").classList.add("hidden"); renderSearchEmpty(); });
}

function renderSearchEmpty() {
  $("searchResults").innerHTML = `<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><p class="empty-title">Найдите нового человека</p><p class="empty-sub">Введите имя или @username</p></div>`;
}

async function searchUsers(queryStr) {
  $("searchResults").innerHTML = `<div class="empty-state"><div class="spinner"></div></div>`;
  try {
    const results = new Map();
    const qLow = queryStr.toLowerCase();
    const uSnap = await getDocs(query(collection(db, "users"), where("username", ">=", qLow), where("username", "<=", qLow + "\uf8ff"), limit(20)));
    const nSnap = await getDocs(query(collection(db, "users"), where("displayName", ">=", queryStr), where("displayName", "<=", queryStr + "\uf8ff"), limit(20)));
    uSnap.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
    nSnap.forEach(d => results.set(d.id, { id: d.id, ...d.data() }));
    const blocked = await getBlockedIds();
    const filtered = Array.from(results.values()).filter(u => (u.uid || u.id) !== currentUser.uid && !blocked.includes(u.uid || u.id));
    renderSearchResults(filtered);
  } catch (e) { console.error(e); renderSearchEmpty(); }
}

async function getBlockedIds() {
  try {
    const snap = await getDocs(query(collection(db, "blocks"), where("blockerId", "==", currentUser.uid)));
    return snap.docs.map(d => d.data().blockedId);
  } catch (_) { return []; }
}

function renderSearchResults(users) {
  const c = $("searchResults");
  if (!users.length) { c.innerHTML = `<div class="empty-state"><p class="empty-title">Никого не найдено</p></div>`; return; }
  c.innerHTML = "";
  users.forEach(user => c.appendChild(buildSearchCard(user)));
}

function buildSearchCard(user) {
  const uid = user.uid || user.id;
  const color = avatarColor(uid);
  const card = document.createElement("div");
  card.className = "search-card";

  const av = document.createElement("div");
  av.className = "search-card-avatar";
  av.style.background = color;
  av.textContent = initials(user.displayName);
  av.addEventListener("click", () => openUserProfile(user));

  const body = document.createElement("div");
  body.className = "search-card-body";

  const nameEl = document.createElement("div");
  nameEl.className = "search-card-name";
  nameEl.textContent = user.displayName || "Пользователь";
  nameEl.addEventListener("click", () => openUserProfile(user));

  body.innerHTML += `<div class="search-card-username">${user.username ? "@" + escHtml(user.username) : ""}</div>`;
  if (user.bio) body.innerHTML += `<div class="search-card-bio">${escHtml(user.bio)}</div>`;
  if (user.interests?.length) {
    const iEl = document.createElement("div");
    iEl.className = "search-card-interests";
    user.interests.slice(0, 4).forEach(k => { iEl.innerHTML += `<span class="search-card-interest">${escHtml(INTEREST_LABELS[k] || k)}</span>`; });
    body.appendChild(iEl);
  }
  const actEl = document.createElement("div");
  actEl.className = "search-card-actions";
  buildUserActionButtons(user, actEl);
  body.appendChild(actEl);

  card.appendChild(av);
  card.insertBefore(nameEl, body);
  card.appendChild(body);
  card.removeChild(nameEl);

  const finalBody = document.createElement("div");
  finalBody.className = "search-card-body";
  finalBody.appendChild(nameEl);
  const usernameSpan = document.createElement("div");
  usernameSpan.className = "search-card-username";
  usernameSpan.textContent = user.username ? "@" + user.username : "";
  finalBody.appendChild(usernameSpan);
  if (user.bio) { const bioEl = document.createElement("div"); bioEl.className = "search-card-bio"; bioEl.textContent = user.bio; finalBody.appendChild(bioEl); }
  if (user.interests?.length) {
    const iEl = document.createElement("div");
    iEl.className = "search-card-interests";
    user.interests.slice(0, 4).forEach(k => {
      const sp = document.createElement("span");
      sp.className = "search-card-interest";
      sp.textContent = INTEREST_LABELS[k] || k;
      iEl.appendChild(sp);
    });
    finalBody.appendChild(iEl);
  }
  const actions2 = document.createElement("div");
  actions2.className = "search-card-actions";
  buildUserActionButtons(user, actions2);
  finalBody.appendChild(actions2);

  const card2 = document.createElement("div");
  card2.className = "search-card";
  card2.appendChild(av.cloneNode(true));
  card2.firstChild.addEventListener("click", () => openUserProfile(user));
  card2.appendChild(finalBody);
  return card2;
}

async function buildUserActionButtons(user, container) {
  const uid = user.uid || user.id;
  // Message button always
  const chatBtn = document.createElement("button");
  chatBtn.className = "btn-action primary";
  chatBtn.textContent = "Написать";
  chatBtn.addEventListener("click", () => openConversationWith(uid));

  // Like button
  const likeBtn = document.createElement("button");
  likeBtn.className = "btn-action outline";
  likeBtn.textContent = "❤️ Нравится";
  likeBtn.addEventListener("click", () => sendLike(uid, user.displayName));

  // Friend request button
  const friendBtn = document.createElement("button");
  friendBtn.className = "btn-action outline";
  friendBtn.textContent = "Добавить в друзья";
  friendBtn.addEventListener("click", () => sendFriendRequest(uid));

  container.appendChild(chatBtn);
  container.appendChild(likeBtn);
  container.appendChild(friendBtn);
}

// ═══════════════════════════════════════════════════════
//  USER PROFILE MODAL
// ═══════════════════════════════════════════════════════
let viewingUser = null;

async function openUserProfile(user) {
  viewingUser = user;
  const uid = user.uid || user.id;
  const color = avatarColor(uid);
  $("userModalAvatar").style.background = color;
  $("userModalInitials").textContent = initials(user.displayName);
  $("userModalName").textContent = user.displayName || "—";
  $("userModalUsername").textContent = user.username ? "@" + user.username : "";
  const meta = [];
  if (user.city) meta.push("📍 " + user.city);
  if (user.birthDate) { const age = calcAge(user.birthDate); if (age) meta.push(age + " лет"); }
  $("userModalMeta").textContent = meta.join("  ");
  $("userModalBio").textContent = user.bio || "";
  renderInterestTags($("userModalInterests"), user.interests || []);
  // Build action buttons
  const actEl = $("userModalActions");
  actEl.innerHTML = "";
  const chatBtn = document.createElement("button");
  chatBtn.className = "btn-action primary";
  chatBtn.textContent = "💬 Написать";
  chatBtn.addEventListener("click", () => openConversationWith(uid));
  actEl.appendChild(chatBtn);
  const likeBtn = document.createElement("button");
  likeBtn.className = "btn-action outline";
  likeBtn.textContent = "❤️ Нравится";
  likeBtn.addEventListener("click", () => sendLike(uid, user.displayName));
  actEl.appendChild(likeBtn);
  const status = await getFriendshipStatus(uid);
  if (status === "friends") {
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn-action danger";
    removeBtn.textContent = "Удалить из друзей";
    removeBtn.addEventListener("click", () => { closeUserProfileModal(); removeFriend(uid); });
    actEl.appendChild(removeBtn);
  } else if (status === "pending_out") {
    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn-action outline";
    cancelBtn.textContent = "Заявка отправлена";
    cancelBtn.disabled = true;
    actEl.appendChild(cancelBtn);
  } else if (status === "pending_in") {
    const acceptBtn = document.createElement("button");
    acceptBtn.className = "btn-action primary";
    acceptBtn.textContent = "Принять заявку";
    acceptBtn.addEventListener("click", async () => {
      // Find req id
      const q = query(collection(db, "friendRequests"), where("fromUid", "==", uid), where("toUid", "==", currentUser.uid), where("status", "==", "pending"));
      const snap = await getDocs(q);
      if (!snap.empty) await acceptFriendRequest(snap.docs[0].id, uid);
      closeUserProfileModal();
    });
    actEl.appendChild(acceptBtn);
  } else {
    const addBtn = document.createElement("button");
    addBtn.className = "btn-action outline";
    addBtn.textContent = "👥 Добавить в друзья";
    addBtn.addEventListener("click", () => sendFriendRequest(uid));
    actEl.appendChild(addBtn);
  }
  $("btnModalBlock").onclick = () => blockUser(uid, user.displayName);
  $("btnModalReport").onclick = () => { closeUserProfileModal(); openReportModal(uid); };
  $("userProfileModal").classList.remove("hidden");
}

function closeUserProfileModal() { $("userProfileModal").classList.add("hidden"); viewingUser = null; }
$("btnCloseUserProfile").addEventListener("click", closeUserProfileModal);
$("userProfileModal").addEventListener("click", e => { if (e.target === $("userProfileModal")) closeUserProfileModal(); });

// Convo header avatar click → open partner profile
$("convoAvatar").addEventListener("click", () => { if (activeConvPartner) openUserProfile(activeConvPartner); });

// ═══════════════════════════════════════════════════════
//  FRIENDS
// ═══════════════════════════════════════════════════════
function setupFriends() {
  $$(".friends-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".friends-tab-btn").forEach(b => b.classList.remove("active"));
      $$(".friends-tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const t = btn.dataset.friendsTab;
      if (t === "list") { $("friendsListContent").classList.add("active"); loadFriendsList(); }
      if (t === "incoming") $("friendsIncomingContent").classList.add("active");
      if (t === "outgoing") { $("friendsOutgoingContent").classList.add("active"); loadOutgoingRequests(); }
    });
  });
  $("btnFriendsSearch").addEventListener("click", () => {
    $("friendsSearchBar").classList.toggle("hidden");
    if (!$("friendsSearchBar").classList.contains("hidden")) $("friendsSearchInput").focus();
  });
  $("friendsSearchInput").addEventListener("input", debounce(e => {
    const q = e.target.value.trim().toLowerCase();
    $$(".friends-tab-content.active .user-item").forEach(item => {
      const name = item.querySelector(".user-item-name")?.textContent.toLowerCase() || "";
      item.style.display = name.includes(q) ? "" : "none";
    });
  }, 200));
}

async function loadFriendsList() {
  const q1 = query(collection(db, "friendships"), where("uid1", "==", currentUser.uid));
  const q2 = query(collection(db, "friendships"), where("uid2", "==", currentUser.uid));
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const ids = new Set([...s1.docs.map(d => d.data().uid2), ...s2.docs.map(d => d.data().uid1)]);
  if (!ids.size) {
    $("friendsList").innerHTML = `<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg><p class="empty-title">Пока нет друзей</p><p class="empty-sub">Найдите новых людей во вкладке «Найти»</p></div>`;
    return;
  }
  const profiles = await Promise.all(Array.from(ids).map(uid => getDoc(doc(db, "users", uid))));
  $("friendsList").innerHTML = "";
  profiles.forEach(snap => { if (snap.exists()) $("friendsList").appendChild(buildFriendItem({ id: snap.id, ...snap.data() })); });
}

function buildFriendItem(user) {
  const uid = user.uid || user.id;
  const color = avatarColor(uid);
  const item = document.createElement("div");
  item.className = "user-item";
  const av = document.createElement("div");
  av.className = "user-item-avatar";
  av.style.background = color;
  av.textContent = initials(user.displayName);
  if (user.isOnline) { const dot = document.createElement("div"); dot.className = "online-indicator"; av.appendChild(dot); }
  av.addEventListener("click", () => openUserProfile(user));
  const body = document.createElement("div");
  body.className = "user-item-body";
  body.innerHTML = `<div class="user-item-name">${escHtml(user.displayName)}</div><div class="user-item-sub">${user.username ? "@" + escHtml(user.username) : ""} ${user.isOnline ? "🟢" : ""}</div>`;
  const acts = document.createElement("div");
  acts.className = "user-item-actions";
  const chatBtn = document.createElement("button");
  chatBtn.className = "btn-action primary";
  chatBtn.textContent = "Написать";
  chatBtn.addEventListener("click", () => openConversationWith(uid));
  const rmBtn = document.createElement("button");
  rmBtn.className = "btn-action outline";
  rmBtn.textContent = "Удалить";
  rmBtn.addEventListener("click", () => showConfirm("Удалить из друзей?", `Удалить ${user.displayName} из друзей?`, () => removeFriend(uid)));
  acts.appendChild(chatBtn);
  acts.appendChild(rmBtn);
  item.appendChild(av);
  item.appendChild(body);
  item.appendChild(acts);
  return item;
}

async function removeFriend(uid) {
  const q1 = query(collection(db, "friendships"), where("uid1", "==", currentUser.uid), where("uid2", "==", uid));
  const q2 = query(collection(db, "friendships"), where("uid1", "==", uid), where("uid2", "==", currentUser.uid));
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  await Promise.all([...s1.docs, ...s2.docs].map(d => deleteDoc(d.ref)));
  loadFriendsList();
  showToast("Удалён из друзей");
}

async function sendFriendRequest(toUid) {
  if (!currentUser) return;
  const existing = await getDocs(query(collection(db, "friendRequests"), where("fromUid", "==", currentUser.uid), where("toUid", "==", toUid), where("status", "==", "pending")));
  if (!existing.empty) { showToast("Заявка уже отправлена"); return; }
  const alreadyFriends = await getFriendshipStatus(toUid);
  if (alreadyFriends === "friends") { showToast("Уже в друзьях"); return; }
  await addDoc(collection(db, "friendRequests"), { fromUid: currentUser.uid, fromName: myProfile?.displayName || "Пользователь", toUid, status: "pending", createdAt: serverTimestamp() });
  await addDoc(collection(db, "notifications"), { toUid, fromUid: currentUser.uid, fromName: myProfile?.displayName || "Пользователь", type: "friend_request", text: (myProfile?.displayName || "Пользователь") + " хочет добавить вас в друзья", read: false, createdAt: serverTimestamp() });
  showToast("Заявка отправлена", "success");
}

function subscribeFriendRequests() {
  if (unsubFriendReqs) unsubFriendReqs();
  const q = query(collection(db, "friendRequests"), where("toUid", "==", currentUser.uid), where("status", "==", "pending"));
  unsubFriendReqs = onSnapshot(q, snap => {
    const count = snap.size;
    [$("incomingBadge"), $("badgeFriends"), $("bnavBadgeFriends")].forEach(b => {
      if (!b) return;
      if (count > 0) { b.textContent = count; b.classList.remove("hidden"); } else b.classList.add("hidden");
    });
    renderIncomingRequests(snap.docs);
  });
}

function renderIncomingRequests(docs) {
  const c = $("incomingList");
  if (!docs.length) { c.innerHTML = `<div class="empty-state"><p class="empty-sub">Нет входящих заявок</p></div>`; return; }
  c.innerHTML = "";
  docs.forEach(async d => {
    const data = d.data();
    const fromSnap = await getDoc(doc(db, "users", data.fromUid));
    if (!fromSnap.exists()) return;
    const from = { id: fromSnap.id, ...fromSnap.data() };
    const uid = from.uid || from.id;
    const color = avatarColor(uid);
    const item = document.createElement("div");
    item.className = "user-item";
    const av = document.createElement("div"); av.className = "user-item-avatar"; av.style.background = color; av.textContent = initials(from.displayName);
    const body = document.createElement("div"); body.className = "user-item-body";
    body.innerHTML = `<div class="user-item-name">${escHtml(from.displayName)}</div><div class="user-item-sub">${from.username ? "@" + escHtml(from.username) : ""}</div>`;
    const acts = document.createElement("div"); acts.className = "user-item-actions";
    const accBtn = document.createElement("button"); accBtn.className = "btn-action primary"; accBtn.textContent = "Принять";
    accBtn.addEventListener("click", () => acceptFriendRequest(d.id, uid));
    const rejBtn = document.createElement("button"); rejBtn.className = "btn-action danger"; rejBtn.textContent = "Отклонить";
    rejBtn.addEventListener("click", () => rejectFriendRequest(d.id));
    acts.appendChild(accBtn); acts.appendChild(rejBtn);
    item.appendChild(av); item.appendChild(body); item.appendChild(acts);
    c.appendChild(item);
  });
}

async function acceptFriendRequest(reqId, fromUid) {
  await updateDoc(doc(db, "friendRequests", reqId), { status: "accepted" });
  await addDoc(collection(db, "friendships"), { uid1: currentUser.uid, uid2: fromUid, createdAt: serverTimestamp() });
  await addDoc(collection(db, "notifications"), { toUid: fromUid, fromUid: currentUser.uid, fromName: myProfile?.displayName || "Пользователь", type: "friend_accepted", text: (myProfile?.displayName || "Пользователь") + " принял вашу заявку в друзья", read: false, createdAt: serverTimestamp() });
  loadFriendsList();
  showToast("Заявка принята", "success");
}

async function rejectFriendRequest(reqId) {
  await updateDoc(doc(db, "friendRequests", reqId), { status: "rejected" });
  showToast("Заявка отклонена");
}

async function loadOutgoingRequests() {
  const snap = await getDocs(query(collection(db, "friendRequests"), where("fromUid", "==", currentUser.uid), where("status", "==", "pending")));
  const c = $("outgoingList");
  if (snap.empty) { c.innerHTML = `<div class="empty-state"><p class="empty-sub">Нет исходящих заявок</p></div>`; return; }
  c.innerHTML = "";
  snap.forEach(async d => {
    const data = d.data();
    const toSnap = await getDoc(doc(db, "users", data.toUid));
    if (!toSnap.exists()) return;
    const to = { id: toSnap.id, ...toSnap.data() };
    const color = avatarColor(to.uid || to.id);
    const item = document.createElement("div"); item.className = "user-item";
    const av = document.createElement("div"); av.className = "user-item-avatar"; av.style.background = color; av.textContent = initials(to.displayName);
    const body = document.createElement("div"); body.className = "user-item-body";
    body.innerHTML = `<div class="user-item-name">${escHtml(to.displayName)}</div><div class="user-item-sub">Ожидает ответа</div>`;
    const acts = document.createElement("div"); acts.className = "user-item-actions";
    const btn = document.createElement("button"); btn.className = "btn-action danger"; btn.textContent = "Отменить";
    btn.addEventListener("click", async () => { await deleteDoc(doc(db, "friendRequests", d.id)); loadOutgoingRequests(); showToast("Отменено"); });
    acts.appendChild(btn);
    item.appendChild(av); item.appendChild(body); item.appendChild(acts);
    c.appendChild(item);
  });
}

async function getFriendshipStatus(uid) {
  const [s1, s2] = await Promise.all([
    getDocs(query(collection(db, "friendships"), where("uid1", "==", currentUser.uid), where("uid2", "==", uid))),
    getDocs(query(collection(db, "friendships"), where("uid1", "==", uid), where("uid2", "==", currentUser.uid)))
  ]);
  if (!s1.empty || !s2.empty) return "friends";
  const [rOut, rIn] = await Promise.all([
    getDocs(query(collection(db, "friendRequests"), where("fromUid", "==", currentUser.uid), where("toUid", "==", uid), where("status", "==", "pending"))),
    getDocs(query(collection(db, "friendRequests"), where("fromUid", "==", uid), where("toUid", "==", currentUser.uid), where("status", "==", "pending")))
  ]);
  if (!rOut.empty) return "pending_out";
  if (!rIn.empty) return "pending_in";
  return "none";
}

// ═══════════════════════════════════════════════════════
//  DATING
// ═══════════════════════════════════════════════════════
function setupDating() {
  $$(".dating-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".dating-tab-btn").forEach(b => b.classList.remove("active"));
      $$(".dating-tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const t = btn.dataset.datingTab;
      if (t === "discover") $("datingDiscover").classList.add("active");
      if (t === "likes") { $("datingLikes").classList.add("active"); loadLikesTab(); }
    });
  });
  $$(".likes-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".likes-tab-btn").forEach(b => b.classList.remove("active"));
      $$(".likes-tab-content").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      const t = btn.dataset.likesTab;
      if (t === "mutual") $("likesMutual").classList.add("active");
      if (t === "iLiked") $("likesILiked").classList.add("active");
      if (t === "likedMe") $("likesLikedMe").classList.add("active");
    });
  });
  $("btnLike").addEventListener("click", handleLike);
  $("btnSkip").addEventListener("click", handleSkip);
  $("btnDatingSettings").addEventListener("click", openDatingSettings);
}

async function loadDatingProfiles() {
  if (!currentUser) return;
  const blocked = await getBlockedIds();
  const seenSnap = await getDocs(query(collection(db, "likes"), where("fromUid", "==", currentUser.uid)));
  const skippedSnap = await getDocs(query(collection(db, "skips"), where("fromUid", "==", currentUser.uid)));
  const seen = new Set([...seenSnap.docs.map(d => d.data().toUid), ...skippedSnap.docs.map(d => d.data().toUid), currentUser.uid, ...blocked]);
  const snap = await getDocs(query(collection(db, "users"), where("privacyDating", "==", "yes"), limit(50)));
  datingProfiles = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => !seen.has(u.uid || u.id));
  datingIndex = 0;
  showDatingCard();
}

function showDatingCard() {
  const cardsArea = $("cardsArea");
  // Remove old cards
  cardsArea.querySelectorAll(".dating-card").forEach(c => c.remove());
  if (datingIndex >= datingProfiles.length) {
    $("datingEmpty").style.display = "";
    cardsArea.appendChild($("datingEmpty"));
    $("datingActions").classList.add("hidden");
    currentDatingProfile = null;
    return;
  }
  $("datingEmpty").style.display = "none";
  $("datingActions").classList.remove("hidden");
  const p = datingProfiles[datingIndex];
  currentDatingProfile = p;
  cardsArea.appendChild(buildDatingCard(p));
  setupSwipe(cardsArea.querySelector(".dating-card"));
}

function buildDatingCard(p) {
  const uid = p.uid || p.id;
  const age = p.birthDate ? calcAge(p.birthDate) : null;
  const card = document.createElement("div");
  card.className = "dating-card";

  const photo = document.createElement("div");
  photo.className = "dating-card-photo";
  if (p.photoURL) {
    photo.style.cssText = `background-image:url(${p.photoURL});background-size:cover;background-position:center`;
  } else {
    photo.style.background = `linear-gradient(135deg,${avatarColor(uid)}22,${avatarColor(uid)}44)`;
    const initEl = document.createElement("span");
    initEl.textContent = initials(p.displayName);
    initEl.style.cssText = `font-size:72px;font-weight:800;color:${avatarColor(uid)}`;
    photo.appendChild(initEl);
  }
  const likeInd = document.createElement("div");
  likeInd.className = "swipe-like-indicator";
  likeInd.textContent = "НРАВИТСЯ";
  const nopeInd = document.createElement("div");
  nopeInd.className = "swipe-nope-indicator";
  nopeInd.textContent = "ПРОПУСТИТЬ";
  photo.appendChild(likeInd);
  photo.appendChild(nopeInd);

  const body = document.createElement("div");
  body.className = "dating-card-body";
  body.innerHTML = `
    <div class="dating-card-name">${escHtml(p.displayName)}${age ? ", " + age : ""}</div>
    <div class="dating-card-username">${p.username ? "@" + escHtml(p.username) : ""}</div>
    <div class="dating-card-meta">${p.city ? `<span>📍 ${escHtml(p.city)}</span>` : ""}</div>
    <div class="dating-card-bio">${escHtml(p.bio || "")}</div>`;
  if (p.interests?.length) {
    const iEl = document.createElement("div");
    iEl.className = "dating-card-interests";
    p.interests.slice(0, 5).forEach(k => {
      const sp = document.createElement("span");
      sp.className = "dating-card-interest";
      sp.textContent = INTEREST_LABELS[k] || k;
      iEl.appendChild(sp);
    });
    body.appendChild(iEl);
  }
  card.appendChild(photo);
  card.appendChild(body);
  return card;
}

// Swipe support
function setupSwipe(card) {
  if (!card) return;
  let startX = 0, currentX = 0, isDragging = false;
  const photo = card.querySelector(".dating-card-photo");
  const likeInd = card.querySelector(".swipe-like-indicator");
  const nopeInd = card.querySelector(".swipe-nope-indicator");

  const onStart = e => { startX = (e.touches ? e.touches[0].clientX : e.clientX); isDragging = true; card.style.transition = "none"; };
  const onMove = e => {
    if (!isDragging) return;
    currentX = (e.touches ? e.touches[0].clientX : e.clientX) - startX;
    const rotate = currentX / 20;
    card.style.transform = `translateX(calc(-50% + ${currentX}px)) rotate(${rotate}deg)`;
    const absX = Math.abs(currentX);
    if (currentX > 30) { likeInd.style.opacity = Math.min(1, (currentX - 30) / 80); nopeInd.style.opacity = 0; }
    else if (currentX < -30) { nopeInd.style.opacity = Math.min(1, (-currentX - 30) / 80); likeInd.style.opacity = 0; }
    else { likeInd.style.opacity = 0; nopeInd.style.opacity = 0; }
  };
  const onEnd = () => {
    if (!isDragging) return;
    isDragging = false;
    card.style.transition = "";
    if (currentX > 80) { animateSwipe(card, "right"); }
    else if (currentX < -80) { animateSwipe(card, "left"); }
    else { card.style.transform = "translateX(-50%)"; likeInd.style.opacity = 0; nopeInd.style.opacity = 0; }
    currentX = 0;
  };
  card.addEventListener("mousedown", onStart);
  card.addEventListener("mousemove", onMove);
  card.addEventListener("mouseup", onEnd);
  card.addEventListener("touchstart", onStart, { passive: true });
  card.addEventListener("touchmove", onMove, { passive: true });
  card.addEventListener("touchend", onEnd);
}

function animateSwipe(card, direction) {
  card.classList.add(direction === "right" ? "swipe-right" : "swipe-left");
  setTimeout(() => {
    card.remove();
    if (direction === "right") handleLike();
    else handleSkipAction();
  }, 300);
}

async function handleLike() {
  if (!currentDatingProfile || !currentUser) return;
  const toUid = currentDatingProfile.uid || currentDatingProfile.id;
  const card = $("cardsArea").querySelector(".dating-card");
  if (card && !card.classList.contains("swipe-right")) {
    card.classList.add("swipe-right");
    setTimeout(() => card.remove(), 300);
  }
  await sendLike(toUid, currentDatingProfile.displayName);
  datingIndex++;
  setTimeout(showDatingCard, 350);
}

function handleSkip() {
  if (!currentDatingProfile) return;
  const card = $("cardsArea").querySelector(".dating-card");
  if (card && !card.classList.contains("swipe-left")) {
    card.classList.add("swipe-left");
    setTimeout(() => card.remove(), 300);
  }
  handleSkipAction();
}

async function handleSkipAction() {
  if (!currentDatingProfile || !currentUser) return;
  const toUid = currentDatingProfile.uid || currentDatingProfile.id;
  try {
    await setDoc(doc(db, "skips", currentUser.uid + "_" + toUid), { fromUid: currentUser.uid, toUid, createdAt: serverTimestamp() });
  } catch (_) {}
  datingIndex++;
  setTimeout(showDatingCard, 350);
}

async function sendLike(toUid, toName) {
  if (!currentUser || toUid === currentUser.uid) return;
  // Check if already liked
  const existingSnap = await getDocs(query(collection(db, "likes"), where("fromUid", "==", currentUser.uid), where("toUid", "==", toUid)));
  if (!existingSnap.empty) { return; }
  await setDoc(doc(db, "likes", currentUser.uid + "_" + toUid), { fromUid: currentUser.uid, toUid, createdAt: serverTimestamp() });
  // Check for mutual like (match)
  const mutualSnap = await getDocs(query(collection(db, "likes"), where("fromUid", "==", toUid), where("toUid", "==", currentUser.uid)));
  if (!mutualSnap.empty) {
    await createMatch(toUid, toName);
  } else {
    await addDoc(collection(db, "notifications"), { toUid, fromUid: currentUser.uid, fromName: myProfile?.displayName || "Пользователь", type: "like", text: (myProfile?.displayName || "Кто-то") + " поставил вам ❤️", read: false, createdAt: serverTimestamp() });
  }
}

async function createMatch(toUid, toName) {
  // Check match doesn't exist
  const existingMatch = await getDocs(query(collection(db, "matches"), where("uids", "array-contains", currentUser.uid)));
  for (const d of existingMatch.docs) {
    if (d.data().uids.includes(toUid)) return; // already matched
  }
  await addDoc(collection(db, "matches"), { uids: [currentUser.uid, toUid], uid1: currentUser.uid, uid2: toUid, createdAt: serverTimestamp() });
  // Notify both
  await addDoc(collection(db, "notifications"), { toUid, fromUid: currentUser.uid, fromName: myProfile?.displayName || "Пользователь", type: "match", text: "У вас взаимная симпатия с " + (myProfile?.displayName || "кем-то") + "! 🎉", read: false, createdAt: serverTimestamp() });
  await addDoc(collection(db, "notifications"), { toUid: currentUser.uid, fromUid: toUid, fromName: toName || "Пользователь", type: "match", text: "У вас взаимная симпатия с " + (toName || "кем-то") + "! 🎉", read: false, createdAt: serverTimestamp() });
  // Show match modal
  showMatchModal(toUid, toName);
}

async function showMatchModal(toUid, toName) {
  $("matchMyInitials").textContent = initials(myProfile?.displayName || "?");
  $("matchMyAvatar").style.background = avatarColor(currentUser.uid);
  $("matchTheirInitials").textContent = initials(toName || "?");
  $("matchTheirAvatar").style.background = avatarColor(toUid);
  $("matchName").textContent = toName || "кем-то";
  $("matchModal").classList.remove("hidden");
  $("btnMatchChat").onclick = async () => { $("matchModal").classList.add("hidden"); await openConversationWith(toUid); };
  $("btnMatchClose").onclick = () => $("matchModal").classList.add("hidden");
}

async function loadLikesTab() {
  // Mutual (matches)
  const matchSnap = await getDocs(query(collection(db, "matches"), where("uids", "array-contains", currentUser.uid)));
  const mutualIds = matchSnap.docs.flatMap(d => d.data().uids.filter(id => id !== currentUser.uid));
  renderLikesList($("mutualList"), mutualIds, true);

  // I liked
  const iLikedSnap = await getDocs(query(collection(db, "likes"), where("fromUid", "==", currentUser.uid)));
  renderLikesList($("iLikedList"), iLikedSnap.docs.map(d => d.data().toUid), false);

  // Liked me
  const likedMeSnap = await getDocs(query(collection(db, "likes"), where("toUid", "==", currentUser.uid)));
  renderLikesList($("likedMeList"), likedMeSnap.docs.map(d => d.data().fromUid), false);
}

async function renderLikesList(container, uids, isMutual) {
  if (!uids.length) { container.innerHTML = `<div class="empty-state"><p class="empty-sub">Пусто</p></div>`; return; }
  container.innerHTML = "";
  const profiles = await Promise.all(uids.map(uid => getDoc(doc(db, "users", uid))));
  profiles.forEach(snap => {
    if (!snap.exists()) return;
    const user = { id: snap.id, ...snap.data() };
    const uid = user.uid || user.id;
    const color = avatarColor(uid);
    const item = document.createElement("div");
    item.className = "user-item";
    const av = document.createElement("div"); av.className = "user-item-avatar"; av.style.background = color; av.textContent = initials(user.displayName);
    av.addEventListener("click", () => openUserProfile(user));
    const body = document.createElement("div"); body.className = "user-item-body";
    body.innerHTML = `<div class="user-item-name">${escHtml(user.displayName)}</div><div class="user-item-sub">${user.username ? "@" + escHtml(user.username) : ""}</div>`;
    const acts = document.createElement("div"); acts.className = "user-item-actions";
    if (isMutual) {
      const chatBtn = document.createElement("button"); chatBtn.className = "btn-action primary"; chatBtn.textContent = "Написать";
      chatBtn.addEventListener("click", () => openConversationWith(uid));
      acts.appendChild(chatBtn);
    }
    item.appendChild(av); item.appendChild(body); item.appendChild(acts);
    container.appendChild(item);
  });
}

function openDatingSettings() { $("datingSettingsModal").classList.remove("hidden"); }
$("btnCloseDatingSettings").addEventListener("click", () => $("datingSettingsModal").classList.add("hidden"));
$("datingSettingsModal").addEventListener("click", e => { if (e.target === $("datingSettingsModal")) $("datingSettingsModal").classList.add("hidden"); });
$("ageMin").addEventListener("input", updateAgeLabel);
$("ageMax").addEventListener("input", updateAgeLabel);
function updateAgeLabel() { $("ageRangeLabel").textContent = $("ageMin").value + "–" + $("ageMax").value; }
$("btnSaveDatingSettings").addEventListener("click", async () => {
  const settings = { ageMin: parseInt($("ageMin").value), ageMax: parseInt($("ageMax").value), city: $("datingCityFilter").value.trim() };
  await updateDoc(doc(db, "users", currentUser.uid), { datingSettings: settings });
  Object.assign(myProfile, { datingSettings: settings });
  $("datingSettingsModal").classList.add("hidden");
  showToast("Настройки сохранены", "success");
  loadDatingProfiles();
});

// ═══════════════════════════════════════════════════════
//  BLOCK / REPORT
// ═══════════════════════════════════════════════════════
async function blockUser(uid, name) {
  showConfirm("Заблокировать?", `Заблокировать ${name || "пользователя"}? Вы не будете видеть друг друга в чатах и знакомствах.`, async () => {
    await setDoc(doc(db, "blocks", currentUser.uid + "_" + uid), { blockerId: currentUser.uid, blockedId: uid, createdAt: serverTimestamp() });
    closeUserProfileModal();
    showToast("Пользователь заблокирован");
    loadDatingProfiles();
  });
}

let reportTargetUid = null;
function openReportModal(uid) { reportTargetUid = uid; $("reportErr").textContent = ""; $$("input[name='reportReason']").forEach(r => r.checked = false); $("reportModal").classList.remove("hidden"); }
$("btnCloseReport").addEventListener("click", () => $("reportModal").classList.add("hidden"));
$("reportModal").addEventListener("click", e => { if (e.target === $("reportModal")) $("reportModal").classList.add("hidden"); });
$("btnSubmitReport").addEventListener("click", async () => {
  const reason = document.querySelector("input[name='reportReason']:checked")?.value;
  if (!reason) { $("reportErr").textContent = "Выберите причину"; return; }
  await addDoc(collection(db, "reports"), { reporterId: currentUser.uid, reportedId: reportTargetUid, reason, createdAt: serverTimestamp() });
  $("reportModal").classList.add("hidden");
  showToast("Жалоба отправлена", "success");
});

// Blocked users list
$("btnSettingsBlocked").addEventListener("click", async () => {
  const snap = await getDocs(query(collection(db, "blocks"), where("blockerId", "==", currentUser.uid)));
  const c = $("blockedList");
  if (snap.empty) { c.innerHTML = `<p style="text-align:center;padding:20px;color:#9ca3af">Нет заблокированных пользователей</p>`; }
  else {
    c.innerHTML = "";
    snap.forEach(async d => {
      const data = d.data();
      const snap2 = await getDoc(doc(db, "users", data.blockedId));
      if (!snap2.exists()) return;
      const user = { id: snap2.id, ...snap2.data() };
      const item = document.createElement("div"); item.className = "user-item";
      const av = document.createElement("div"); av.className = "user-item-avatar"; av.style.background = avatarColor(user.uid || user.id); av.textContent = initials(user.displayName);
      const body = document.createElement("div"); body.className = "user-item-body";
      body.innerHTML = `<div class="user-item-name">${escHtml(user.displayName)}</div>`;
      const btn = document.createElement("button"); btn.className = "btn-action outline"; btn.textContent = "Разблокировать";
      btn.addEventListener("click", async () => {
        await deleteDoc(d.ref);
        item.remove();
        showToast("Разблокировано");
      });
      const acts = document.createElement("div"); acts.className = "user-item-actions"; acts.appendChild(btn);
      item.appendChild(av); item.appendChild(body); item.appendChild(acts);
      c.appendChild(item);
    });
  }
  $("blockedModal").classList.remove("hidden");
});
$("btnCloseBlocked").addEventListener("click", () => $("blockedModal").classList.add("hidden"));
$("blockedModal").addEventListener("click", e => { if (e.target === $("blockedModal")) $("blockedModal").classList.add("hidden"); });

// ═══════════════════════════════════════════════════════
//  NOTIFICATIONS
// ═══════════════════════════════════════════════════════
function subscribeNotificationsLive() {
  if (unsubNotifications) unsubNotifications();
  const q = query(collection(db, "notifications"), where("toUid", "==", currentUser.uid), where("read", "==", false));
  unsubNotifications = onSnapshot(q, snap => {
    const count = snap.size;
    [$("badgeNotifications"), $("bnavBadgeNotifications")].forEach(b => {
      if (!b) return;
      if (count > 0) { b.textContent = count > 99 ? "99+" : count; b.classList.remove("hidden"); }
      else b.classList.add("hidden");
    });
  });
}

async function markNotificationsRead() {
  try {
    const snap = await getDocs(query(collection(db, "notifications"), where("toUid", "==", currentUser.uid), where("read", "==", false)));
    await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })));
    loadNotificationsList();
  } catch (e) { console.error(e); }
}

async function loadNotificationsList() {
  const snap = await getDocs(query(collection(db, "notifications"), where("toUid", "==", currentUser.uid), orderBy("createdAt", "desc"), limit(50)));
  const c = $("notificationsList");
  if (snap.empty) {
    c.innerHTML = `<div class="empty-state"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><p class="empty-title">Нет уведомлений</p></div>`;
    return;
  }
  c.innerHTML = "";
  snap.forEach(d => {
    const data = d.data();
    const item = document.createElement("div");
    item.className = "notif-item" + (data.read ? "" : " unread");
    item.innerHTML = `
      <div class="notif-avatar" style="background:${avatarColor(data.fromUid || "x")}">${initials(data.fromName || "?")}</div>
      <div class="notif-body">
        <div class="notif-text">${escHtml(data.text || "")}</div>
        <div class="notif-time">${fmtTime(data.createdAt)}</div>
      </div>
      ${!data.read ? '<div class="notif-dot"></div>' : ''}`;
    if (data.fromUid && (data.type === "friend_request" || data.type === "match" || data.type === "like")) {
      item.addEventListener("click", async () => {
        const snap2 = await getDoc(doc(db, "users", data.fromUid));
        if (snap2.exists()) openUserProfile({ id: snap2.id, ...snap2.data() });
      });
    }
    c.appendChild(item);
  });
}

function setupNotificationsTab() {
  $("btnMarkAllRead").addEventListener("click", markNotificationsRead);
}

// ═══════════════════════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════════════════════
function setupSettings() {
  $("btnLogout").addEventListener("click", () => {
    showConfirm("Выйти?", "Вы уверены, что хотите выйти из аккаунта?", async () => {
      await setOnlineStatus(false);
      await signOut(auth);
    });
  });
  $("btnSettingsPrivacy").addEventListener("click", openPrivacyModal);
  $("btnSettingsDating").addEventListener("click", openDatingSettings);
}

async function openPrivacyModal() {
  if (myProfile) {
    $("privacyMessages").value = myProfile.privacyMessages || "everyone";
    $("privacyOnline").value = myProfile.privacyOnline || "everyone";
    $("privacyFriendReq").value = myProfile.privacyFriendReq || "everyone";
    $("privacyDating").value = myProfile.privacyDating || "yes";
  }
  $("privacyModal").classList.remove("hidden");
}
$("btnClosePrivacy").addEventListener("click", () => $("privacyModal").classList.add("hidden"));
$("privacyModal").addEventListener("click", e => { if (e.target === $("privacyModal")) $("privacyModal").classList.add("hidden"); });
$("btnSavePrivacy").addEventListener("click", async () => {
  const updates = {
    privacyMessages: $("privacyMessages").value,
    privacyOnline: $("privacyOnline").value,
    privacyFriendReq: $("privacyFriendReq").value,
    privacyDating: $("privacyDating").value
  };
  await updateDoc(doc(db, "users", currentUser.uid), updates);
  Object.assign(myProfile, updates);
  $("privacyModal").classList.add("hidden");
  showToast("Настройки приватности сохранены", "success");
});


// ═══════════════════════════════════════════════════════
//  AVATAR UPLOAD
// ═══════════════════════════════════════════════════════
$("btnEditAvatar").addEventListener("click", () => {
  $("avatarFileInput").click();
});

$("avatarFileInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  $("avatarFileInput").value = "";
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Выберите изображение", "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("Файл слишком большой (макс. 5MB)", "error");
    return;
  }

  showLoading();
  try {
    // Upload to Firebase Storage
    const path = `avatars/${currentUser.uid}/${Date.now()}_${file.name}`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, file);
    const url = await getDownloadURL(ref);

    // Update Firebase Auth profile
    await updateProfile(currentUser, { photoURL: url });

    // Update Firestore
    await updateDoc(doc(db, "users", currentUser.uid), {
      photoURL: url,
      updatedAt: serverTimestamp()
    });

    // Update local state
    myProfile.photoURL = url;

    // Re-render profile with new photo
    renderMyProfileAvatar(url);
    showToast("Фото обновлено", "success");
  } catch (err) {
    console.error("Avatar upload error:", err);
    showToast("Ошибка загрузки фото", "error");
  } finally {
    hideLoading();
  }
});

function renderMyProfileAvatar(photoURL) {
  const color = avatarColor(currentUser.uid);

  // Profile tab avatar
  const profileAv = $("myProfileAvatar");
  if (photoURL) {
    profileAv.style.backgroundImage = `url(${photoURL})`;
    profileAv.style.backgroundSize = "cover";
    profileAv.style.backgroundPosition = "center";
    profileAv.style.background = "transparent";
    $("myProfileInitials").textContent = "";
  } else {
    profileAv.style.backgroundImage = "";
    profileAv.style.background = color;
    $("myProfileInitials").textContent = initials(myProfile?.displayName || "?");
  }

  // Sidebar avatar
  const sidebarAv = $("sidebarAvatar");
  if (photoURL) {
    sidebarAv.style.backgroundImage = `url(${photoURL})`;
    sidebarAv.style.backgroundSize = "cover";
    sidebarAv.style.backgroundPosition = "center";
    sidebarAv.style.background = "transparent";
    $("sidebarInitials").textContent = "";
  } else {
    sidebarAv.style.backgroundImage = "";
    sidebarAv.style.background = color;
    $("sidebarInitials").textContent = initials(myProfile?.displayName || "?");
  }
}
