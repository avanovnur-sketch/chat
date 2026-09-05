import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, doc, setDoc,
  query, orderBy, limit, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import {
  getStorage, ref as storageRef, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-storage.js";

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
const storage = getStorage(app);

const AVATARS = [
  { emoji: "🙂", color: "#667eea" }, { emoji: "😎", color: "#f6ad55" },
  { emoji: "🐱", color: "#f56565" }, { emoji: "🐶", color: "#48bb78" },
  { emoji: "🦊", color: "#ed8936" }, { emoji: "🐼", color: "#4a5568" },
  { emoji: "🌟", color: "#ecc94b" }, { emoji: "🍀", color: "#38a169" },
  { emoji: "🔥", color: "#e53e3e" }, { emoji: "🌈", color: "#9f7aea" },
  { emoji: "👾", color: "#805ad5" }, { emoji: "🐸", color: "#48bb78" }
];

function getOrCreateUserId() {
  let id = localStorage.getItem("chatUserId");
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("chatUserId", id);
  }
  return id;
}

const myUserId = getOrCreateUserId();

let myProfile = {
  name: localStorage.getItem("chatNick") || "",
  status: localStorage.getItem("chatStatus") || "",
  avatarIdx: parseInt(localStorage.getItem("chatAvatarIdx") || "0", 10)
};

function saveProfileLocal() {
  localStorage.setItem("chatNick", myProfile.name);
  localStorage.setItem("chatStatus", myProfile.status);
  localStorage.setItem("chatAvatarIdx", String(myProfile.avatarIdx));
}

async function saveProfileRemote() {
  try {
    await setDoc(doc(db, "users", myUserId), {
      name: myProfile.name,
      status: myProfile.status,
      avatarIdx: myProfile.avatarIdx,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (err) {
    console.error("Не удалось сохранить профиль в Firestore:", err);
  }
}

// ==== DOM ====
const loginScreen = document.getElementById("loginScreen");
const contactsScreen = document.getElementById("contactsScreen");
const chatScreen = document.getElementById("chatScreen");

const nickInput = document.getElementById("nickInput");
const statusInput = document.getElementById("statusInput");
const joinBtn = document.getElementById("joinBtn");
const loginErr = document.getElementById("loginErr");

const contactsList = document.getElementById("contactsList");
const headerAvatarBtn = document.getElementById("headerAvatarBtn");

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

const loginAvatarPicker = document.getElementById("loginAvatarPicker");
const editAvatarPicker = document.getElementById("editAvatarPicker");
const profileModal = document.getElementById("profileModal");
const editNickInput = document.getElementById("editNickInput");
const editStatusInput = document.getElementById("editStatusInput");
const editErr = document.getElementById("editErr");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const closeProfileBtn = document.getElementById("closeProfileBtn");

function showScreen(el) {
  [loginScreen, contactsScreen, chatScreen].forEach(function (s) {
    s.classList.remove("active");
  });
  el.classList.add("active");
}

function buildAvatarPicker(container, selectedIdx, onSelect) {
  container.innerHTML = "";
  AVATARS.forEach(function (a, idx) {
    const el = document.createElement("div");
    el.className = "avatarOpt" + (idx === selectedIdx ? " selected" : "");
    el.style.background = a.color;
    el.textContent = a.emoji;
    el.addEventListener("click", function () {
      container.querySelectorAll(".avatarOpt").forEach(function (o) {
        o.classList.remove("selected");
      });
      el.classList.add("selected");
      onSelect(idx);
    });
    container.appendChild(el);
  });
}

let loginSelectedAvatar = myProfile.avatarIdx || 0;
let editSelectedAvatar = myProfile.avatarIdx || 0;

buildAvatarPicker(loginAvatarPicker, loginSelectedAvatar, function (idx) {
  loginSelectedAvatar = idx;
});

if (myProfile.name) {
  nickInput.value = myProfile.name;
  statusInput.value = myProfile.status;
}

function updateHeaderAvatar() {
  const a = AVATARS[myProfile.avatarIdx] || AVATARS[0];
  headerAvatarBtn.textContent = a.emoji;
  headerAvatarBtn.style.background = a.color;
}

function enterApp(name, status, avatarIdx) {
  const trimmed = name.trim();
  if (!trimmed) {
    loginErr.textContent = "Введите имя";
    return;
  }
  myProfile = { name: trimmed, status: status.trim(), avatarIdx: avatarIdx };
  saveProfileLocal();
  saveProfileRemote();
  updateHeaderAvatar();
  showScreen(contactsScreen);
  startContactsListener();
}

joinBtn.addEventListener("click", function () {
  enterApp(nickInput.value, statusInput.value, loginSelectedAvatar);
});
nickInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter") enterApp(nickInput.value, statusInput.value, loginSelectedAvatar);
});

// ==== Модалка профиля ====
function openProfileModal() {
  editNickInput.value = myProfile.name;
  editStatusInput.value = myProfile.status;
  editSelectedAvatar = myProfile.avatarIdx;
  editErr.textContent = "";
  buildAvatarPicker(editAvatarPicker, editSelectedAvatar, function (idx) {
    editSelectedAvatar = idx;
  });
  profileModal.classList.add("open");
}

headerAvatarBtn.addEventListener("click", openProfileModal);
closeProfileBtn.addEventListener("click", function () {
  profileModal.classList.remove("open");
});
profileModal.addEventListener("click", function (e) {
  if (e.target === profileModal) profileModal.classList.remove("open");
});

saveProfileBtn.addEventListener("click", function () {
  const trimmed = editNickInput.value.trim();
  if (!trimmed) {
    editErr.textContent = "Введите имя";
    return;
  }
  myProfile = { name: trimmed, status: editStatusInput.value.trim(), avatarIdx: editSelectedAvatar };
  saveProfileLocal();
  saveProfileRemote();
  updateHeaderAvatar();
  profileModal.classList.remove("open");
});

// ==== Список контактов (все зарегистрированные профили, кроме себя) ====
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
      contactsList.innerHTML = '<div id="contactsEmpty" class="emptyHint">Пока никого нет. Позови друзей открыть эту страницу и создать профиль!</div>';
    }
  }, function (error) {
    console.error("Ошибка загрузки контактов:", error);
  });
}

function buildContactItem(contactId, data) {
  const avatar = AVATARS[data.avatarIdx] || AVATARS[0];
  const item = document.createElement("div");
  item.className = "contactItem";

  const avatarEl = document.createElement("div");
  avatarEl.className = "contactAvatar";
  avatarEl.style.background = avatar.color;
  avatarEl.textContent = avatar.emoji;

  const info = document.createElement("div");
  info.className = "contactInfo";
  info.innerHTML =
    '<div class="contactName">' + escapeHtml(data.name || "Без имени") + '</div>' +
    '<div class="contactStatus">' + escapeHtml(data.status || "") + '</div>';

  item.appendChild(avatarEl);
  item.appendChild(info);
  item.addEventListener("click", function () {
    openChat(contactId, data);
  });
  return item;
}

// ==== Переписка 1 на 1 ====
let currentContactId = null;
let messagesUnsub = null;

function getConversationId(idA, idB) {
  return [idA, idB].sort().join("_");
}

function openChat(contactId, data) {
  currentContactId = contactId;
  const avatar = AVATARS[data.avatarIdx] || AVATARS[0];
  chatContactName.textContent = data.name || "Без имени";
  chatContactStatus.textContent = data.status || "";
  chatContactName.style.color = "#191919";
  void avatar;

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
      messagesEl.innerHTML = '<div id="emptyState" class="emptyHint">Сообщений пока нет. Напиши первым!</div>';
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

// ==== Фото: сжатие на клиенте и загрузка в Firebase Storage ====
function compressImage(file, maxSize, quality) {
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
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob); else reject(new Error("Не удалось сжать фото"));
        }, "image/jpeg", quality);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

attachBtn.addEventListener("click", function () {
  fileInput.click();
});

fileInput.addEventListener("change", async function () {
  const file = fileInput.files && fileInput.files[0];
  fileInput.value = "";
  if (!file || !currentContactId) return;

  attachBtn.disabled = true;
  sendBtn.disabled = true;
  uploadStatus.textContent = "Загрузка фото…";

  try {
    const blob = await compressImage(file, 1280, 0.8);
    const convId = getConversationId(myUserId, currentContactId);
    const path = "conversations/" + convId + "/" + Date.now() + "_" + Math.random().toString(36).slice(2) + ".jpg";
    const fileRef = storageRef(storage, path);
    await uploadBytes(fileRef, blob, { contentType: "image/jpeg" });
    const url = await getDownloadURL(fileRef);

    const messagesRef = collection(db, "conversations", convId, "messages");
    await addDoc(messagesRef, {
      imageUrl: url,
      authorId: myUserId,
      createdAt: serverTimestamp()
    });
    uploadStatus.textContent = "";
  } catch (err) {
    console.error("Ошибка загрузки фото:", err);
    uploadStatus.textContent = "Не удалось загрузить фото";
    setTimeout(function () { uploadStatus.textContent = ""; }, 3000);
  } finally {
    attachBtn.disabled = false;
    sendBtn.disabled = false;
  }
});

function renderMessage(data) {
  const mine = data.authorId === myUserId;
  const profile = mine ? myProfile : (contactsMap[data.authorId] || { avatarIdx: 0 });
  const avatar = AVATARS[profile.avatarIdx] || AVATARS[0];

  const row = document.createElement("div");
  row.className = "msgRow " + (mine ? "mine" : "theirs");

  const avatarEl = document.createElement("div");
  avatarEl.className = "rowAvatar";
  avatarEl.style.background = avatar.color;
  avatarEl.textContent = avatar.emoji;

  const bubble = document.createElement("div");
  bubble.className = "msg";

  var time = "";
  if (data.createdAt && data.createdAt.toDate) {
    time = data.createdAt.toDate().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  if (data.imageUrl) {
    bubble.innerHTML =
      '<img class="msgImage" src="' + data.imageUrl + '" alt="фото">' +
      '<span class="imgTime">' + time + '</span>';
    bubble.querySelector("img").addEventListener("click", function () {
      window.open(data.imageUrl, "_blank");
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

updateHeaderAvatar();
