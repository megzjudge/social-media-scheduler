"use strict";

// Hashtag options (without #)
const metadataOptions = ["mbti", "mbtimemes", "entp", "entj", "intp", "intj"];
const selectedMetadata = new Set();

// DOM
const metadataContainer = document.getElementById("metadataContainer");
const resultEl = document.getElementById("result");
const titleEl = document.getElementById("pinterestTitle");
const altEl = document.getElementById("altText");
const boardSelect = document.getElementById("board");
const urlEl = document.getElementById("url");
const nameEl = document.getElementById("name");
const hiddenSelected = document.getElementById("selectedMetadata");
const form = document.getElementById("postForm");

// A11y status region
resultEl.setAttribute("role", "status");
resultEl.setAttribute("aria-live", "polite");

// Build accessible “chips”
(function initChips() {
  metadataOptions.forEach((opt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "metadata-option";
    btn.textContent = opt;
    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", () => toggleChip(opt, btn));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleChip(opt, btn);
      }
    });
    metadataContainer.appendChild(btn);
  });
})();

function toggleChip(opt, btn) {
  if (selectedMetadata.has(opt)) {
    selectedMetadata.delete(opt);
    btn.setAttribute("aria-pressed", "false");
    btn.classList.remove("selected");
  } else {
    selectedMetadata.add(opt);
    btn.setAttribute("aria-pressed", "true");
    btn.classList.add("selected");
  }
  hiddenSelected.value = [...selectedMetadata].join(" ");
}

// Mirror title -> alt text; clamp to 500
titleEl.addEventListener("input", (e) => {
  const val = e.target.value.slice(0, 100); // Pinterest title ~100 chars
  if (e.target.value !== val) e.target.value = val;
  const autoAlt = val.slice(0, 500);
  if (altEl.value === "" || document.activeElement !== altEl) {
    altEl.value = autoAlt;
  }
});

// Fetch boards on load
(async function fetchBoards() {
  try {
    const r = await fetch("/api/boards", { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error(`Boards error ${r.status}`);
    const boards = await r.json();
    boardSelect.innerHTML = '<option value="">Select a board</option>';
    boards.forEach((b) => {
      const opt = document.createElement("option");
      opt.value = b.id;
      opt.textContent = b.name;
      boardSelect.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    boardSelect.innerHTML = '<option value="">Error loading boards</option>';
    resultEl.textContent = "Could not load boards. Check your API token/server.";
  }
})();

// Submit: validate + post
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  resultEl.textContent = "Posting to Pinterest…";

  // Basic validations
  const title = titleEl.value.trim();
  const boardId = boardSelect.value.trim();
  const mediaUrl = urlEl.value.trim();
  const nameVal = nameEl.value.trim();
  const altText = altEl.value.trim().slice(0, 500);

  if (!title || !boardId || !mediaUrl) {
    resultEl.textContent = "Please fill Title, Media URL, and select a Board.";
    return;
  }

  // Description: name + hashtags (space-separated) (<= 500)
  const hashtags = [...selectedMetadata].map((t) => `#${t}`).join(" ");
  const description = `${nameVal} ${hashtags}`.trim().slice(0, 500);

  try {
    const response = await fetch("/api/post", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ title, boardId, description, mediaUrl, altText }),
    });

    const contentType = response.headers.get("content-type") || "";
    const data =
      contentType.includes("application/json") ? await response.json() : {};

    if (response.ok) {
      resultEl.textContent = `✅ Success! Pin ID: ${data.pinId || "(unknown)"}`;
      form.reset();
      hiddenSelected.value = "";
      [...metadataContainer.querySelectorAll(".metadata-option")].forEach((b) => {
        b.classList.remove("selected");
        b.setAttribute("aria-pressed", "false");
      });
      altEl.value = "";
    } else {
      resultEl.textContent = `❌ Error: ${data.error || response.statusText}`;
    }
  } catch (error) {
    resultEl.textContent = `❌ Network error: ${error.message}`;
  }
});
