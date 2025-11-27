console.log("[MetaAI Batch] contentScript loaded", window.location.href);

// ====== SELECTORS DOM META.AI ======
const SELECTORS = {
  // editor lexical
  promptInput:
    'div[contenteditable="true"][role="textbox"][aria-label="Ask anything..."]',

  // tombol kirim
  sendButton: 'div[aria-label="Send"][role="button"]',

  // tombol download per media
  downloadButton: 'div[aria-label="Download media"][role="button"]',
};

// ====== STATE ======
let prompts = [];
let currentIndex = 0;
let isRunning = false;

// ====== UI FLOATING PANEL ======

function createPanel() {
  if (document.getElementById("metaAIBatchPanel")) return;

  const panel = document.createElement("div");
  panel.id = "metaAIBatchPanel";

  Object.assign(panel.style, {
    position: "fixed",
    top: "96px",
    right: "20px",
    width: "260px",
    maxWidth: "90vw",
    zIndex: 999999,
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: "11px",
    color: "#e5e7eb",
    borderRadius: "12px",
    boxShadow: "0 18px 45px rgba(0,0,0,0.45)",
    border: "1px solid rgba(51,65,85,0.9)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,0.94))",
    backdropFilter: "blur(14px)",
    overflow: "hidden", // penting buat crop watermark background
  });

  // ====== DI SINI KITA TAMBAH: layer watermark + wrapper konten ======
  panel.innerHTML = `
    <!-- BACKGROUND WATERMARK MF -->
    <div style="
      position:absolute;
      inset:0;
      pointer-events:none;
      display:flex;
      align-items:center;
      justify-content:center;
      opacity:0.06;
    ">
      <span style="
        font-size:52px;
        font-weight:800;
        letter-spacing:0.08em;
        text-transform:uppercase;
        color:#38bdf8;
        text-shadow:0 0 18px rgba(56,189,248,0.7);
      ">
        MF
      </span>
    </div>

    <!-- WRAPPER KONTEN (di atas watermark) -->
    <div style="position:relative; z-index:1;">
      <div id="metaAIBatchPanelHeader" style="
        cursor: move;
        padding: 6px 10px;
        border-radius: 12px 12px 0 0;
        border-bottom: 1px solid rgba(51,65,85,0.85);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        background: radial-gradient(circle at top left, rgba(56,189,248,0.25), transparent 55%);
      ">
        <div style="display:flex; align-items:center; gap:6px;">
          <!-- ICON SVG KECIL / LOGO -->
          <span style="
            display:inline-flex;
            align-items:center;
            justify-content:center;
            height:20px;
            width:20px;
            border-radius:8px;
            border:1px solid rgba(56,189,248,0.7);
            background:rgba(15,23,42,0.95);
          ">
            <svg viewBox="0 0 24 24" width="14" height="14"
              style="display:block; color:#7dd3fc;">
              <defs>
                <linearGradient id="mfBadgeGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#38bdf8"/>
                  <stop offset="100%" stop-color="#22c55e"/>
                </linearGradient>
              </defs>
              <rect x="3" y="3" width="18" height="18" rx="5"
                fill="none"
                stroke="url(#mfBadgeGrad)"
                stroke-width="1.4"/>
              <path d="M8 15V9.5L10 13.5L12 9.5V15"
                fill="none"
                stroke="#e5e7eb"
                stroke-width="1.3"
                stroke-linecap="round"
                stroke-linejoin="round"/>
              <path d="M14 15V9H17"
                fill="none"
                stroke="#e5e7eb"
                stroke-width="1.3"
                stroke-linecap="round"
                stroke-linejoin="round"/>
            </svg>
          </span>
          <span style="
            font-weight:600;
            font-size:11px;
            letter-spacing:0.03em;
            color:#e5e7eb;
          ">
            MetaAI Batch By MF
          </span>
        </div>
        <span id="metaAIBatchMiniStatus" style="
          display:inline-flex;
          align-items:center;
          gap:4px;
          font-size:10px;
          color:#6ee7b7;
        ">
          <span style="
            height:6px;
            width:6px;
            border-radius:999px;
            background:#4ade80;
            box-shadow:0 0 6px rgba(74,222,128,0.8);
          "></span>
          Idle
        </span>
      </div>

      <div style="
        padding:10px;
        border-radius:0 0 12px 12px;
        background:radial-gradient(circle at bottom right, rgba(30,64,175,0.35), transparent 55%);
      ">
        <div style="margin-bottom:8px;">
          <label for="metaAIBatchFileInput" style="
            display:block;
            font-size:10px;
            text-transform:uppercase;
            letter-spacing:0.06em;
            color:rgba(148,163,184,0.95);
            margin-bottom:3px;
          ">
            Prompt file (.txt)
          </label>
          <input
            type="file"
            id="metaAIBatchFileInput"
            accept=".txt"
            style="
              display:block;
              width:100%;
              font-size:10px;
              color:#e5e7eb;
              border-radius:8px;
              border:1px solid rgba(51,65,85,0.95);
              background:rgba(15,23,42,0.9);
              padding:4px 6px;
              box-sizing:border-box;
            "
          />
        </div>

        <div style="display:flex; gap:6px; margin-bottom:8px;">
          <button
            id="metaAIBatchStartBtn"
            style="
              flex:1;
              display:inline-flex;
              align-items:center;
              justify-content:center;
              gap:6px;
              border-radius:8px;
              padding:5px 6px;
              border:1px solid rgba(52,211,153,0.85);
              background:linear-gradient(135deg,#22c55e,#4ade80);
              font-size:11px;
              font-weight:500;
              color:#022c22;
              cursor:pointer;
            ">
            <span style="
              height:6px;
              width:6px;
              border-radius:999px;
              background:#166534;
            "></span>
            Start
          </button>

          <button
            id="metaAIBatchStopBtn"
            style="
              flex:1;
              display:inline-flex;
              align-items:center;
              justify-content:center;
              gap:6px;
              border-radius:8px;
              padding:5px 6px;
              border:1px solid rgba(248,113,113,0.9);
              background:linear-gradient(135deg,#ef4444,#fb7185);
              font-size:11px;
              font-weight:500;
              color:#fef2f2;
              cursor:pointer;
            ">
            <span style="
              height:6px;
              width:6px;
              border-radius:999px;
              background:#7f1d1d;
            "></span>
            Stop
          </button>
        </div>

        <div style="margin-bottom:8px;">
          <div style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            margin-bottom:2px;
          ">
            <span style="
              font-size:10px;
              text-transform:uppercase;
              letter-spacing:0.06em;
              color:rgba(148,163,184,0.95);
            ">
              Status
            </span>
            <span id="metaAIBatchProgressLabel" style="
              font-size:10px;
              color:#e5e7eb;
            ">
              0%
            </span>
          </div>
          <div
            id="metaAIBatchStatus"
            style="
              border-radius:8px;
              border:1px solid rgba(51,65,85,0.95);
              background:rgba(15,23,42,0.9);
              padding:4px 6px;
              max-height:70px;
              overflow-y:auto;
              font-size:10px;
              line-height:1.35;
              color:#e5e7eb;
              white-space:pre-line;
            ">
            Ready.
          </div>
        </div>

        <div>
          <div style="
            height:6px;
            width:100%;
            border-radius:999px;
            background:rgba(15,23,42,0.9);
            border:1px solid rgba(30,64,175,0.75);
            overflow:hidden;
          ">
            <div
              id="metaAIBatchProgressBar"
              style="
                height:100%;
                width:0%;
                border-radius:999px;
                background:linear-gradient(90deg,#38bdf8,#4ade80,#38bdf8);
                transition:width 0.25s ease-out;
              ">
            </div>
          </div>
        </div>

        <!-- WATERMARK by MF + LINK LYNK -->
        <div style="
          margin-top:8px;
          display:flex;
          justify-content:flex-end;
          align-items:center;
          gap:6px;
          opacity:0.95;
        ">
          <!-- Icon watermark -->
          <svg viewBox="0 0 24 24" width="11" height="11" style="opacity:0.85;">
            <circle cx="12" cy="12" r="9"
              fill="none"
              stroke="rgba(148,163,184,0.8)"
              stroke-width="1.2"/>
            <path d="M8 14V10L10 13L12 10V14"
              fill="none"
              stroke="rgba(148,163,184,0.95)"
              stroke-width="1.1"
              stroke-linecap="round"
              stroke-linejoin="round"/>
            <path d="M14 14V10H17"
              fill="none"
              stroke="rgba(148,163,184,0.95)"
              stroke-width="1.1"
              stroke-linecap="round"
              stroke-linejoin="round"/>
          </svg>

          <span style="font-size:9px; color:rgba(148,163,184,0.9);">
            Download for free at 
            <a href="https://lynk.id/feynoir" target="_blank"
              style="color:#7dd3fc; text-decoration:none; font-weight:500;">
              lynk.id/feynoir
            </a>
          </span>
        </div>

      </div>
    </div>
  `;

  document.body.appendChild(panel);
  makePanelDraggable(panel);
  attachPanelEvents();
}

function makePanelDraggable(panel) {
  const header = panel.querySelector("#metaAIBatchPanelHeader");
  let offsetX = 0;
  let offsetY = 0;
  let dragging = false;

  header.addEventListener("mousedown", (e) => {
    dragging = true;
    offsetX = e.clientX - panel.offsetLeft;
    offsetY = e.clientY - panel.offsetTop;
    if (document.body) document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!dragging) return;
    panel.style.left = e.clientX - offsetX + "px";
    panel.style.top = e.clientY - offsetY + "px";
    panel.style.right = "auto";
  });

  document.addEventListener("mouseup", () => {
    dragging = false;
    if (document.body) document.body.style.userSelect = "";
  });
}

function attachPanelEvents() {
  const fileInput = document.getElementById("metaAIBatchFileInput");
  const startBtn = document.getElementById("metaAIBatchStartBtn");
  const stopBtn = document.getElementById("metaAIBatchStopBtn");

  if (fileInput) fileInput.addEventListener("change", handleFileChange);
  if (startBtn) startBtn.addEventListener("click", startAutomation);
  if (stopBtn) stopBtn.addEventListener("click", stopAutomation);
}

function handleFileChange(e) {
  const file = e.target.files[0];
  if (!file) {
    sendStatus("Tidak ada file yang dipilih.");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const text = reader.result;
    prompts = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    currentIndex = 0;
    sendStatus(`File loaded.\nTotal prompts: ${prompts.length}`, 0);
  };
  reader.readAsText(file);
}

function startAutomation() {
  if (!prompts || prompts.length === 0) {
    sendStatus("Belum ada prompt.\nPilih file .txt dulu.");
    return;
  }
  if (isRunning) {
    sendStatus("Automation sudah berjalan.");
    return;
  }

  isRunning = true;
  updateMiniStatus(true);

  sendStatus(
    `Mulai automation.\nTotal prompts: ${prompts.length}`,
    (currentIndex / prompts.length) * 100
  );
  runNextPrompt();
}

function stopAutomation() {
  isRunning = false;
  updateMiniStatus(false);
  sendStatus("Automation dihentikan oleh user.");
}

// ====== STATUS HELPER ======
function sendStatus(text, progress = null) {
  const statusEl = document.getElementById("metaAIBatchStatus");
  const progressFill = document.getElementById("metaAIBatchProgressBar");
  const progressLabel = document.getElementById("metaAIBatchProgressLabel");

  if (statusEl) {
    statusEl.textContent = text;
    statusEl.scrollTop = statusEl.scrollHeight;
  }

  if (typeof progress === "number") {
    const clamped = Math.max(0, Math.min(100, progress));
    if (progressFill) {
      progressFill.style.width = clamped + "%";
    }
    if (progressLabel) {
      progressLabel.textContent = clamped.toFixed(0) + "%";
    }
  }
}

function updateMiniStatus(running) {
  const mini = document.getElementById("metaAIBatchMiniStatus");
  if (!mini) return;

  if (running) {
    mini.innerHTML = `
      <span style="
        height:6px;
        width:6px;
        border-radius:999px;
        background:#4ade80;
        box-shadow:0 0 6px rgba(74,222,128,0.8);
      "></span>
      Running
    `;
  } else {
    mini.innerHTML = `
      <span style="
        height:6px;
        width:6px;
        border-radius:999px;
        background:#9ca3af;
      "></span>
      Idle
    `;
  }
}

function log(...args) {
  console.log("[MetaAI Batch]", ...args);
}

// ====== DOM HELPERS ======
function waitForElement(selector, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(selector);
    if (existing) return resolve(existing);

    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error("Timeout waiting for element: " + selector));
    }, timeoutMs);
  });
}

function getDownloadButtons() {
  return Array.from(document.querySelectorAll(SELECTORS.downloadButton));
}

function getLatestDownloadButton() {
  const buttons = getDownloadButtons();
  if (!buttons || buttons.length === 0) return null;
  return buttons[buttons.length - 1];
}

// ====== CORE AUTOMATION ======
async function typePrompt(promptText) {
  const editor = await waitForElement(SELECTORS.promptInput, 15000);

  editor.focus();

  const selection = window.getSelection();
  selection.removeAllRanges();
  const range = document.createRange();
  range.selectNodeContents(editor);
  selection.addRange(range);
  document.execCommand("delete", false, null);

  document.execCommand("insertText", false, promptText);

  editor.dispatchEvent(new InputEvent("input", { bubbles: true }));

  // kasih waktu Lexical update state
  await new Promise((res) => setTimeout(res, 800));
}

async function clickSend() {
  const btn = await waitForElement(SELECTORS.sendButton, 15000);

  let tries = 0;
  while (tries < 50) {
    const isDisabledAttr = btn.getAttribute("aria-disabled");
    const isDisabled =
      isDisabledAttr === "true" || btn.hasAttribute("disabled");
    const cursor = window.getComputedStyle(btn).cursor;

    if (!isDisabled && cursor !== "not-allowed") break;

    await new Promise((res) => setTimeout(res, 100));
    tries++;
  }

  btn.click();
  log("Send clicked");
}

async function waitForResultAndDownload(prevLastButton, timeoutMs = 120000) {
  const start = Date.now();
  log(
    "Waiting for new download button element (prevLastButton):",
    prevLastButton
  );

  while (Date.now() - start < timeoutMs) {
    const latest = getLatestDownloadButton();

    if (!latest) {
      await new Promise((res) => setTimeout(res, 1000));
      continue;
    }

    // tombol baru = elemen terakhir berbeda dari sebelumnya
    if (latest !== prevLastButton) {
      latest.click();
      log("Clicked new Download media button.");
      await new Promise((res) => setTimeout(res, 1200));
      return;
    }

    await new Promise((res) => setTimeout(res, 1000));
  }

  throw new Error("Timeout waiting for new download button element");
}

async function runNextPrompt() {
  if (!isRunning) {
    log("Automation stopped.");
    return;
  }

  if (currentIndex >= prompts.length) {
    sendStatus(`Selesai! Semua ${prompts.length} prompt telah diproses.`, 100);
    isRunning = false;
    updateMiniStatus(false);
    return;
  }

  const promptText = prompts[currentIndex];
  const total = prompts.length;

  sendStatus(
    `Prompt ${currentIndex + 1} dari ${total}\nMengetik prompt...`,
    Math.round((currentIndex / total) * 100)
  );
  log(`Prompt ${currentIndex + 1}/${total}:`, promptText.slice(0, 80));

  try {
    // simpan tombol download terakhir sebelum kirim prompt
    const prevLastDownloadBtn = getLatestDownloadButton();

    await typePrompt(promptText);

    sendStatus(
      `Prompt ${currentIndex + 1}: Mengirim prompt...`,
      Math.round((currentIndex / total) * 100)
    );
    await clickSend();

    sendStatus(`Prompt ${currentIndex + 1}: Menunggu hasil generate...`);
    await waitForResultAndDownload(prevLastDownloadBtn);

    sendStatus(
      `Prompt ${currentIndex + 1}: Sudah di-download.`,
      Math.round(((currentIndex + 1) / total) * 100)
    );
  } catch (err) {
    console.error("Error in cycle:", err);
    sendStatus(
      `Error di prompt ${currentIndex + 1}.\nLanjut ke prompt berikutnya...`
    );
  }

  currentIndex += 1;

  await new Promise((res) => setTimeout(res, 1800));

  runNextPrompt();
}

// ====== INIT ======
createPanel();
