import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, setDoc, getDoc, getDocs, deleteDoc, runTransaction,
  query, where, orderBy, limit, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBhImSZoiZAwGHll_QcBgTls-sjmpmg1S8",
  authDomain: "kakashi-171e5.firebaseapp.com",
  projectId: "kakashi-171e5",
  storageBucket: "kakashi-171e5.firebasestorage.app",
  messagingSenderId: "130432668952",
  appId: "1:130432668952:web:7d1a67f4fa0a88ce21ba6d",
  measurementId: "G-1GN10PSTT8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Явно храним сессию в браузере — при следующем открытии сайта
// пользователь останется авторизован (токен Firebase живёт в localStorage).
setPersistence(auth, browserLocalPersistence).catch(function (err) {
  console.error("Не удалось настроить сохранение сессии:", err);
});

const AVATARS = [
  { emoji: "🙂", color: "#667eea" }, { emoji: "😎", color: "#f6ad55" },
  { emoji: "🐱", color: "#f56565" }, { emoji: "🐶", color: "#48bb78" },
  { emoji: "🦊", color: "#ed8936" }, { emoji: "🐼", color: "#4a5568" },
  { emoji: "🌟", color: "#ecc94b" }, { emoji: "🍀", color: "#38a169" },
  { emoji: "🔥", color: "#e53e3e" }, { emoji: "🌈", color: "#9f7aea" },
  { emoji: "👾", color: "#805ad5" }, { emoji: "🐸", color: "#48bb78" }
];

let myUserId = null;
let myProfile = {
  name: "", status: "", avatarIdx: 0, photoData: null,
  username: "", bio: "", city: "", interests: [], birthDate: "", phone: ""
};

// ==== DOM: экраны ====
const authScreen = document.getElementById("authScreen");
const profileSetupScreen = document.getElementById("profileSetupScreen");
const contactsScreen = document.getElementById("contactsScreen");
const friendsScreen = document.getElementById("friendsScreen");
const searchScreen = document.getElementById("searchScreen");
const chatScreen = document.getElementById("chatScreen");
const profileScreen = document.getElementById("profileScreen");
const viewProfileScreen = document.getElementById("viewProfileScreen");

const ALL_SCREENS = [authScreen, profileSetupScreen, contactsScreen, friendsScreen, searchScreen, chatScreen, profileScreen, viewProfileScreen];
const MAIN_TAB_SCREENS = [contactsScreen, friendsScreen, searchScreen];
let lastMainScreen = contactsScreen;

function showScreen(el) {
  ALL_SCREENS.forEach(function (s) { s.classList.remove("active"); });
  el.classList.add("active");
  if (MAIN_TAB_SCREENS.indexOf(el) !== -1) {
    lastMainScreen = el;
    updateNavActiveStates();
  }
  updateDesktopLayoutClasses(el);
}

function updateNavActiveStates() {
  const navSets = [
    [document.getElementById("navChatsBtn"), document.getElementById("navFriendsBtn"), document.getElementById("navSearchBtn")],
    [document.getElementById("navChatsBtn2"), document.getElementById("navFriendsBtn2"), document.getElementById("navSearchBtn2")],
    [document.getElementById("navChatsBtn3"), document.getElementById("navFriendsBtn3"), document.getElementById("navSearchBtn3")],
    [document.getElementById("desktopNavChatsBtn"), document.getElementById("desktopNavFriendsBtn"), document.getElementById("desktopNavSearchBtn")]
  ];
  const activeIdx = lastMainScreen === contactsScreen ? 0 : (lastMainScreen === friendsScreen ? 1 : 2);
  navSets.forEach(function (set) {
    set.forEach(function (btn, idx) {
      if (!btn) return;
      btn.classList.toggle("active", idx === activeIdx);
    });
  });
}

// ==== Полноэкранный desktop-layout (Этап 1) ====
// На узких экранах (телефон) поведение не меняется: viden только .screen.active.
// На широких экранах (см. styles.css, @media min-width: 900px) одновременно видны:
// колонка навигации, колонка активной вкладки (Чаты/Друзья/Найти) и колонка деталей
// (открытый чат / просмотр профиля / мой профиль). Эта функция просто расставляет
// вспомогательные классы, которые задействует CSS — сама логика showScreen() не трогается,
// поэтому мобильное поведение остаётся прежним.
const DETAIL_SCREENS = [chatScreen, viewProfileScreen, profileScreen];
const appEl = document.querySelector(".app");

function updateDesktopLayoutClasses(activeEl) {
  const isAuthOrSetup = (activeEl === authScreen || activeEl === profileSetupScreen);
  appEl.classList.toggle("authOrSetup", isAuthOrSetup);

  MAIN_TAB_SCREENS.forEach(function (s) {
    s.classList.toggle("mainTabActive", s === lastMainScreen && !isAuthOrSetup);
  });

  const isDetail = DETAIL_SCREENS.indexOf(activeEl) !== -1;
  DETAIL_SCREENS.forEach(function (s) {
    s.classList.toggle("detailActive", isDetail && s === activeEl);
  });
  appEl.classList.toggle("noDetail", !isDetail);
}

function wireNavButtons() {
  ["navChatsBtn", "navChatsBtn2", "navChatsBtn3", "desktopNavChatsBtn"].forEach(function (id) {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", function () { showScreen(contactsScreen); });
  });
  ["navFriendsBtn", "navFriendsBtn2", "navFriendsBtn3", "desktopNavFriendsBtn"].forEach(function (id) {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", function () { showScreen(friendsScreen); });
  });
  ["navSearchBtn", "navSearchBtn2", "navSearchBtn3", "desktopNavSearchBtn"].forEach(function (id) {
    const btn = document.getElementById(id);
    if (btn) btn.addEventListener("click", function () { showScreen(searchScreen); });
  });
}
wireNavButtons();

// ==== DOM: авторизация ====
const tabLoginBtn = document.getElementById("tabLoginBtn");
const tabRegisterBtn = document.getElementById("tabRegisterBtn");
const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const authErr = document.getElementById("authErr");
const authSubmitBtn = document.getElementById("authSubmitBtn");
const googleBtn = document.getElementById("googleBtn");

let authMode = "login";

function setAuthMode(mode) {
  authMode = mode;
  authErr.textContent = "";
  if (mode === "login") {
    tabLoginBtn.classList.add("active");
    tabRegisterBtn.classList.remove("active");
    authSubmitBtn.textContent = "Войти";
    passwordInput.autocomplete = "current-password";
  } else {
    tabRegisterBtn.classList.add("active");
    tabLoginBtn.classList.remove("active");
    authSubmitBtn.textContent = "Зарегистрироваться";
    passwordInput.autocomplete = "new-password";
  }
}

tabLoginBtn.addEventListener("click", function () { setAuthMode("login"); });
tabRegisterBtn.addEventListener("click", function () { setAuthMode("register"); });

function friendlyAuthError(err) {
  const code = err && err.code ? err.code : "";
  if (code === "auth/invalid-email") return "Некорректный email";
  if (code === "auth/user-not-found" || code === "auth/wrong-password" || code === "auth/invalid-credential") return "Неверный email или пароль";
  if (code === "auth/email-already-in-use") return "Этот email уже зарегистрирован";
  if (code === "auth/weak-password") return "Пароль слишком короткий (минимум 6 символов)";
  if (code === "auth/popup-closed-by-user") return "Окно входа через Google было закрыто";
  if (code === "auth/unauthorized-domain") return "Этот домен не разрешён в настройках Firebase Authentication";
  return "Ошибка: " + (err && err.message ? err.message : "неизвестная");
}

authSubmitBtn.addEventListener("click", async function () {
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  authErr.textContent = "";

  if (!email || !password) {
    authErr.textContent = "Заполни email и пароль";
    return;
  }

  authSubmitBtn.disabled = true;
  try {
    if (authMode === "login") {
      await signInWithEmailAndPassword(auth, email, password);
    } else {
      await createUserWithEmailAndPassword(auth, email, password);
    }
    // дальше подхватит onAuthStateChanged
  } catch (err) {
    console.error("Ошибка авторизации:", err);
    authErr.textContent = friendlyAuthError(err);
  } finally {
    authSubmitBtn.disabled = false;
  }
});

googleBtn.addEventListener("click", async function () {
  authErr.textContent = "";
  googleBtn.disabled = true;
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (err) {
    console.error("Ошибка входа через Google:", err);
    authErr.textContent = friendlyAuthError(err);
  } finally {
    googleBtn.disabled = false;
  }
});

// ==== Аватар: общая отрисовка (эмодзи или загруженное фото) ====
function applyAvatarVisual(el, profile) {
  if (profile && profile.photoData) {
    el.style.backgroundImage = "url('" + profile.photoData + "')";
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
    el.textContent = "";
  } else {
    const a = AVATARS[(profile && profile.avatarIdx) || 0] || AVATARS[0];
    el.style.backgroundImage = "none";
    el.style.background = a.color;
    el.textContent = a.emoji;
  }
}

function compressImageToDataUrl(file, maxSize, quality) {
  return new Promise(function (resolve, reject) {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = function (e) {
      img.onload = function () {
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * (maxSize / w)); w = maxSize; }
          else { w = Math.round(w * (maxSize / h)); h = maxSize; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ==== Аватар-пикер (эмодзи + загрузка своего фото) ====
const avatarFileInput = document.getElementById("avatarFileInput");
let pendingUploadTarget = null;

function buildAvatarPicker(container, state, onChange) {
  container.innerHTML = "";

  AVATARS.forEach(function (a, idx) {
    const el = document.createElement("div");
    el.className = "avatarOpt";
    el.style.background = a.color;
    el.textContent = a.emoji;
    el.addEventListener("click", function () {
      state.avatarIdx = idx;
      state.photoData = null;
      refreshAvatarPickerVisuals(container, state);
      onChange();
    });
    container.appendChild(el);
  });

  const uploadTile = document.createElement("div");
  uploadTile.className = "avatarOpt uploadTile";
  uploadTile.textContent = "📤";
  uploadTile.title = "Загрузить своё фото";
  uploadTile.addEventListener("click", function () {
    pendingUploadTarget = { container: container, state: state, onChange: onChange };
    avatarFileInput.click();
  });
  container.appendChild(uploadTile);

  refreshAvatarPickerVisuals(container, state);
}

function refreshAvatarPickerVisuals(container, state) {
  const tiles = container.querySelectorAll(".avatarOpt");
  tiles.forEach(function (tile, idx) {
    const isUploadTile = tile.classList.contains("uploadTile");
    tile.classList.remove("selected");
    if (isUploadTile) {
      if (state.photoData) {
        tile.style.backgroundImage = "url('" + state.photoData + "')";
        tile.textContent = "";
        tile.classList.add("selected");
      } else {
        tile.style.backgroundImage = "none";
        tile.textContent = "📤";
      }
    } else if (!state.photoData && state.avatarIdx === idx) {
      tile.classList.add("selected");
    }
  });
}

avatarFileInput.addEventListener("change", async function () {
  const file = avatarFileInput.files && avatarFileInput.files[0];
  avatarFileInput.value = "";
  if (!file || !pendingUploadTarget) return;

  try {
    const dataUrl = await compressImageToDataUrl(file, 320, 0.75);
    pendingUploadTarget.state.photoData = dataUrl;
    refreshAvatarPickerVisuals(pendingUploadTarget.container, pendingUploadTarget.state);
    pendingUploadTarget.onChange();
  } catch (err) {
    console.error("Не удалось обработать фото:", err);
    alert("Не удалось обработать фото");
  } finally {
    pendingUploadTarget = null;
  }
});

// ==== Username: проверка и резервирование (Этап 1) ====
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function normalizeUsername(raw) {
  return (raw || "").trim().toLowerCase();
}

function parseInterests(raw) {
  return (raw || "")
    .split(",")
    .map(function (s) { return s.trim(); })
    .filter(Boolean)
    .slice(0, 10);
}

// Живая проверка занятости username при вводе (только UI-подсказка,
// окончательная защита от гонки — в транзакции при сохранении).
function wireUsernameHint(inputEl, hintEl, getOwnCurrentUsername) {
  let debounceTimer = null;
  inputEl.addEventListener("input", function () {
    const value = normalizeUsername(inputEl.value);
    hintEl.className = "fieldHint";
    if (debounceTimer) clearTimeout(debounceTimer);

    if (!value) { hintEl.textContent = ""; return; }
    if (!USERNAME_RE.test(value)) {
      hintEl.textContent = "3–20 символов: латиница, цифры, _";
      hintEl.classList.add("taken");
      return;
    }
    if (value === normalizeUsername(getOwnCurrentUsername())) {
      hintEl.textContent = "это уже ваш username";
      hintEl.classList.add("ok");
      return;
    }

    hintEl.textContent = "проверка…";
    hintEl.classList.add("checking");
    debounceTimer = setTimeout(async function () {
      try {
        const snap = await getDoc(doc(db, "usernames", value));
        if (normalizeUsername(inputEl.value) !== value) return; // пользователь уже печатает дальше
        hintEl.className = "fieldHint";
        if (snap.exists()) {
          hintEl.textContent = "занят";
          hintEl.classList.add("taken");
        } else {
          hintEl.textContent = "свободен";
          hintEl.classList.add("ok");
        }
      } catch (err) {
        console.error("Ошибка проверки username:", err);
      }
    }, 400);
  });
}

// Атомарно резервирует новый username (и освобождает старый), затем пишет профиль.
// Если username занят кем-то другим — бросает понятную ошибку.
async function saveProfileWithUsername(profileData, previousUsername) {
  const newUsernameLower = normalizeUsername(profileData.username);
  const prevUsernameLower = normalizeUsername(previousUsername);

  await runTransaction(db, async function (tx) {
    if (newUsernameLower && newUsernameLower !== prevUsernameLower) {
      const newRef = doc(db, "usernames", newUsernameLower);
      const newSnap = await tx.get(newRef);
      if (newSnap.exists() && newSnap.data().uid !== myUserId) {
        throw new Error("USERNAME_TAKEN");
      }
      tx.set(newRef, { uid: myUserId });
    }
    if (prevUsernameLower && prevUsernameLower !== newUsernameLower) {
      tx.delete(doc(db, "usernames", prevUsernameLower));
    }
    tx.set(doc(db, "users", myUserId), Object.assign({}, profileData, { updatedAt: serverTimestamp() }));
  });
}


const setupAvatarPicker = document.getElementById("setupAvatarPicker");
const setupNickInput = document.getElementById("setupNickInput");
const setupUsernameInput = document.getElementById("setupUsernameInput");
const setupUsernameHint = document.getElementById("setupUsernameHint");
const setupBioInput = document.getElementById("setupBioInput");
const setupCityInput = document.getElementById("setupCityInput");
const setupInterestsInput = document.getElementById("setupInterestsInput");
const setupBirthDateInput = document.getElementById("setupBirthDateInput");
const setupPhoneInput = document.getElementById("setupPhoneInput");
const setupStatusInput = document.getElementById("setupStatusInput");
const setupErr = document.getElementById("setupErr");
const setupSaveBtn = document.getElementById("setupSaveBtn");

let setupState = { avatarIdx: 0, photoData: null };

wireUsernameHint(setupUsernameInput, setupUsernameHint, function () { return ""; });

function openProfileSetup(prefillName) {
  setupState = { avatarIdx: Math.floor(Math.random() * AVATARS.length), photoData: null };
  setupNickInput.value = prefillName || "";
  setupUsernameInput.value = "";
  setupUsernameHint.textContent = "";
  setupBioInput.value = "";
  setupCityInput.value = "";
  setupInterestsInput.value = "";
  setupBirthDateInput.value = "";
  setupPhoneInput.value = "";
  setupStatusInput.value = "";
  setupErr.textContent = "";
  buildAvatarPicker(setupAvatarPicker, setupState, function () {});
  showScreen(profileSetupScreen);
}

setupSaveBtn.addEventListener("click", async function () {
  const name = setupNickInput.value.trim();
  const username = normalizeUsername(setupUsernameInput.value);

  if (!name) { setupErr.textContent = "Введите имя"; return; }
  if (!username || !USERNAME_RE.test(username)) {
    setupErr.textContent = "Укажите корректный username (3–20 символов: латиница, цифры, _)";
    return;
  }

  const profileData = {
    name: name,
    nameLower: name.toLowerCase(),
    username: username,
    status: setupStatusInput.value.trim(),
    bio: setupBioInput.value.trim(),
    city: setupCityInput.value.trim(),
    interests: parseInterests(setupInterestsInput.value),
    birthDate: setupBirthDateInput.value || "",
    phone: setupPhoneInput.value.trim(),
    avatarIdx: setupState.avatarIdx,
    photoData: setupState.photoData
  };

  setupSaveBtn.disabled = true;
  setupErr.textContent = "";
  try {
    await saveProfileWithUsername(profileData, "");
    myProfile = profileData;
    updateHeaderAvatar();
    showScreen(contactsScreen);
    startContactsListener();
    startRelationshipListeners();
  } catch (err) {
    console.error("Не удалось сохранить профиль:", err);
    setupErr.textContent = (err && err.message === "USERNAME_TAKEN")
      ? "Этот username уже занят, выберите другой"
      : "Не удалось сохранить профиль";
  } finally {
    setupSaveBtn.disabled = false;
  }
});

// ==== Экран "Мой профиль" (просмотр / редактирование) ====
const headerAvatarBtn = document.getElementById("headerAvatarBtn");
const editAvatarPicker = document.getElementById("editAvatarPicker");
const profileBackBtn = document.getElementById("profileBackBtn");
const editNickInput = document.getElementById("editNickInput");
const editUsernameInput = document.getElementById("editUsernameInput");
const editUsernameHint = document.getElementById("editUsernameHint");
const editBioInput = document.getElementById("editBioInput");
const editCityInput = document.getElementById("editCityInput");
const editInterestsInput = document.getElementById("editInterestsInput");
const editBirthDateInput = document.getElementById("editBirthDateInput");
const editPhoneInput = document.getElementById("editPhoneInput");
const editStatusInput = document.getElementById("editStatusInput");
const editErr = document.getElementById("editErr");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const logoutBtn = document.getElementById("logoutBtn");

let editState = { avatarIdx: 0, photoData: null };

wireUsernameHint(editUsernameInput, editUsernameHint, function () { return myProfile.username; });

function updateHeaderAvatar() {
  applyAvatarVisual(headerAvatarBtn, myProfile);
  const friendsHeaderAvatarBtn = document.getElementById("friendsHeaderAvatarBtn");
  const searchHeaderAvatarBtn = document.getElementById("searchHeaderAvatarBtn");
  const desktopAvatarBtn = document.getElementById("desktopAvatarBtn");
  if (friendsHeaderAvatarBtn) applyAvatarVisual(friendsHeaderAvatarBtn, myProfile);
  if (searchHeaderAvatarBtn) applyAvatarVisual(searchHeaderAvatarBtn, myProfile);
  if (desktopAvatarBtn) applyAvatarVisual(desktopAvatarBtn, myProfile);
}

function openMyProfileScreen() {
  editState = { avatarIdx: myProfile.avatarIdx || 0, photoData: myProfile.photoData || null };
  editNickInput.value = myProfile.name || "";
  editUsernameInput.value = myProfile.username || "";
  editUsernameHint.textContent = "";
  editBioInput.value = myProfile.bio || "";
  editCityInput.value = myProfile.city || "";
  editInterestsInput.value = (myProfile.interests || []).join(", ");
  editBirthDateInput.value = myProfile.birthDate || "";
  editPhoneInput.value = myProfile.phone || "";
  editStatusInput.value = myProfile.status || "";
  editErr.textContent = "";
  buildAvatarPicker(editAvatarPicker, editState, function () {});
  showScreen(profileScreen);
}

[headerAvatarBtn, document.getElementById("friendsHeaderAvatarBtn"), document.getElementById("searchHeaderAvatarBtn"), document.getElementById("desktopAvatarBtn")].forEach(function (btn) {
  if (btn) btn.addEventListener("click", openMyProfileScreen);
});

profileBackBtn.addEventListener("click", function () {
  showScreen(lastMainScreen);
});

saveProfileBtn.addEventListener("click", async function () {
  const trimmedName = editNickInput.value.trim();
  const username = normalizeUsername(editUsernameInput.value);

  if (!trimmedName) { editErr.textContent = "Введите имя"; return; }
  if (!username || !USERNAME_RE.test(username)) {
    editErr.textContent = "Укажите корректный username (3–20 символов: латиница, цифры, _)";
    return;
  }

  const profileData = {
    name: trimmedName,
    nameLower: trimmedName.toLowerCase(),
    username: username,
    status: editStatusInput.value.trim(),
    bio: editBioInput.value.trim(),
    city: editCityInput.value.trim(),
    interests: parseInterests(editInterestsInput.value),
    birthDate: editBirthDateInput.value || "",
    phone: editPhoneInput.value.trim(),
    avatarIdx: editState.avatarIdx,
    photoData: editState.photoData
  };

  saveProfileBtn.disabled = true;
  editErr.textContent = "";
  try {
    await saveProfileWithUsername(profileData, myProfile.username);
    myProfile = profileData;
    updateHeaderAvatar();
    showScreen(lastMainScreen);
  } catch (err) {
    console.error("Не удалось сохранить профиль:", err);
    editErr.textContent = (err && err.message === "USERNAME_TAKEN")
      ? "Этот username уже занят, выберите другой"
      : "Не удалось сохранить профиль";
  } finally {
    saveProfileBtn.disabled = false;
  }
});

logoutBtn.addEventListener("click", async function () {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Ошибка выхода:", err);
  }
});

// ==== Этап 2: друзья, заявки, блокировки ====
const friendsMap = {};        // otherUid -> true
const sentRequestsMap = {};   // otherUid -> requestId
const incomingRequestsMap = {}; // requestId -> fromUid
const blockedByMeMap = {};    // otherUid -> true (я заблокировал их)
const blockedMeMap = {};      // otherUid -> true (они заблокировали меня)

let friendshipsUnsub = null;
let sentRequestsUnsub = null;
let incomingRequestsUnsub = null;
let blocksByMeUnsub = null;
let blocksOnMeUnsub = null;

function friendshipDocId(uidA, uidB) {
  return [uidA, uidB].sort().join("_");
}

function startRelationshipListeners() {
  const friendshipsRef = collection(db, "friendships");
  friendshipsUnsub = onSnapshot(query(friendshipsRef, where("uids", "array-contains", myUserId)), function (snapshot) {
    Object.keys(friendsMap).forEach(function (k) { delete friendsMap[k]; });
    snapshot.forEach(function (docSnap) {
      const uids = docSnap.data().uids || [];
      const other = uids[0] === myUserId ? uids[1] : uids[0];
      if (other) friendsMap[other] = true;
    });
    renderFriendsScreen();
    renderViewProfileActions();
  }, function (err) { console.error("Ошибка загрузки друзей:", err); });

  const requestsRef = collection(db, "friendRequests");

  sentRequestsUnsub = onSnapshot(query(requestsRef, where("fromUid", "==", myUserId)), function (snapshot) {
    Object.keys(sentRequestsMap).forEach(function (k) { delete sentRequestsMap[k]; });
    snapshot.forEach(function (docSnap) {
      const d = docSnap.data();
      if (d.status === "pending") sentRequestsMap[d.toUid] = docSnap.id;
    });
    renderViewProfileActions();
  }, function (err) { console.error("Ошибка загрузки заявок:", err); });

  incomingRequestsUnsub = onSnapshot(query(requestsRef, where("toUid", "==", myUserId)), function (snapshot) {
    Object.keys(incomingRequestsMap).forEach(function (k) { delete incomingRequestsMap[k]; });
    snapshot.forEach(function (docSnap) {
      const d = docSnap.data();
      if (d.status === "pending") incomingRequestsMap[docSnap.id] = d.fromUid;
    });
    renderFriendsScreen();
    renderViewProfileActions();
  }, function (err) { console.error("Ошибка загрузки входящих заявок:", err); });

  const blocksRef = collection(db, "blocks");

  blocksByMeUnsub = onSnapshot(query(blocksRef, where("blockerUid", "==", myUserId)), function (snapshot) {
    Object.keys(blockedByMeMap).forEach(function (k) { delete blockedByMeMap[k]; });
    snapshot.forEach(function (docSnap) { blockedByMeMap[docSnap.data().blockedUid] = true; });
    renderViewProfileActions();
  }, function (err) { console.error("Ошибка загрузки блокировок:", err); });

  blocksOnMeUnsub = onSnapshot(query(blocksRef, where("blockedUid", "==", myUserId)), function (snapshot) {
    Object.keys(blockedMeMap).forEach(function (k) { delete blockedMeMap[k]; });
    snapshot.forEach(function (docSnap) { blockedMeMap[docSnap.data().blockerUid] = true; });
  }, function (err) { console.error("Ошибка загрузки блокировок:", err); });
}

function stopRelationshipListeners() {
  [friendshipsUnsub, sentRequestsUnsub, incomingRequestsUnsub, blocksByMeUnsub, blocksOnMeUnsub].forEach(function (unsub) {
    if (unsub) unsub();
  });
  friendshipsUnsub = sentRequestsUnsub = incomingRequestsUnsub = blocksByMeUnsub = blocksOnMeUnsub = null;
  [friendsMap, sentRequestsMap, incomingRequestsMap, blockedByMeMap, blockedMeMap].forEach(function (m) {
    Object.keys(m).forEach(function (k) { delete m[k]; });
  });
}

async function sendFriendRequest(otherUid) {
  await addDoc(collection(db, "friendRequests"), {
    fromUid: myUserId,
    toUid: otherUid,
    status: "pending",
    createdAt: serverTimestamp()
  });
}

async function acceptFriendRequest(requestId, fromUid) {
  await runTransaction(db, async function (tx) {
    tx.delete(doc(db, "friendRequests", requestId));
    tx.set(doc(db, "friendships", friendshipDocId(myUserId, fromUid)), {
      uids: [myUserId, fromUid],
      createdAt: serverTimestamp()
    });
  });
}

async function declineFriendRequest(requestId) {
  await deleteDoc(doc(db, "friendRequests", requestId));
}

async function removeFriend(otherUid) {
  await deleteDoc(doc(db, "friendships", friendshipDocId(myUserId, otherUid)));
}

async function blockUser(otherUid) {
  await runTransaction(db, async function (tx) {
    tx.set(doc(db, "blocks", myUserId + "_" + otherUid), {
      blockerUid: myUserId,
      blockedUid: otherUid,
      createdAt: serverTimestamp()
    });
    tx.delete(doc(db, "friendships", friendshipDocId(myUserId, otherUid)));
    const mySentId = sentRequestsMap[otherUid];
    if (mySentId) tx.delete(doc(db, "friendRequests", mySentId));
  });
  const incomingEntry = Object.keys(incomingRequestsMap).find(function (rid) { return incomingRequestsMap[rid] === otherUid; });
  if (incomingEntry) await declineFriendRequest(incomingEntry);
}

async function unblockUser(otherUid) {
  await deleteDoc(doc(db, "blocks", myUserId + "_" + otherUid));
}

// ==== Экран "Друзья" ====
const incomingRequestsSection = document.getElementById("incomingRequestsSection");
const incomingRequestsList = document.getElementById("incomingRequestsList");
const friendsList = document.getElementById("friendsList");
const friendsBadges = [document.getElementById("friendsBadge"), document.getElementById("friendsBadge2"), document.getElementById("friendsBadge3"), document.getElementById("friendsBadgeDesktop")];

function renderFriendsScreen() {
  const incomingIds = Object.keys(incomingRequestsMap);

  friendsBadges.forEach(function (b) {
    if (!b) return;
    if (incomingIds.length > 0) { b.hidden = false; b.textContent = String(incomingIds.length); }
    else { b.hidden = true; }
  });

  if (incomingIds.length === 0) {
    incomingRequestsSection.hidden = true;
    incomingRequestsList.innerHTML = "";
  } else {
    incomingRequestsSection.hidden = false;
    incomingRequestsList.innerHTML = "";
    incomingIds.forEach(function (requestId) {
      const fromUid = incomingRequestsMap[requestId];
      const data = contactsMap[fromUid];
      if (!data) return;
      const row = document.createElement("div");
      row.className = "friendRow";

      const avatarEl = document.createElement("div");
      avatarEl.className = "contactAvatar";
      applyAvatarVisual(avatarEl, data);

      const info = document.createElement("div");
      info.className = "friendRowInfo";
      info.innerHTML = '<div class="contactName">' + escapeHtml(data.name || "Без имени") + '</div>' +
        '<div class="contactStatus">@' + escapeHtml(data.username || "") + '</div>';
      info.addEventListener("click", function () { openViewProfile(fromUid, data); });

      const actions = document.createElement("div");
      actions.className = "friendRowActions";
      const acceptBtn = document.createElement("button");
      acceptBtn.className = "smallBtn primary";
      acceptBtn.textContent = "Принять";
      acceptBtn.addEventListener("click", function () { acceptFriendRequest(requestId, fromUid).catch(function (e) { console.error(e); }); });
      const declineBtn = document.createElement("button");
      declineBtn.className = "smallBtn";
      declineBtn.textContent = "Откл.";
      declineBtn.addEventListener("click", function () { declineFriendRequest(requestId).catch(function (e) { console.error(e); }); });
      actions.appendChild(acceptBtn);
      actions.appendChild(declineBtn);

      row.appendChild(avatarEl);
      row.appendChild(info);
      row.appendChild(actions);
      incomingRequestsList.appendChild(row);
    });
  }

  const friendUids = Object.keys(friendsMap);
  if (friendUids.length === 0) {
    friendsList.innerHTML = '<div class="emptyHint">У тебя пока нет друзей. Найди их во вкладке «Найти»!</div>';
    return;
  }
  friendsList.innerHTML = "";
  friendUids.forEach(function (uid) {
    const data = contactsMap[uid];
    if (!data) return;
    const row = document.createElement("div");
    row.className = "friendRow";

    const avatarEl = document.createElement("div");
    avatarEl.className = "contactAvatar";
    applyAvatarVisual(avatarEl, data);

    const info = document.createElement("div");
    info.className = "friendRowInfo";
    info.innerHTML = '<div class="contactName">' + escapeHtml(data.name || "Без имени") + '</div>' +
      '<div class="contactStatus">@' + escapeHtml(data.username || "") + '</div>';
    info.addEventListener("click", function () { openViewProfile(uid, data); });

    const actions = document.createElement("div");
    actions.className = "friendRowActions";
    const msgBtn = document.createElement("button");
    msgBtn.className = "smallBtn primary";
    msgBtn.textContent = "Написать";
    msgBtn.addEventListener("click", function () { openChat(uid, data); });
    actions.appendChild(msgBtn);

    row.appendChild(avatarEl);
    row.appendChild(info);
    row.appendChild(actions);
    friendsList.appendChild(row);
  });
}

// ==== Экран "Найти друзей" ====
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
let searchDebounceTimer = null;

searchInput.addEventListener("input", function () {
  const term = searchInput.value.trim();
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  if (!term) {
    searchResults.innerHTML = '<div class="emptyHint">Начни вводить имя или username, чтобы найти людей.</div>';
    return;
  }
  searchResults.innerHTML = '<div class="emptyHint">Ищу…</div>';
  searchDebounceTimer = setTimeout(function () { runSearch(term); }, 400);
});

async function runSearch(term) {
  const termLower = term.toLowerCase().replace(/^@/, "");
  const usersRef = collection(db, "users");
  const foundMap = {};

  try {
    const byName = await getDocs(query(usersRef, orderBy("nameLower"), where("nameLower", ">=", termLower), where("nameLower", "<", termLower + "\uf8ff"), limit(20)));
    byName.forEach(function (docSnap) { foundMap[docSnap.id] = docSnap.data(); });

    const byUsername = await getDocs(query(usersRef, orderBy("username"), where("username", ">=", termLower), where("username", "<", termLower + "\uf8ff"), limit(20)));
    byUsername.forEach(function (docSnap) { foundMap[docSnap.id] = docSnap.data(); });
  } catch (err) {
    console.error("Ошибка поиска:", err);
    searchResults.innerHTML = '<div class="emptyHint">Не удалось выполнить поиск</div>';
    return;
  }

  if (searchInput.value.trim().toLowerCase().replace(/^@/, "") !== termLower) return; // ввод уже изменился

  const results = Object.keys(foundMap)
    .filter(function (uid) { return uid !== myUserId && !blockedMeMap[uid] && !blockedByMeMap[uid]; })
    .map(function (uid) { return { uid: uid, data: foundMap[uid] }; });

  if (results.length === 0) {
    searchResults.innerHTML = '<div class="emptyHint">Никого не нашлось</div>';
    return;
  }

  searchResults.innerHTML = "";
  results.forEach(function (r) {
    contactsMap[r.uid] = r.data; // пополняем общий кэш профилей
    const row = document.createElement("div");
    row.className = "friendRow";

    const avatarEl = document.createElement("div");
    avatarEl.className = "contactAvatar";
    applyAvatarVisual(avatarEl, r.data);

    const info = document.createElement("div");
    info.className = "friendRowInfo";
    info.innerHTML = '<div class="contactName">' + escapeHtml(r.data.name || "Без имени") + '</div>' +
      '<div class="contactStatus">@' + escapeHtml(r.data.username || "") + (r.data.bio ? " · " + escapeHtml(r.data.bio) : "") + '</div>';
    info.addEventListener("click", function () { openViewProfile(r.uid, r.data); });

    const actions = document.createElement("div");
    actions.className = "friendRowActions";
    actions.appendChild(buildRelationshipButton(r.uid));

    row.appendChild(avatarEl);
    row.appendChild(info);
    row.appendChild(actions);
    searchResults.appendChild(row);
  });
}

function buildRelationshipButton(otherUid) {
  const btn = document.createElement("button");
  btn.className = "smallBtn";
  if (friendsMap[otherUid]) {
    btn.textContent = "Вы друзья";
    btn.disabled = true;
  } else if (sentRequestsMap[otherUid]) {
    btn.textContent = "Заявка отправлена";
    btn.disabled = true;
  } else {
    btn.className = "smallBtn primary";
    btn.textContent = "Добавить";
    btn.addEventListener("click", function () {
      btn.disabled = true;
      btn.textContent = "Заявка отправлена";
      sendFriendRequest(otherUid).catch(function (err) {
        console.error("Ошибка отправки заявки:", err);
        btn.disabled = false;
        btn.textContent = "Добавить";
      });
    });
  }
  return btn;
}

// ==== Экран профиля другого пользователя ====
const viewProfileBackBtn = document.getElementById("viewProfileBackBtn");
const viewProfileAvatar = document.getElementById("viewProfileAvatar");
const viewProfileName = document.getElementById("viewProfileName");
const viewProfileUsername = document.getElementById("viewProfileUsername");
const viewProfileBio = document.getElementById("viewProfileBio");
const viewProfileMeta = document.getElementById("viewProfileMeta");
const viewProfileInterests = document.getElementById("viewProfileInterests");
const viewProfileErr = document.getElementById("viewProfileErr");
const viewMessageBtn = document.getElementById("viewMessageBtn");
const viewAddFriendBtn = document.getElementById("viewAddFriendBtn");
const viewPendingBtn = document.getElementById("viewPendingBtn");
const viewAcceptBtn = document.getElementById("viewAcceptBtn");
const viewDeclineBtn = document.getElementById("viewDeclineBtn");
const viewRemoveFriendBtn = document.getElementById("viewRemoveFriendBtn");
const viewBlockBtn = document.getElementById("viewBlockBtn");
const viewUnblockBtn = document.getElementById("viewUnblockBtn");

let viewedUid = null;
let viewedData = null;

function openViewProfile(otherUid, data) {
  viewedUid = otherUid;
  viewedData = data;
  applyAvatarVisual(viewProfileAvatar, data);
  viewProfileName.textContent = data.name || "Без имени";
  viewProfileUsername.textContent = data.username ? "@" + data.username : "";
  viewProfileBio.textContent = data.bio || "";
  viewProfileMeta.innerHTML = "";
  if (data.city) viewProfileMeta.innerHTML += '<span>📍 ' + escapeHtml(data.city) + '</span>';
  viewProfileInterests.innerHTML = (data.interests || []).map(function (i) {
    return '<span class="interestChip">' + escapeHtml(i) + '</span>';
  }).join("");
  viewProfileErr.textContent = "";
  renderViewProfileActions();
  showScreen(viewProfileScreen);
}

function renderViewProfileActions() {
  if (!viewedUid) return;
  const otherUid = viewedUid;
  [viewMessageBtn, viewAddFriendBtn, viewPendingBtn, viewAcceptBtn, viewDeclineBtn, viewRemoveFriendBtn, viewBlockBtn, viewUnblockBtn]
    .forEach(function (b) { b.hidden = true; });

  if (blockedByMeMap[otherUid]) {
    viewUnblockBtn.hidden = false;
    return;
  }

  const incomingEntry = Object.keys(incomingRequestsMap).find(function (rid) { return incomingRequestsMap[rid] === otherUid; });

  if (friendsMap[otherUid]) {
    viewMessageBtn.hidden = false;
    viewRemoveFriendBtn.hidden = false;
  } else if (incomingEntry) {
    viewAcceptBtn.hidden = false;
    viewDeclineBtn.hidden = false;
    viewAcceptBtn.onclick = function () {
      acceptFriendRequest(incomingEntry, otherUid).catch(function (e) { viewProfileErr.textContent = "Ошибка"; console.error(e); });
    };
    viewDeclineBtn.onclick = function () {
      declineFriendRequest(incomingEntry).catch(function (e) { viewProfileErr.textContent = "Ошибка"; console.error(e); });
    };
  } else if (sentRequestsMap[otherUid]) {
    viewPendingBtn.hidden = false;
  } else {
    viewAddFriendBtn.hidden = false;
  }

  viewBlockBtn.hidden = false;
}

viewProfileBackBtn.addEventListener("click", function () { showScreen(lastMainScreen); });

viewMessageBtn.addEventListener("click", function () { if (viewedUid) openChat(viewedUid, viewedData); });

viewAddFriendBtn.addEventListener("click", function () {
  if (!viewedUid) return;
  viewAddFriendBtn.disabled = true;
  sendFriendRequest(viewedUid).catch(function (err) {
    console.error("Ошибка отправки заявки:", err);
    viewProfileErr.textContent = "Не удалось отправить заявку";
    viewAddFriendBtn.disabled = false;
  });
});

viewRemoveFriendBtn.addEventListener("click", function () {
  if (!viewedUid) return;
  if (!confirm("Удалить из друзей?")) return;
  removeFriend(viewedUid).catch(function (err) { console.error(err); viewProfileErr.textContent = "Не удалось удалить"; });
});

viewBlockBtn.addEventListener("click", function () {
  if (!viewedUid) return;
  if (!confirm("Заблокировать пользователя? Он больше не сможет писать вам и добавлять в друзья.")) return;
  blockUser(viewedUid).catch(function (err) { console.error(err); viewProfileErr.textContent = "Не удалось заблокировать"; });
});

viewUnblockBtn.addEventListener("click", function () {
  if (!viewedUid) return;
  unblockUser(viewedUid).catch(function (err) { console.error(err); viewProfileErr.textContent = "Не удалось разблокировать"; });
});

// ==== Список контактов ====
const contactsList = document.getElementById("contactsList");
const contactsMap = {};
let contactsUnsub = null;

function startContactsListener() {
  if (contactsUnsub) contactsUnsub();
  const usersRef = collection(db, "users");
  contactsUnsub = onSnapshot(usersRef, function (snapshot) {
    contactsList.innerHTML = "";
    let count = 0;

    snapshot.forEach(function (docSnap) {
      if (docSnap.id === myUserId) return;
      const data = docSnap.data();
      contactsMap[docSnap.id] = data;
      count++;
      contactsList.appendChild(buildContactItem(docSnap.id, data));
    });

    if (count === 0) {
      contactsList.innerHTML = '<div class="emptyHint">Пока никого нет. Позови друзей открыть эту страницу и создать профиль!</div>';
    }
    renderFriendsScreen();
  }, function (error) {
    console.error("Ошибка загрузки контактов:", error);
  });
}

function buildContactItem(contactId, data) {
  const item = document.createElement("div");
  item.className = "contactItem";

  const avatarEl = document.createElement("div");
  avatarEl.className = "contactAvatar";
  applyAvatarVisual(avatarEl, data);

  const info = document.createElement("div");
  info.className = "contactInfo";
  const usernameLine = data.username ? '@' + escapeHtml(data.username) : "";
  const statusLine = data.status || "";
  const subtitle = usernameLine && statusLine ? usernameLine + " · " + escapeHtml(statusLine)
                    : (usernameLine || escapeHtml(statusLine));
  info.innerHTML =
    '<div class="contactName">' + escapeHtml(data.name || "Без имени") + '</div>' +
    '<div class="contactStatus">' + subtitle + '</div>';

  item.appendChild(avatarEl);
  item.appendChild(info);
  item.addEventListener("click", function () {
    openChat(contactId, data);
  });
  return item;
}

// ==== Переписка 1 на 1 ====
const backBtn = document.getElementById("backBtn");
const chatContactName = document.getElementById("chatContactName");
const chatContactStatus = document.getElementById("chatContactStatus");
const messagesEl = document.getElementById("messages");
const msgForm = document.getElementById("msgForm");
const msgInput = document.getElementById("msgInput");
const sendBtn = document.getElementById("sendBtn");
const attachBtn = document.getElementById("attachBtn");
const fileInput = document.getElementById("fileInput");
const uploadStatus = document.getElementById("uploadStatus");

let currentContactId = null;
let messagesUnsub = null;

function getConversationId(idA, idB) {
  return [idA, idB].sort().join("_");
}

function openChat(contactId, data) {
  currentContactId = contactId;
  chatContactName.textContent = data.name || "Без имени";
  chatContactStatus.textContent = data.status || "";
  showScreen(chatScreen);
  startMessagesListener();
}

backBtn.addEventListener("click", function () {
  if (messagesUnsub) { messagesUnsub(); messagesUnsub = null; }
  currentContactId = null;
  showScreen(lastMainScreen);
});

function startMessagesListener() {
  if (messagesUnsub) messagesUnsub();
  const convId = getConversationId(myUserId, currentContactId);
  const messagesRef = collection(db, "conversations", convId, "messages");
  const q = query(messagesRef, orderBy("createdAt", "asc"), limit(200));

  messagesUnsub = onSnapshot(q, function (snapshot) {
    messagesEl.innerHTML = "";

    if (snapshot.empty) {
      messagesEl.innerHTML = '<div class="emptyHint">Сообщений пока нет. Напиши первым!</div>';
      return;
    }

    snapshot.forEach(function (docSnap) {
      renderMessage(docSnap.data());
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }, function (error) {
    console.error("Ошибка чтения сообщений:", error);
  });
}

msgForm.addEventListener("submit", async function (e) {
  e.preventDefault();
  const text = msgInput.value.trim();
  if (!text || !currentContactId) return;

  const convId = getConversationId(myUserId, currentContactId);
  const messagesRef = collection(db, "conversations", convId, "messages");

  sendBtn.disabled = true;
  try {
    await addDoc(messagesRef, {
      text: text,
      authorId: myUserId,
      createdAt: serverTimestamp()
    });
    msgInput.value = "";
  } catch (err) {
    console.error("Ошибка отправки:", err);
    alert("Не удалось отправить сообщение. Проверь правила безопасности Firestore.");
  } finally {
    sendBtn.disabled = false;
    msgInput.focus();
  }
});

// ==== Фото в сообщениях (тоже base64 прямо в Firestore) ====
attachBtn.addEventListener("click", function () {
  fileInput.click();
});

fileInput.addEventListener("change", async function () {
  const file = fileInput.files && fileInput.files[0];
  fileInput.value = "";
  if (!file || !currentContactId) return;

  attachBtn.disabled = true;
  sendBtn.disabled = true;
  uploadStatus.textContent = "Сжимаю фото…";

  try {
    const dataUrl = await compressImageToDataUrl(file, 700, 0.55);

    if (dataUrl.length > 900000) {
      uploadStatus.textContent = "Фото слишком большое даже после сжатия";
      setTimeout(function () { uploadStatus.textContent = ""; }, 3000);
      return;
    }

    uploadStatus.textContent = "Отправка фото…";
    const convId = getConversationId(myUserId, currentContactId);
    const messagesRef = collection(db, "conversations", convId, "messages");
    await addDoc(messagesRef, {
      imageData: dataUrl,
      authorId: myUserId,
      createdAt: serverTimestamp()
    });
    uploadStatus.textContent = "";
  } catch (err) {
    console.error("Ошибка отправки фото:", err);
    uploadStatus.textContent = "Не удалось отправить фото";
    setTimeout(function () { uploadStatus.textContent = ""; }, 3000);
  } finally {
    attachBtn.disabled = false;
    sendBtn.disabled = false;
  }
});

function renderMessage(data) {
  const mine = data.authorId === myUserId;
  const profile = mine ? myProfile : (contactsMap[data.authorId] || { avatarIdx: 0 });

  const row = document.createElement("div");
  row.className = "msgRow " + (mine ? "mine" : "theirs");

  const avatarEl = document.createElement("div");
  avatarEl.className = "rowAvatar";
  applyAvatarVisual(avatarEl, profile);

  const bubble = document.createElement("div");
  bubble.className = "msg";

  var time = "";
  if (data.createdAt && data.createdAt.toDate) {
    time = data.createdAt.toDate().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  if (data.imageData) {
    bubble.innerHTML =
      '<img class="msgImage" src="' + data.imageData + '" alt="фото">' +
      '<span class="imgTime">' + time + '</span>';
    bubble.querySelector("img").addEventListener("click", function () {
      const w = window.open("");
      if (w) w.document.write('<img src="' + data.imageData + '" style="max-width:100%">');
    });
  } else {
    bubble.innerHTML = escapeHtml(data.text || "") + '<span class="time">' + time + '</span>';
  }

  row.appendChild(avatarEl);
  row.appendChild(bubble);
  messagesEl.appendChild(row);
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

// ==== Точка входа: следим за состоянием авторизации ====
onAuthStateChanged(auth, async function (user) {
  if (messagesUnsub) { messagesUnsub(); messagesUnsub = null; }
  if (contactsUnsub) { contactsUnsub(); contactsUnsub = null; }
  stopRelationshipListeners();

  if (!user) {
    myUserId = null;
    emailInput.value = "";
    passwordInput.value = "";
    setAuthMode("login");
    showScreen(authScreen);
    return;
  }

  myUserId = user.uid;

  try {
    const snap = await getDoc(doc(db, "users", myUserId));
    if (snap.exists()) {
      const data = snap.data();
      myProfile = {
        name: data.name || "",
        status: data.status || "",
        avatarIdx: typeof data.avatarIdx === "number" ? data.avatarIdx : 0,
        photoData: data.photoData || null,
        username: data.username || "",
        bio: data.bio || "",
        city: data.city || "",
        interests: Array.isArray(data.interests) ? data.interests : [],
        birthDate: data.birthDate || "",
        phone: data.phone || ""
      };
      updateHeaderAvatar();
      showScreen(contactsScreen);
      startContactsListener();
      startRelationshipListeners();
    } else {
      const prefillName = user.email ? user.email.split("@")[0] : "";
      openProfileSetup(prefillName);
    }
  } catch (err) {
    console.error("Ошибка загрузки профиля:", err);
  }
});
