// --- Safe DOM get ---
const $ = (id) => document.getElementById(id);

// Grab elements (they may be null if HTML changed)
const nameEl = $('name');
const urlEl = $('url');
const metadataContainer = $('metadataContainer');
const selectedMetadataEl = $('selectedMetadata');
const xExtras = $('xExtras');
const xCount = $('xCount');
const pinterestExtras = $('pinterestExtras');
const pinterestTitleEl = $('pinterestTitle');
const boardEl = $('board');
const altTextEl = $('altText');
const postBtn = $('postAll');
const statusEl = $('status');
const mediaPreview = $('mediaPreview');
const previewTitle = $('previewTitle');
const previewDesc = $('previewDesc');
const platformToggles = $('platformToggles');
const uploader = $('uploader');
const fileInput = $('fileInput');
const pickFileBtn = $('pickFile');
const clearFileBtn = $('clearFile');
const resultEl = $('result');

// Guard: if critical nodes are missing, bail gracefully
function assert(el, id) {
  if (!el) console.warn(`[UI] Missing #${id}`);
  return !!el;
}

// Wrap all wiring so we don’t call addEventListener on nulls
function initUI() {
  // Wire platform toggles
  if (assert(platformToggles, 'platformToggles')) {
    platformToggles.querySelectorAll('.toggle').forEach(btn => {
      btn.addEventListener('click', () => togglePlatform(btn));
    });
  }

  // Inputs
  if (assert(nameEl, 'name')) nameEl.addEventListener('input', updatePreview);
  if (assert(urlEl, 'url')) urlEl.addEventListener('input', updatePreview);

  if (assert(pinterestTitleEl, 'pinterestTitle')) {
    pinterestTitleEl.addEventListener('input', (e) => {
      if (altTextEl && !altTextEl.value) altTextEl.value = e.target.value.slice(0, 100);
      updatePreview();
    });
  }
  if (assert(altTextEl, 'altText')) altTextEl.addEventListener('input', updatePreview);

  // Uploader
  if (assert(pickFileBtn, 'pickFile') && assert(fileInput, 'fileInput')) {
    pickFileBtn.addEventListener('click', () => fileInput.click());
  }
  if (assert(clearFileBtn, 'clearFile')) {
    clearFileBtn.addEventListener('click', () => {
      chosenFile = null;
      if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = null; }
      clearFileBtn.disabled = true;
      updatePreview();
    });
  }
  if (assert(fileInput, 'fileInput')) {
    fileInput.addEventListener('change', handleFiles);
  }
  if (assert(uploader, 'uploader')) {
    ['dragenter','dragover'].forEach(evt => uploader.addEventListener(evt, e => {
      e.preventDefault(); e.stopPropagation(); uploader.classList.add('drag');
    }));
    ['dragleave','drop'].forEach(evt => uploader.addEventListener(evt, e => {
      e.preventDefault(); e.stopPropagation(); uploader.classList.remove('drag');
    }));
    uploader.addEventListener('drop', (e) => {
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      if (f && fileInput) { fileInput.files = e.dataTransfer.files; handleFiles(); }
    });
  }

  // Post button
  if (assert(postBtn, 'postAll')) {
    postBtn.addEventListener('click', handlePostAll);
  }

  // Build hashtag chips only if container exists
  if (assert(metadataContainer, 'metadataContainer')) initHashtags();

  // Boards dropdown (robust JSON parsing)
  if (assert(boardEl, 'board')) fetchBoards();

  updatePreview();
}

// Robust /boards fetch: detect accidental HTML
async function fetchBoards() {
  try {
    const res = await fetch('/boards', { headers: { 'Accept': 'application/json' } });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Got HTML or non-JSON -> show first chars for diagnosis
      throw new Error(`Expected JSON from /boards, got: ${text.slice(0, 80)}…`);
    }
    if (!Array.isArray(data)) throw new Error('Boards response is not an array');

    boardEl.innerHTML = '<option value="">Select a board</option>';
    data.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      boardEl.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    if (boardEl) boardEl.innerHTML = '<option value="">Error loading boards</option>';
    if (resultEl) resultEl.textContent = 'Could not load boards. Check your functions/boards.js route and token.';
  }
  refreshPostEnabled();
}

// Call init as soon as the DOM is parsed (defer should guarantee this; extra safety here)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUI);
} else {
  initUI();
}
