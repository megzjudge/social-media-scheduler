/* script.js — flat routes + robust wiring */
"use strict";

// ===== Globals / State =====
const metadataOptions = ["mbti","mbtimemes","entp","entj","intp","intj"];
const selectedMetadata = [];
const selectedPlatforms = new Set();

let chosenFile = null;   // File object (only kept locally for preview)
let objectUrl  = null;   // object URL for preview (revoked when cleared)

// ===== DOM helpers =====
const $ = (id) => document.getElementById(id);
function assert(el, id) { if (!el) console.warn(`[UI] Missing #${id}`); return !!el; }

// Elements
const nameEl            = $("name");
const urlEl             = $("url");
const metadataContainer = $("metadataContainer");
const selectedMetadataEl= $("selectedMetadata");

const xExtras           = $("xExtras");
const xCount            = $("xCount");

const pinterestExtras   = $("pinterestExtras");
const pinterestTitleEl  = $("pinterestTitle");
const boardEl           = $("board");
const altTextEl         = $("altText");

const postBtn           = $("postAll");
const statusEl          = $("status");

const mediaPreview      = $("mediaPreview");
const previewTitle      = $("previewTitle");
const previewDesc       = $("previewDesc");

const platformToggles   = $("platformToggles");

const uploader          = $("uploader");
const fileInput         = $("fileInput");
const pickFileBtn       = $("pickFile");
const clearFileBtn      = $("clearFile");

const resultEl          = $("result");

// ===== Utils =====
const log = (msg) => { if (statusEl) { statusEl.textContent += `${msg}\n`; statusEl.scrollTop = statusEl.scrollHeight; } };
const escapeHtml = (s) => s.replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));

// Caption builder
function hashtagsString(){ return selectedMetadata.map(t => `#${t}`).join(" "); }
function composedCaption(){
  const text = nameEl?.value?.trim() || "";
  const url  = urlEl?.value?.trim() || "";
  return [text, hashtagsString(), url].filter(Boolean).join(" ");
}

// ===== Core UI funcs (defined BEFORE wiring to avoid undefined errors) =====
function updatePreview(){
  const caption = composedCaption();
  const captionEl = document.getElementById("previewCaption");
  if (captionEl) captionEl.textContent = caption || "—";

  // media
  const mediaPreview = document.getElementById("mediaPreview");
  if (mediaPreview) {
    if (objectUrl) {
      mediaPreview.innerHTML = "";
      const img = document.createElement("img");
      img.src = objectUrl;
      img.alt = (altTextEl?.value || pinterestTitleEl?.value || nameEl?.value || "Uploaded image");
      mediaPreview.appendChild(img);
    } else if (urlEl?.value) {
      mediaPreview.innerHTML = "";
      const img = document.createElement("img");
      img.src = urlEl.value;
      img.alt = (altTextEl?.value || pinterestTitleEl?.value || nameEl?.value || "Linked image");
      mediaPreview.appendChild(img);
    } else {
      mediaPreview.innerHTML = '<span class="muted">No image yet</span>';
    }
  }

  // X character counter
  const remaining = 280 - caption.length;
  if (xCount) {
    xCount.textContent = remaining;
    xCount.classList.toggle("danger", remaining < 0);
  }

  refreshPostEnabled();
}

function refreshPostEnabled(){
  const hasPlatform = selectedPlatforms.size > 0;
  const hasTitle    = !!(nameEl && nameEl.value.trim());
  const xValid = !selectedPlatforms.has("x") || (280 - composedCaption().length >= 0);
  const pinterestValid = !selectedPlatforms.has("pinterest") ||
                         ( (pinterestTitleEl && pinterestTitleEl.value.trim()) && (boardEl && boardEl.value) );

  if (postBtn) postBtn.disabled = !(hasPlatform && hasTitle && xValid && pinterestValid);
}

function togglePlatform(btn){
  const platform = btn.dataset.platform;
  const active   = btn.getAttribute("data-active") === "true";
  const now      = !active;
  btn.setAttribute("data-active", String(now));
  btn.setAttribute("aria-pressed", String(now));
  if (now) selectedPlatforms.add(platform); else selectedPlatforms.delete(platform);

  if (xExtras)        xExtras.style.display        = selectedPlatforms.has("x") ? "" : "none";
  if (pinterestExtras)pinterestExtras.style.display= selectedPlatforms.has("pinterest") ? "" : "none";

  refreshPostEnabled();
}

function handleFiles(){
  const f = fileInput?.files && fileInput.files[0];
  if (!f) return;
  chosenFile = f;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(f);
  if (clearFileBtn) clearFileBtn.disabled = false;
  updatePreview();
}

// ===== Hashtag chips =====
function initHashtags(){
  if (!metadataContainer) return;
  metadataOptions.forEach(option => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "metadata-option";
    btn.textContent = option;
    btn.setAttribute("aria-pressed","false");
    btn.addEventListener("click", ()=>{
      const idx = selectedMetadata.indexOf(option);
      if (idx >= 0) {
        selectedMetadata.splice(idx,1);
        btn.classList.remove("selected");
        btn.setAttribute("aria-pressed","false");
      } else {
        selectedMetadata.push(option);
        btn.classList.add("selected");
        btn.setAttribute("aria-pressed","true");
      }
      if (selectedMetadataEl) selectedMetadataEl.value = selectedMetadata.join(" ");
      updatePreview();
    });
    metadataContainer.appendChild(btn);
  });
}

// ===== Boards (flat route /boards) =====
async function fetchBoards(){
  if (!boardEl) return;
  try {
    const res  = await fetch("/boards", { headers: { "Accept": "application/json" } });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } 
    catch { throw new Error(`Expected JSON from /boards, got: ${text.slice(0, 60)}…`); }

    if (!Array.isArray(data)) throw new Error("Boards response is not an array");
    boardEl.innerHTML = '<option value="">Select a board</option>';
    data.forEach(b => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.name;
      boardEl.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    boardEl.innerHTML = '<option value="">Error loading boards</option>';
    if (resultEl) resultEl.textContent = "Could not load boards. Check your functions/boards.js and token.";
  }
  refreshPostEnabled();
}

// ===== Upload (flat route /upload). NOTE: we DO NOT upload on choose; only on Post. =====
async function uploadMediaIfNeeded(){
  // If a local file was picked, upload now (when posting)
  if (chosenFile) {
    const fd = new FormData();
    fd.append("file", chosenFile);
    const res = await fetch("/upload", { method: "POST", body: fd });
    const data = await res.json().catch(()=> ({}));
    if (!res.ok) throw new Error(data?.error || `Upload failed (${res.status})`);
    if (!data.url) throw new Error("Upload returned no URL");
    return data.url; // public HTTPS URL for Pinterest to fetch
  }
  // If no file, but URL provided, use that
  if (urlEl?.value) return urlEl.value.trim();
  // Nothing to post
  return null;
}

// ===== Post to selected =====
async function handlePostAll(){
  if (!statusEl) return;
  statusEl.textContent = "";

  const title   = nameEl?.value?.trim() || "";
  const caption = composedCaption();
  let mediaUrl  = null;

  try {
    mediaUrl = await uploadMediaIfNeeded(); // Upload only now, not earlier.
  } catch (e) {
    log(`Upload error: ${e?.message || e}`);
    return;
  }

  const targets = Array.from(selectedPlatforms);
  if (targets.length === 0) { log("No platforms selected."); return; }

  log(`Preparing to post to: ${targets.join(", ")}`);

  const tasks = targets.map(p => postToPlatform(p, { title, caption, mediaUrl }));
  const results = await Promise.allSettled(tasks);
  results.forEach((r,i)=> {
    const p = targets[i];
    if (r.status === "fulfilled") log(`[${p}] ✓ ${r.value}`);
    else log(`[${p}] ✗ ${r.reason?.message || r.reason}`);
  });
}

async function postToPlatform(platform, base){
  if (platform === "pinterest") {
    const payload = {
      title: (pinterestTitleEl?.value?.trim() || base.title),
      boardId: (boardEl?.value || ""),
      description: base.caption,
      mediaUrl: base.mediaUrl,
      altText: (altTextEl?.value?.trim() || pinterestTitleEl?.value?.trim() || base.title),
    };
    if (!payload.boardId) throw new Error("Missing Pinterest board");

    const res = await fetch("/pinterest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(()=> ({}));
    if (!res.ok) throw new Error(j.error || "Pinterest error");
    // Optional: clear local temp preview (object URL)
    if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
    chosenFile = null;
    if (clearFileBtn) clearFileBtn.disabled = true;
    updatePreview();
    return `Pin created (id: ${j.pinId || "unknown"})`;
  }

  if (platform === "x")         throw new Error("X posting not wired yet");
  if (platform === "instagram") throw new Error("Instagram posting not wired yet");
  if (platform === "facebook")  throw new Error("Facebook posting not wired yet");
  throw new Error("Unknown platform");
}

// ===== Init wiring (safe) =====
function initUI(){
  // Platform toggles
  if (assert(platformToggles, "platformToggles")) {
    platformToggles.querySelectorAll(".toggle").forEach(btn => {
      btn.addEventListener("click", () => togglePlatform(btn));
    });
  }

  // Inputs & counters
  if (assert(nameEl, "name")) nameEl.addEventListener("input", updatePreview);
  if (assert(urlEl, "url"))   urlEl.addEventListener("input", updatePreview);

  if (assert(pinterestTitleEl, "pinterestTitle")) {
    pinterestTitleEl.addEventListener("input", (e)=>{
      if (altTextEl && !altTextEl.value) altTextEl.value = e.target.value.slice(0,100);
      updatePreview();
    });
  }
  if (assert(altTextEl, "altText")) altTextEl.addEventListener("input", updatePreview);

  // Uploader (no duplicates created here)
  if (assert(pickFileBtn, "pickFile") && assert(fileInput, "fileInput")) {
    pickFileBtn.addEventListener("click", () => fileInput.click());
  }
  if (assert(clearFileBtn, "clearFile")) {
    clearFileBtn.addEventListener("click", () => {
      chosenFile = null;
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
      clearFileBtn.disabled = true;
      updatePreview();
    });
  }
  if (assert(fileInput, "fileInput")) {
    fileInput.addEventListener("change", handleFiles);
  }
  if (assert(uploader, "uploader")) {
    ["dragenter","dragover"].forEach(evt => uploader.addEventListener(evt, e=>{
      e.preventDefault(); e.stopPropagation(); uploader.classList.add("drag");
    }));
    ["dragleave","drop"].forEach(evt => uploader.addEventListener(evt, e=>{
      e.preventDefault(); e.stopPropagation(); uploader.classList.remove("drag");
    }));
    uploader.addEventListener("drop", (e)=>{
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && fileInput) { fileInput.files = e.dataTransfer.files; handleFiles(); }
    });
  }

  // Post button
  if (assert(postBtn, "postAll")) postBtn.addEventListener("click", handlePostAll);

  // Hashtag chips
  if (assert(metadataContainer, "metadataContainer")) initHashtags();

  // Boards
  if (assert(boardEl, "board")) fetchBoards();

  // First paint
  updatePreview();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUI);
} else {
  initUI();
}
