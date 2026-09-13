import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, setDoc, getDoc, deleteDoc, runTransaction,
  query, orderBy, limit, onSnapshot, serverTimestamp
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
const chatScreen = document.getElementById("chatScreen");
const profileScreen = document.getElementById("profileScreen");

function showScreen(el) {
  [authScreen, profileSetupScreen, contactsScreen, chatScreen, profileScreen].forEach(function (s) {
    s.classList.remove("active");
  });
  el.classList.add("active");
}

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
}

headerAvatarBtn.addEventListener("click", function () {
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
});

profileBackBtn.addEventListener("click", function () {
  showScreen(contactsScreen);
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
    showScreen(contactsScreen);
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
  showScreen(contactsScreen);
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
    } else {
      const prefillName = user.email ? user.email.split("@")[0] : "";
      openProfileSetup(prefillName);
    }
  } catch (err) {
    console.error("Ошибка загрузки профиля:", err);
  }
});
