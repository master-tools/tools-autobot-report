javascript:(() => {
  "use strict";

  const APP = {
    NAME: "Instan Multi Report",
    VERSION: "Tools Auto Report"
  };

  const NS = "__IRDG_V736_SAFE_BROWSING_ERROR_RETRY_FLOW__";

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const now = () => Date.now();
  const norm = (v) => String(v || "").replace(/\s+/g, " ").trim().toLowerCase();
  const limit = (v, n) => String(v || "").slice(0, Math.max(0, n | 0));

  const state = (() => {
    const root = window[NS] || (window[NS] = Object.create(null));
    if (!root.gsc) root.gsc = { busy: false, noteText: "" };
    if (!root.sb) root.sb = { busy: false, submitted: false };
    if (!root.gd) root.gd = { busy: false, noteText: "" };
    return root;
  })();

  const makeCleanup = () => {
    const stack = [];
    return {
      add(fn) {
        if (typeof fn === "function") stack.push(fn);
        return fn;
      },
      run() {
        while (stack.length) {
          const fn = stack.pop();
          try { fn(); } catch (_) {}
        }
      }
    };
  };

  const isVisible = (el) => {
    if (!el) return false;
    try {
      const rect = el.getBoundingClientRect?.();
      const rects = el.getClientRects?.();
      const cs = getComputedStyle(el);
      if (!rects || !rects.length) return false;
      if (!rect || rect.width <= 0 || rect.height <= 0) return false;
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity || 1) <= 0) return false;
      return true;
    } catch (_) {
      return true;
    }
  };

  const isDisabled = (el) => {
    if (!el) return true;
    try {
      if (el.disabled) return true;
      if (el.matches?.("[disabled], [aria-disabled='true']")) return true;
      const attr = String(el.getAttribute?.("aria-disabled") || "").toLowerCase();
      return attr === "true";
    } catch (_) {
      return false;
    }
  };

  const qsa = (sel, root = document) => {
    try {
      return Array.from(root.querySelectorAll(sel));
    } catch (_) {
      return [];
    }
  };

  const pick = (sel, root = document, visibleOnly = false) => {
    const all = qsa(sel, root);
    if (!all.length) return null;
    if (!visibleOnly) return all[0] || null;
    return all.find(isVisible) || all[0] || null;
  };

  const waitFor = async (fn, timeoutMs = 12000, stepMs = 100) => {
    const start = now();
    while (now() - start < timeoutMs) {
      let out = null;
      try {
        out = fn();
      } catch (_) {
        out = null;
      }
      if (out) return out;
      await sleep(stepMs);
    }
    return null;
  };

  const waitTruthy = async (fn, timeoutMs = 12000, stepMs = 100) => {
    const start = now();
    while (now() - start < timeoutMs) {
      let ok = false;
      try {
        ok = !!fn();
      } catch (_) {
        ok = false;
      }
      if (ok) return true;
      await sleep(stepMs);
    }
    return false;
  };

  const getValueSetter = (el) => {
    try {
      let proto = el;
      while ((proto = Object.getPrototypeOf(proto))) {
        const desc = Object.getOwnPropertyDescriptor(proto, "value");
        if (desc && typeof desc.set === "function") return desc.set;
      }
    } catch (_) {}
    return null;
  };

  const hardInput = (el, value) => {
    if (!el) return false;
    const next = String(value ?? "");
    try { el.focus?.({ preventScroll: true }); } catch (_) {}
    try {
      const setter = getValueSetter(el);
      if (setter) setter.call(el, next);
      else el.value = next;
    } catch (_) {
      try {
        el.value = next;
      } catch (_) {
        return false;
      }
    }
    const fire = (ev) => {
      try { el.dispatchEvent(ev); } catch (_) {}
    };
    try {
      fire(new InputEvent("beforeinput", { bubbles: true, composed: true, data: next, inputType: "insertText" }));
    } catch (_) {}
    try {
      fire(new InputEvent("input", { bubbles: true, composed: true, data: next, inputType: "insertFromPaste" }));
    } catch (_) {
      fire(new Event("input", { bubbles: true }));
    }
    fire(new Event("change", { bubbles: true }));
    try {
      el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "End" }));
      el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "End" }));
    } catch (_) {}
    return true;
  };

  const inputReflects = (el, value) => {
    try {
      return String(el?.value || "") === String(value || "");
    } catch (_) {
      return false;
    }
  };

  const setInputStable = async (el, value, tries = 8) => {
    if (!el) return false;
    const next = String(value ?? "");
    for (let i = 0; i < tries; i++) {
      hardInput(el, next);
      await sleep(70 + i * 20);
      if (inputReflects(el, next)) return true;
    }
    return inputReflects(el, next);
  };

  const realClick = (el) => {
    if (!el) return false;
    try { el.scrollIntoView?.({ block: "center", inline: "center" }); } catch (_) {}
    try { el.focus?.({ preventScroll: true }); } catch (_) {}
    try {
      const rect = el.getBoundingClientRect?.();
      if (rect && rect.width > 0 && rect.height > 0) {
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const init = { bubbles: true, cancelable: true, composed: true, clientX: cx, clientY: cy, button: 0, buttons: 1, view: window };
        try { el.dispatchEvent(new PointerEvent("pointerdown", { ...init, pointerId: 1, isPrimary: true, pointerType: "mouse" })); } catch (_) {}
        try { el.dispatchEvent(new MouseEvent("mousedown", init)); } catch (_) {}
        try { el.dispatchEvent(new PointerEvent("pointerup", { ...init, pointerId: 1, isPrimary: true, pointerType: "mouse" })); } catch (_) {}
        try { el.dispatchEvent(new MouseEvent("mouseup", init)); } catch (_) {}
      }
    } catch (_) {}
    try {
      el.click();
      return true;
    } catch (_) {}
    try {
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, composed: true, view: window }));
      return true;
    } catch (_) {
      return false;
    }
  };

  const clickAndVerify = async (getEl, verifyFn, tries = 6, afterMs = 250) => {
    for (let i = 0; i < tries; i++) {
      const el = typeof getEl === "function" ? getEl() : getEl;
      if (!el || isDisabled(el)) {
        await sleep(100 + i * 20);
        continue;
      }
      realClick(el);
      await sleep(afterMs + i * 40);
      try {
        if (verifyFn()) return true;
      } catch (_) {}
    }
    try {
      return !!verifyFn();
    } catch (_) {
      return false;
    }
  };

  const normalizeUrl = (value) => {
    let raw = String(value || "").trim();
    if (!raw) return "";
    if (!/^https?:\/\//i.test(raw) && /^[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(raw)) raw = "https://" + raw;
    try {
      const url = new URL(raw);
      const protocol = String(url.protocol || "").toLowerCase();
      if (protocol !== "http:" && protocol !== "https:") return "";
      url.hash = "";
      return url.toString();
    } catch (_) {
      return "";
    }
  };

  const parseUrlList = (input) => {
    const raw = String(input || "");
    const chunks = raw.split(/[\n,;]+/).map((s) => String(s || "").trim()).filter(Boolean);
    const invalid = [];
    const urls = [];
    const seen = new Set();
    for (const part of chunks) {
      const url = normalizeUrl(part);
      if (!url) {
        invalid.push(part);
        continue;
      }
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push(url);
    }
    return { urls, invalid, total: chunks.length };
  };

  const promptUrls = () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      const raw = prompt("Masukkan 1-10 URL. Bisa pisah baris / koma / titik koma:", "");
      if (raw == null) return null;
      const parsed = parseUrlList(raw);
      if (parsed.invalid.length) {
        alert("Ada URL tidak valid. Rapikan dulu lalu jalankan lagi.\n\nContoh bermasalah:\n" + parsed.invalid.slice(0, 5).join("\n"));
        continue;
      }
      if (!parsed.urls.length) {
        alert("URL kosong atau tidak valid.");
        continue;
      }
      if (parsed.urls.length > 10) {
        alert("Maksimal 10 URL per batch. Saat ini terbaca " + parsed.urls.length + " URL unik.");
        continue;
      }
      const preview = parsed.urls.map((u, i) => (i + 1) + ". " + u).join("\n");
      if (confirm("Proses " + parsed.urls.length + " URL ini?\n\n" + preview)) return parsed.urls;
    }
    return [];
  };

  const pickByWords = (words, selector = "button,[role='button']", root = document) => {
    const nodes = qsa(selector, root).filter(isVisible);
    return nodes.find((el) => {
      const text = norm([el.textContent, el.getAttribute?.("aria-label"), el.getAttribute?.("title")].filter(Boolean).join(" "));
      return words.some((w) => text.includes(norm(w)));
    }) || null;
  };

  const runGSC = async () => {
    const KEY = state.gsc;

    const CFG = {
      ROOTS: [
        'c-wiz[jsname="a9kxte"]',
        'div[jsname="a9kxte"]',
        'form',
        'body'
      ],
      URL_INPUTS: [
        'input[type="url"]',
        'input[autocomplete="url"]',
        'input[type="text"][aria-label*="url" i]',
        'input[aria-label*="URL" i]'
      ].join(","),
      STEP1_OPTIONS: '[role="option"], [role="radio"], mat-radio-button',
      STEP2_LISTBOX: 'div[jsname="Qqpt6d"][role="listbox"], [role="listbox"][aria-multiselectable="true"]',
      STEP2_OPTIONS: '[jsname="JIbuQc"][role="option"], [role="option"]',
      STEP2_LABEL: '[jsname="ODzDMd"], .VfPpkd-StrnGf-rymPhb-b9t22c, .mdc-list-item__primary-text',
      STEP2_TEXTAREA: 'textarea[maxlength], textarea[jsname="YPqjbf"], textarea',
      CONTINUE_WORDS: ["continue", "next", "lanjutkan", "berikutnya"],
      SEND_WORDS: ["send", "submit", "kirim"],
      DONE_WORDS: ["done", "selesai", "oke", "ok", "tutup"],
      AGAIN_WORDS: ["report another", "another report", "new report", "submit another", "laporkan halaman lain", "buat laporan baru", "lapor lagi"],
      SUCCESS_WORDS: ["thank", "terima kasih", "submitted", "terkirim"],
      STEP1_GOOD: [
        "the page displays spammy content",
        "halaman menampilkan konten berisi spam",
        "spammy content",
        "konten berisi spam"
      ],
      STEP1_BAD: [
        "the page engages in a spammy behavior",
        "halaman ini terlibat dalam perilaku spam",
        "the page is deceptive",
        "halaman ini menipu",
        "the page is low quality",
        "halaman ini berkualitas rendah",
        "the page contains inorganic links",
        "halaman ini berisi link non-organik",
        "other",
        "lainnya"
      ],
      STEP1_DESC_GROUPS: [
        ["irrelevant", "useless", "exploit", "relevant result"],
        ["tidak relevan", "tidak bermanfaat", "mengeksploitasi", "hasil yang relevan"]
      ],
      STEP2_SUBCATS: ["7", "8", "9", "10", "4", "11"],
      STEP2_ALIASES: {
        "7": ["scraped content", "konten salinan"],
        "8": ["scaled content abuse", "penyalahgunaan konten berskala besar"],
        "9": ["keyword stuffing", "penjejalan kata kunci"],
        "10": ["thin affiliate pages", "halaman afiliasi tipis"],
        "4": ["hacked pages", "halaman yang diretas"],
        "11": ["user-generated spam", "spam buatan pengguna"]
      }
    };

    const getRoot = () => CFG.ROOTS.map((sel) => pick(sel, document, true)).find(Boolean) || document.body || document.documentElement || document;
    const getUrlInputs = (root = document) => qsa(CFG.URL_INPUTS, root).filter((el) => !isDisabled(el));
    const pickUrlInput = (root = document) => {
      const list = getUrlInputs(root);
      if (!list.length) return null;
      const visible = list.filter(isVisible);
      const usable = visible.length ? visible : list;
      return usable.find((el) => !norm(el.value)) || usable[0] || null;
    };

    const getContinueBtn = (root = document) => pick('button[jsname="EwKiCc"]', root, true) || pickByWords(CFG.CONTINUE_WORDS, "button,[role='button']", root);
    const getSendBtn = (root = document) => pick('button[jsname="sFeBqf"]', root, true) || pickByWords(CFG.SEND_WORDS, "button,[role='button']", root);
    const getStep2Listbox = (root = document) => pick(CFG.STEP2_LISTBOX, root, true);
    const getStep2Textarea = (root = document) => pick(CFG.STEP2_TEXTAREA, root, true);
    const getSuccessDialog = (root = document) => {
      const dialogs = qsa('div[role="alertdialog"], div[role="dialog"]', root).filter(isVisible);
      return dialogs.find((dlg) => CFG.SUCCESS_WORDS.some((x) => norm(dlg.textContent).includes(norm(x)))) || null;
    };
    const getDoneBtn = (root = document) => {
      const dlg = getSuccessDialog(root);
      if (!dlg) return null;
      return pickByWords(CFG.DONE_WORDS, "button,[role='button']", dlg) || pick('button,[role="button"]', dlg, true);
    };
    const getAgainBtn = (root = document) => pickByWords(CFG.AGAIN_WORDS, "button,[role='button']", root);
    const getShownUrl = (root = document) => {
      const nodes = qsa('.l1Ptff, [data-url], [jsname="YrmH0"]', root).filter(isVisible);
      for (const el of nodes) {
        const text = normalizeUrl(el.getAttribute?.("data-url") || el.textContent || "");
        if (text) return text;
      }
      return "";
    };
    const isStep2 = (root = document) => !!getStep2Listbox(root) || (!!getSendBtn(root) && !!getStep2Textarea(root));
    const isFreshStart = (root = document) => {
      if (!root) return false;
      if (getSuccessDialog(document)) return false;
      const input = pickUrlInput(root);
      return !!input && !isStep2(root);
    };

    const clearUrlInput = async (root = document) => {
      const input = pickUrlInput(root);
      if (!input) return false;
      return setInputStable(input, "", 8);
    };

    const rootReadyForNext = () => {
      const root = getRoot();
      const input = pickUrlInput(root);
      if (!root || !input) return false;
      if (getSuccessDialog(document)) return false;
      if (isStep2(root)) return false;
      return String(input.value || "").trim() === "";
    };

    const resetAfterSubmit = async (prevUrl) => {
      await waitTruthy(() => !!getSuccessDialog(document) || isFreshStart(getRoot()), 12000, 120);

      if (rootReadyForNext()) return true;

      const doneBtn = await waitFor(() => getDoneBtn(document), 10000, 120);
      if (doneBtn) {
        await clickAndVerify(
          () => getDoneBtn(document) || doneBtn,
          () => rootReadyForNext() || isFreshStart(getRoot()),
          8,
          320
        );
      }

      let fresh = await waitTruthy(() => rootReadyForNext() || isFreshStart(getRoot()), 12000, 140);

      if (!fresh) {
        const againBtn = getAgainBtn(document);
        if (againBtn) {
          await clickAndVerify(
            () => getAgainBtn(document) || againBtn,
            () => rootReadyForNext() || isFreshStart(getRoot()),
            5,
            300
          );
        }
        fresh = await waitTruthy(() => rootReadyForNext() || isFreshStart(getRoot()), 8000, 140);
      }

      if (!fresh) return false;

      const root = getRoot();
      const input = pickUrlInput(root);
      if (input) {
        const current = normalizeUrl(input.value || "");
        if (!current || current === normalizeUrl(prevUrl) || String(input.value || "").trim()) {
          await clearUrlInput(root);
        }
      }

      await sleep(220);
      return rootReadyForNext();
    };

    const scoreStep1 = (el) => {
      const text = norm([el.textContent, el.getAttribute?.("aria-label"), el.getAttribute?.("title")].filter(Boolean).join(" "));
      if (!text) return -999;
      let score = 0;
      if (CFG.STEP1_GOOD.some((x) => text.includes(norm(x)))) score += 100;
      if (text.includes("spammy content") || text.includes("konten berisi spam")) score += 30;
      for (const group of CFG.STEP1_DESC_GROUPS) {
        if (group.every((x) => text.includes(norm(x)))) score += 40;
      }
      if (CFG.STEP1_BAD.some((x) => text.includes(norm(x)))) score -= 60;
      return score;
    };

    const getStep1Option = (root = document) => {
      const lb = getStep2Listbox(root);
      const opts = qsa(CFG.STEP1_OPTIONS, root)
        .filter(isVisible)
        .filter((el) => !(lb && lb.contains(el)));
      if (!opts.length) return null;
      let best = null;
      let bestScore = -999;
      for (const opt of opts) {
        const score = scoreStep1(opt);
        if (score > bestScore) {
          bestScore = score;
          best = opt;
        }
      }
      return bestScore >= 20 ? best : (opts.length === 1 ? opts[0] : null);
    };

    const getStep2Options = (root = document) => {
      const lb = getStep2Listbox(root);
      const scope = lb || root;
      return qsa(CFG.STEP2_OPTIONS, scope).filter(isVisible);
    };

    const getStep2Label = (opt) => {
      if (!opt) return "";
      const node = pick(CFG.STEP2_LABEL, opt) || opt;
      return String(node?.textContent || opt.getAttribute?.("aria-label") || opt.getAttribute?.("title") || "").trim();
    };

    const getStep2Subcat = (opt) => {
      if (!opt) return "";
      const candidates = [
        opt.getAttribute?.("data-subcategory"),
        opt.closest?.("[data-subcategory]")?.getAttribute?.("data-subcategory"),
        opt.getAttribute?.("data-value"),
        opt.dataset?.subcategory,
        opt.dataset?.value
      ].filter(Boolean);
      return String(candidates[0] || "").trim();
    };

    const chipSelected = (opt) => {
      const text = String(opt?.getAttribute?.("aria-selected") || opt?.getAttribute?.("aria-checked") || "").toLowerCase();
      if (text === "true") return true;
      const cls = String(opt?.className || "").toLowerCase();
      return /selected|checked|active/.test(cls);
    };

    const ensureChip = async (opt, selected) => {
      if (!opt) return false;
      for (let i = 0; i < 6; i++) {
        if (chipSelected(opt) === selected) return true;
        realClick(opt);
        await sleep(130 + i * 35);
      }
      return chipSelected(opt) === selected;
    };

    const fillUrl = async (url, root = document) => {
      const input = await waitFor(() => pickUrlInput(root), 9000, 120);
      if (!input) return false;
      return setInputStable(input, url, 10);
    };

    const ensureStep1 = async (root = document) => {
      const option = await waitFor(() => getStep1Option(root), 12000, 120);
      if (!option) throw new Error("Step 1: opsi alasan tidak ketemu");
      const clicked = await clickAndVerify(
        () => option,
        () => {
          const attr = String(option.getAttribute?.("aria-selected") || option.getAttribute?.("aria-checked") || "").toLowerCase();
          return attr === "true" || /selected|checked|active/.test(String(option.className || "").toLowerCase()) || !isDisabled(getContinueBtn(root));
        },
        5,
        220
      );
      if (!clicked) throw new Error("Step 1: gagal memilih alasan");

      const continueBtn = await waitFor(() => {
        const btn = getContinueBtn(root);
        return btn && !isDisabled(btn) ? btn : null;
      }, 10000, 100);
      if (!continueBtn) throw new Error("Step 1: tombol Continue/Lanjutkan tidak aktif");

      const moved = await clickAndVerify(
        () => getContinueBtn(root),
        () => isStep2(root),
        7,
        320
      );
      if (!moved) {
        const ok = await waitTruthy(() => isStep2(root), 6000, 120);
        if (!ok) throw new Error("Step 2: tidak muncul setelah klik Continue/Lanjutkan");
      }
    };

    const ensureStep2 = async (noteText, root = document) => {
      const ready = await waitTruthy(() => isStep2(root), 15000, 120);
      if (!ready) throw new Error("Step 2: tidak siap");

      const options = getStep2Options(root);
      const bySub = new Map();
      const byLabel = new Map();

      for (const opt of options) {
        const sub = getStep2Subcat(opt);
        const label = norm(getStep2Label(opt));
        if (sub) bySub.set(sub, opt);
        if (label) byLabel.set(label, opt);
      }

      const selected = new Set();
      const missing = [];

      for (const sub of CFG.STEP2_SUBCATS) {
        let opt = bySub.get(sub) || null;
        if (!opt) {
          const aliases = CFG.STEP2_ALIASES[sub] || [];
          opt = aliases.map((x) => byLabel.get(norm(x))).find(Boolean) || null;
        }
        if (!opt) {
          missing.push((CFG.STEP2_ALIASES[sub] || [sub])[0]);
          continue;
        }
        const ok = await ensureChip(opt, true);
        if (!ok) throw new Error("Step 2: gagal memilih -> " + ((CFG.STEP2_ALIASES[sub] || [sub])[0]));
        selected.add(opt);
      }

      if (missing.length) throw new Error("Step 2: chip tidak ketemu -> " + missing.join(", "));

      for (const opt of options) {
        if (selected.has(opt)) continue;
        if (chipSelected(opt)) await ensureChip(opt, false);
      }

      const ta = getStep2Textarea(root);
      if (ta && String(noteText || "").trim()) {
        const ok = await setInputStable(ta, limit(String(noteText || "").trim(), 300), 8);
        if (!ok) throw new Error("Step 2: detail tambahan gagal diisi");
      }

      const sendBtn = await waitFor(() => {
        const btn = getSendBtn(root);
        return btn && !isDisabled(btn) ? btn : null;
      }, 10000, 100);
      if (!sendBtn) throw new Error("Step 2: tombol Send/Kirim tidak aktif");

      const beforeDialogText = norm(getSuccessDialog(document)?.textContent || "");
      const beforeBody = norm(document.body?.textContent || "");

      const sent = await clickAndVerify(
        () => getSendBtn(root),
        () => {
          const dlg = getSuccessDialog(document);
          const dlgText = norm(dlg?.textContent || "");
          const body = norm(document.body?.textContent || "");
          if (dlg && dlgText && dlgText !== beforeDialogText && CFG.SUCCESS_WORDS.some((x) => dlgText.includes(norm(x)))) return true;
          if (body !== beforeBody && CFG.SUCCESS_WORDS.some((x) => body.includes(norm(x)))) return true;
          return false;
        },
        5,
        500
      );

      if (!sent) {
        const ok = await waitTruthy(() => {
          const dlg = getSuccessDialog(document);
          const dlgText = norm(dlg?.textContent || "");
          const body = norm(document.body?.textContent || "");
          if (dlg && dlgText && dlgText !== beforeDialogText && CFG.SUCCESS_WORDS.some((x) => dlgText.includes(norm(x)))) return true;
          if (body !== beforeBody && CFG.SUCCESS_WORDS.some((x) => body.includes(norm(x)))) return true;
          return false;
        }, 10000, 150);
        if (!ok) throw new Error("Step 2: submit tidak terkonfirmasi");
      }
    };

    if (location.hostname !== "search.google.com" || !String(location.pathname || "").includes("/search-console/report-spam")) {
      alert("Buka halaman https://search.google.com/search-console/report-spam dulu, lalu jalankan bookmarklet ini di sana.");
      return;
    }

    if (KEY.busy) return;
    KEY.busy = true;

    try {
      const urls = promptUrls();
      if (urls == null) return;
      if (!urls.length) throw new Error("URL kosong");

      if (!String(KEY.noteText || "").trim()) {
        const note = prompt("Atur detail tambahan. Auto-save sampai refresh browser", "");
        if (note == null) return;
        KEY.noteText = String(note || "").trim();
      }

      let done = 0;
      for (let i = 0; i < urls.length; i++) {
        const root = await waitFor(() => getRoot(), 10000, 120);
        if (!root) throw new Error("Halaman report-spam belum siap");

        const targetUrl = urls[i];

        if (isStep2(root)) {
          const shown = getShownUrl(root);
          if (shown && normalizeUrl(shown) !== normalizeUrl(targetUrl)) {
            throw new Error("Step 2 sedang terbuka untuk URL lain. Reload halaman report-spam dulu agar URL tidak salah kirim.");
          }
        } else {
          const filled = await fillUrl(targetUrl, root);
          if (!filled) throw new Error("Input URL tidak ketemu atau gagal diisi");
          await ensureStep1(root);
        }

        await ensureStep2(KEY.noteText, root);
        done += 1;

        const isLast = i === urls.length - 1;
        if (!isLast) {
          const resetOk = await resetAfterSubmit(targetUrl);
          if (!resetOk) {
            throw new Error("Submit sukses untuk URL " + done + "/" + urls.length + ", tapi form gagal reset otomatis setelah Done. Proses dihentikan agar tidak salah kirim URL berikutnya.");
          }
        }
      }

      if (done === urls.length) {
        const keepDoneOpen = !!getSuccessDialog(document);
        if (!keepDoneOpen) alert("Selesai: " + done + " URL berhasil diproses di Google Search Console.");
      }
    } catch (err) {
      alert(String(err?.message || err));
    } finally {
      KEY.busy = false;
    }
  };

  const runSafeBrowsing = async () => {
    const CFG = {
      REPORT_URL: "https://safebrowsing.google.com/safebrowsing/report_phish/",
      SS_DETAILS_KEY: "__IRDG_SB_DETAILS_V736__",
      SS_RELOAD_TO_KEY: "__IRDG_SB_RELOAD_TO_V736__",
      SS_QUEUE_KEY: "__IRDG_SB_QUEUE_V736__",
      WN_PREFIX: "__IRDG_SB_V736__:",
      HASH_PREFIX: "#sbv=736",
      MIN_DETAILS_LEN: 3,
      REQUIRE_DETAILS: true,
      SUBMIT_RETRY_MAX: 5,
      SUBMIT_RETRY_DELAY_MS: 1200,
      TARGET_REPORTTYPE_TEXTS: [
        "this page is not safe",
        "this page isn't safe",
        "this page is unsafe",
        "page is not safe",
        "page isn't safe",
        "unsafe page",
        "not safe",
        "unsafe",
        "phishing",
        "deceptive page",
        "harmful page",
        "malicious page",
        "suspicious page",
        "halaman ini tidak aman",
        "situs ini tidak aman"
      ],
      SAFE_REPORTTYPE_TEXTS: [
        "this page is safe",
        "page is safe",
        "safe page",
        "this site is safe",
        "site is safe",
        "halaman ini aman",
        "situs ini aman"
      ],
      THREAT_TYPE_TEXTS: [
        "malware"
      ],
      THREAT_CATEGORY_TEXTS: [
        "malware web",
        "web malware"
      ],
      SELECT_PLACEHOLDER_WORDS: [
        "select",
        "choose",
        "pilih",
        "report type",
        "jenis laporan",
        "threat type",
        "jenis ancaman",
        "threat category",
        "kategori ancaman"
      ],
      SUCCESS_TEXTS: [
        "pengiriman url berhasil",
        "pengiriman berhasil",
        "pengiriman berhasil dikirim",
        "status pengiriman",
        "laporan berhasil dikirim",
        "laporan telah dikirim",
        "url submitted successfully",
        "url was submitted successfully",
        "submission successful",
        "submission was successful",
        "status of submission submission was successful",
        "submitted successfully",
        "report submitted",
        "report has been submitted",
        "your report has been submitted",
        "we received your report",
        "thanks for helping",
        "thank you"
      ],
      ERROR_TEXTS: [
        "status of submission terjadi error",
        "status pengiriman terjadi error",
        "terjadi error. coba lagi",
        "terjadi error",
        "submission failed",
        "failed to submit",
        "could not submit",
        "an error occurred",
        "something went wrong",
        "please try again",
        "try again",
        "gagal",
        "error",
        "invalid url",
        "coba lagi",
        "terjadi kesalahan"
      ],
      SUBMIT_WORDS: ["submit", "send", "report", "kirim", "laporkan"],
      SEL: {
        reportTypeSelect: [
          'mat-select[formcontrolname="reportType"]',
          '[formcontrolname="reportType"]',
          'select[formcontrolname="reportType"]',
          'select[name*="report" i]',
          'select[aria-label*="report" i]',
          'select'
        ].join(","),
        reportTypeText: '.mat-mdc-select-min-line, .mat-mdc-select-value-text, .mdc-select__selected-text, .mat-select-value-text, .mat-select-value',
        reportTypeTrigger: '.mat-mdc-select-trigger, .mdc-select__anchor, [role="combobox"], .mat-select-trigger, select',
        threatTypeSelect: 'mat-select[formcontrolname="l1Taxonomy"], select[formcontrolname="l1Taxonomy"], [formcontrolname="l1Taxonomy"]',
        threatCategorySelect: 'mat-select[formcontrolname="l3Taxonomy"], select[formcontrolname="l3Taxonomy"], [formcontrolname="l3Taxonomy"]',
        urlInput: 'input[formcontrolname="url"], input[name="url"], input[id*="url" i], input[type="url"], input[aria-label*="url" i], input[placeholder*="url" i], input[type="text"]',
        detailsArea: 'textarea[formcontrolname="details"], textarea[name*="detail" i], textarea[aria-label*="detail" i], textarea[placeholder*="detail" i], textarea',
        submitBtn: 'button[type="submit"].form-submit-button, button[type="submit"], input[type="submit"], button.form-submit-button',
        option: 'mat-option, .mat-mdc-option, .mdc-list-item, [role="option"]',
        optionText: '.mdc-list-item__primary-text, .mat-mdc-option-text, .mdc-list-item__text, .mat-pseudo-checkbox + span',
        successScope: 'section, div, mat-card, main, form, p, span, h1, h2, h3, status-tile, mat-card-content'
      }
    };

    try {
      if (window.__irdgStopSB) window.__irdgStopSB();
    } catch (_) {}

    const cleanup = makeCleanup();
    const sbState = state.sb;
    if (sbState.busy) return;
    sbState.busy = true;
    sbState.submitted = false;

    const stop = () => {
      cleanup.run();
      try { delete window.__irdgStopSB; } catch (_) {}
      sbState.busy = false;
      sbState.submitted = false;
    };

    window.__irdgStopSB = stop;

    const installNetTracker = () => {
      const tracker = { inflight: 0, started: 0, finished: 0, lastChange: now(), xhrMap: new WeakMap() };
      const bumpStart = () => {
        tracker.inflight += 1;
        tracker.started += 1;
        tracker.lastChange = now();
      };
      const bumpEnd = () => {
        tracker.inflight = Math.max(0, (tracker.inflight | 0) - 1);
        tracker.finished += 1;
        tracker.lastChange = now();
      };

      if (typeof window.fetch === "function") {
        const origFetch = window.fetch;
        window.fetch = function (...args) {
          bumpStart();
          let out;
          try {
            out = origFetch.apply(this, args);
          } catch (err) {
            bumpEnd();
            throw err;
          }
          return Promise.resolve(out).finally(() => bumpEnd());
        };
        cleanup.add(() => {
          try { window.fetch = origFetch; } catch (_) {}
        });
      }

      if (window.XMLHttpRequest) {
        const origOpen = XMLHttpRequest.prototype.open;
        const origSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (...args) {
          try { tracker.xhrMap.set(this, { url: String(args?.[1] || "") }); } catch (_) {}
          return origOpen.apply(this, args);
        };

        XMLHttpRequest.prototype.send = function (...args) {
          bumpStart();
          const xhr = this;
          const done = () => {
            try { xhr.removeEventListener("loadend", done); } catch (_) {}
            bumpEnd();
          };
          try { xhr.addEventListener("loadend", done, { once: true }); } catch (_) {}
          try {
            return origSend.apply(xhr, args);
          } catch (err) {
            done();
            throw err;
          }
        };

        cleanup.add(() => {
          try { XMLHttpRequest.prototype.open = origOpen; } catch (_) {}
          try { XMLHttpRequest.prototype.send = origSend; } catch (_) {}
        });
      }

      return tracker;
    };

    const net = installNetTracker();

    const getNavType = () => {
      try {
        const entry = performance.getEntriesByType?.("navigation")?.[0];
        if (entry?.type) return entry.type;
      } catch (_) {}
      try {
        const t = performance.navigation?.type;
        if (t === 1) return "reload";
        if (t === 2) return "back_forward";
      } catch (_) {}
      return "navigate";
    };

    const ssOK = (() => {
      try {
        const key = "__irdg_probe__" + Math.random().toString(36).slice(2);
        sessionStorage.setItem(key, "1");
        sessionStorage.removeItem(key);
        return true;
      } catch (_) {
        return false;
      }
    })();

    const ssGet = (k) => {
      try { return ssOK ? sessionStorage.getItem(k) : null; } catch (_) { return null; }
    };
    const ssSet = (k, v) => {
      try {
        if (!ssOK) return false;
        sessionStorage.setItem(k, String(v));
        return true;
      } catch (_) {
        return false;
      }
    };
    const ssDel = (k) => {
      try {
        if (!ssOK) return false;
        sessionStorage.removeItem(k);
        return true;
      } catch (_) {
        return false;
      }
    };

    const wnRead = () => {
      try {
        const raw = String(window.name || "");
        if (!raw.startsWith(CFG.WN_PREFIX)) return null;
        return JSON.parse(raw.slice(CFG.WN_PREFIX.length));
      } catch (_) {
        return null;
      }
    };
    const wnWrite = (obj) => {
      try { window.name = CFG.WN_PREFIX + JSON.stringify(obj || {}); } catch (_) {}
    };
    const wnClear = () => {
      try { window.name = ""; } catch (_) {}
    };

    const timeOriginStr = () => {
      try {
        const n = performance.timeOrigin;
        if (typeof n === "number" && isFinite(n)) return String(Math.floor(n));
      } catch (_) {}
      return "";
    };

    const consumeReloadOnce = () => {
      if (getNavType() !== "reload") return false;
      const current = timeOriginStr();
      if (!current) return true;
      const last = String(ssGet(CFG.SS_RELOAD_TO_KEY) || "");
      if (last === current) return false;
      ssSet(CFG.SS_RELOAD_TO_KEY, current);
      return true;
    };

    const buildHash = (urls, resetFlag) => {
      return CFG.HASH_PREFIX + "&q=" + encodeURIComponent(JSON.stringify(urls || [])) + "&r=" + (resetFlag ? "1" : "0");
    };

    const parseHash = () => {
      const hash = String(location.hash || "");
      if (!hash.startsWith(CFG.HASH_PREFIX)) return null;
      const out = Object.create(null);
      for (const part of hash.slice(1).split("&")) {
        const idx = part.indexOf("=");
        if (idx < 0) continue;
        out[part.slice(0, idx)] = part.slice(idx + 1);
      }
      let queue = [];
      try {
        queue = JSON.parse(decodeURIComponent(out.q || "%5B%5D"));
      } catch (_) {
        queue = [];
      }
      return { queue: Array.isArray(queue) ? queue : [], reset: out.r === "1" };
    };

    const saveQueue = (queue) => {
      const cleaned = Array.from(new Set((queue || []).map((x) => normalizeUrl(x)).filter(Boolean))).slice(0, 10);
      try { ssSet(CFG.SS_QUEUE_KEY, JSON.stringify(cleaned)); } catch (_) {}
      try {
        const obj = wnRead() || {};
        obj.q = cleaned;
        wnWrite(obj);
      } catch (_) {}
      return cleaned;
    };

    const loadQueue = () => {
      try {
        const a = JSON.parse(String(ssGet(CFG.SS_QUEUE_KEY) || "[]"));
        if (Array.isArray(a) && a.length) return a.map(normalizeUrl).filter(Boolean);
      } catch (_) {}
      try {
        const obj = wnRead();
        const b = Array.isArray(obj?.q) ? obj.q : [];
        if (b.length) return b.map(normalizeUrl).filter(Boolean);
      } catch (_) {}
      return [];
    };

    const saveDetails = (value) => {
      const v = String(value || "").trim();
      if (v.length < CFG.MIN_DETAILS_LEN) return;
      try { ssSet(CFG.SS_DETAILS_KEY, v); } catch (_) {}
      try {
        const obj = wnRead() || {};
        obj.d = v;
        wnWrite(obj);
      } catch (_) {}
    };

    const loadDetails = () => {
      const a = String(ssGet(CFG.SS_DETAILS_KEY) || "").trim();
      if (a.length >= CFG.MIN_DETAILS_LEN) return a;
      try {
        const obj = wnRead();
        const b = String(obj?.d || "").trim();
        if (b.length >= CFG.MIN_DETAILS_LEN) return b;
      } catch (_) {}
      return "";
    };

    const clearDetails = () => {
      try { ssDel(CFG.SS_DETAILS_KEY); } catch (_) {}
      try {
        const obj = wnRead();
        if (obj && typeof obj === "object") {
          delete obj.d;
          wnWrite(obj);
        } else {
          wnClear();
        }
      } catch (_) {}
    };

    const isReportPage = (() => {
      const host = String(location.hostname || "").toLowerCase();
      const path = String(location.pathname || "").toLowerCase();
      return (host === "safebrowsing.google.com" || host === "google.com" || host === "www.google.com") && path.includes("/safebrowsing/report_phish");
    })();

    try {
      if (!isReportPage) {
        const input = promptUrls();
        if (input == null) return;
        if (!input.length) throw new Error("URL kosong");
        const reset = consumeReloadOnce();
        const queue = saveQueue(input);
        location.href = CFG.REPORT_URL + buildHash(queue, reset);
        return;
      }

      const parsed = parseHash();
      const resetByHash = !!parsed?.reset;
      const resetByReload = consumeReloadOnce();
      if (resetByHash || resetByReload) clearDetails();

      const initialQueue = saveQueue((parsed?.queue || loadQueue() || []).map(normalizeUrl).filter(Boolean));
      if (!initialQueue.length) {
        const input = promptUrls();
        if (input == null) return;
        if (!input.length) throw new Error("URL kosong");
        saveQueue(input);
      }

      const getQueue = () => loadQueue();

      const getText = (el) => String(el?.textContent || "").trim();
      const pressKey = (el, key) => {
        if (!el) return false;
        try { el.focus?.({ preventScroll: true }); } catch (_) {}
        try { el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key })); } catch (_) {}
        try { el.dispatchEvent(new KeyboardEvent("keypress", { bubbles: true, cancelable: true, key })); } catch (_) {}
        try { el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, cancelable: true, key })); } catch (_) {}
        return true;
      };

      const isNativeSelect = (el) => String(el?.tagName || "").toLowerCase() === "select";
      const getNativeSelectedText = (select) => {
        if (!isNativeSelect(select)) return "";
        const opt = select.options?.[select.selectedIndex];
        return String(opt?.textContent || opt?.label || opt?.value || select.value || "").trim();
      };
      const nativeSelectOptionText = (select) => {
        if (!isNativeSelect(select)) return "";
        try {
          return Array.from(select.options || []).map((opt) => String(opt.textContent || opt.label || opt.value || "")).join(" ");
        } catch (_) {
          return "";
        }
      };
      const selectLooksLikeReportType = (el) => {
        const meta = String(el?.getAttribute?.("formcontrolname") || el?.name || el?.id || el?.getAttribute?.("aria-label") || el?.getAttribute?.("placeholder") || "");
        if (/report|type|jenis|laporan/i.test(meta)) return true;
        return /(not\s+safe|isn['’]?t\s+safe|unsafe|phish(?:ing)?|deceptive|harmful|malicious|suspicious|tidak\s+aman)/i.test(nativeSelectOptionText(el));
      };
      const getReportSelect = () => {
        const nodes = qsa(CFG.SEL.reportTypeSelect, document).filter((el) => !isDisabled(el));
        const visible = nodes.filter(isVisible);
        const ranked = visible.length ? visible : nodes;
        return ranked.find((el) => selectLooksLikeReportType(el) && (isNativeSelect(el) || pick(CFG.SEL.reportTypeTrigger, el, true) || pick(CFG.SEL.reportTypeText, el, true))) || ranked.find((el) => pick(CFG.SEL.reportTypeTrigger, el, true) || pick(CFG.SEL.reportTypeText, el, true)) || ranked[0] || null;
      };
      const getReportTrigger = () => {
        const sel = getReportSelect();
        if (!sel) return null;
        if (isNativeSelect(sel)) return sel;
        return pick(CFG.SEL.reportTypeTrigger, sel, true) || pick(CFG.SEL.reportTypeTrigger, document, true) || sel;
      };
      const getReportText = () => {
        const sel = getReportSelect();
        if (!sel) return "";
        if (isNativeSelect(sel)) return getNativeSelectedText(sel);
        return getText(pick(CFG.SEL.reportTypeText, sel, true) || sel);
      };
      const getReportOptions = () => qsa(CFG.SEL.option, document).filter(isVisible);
      const getOptionText = (node) => getText(pick(CFG.SEL.optionText, node, true) || node);
      const getUrlInput = () => {
        const nodes = qsa(CFG.SEL.urlInput, document).filter((el) => !isDisabled(el));
        const visible = nodes.filter(isVisible);
        const ranked = visible.length ? visible : nodes;
        return ranked.find((el) => /url/i.test(String(el.getAttribute?.("formcontrolname") || el.name || el.id || el.getAttribute?.("aria-label") || el.getAttribute?.("placeholder") || ""))) || ranked[0] || null;
      };
      const getDetails = () => {
        const nodes = qsa(CFG.SEL.detailsArea, document).filter((el) => !isDisabled(el));
        const visible = nodes.filter(isVisible);
        const ranked = visible.length ? visible : nodes;
        return ranked.find((el) => /detail|comment|additional|description|keterangan|alasan/i.test(String(el.getAttribute?.("formcontrolname") || el.name || el.id || el.getAttribute?.("aria-label") || el.getAttribute?.("placeholder") || ""))) || ranked[0] || null;
      };
      const getSubmit = () => {
        const direct = pick(CFG.SEL.submitBtn, document, true);
        if (direct) return direct;
        return pickByWords(CFG.SUBMIT_WORDS, "button,[role='button'],input[type='button'],input[type='submit']", document);
      };
      const submitEnabled = () => {
        const btn = getSubmit();
        return !!btn && !isDisabled(btn);
      };

      const sbMeta = { domTick: 0, btnTick: 0, txSeq: 0 };
      let observedSubmit = null;
      let rebindTimer = 0;

      const rebindSubmitObserver = () => {
        const btn = getSubmit();
        if (btn === observedSubmit) return !!btn;
        try { btnObserver.disconnect(); } catch (_) {}
        observedSubmit = btn;
        if (btn) {
          try {
            btnObserver.observe(btn, { attributes: true, attributeFilter: ["disabled", "class", "aria-disabled"] });
          } catch (_) {}
        }
        return !!btn;
      };

      const queueRebind = () => {
        try { clearTimeout(rebindTimer); } catch (_) {}
        rebindTimer = window.setTimeout(() => {
          rebindSubmitObserver();
        }, 60);
      };

      const btnObserver = new MutationObserver(() => {
        sbMeta.btnTick += 1;
        sbMeta.domTick += 1;
      });

      const docObserver = new MutationObserver(() => {
        sbMeta.domTick += 1;
        queueRebind();
      });

      try {
        docObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
      } catch (_) {}
      cleanup.add(() => {
        try { clearTimeout(rebindTimer); } catch (_) {}
        try { btnObserver.disconnect(); } catch (_) {}
        try { docObserver.disconnect(); } catch (_) {}
      });
      rebindSubmitObserver();

      const textMatchesAny = (text, words) => {
        const t = norm(text);
        return !!t && (words || []).some((x) => t.includes(norm(x)));
      };

      const isPlaceholderSelectText = (text) => {
        const t = norm(text);
        if (!t) return true;
        return CFG.SELECT_PLACEHOLDER_WORDS.some((x) => t === norm(x) || t.includes(norm(x)));
      };

      const getControlSelect = (selector) => {
        const nodes = qsa(selector, document).filter((el) => !isDisabled(el));
        const visible = nodes.filter(isVisible);
        return (visible.length ? visible : nodes)[0] || null;
      };

      const getSelectDisplayText = (selectEl) => {
        if (!selectEl) return "";
        if (isNativeSelect(selectEl)) return getNativeSelectedText(selectEl);
        return getText(pick(CFG.SEL.reportTypeText, selectEl, true) || selectEl);
      };

      const getSelectTrigger = (selectEl) => {
        if (!selectEl) return null;
        if (isNativeSelect(selectEl)) return selectEl;
        return pick(CFG.SEL.reportTypeTrigger, selectEl, true) || selectEl;
      };

      const getVisibleOptions = () => qsa(CFG.SEL.option, document).filter(isVisible);

      const selectNativeByTexts = async (selectEl, wantedTexts) => {
        if (!isNativeSelect(selectEl)) return false;
        const options = Array.from(selectEl.options || []);
        const found = options.find((opt) => textMatchesAny(String(opt.textContent || opt.label || opt.value || ""), wantedTexts));
        if (!found) return false;
        const idx = options.indexOf(found);
        for (let i = 0; i < 6; i++) {
          try {
            selectEl.value = found.value;
            selectEl.selectedIndex = idx;
            found.selected = true;
          } catch (_) {}
          try { selectEl.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) {}
          try { selectEl.dispatchEvent(new Event("change", { bubbles: true })); } catch (_) {}
          try { selectEl.dispatchEvent(new FocusEvent("blur", { bubbles: true, composed: true, relatedTarget: document.body })); } catch (_) {}
          await sleep(90 + i * 25);
          if (textMatchesAny(getNativeSelectedText(selectEl), wantedTexts)) return true;
        }
        return textMatchesAny(getNativeSelectedText(selectEl), wantedTexts);
      };

      const getFirstNonPlaceholderOption = () => {
        return getVisibleOptions().find((node) => {
          const text = getOptionText(node);
          return !!text && !isPlaceholderSelectText(text);
        }) || null;
      };

      const selectMaterialByTexts = async (selectEl, wantedTexts, labelName, opts = {}) => {
        if (!selectEl) return false;
        const current = getSelectDisplayText(selectEl);
        if (textMatchesAny(current, wantedTexts)) return true;
        if (opts.acceptAnyNonPlaceholder && current && !isPlaceholderSelectText(current)) return true;

        if (isNativeSelect(selectEl)) {
          const ok = await selectNativeByTexts(selectEl, wantedTexts);
          if (ok) return true;
          if (opts.acceptAnyNonPlaceholder && getSelectDisplayText(selectEl) && !isPlaceholderSelectText(getSelectDisplayText(selectEl))) return true;
          if (opts.acceptFirstNonPlaceholderOption) {
            const options = Array.from(selectEl.options || []);
            const found = options.find((opt) => {
              const text = String(opt.textContent || opt.label || opt.value || "").trim();
              return !!text && !isPlaceholderSelectText(text);
            }) || null;
            if (found) {
              const idx = options.indexOf(found);
              for (let i = 0; i < 5; i++) {
                try {
                  selectEl.value = found.value;
                  selectEl.selectedIndex = idx;
                  found.selected = true;
                } catch (_) {}
                try { selectEl.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) {}
                try { selectEl.dispatchEvent(new Event("change", { bubbles: true })); } catch (_) {}
                await sleep(90 + i * 25);
                const nextText = getSelectDisplayText(selectEl);
                if (nextText && !isPlaceholderSelectText(nextText)) return true;
              }
            }
          }
          return false;
        }

        const trigger = getSelectTrigger(selectEl);
        if (!trigger) return false;

        for (let attempt = 0; attempt < 8; attempt++) {
          const displayText = getSelectDisplayText(selectEl);
          if (textMatchesAny(displayText, wantedTexts)) return true;
          if (opts.acceptAnyNonPlaceholder && displayText && !isPlaceholderSelectText(displayText)) return true;

          realClick(trigger);
          await sleep(110 + attempt * 35);

          let opt = getVisibleOptions().find((node) => textMatchesAny(getOptionText(node), wantedTexts));
          if (!opt && opts.looseText) {
            opt = getVisibleOptions().find((node) => norm(getOptionText(node)).includes(norm(opts.looseText)));
          }
          if (!opt && opts.looseTexts && Array.isArray(opts.looseTexts)) {
            opt = getVisibleOptions().find((node) => opts.looseTexts.some((x) => norm(getOptionText(node)).includes(norm(x))));
          }
          if (!opt && opts.acceptFirstNonPlaceholderOption) {
            opt = getFirstNonPlaceholderOption();
          }
          if (!opt) {
            pressKey(trigger, "Enter");
            await sleep(90 + attempt * 30);
            opt = getVisibleOptions().find((node) => textMatchesAny(getOptionText(node), wantedTexts)) || (opts.acceptFirstNonPlaceholderOption ? getFirstNonPlaceholderOption() : null);
          }
          if (!opt) {
            pressKey(trigger, "ArrowDown");
            await sleep(90 + attempt * 30);
            opt = getVisibleOptions().find((node) => textMatchesAny(getOptionText(node), wantedTexts)) || (opts.acceptFirstNonPlaceholderOption ? getFirstNonPlaceholderOption() : null);
          }
          if (!opt) {
            try { realClick(document.body); } catch (_) {}
            await sleep(120 + attempt * 35);
            continue;
          }

          const clicked = await clickAndVerify(
            () => getVisibleOptions().find((node) => textMatchesAny(getOptionText(node), wantedTexts)) || (opts.acceptFirstNonPlaceholderOption ? getFirstNonPlaceholderOption() : null) || opt,
            () => {
              const nextText = getSelectDisplayText(selectEl);
              return textMatchesAny(nextText, wantedTexts) || (opts.acceptAnyNonPlaceholder && nextText && !isPlaceholderSelectText(nextText));
            },
            5,
            220
          );
          if (clicked) return true;

          const inner = pick(CFG.SEL.optionText, opt, true);
          if (inner) realClick(inner);
          const verified = await waitTruthy(() => {
            const nextText = getSelectDisplayText(selectEl);
            return textMatchesAny(nextText, wantedTexts) || (opts.acceptAnyNonPlaceholder && nextText && !isPlaceholderSelectText(nextText));
          }, 3000, 80);
          if (verified) return true;
        }

        if (opts.acceptAnyNonPlaceholder && getSelectDisplayText(selectEl) && !isPlaceholderSelectText(getSelectDisplayText(selectEl))) return true;
        throw new Error(labelName + " Safe Browsing tidak bisa dipilih. Nilai sekarang: " + (getSelectDisplayText(selectEl) || "(kosong)"));
      };

      const ensureThreatFlow = async () => {
        await waitTruthy(() => !!getControlSelect(CFG.SEL.threatTypeSelect) || !!getUrlInput(), 7000, 120);

        const threatType = getControlSelect(CFG.SEL.threatTypeSelect);
        if (threatType) {
          await selectMaterialByTexts(threatType, CFG.THREAT_TYPE_TEXTS, "Threat type / Jenis Ancaman: Malware", {
            looseText: "malware",
            looseTexts: ["malware"]
          });
        }

        await waitTruthy(() => !!getControlSelect(CFG.SEL.threatCategorySelect) || !!getUrlInput(), 7000, 120);
        const threatCategory = getControlSelect(CFG.SEL.threatCategorySelect);
        if (threatCategory) {
          await selectMaterialByTexts(threatCategory, CFG.THREAT_CATEGORY_TEXTS, "Threat category / Kategori Ancaman: Malware Web", {
            looseText: "malware web",
            looseTexts: ["malware web", "web malware"]
          });
        }
      };

      const safeReportTypeMatch = (text) => {
        const t = norm(text);
        if (!t) return false;
        return CFG.SAFE_REPORTTYPE_TEXTS.some((x) => t.includes(norm(x))) && !/(not\s+safe|isn['’]?t\s+safe|unsafe|tidak\s+aman)/i.test(t);
      };

      const targetReportTypeMatch = (text) => {
        const t = norm(text);
        if (!t || safeReportTypeMatch(t)) return false;
        if (CFG.TARGET_REPORTTYPE_TEXTS.some((x) => t.includes(norm(x)))) return true;
        return /(not\s+safe|isn['’]?t\s+safe|unsafe|phish(?:ing)?|deceptive|harmful|malicious|suspicious|tidak\s+aman)/i.test(t);
      };

      const selectNativeReportType = async (select) => {
        if (!isNativeSelect(select)) return false;
        const options = Array.from(select.options || []);
        let found = null;
        for (const opt of options) {
          const text = String(opt.textContent || opt.label || opt.value || "").trim();
          if (!text) continue;
          if (targetReportTypeMatch(text)) {
            found = opt;
            break;
          }
        }
        if (!found) return false;

        const idx = options.indexOf(found);
        for (let i = 0; i < 6; i++) {
          try {
            select.value = found.value;
            select.selectedIndex = idx;
            found.selected = true;
          } catch (_) {}
          try { select.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) {}
          try { select.dispatchEvent(new Event("change", { bubbles: true })); } catch (_) {}
          try { select.dispatchEvent(new FocusEvent("blur", { bubbles: true, composed: true, relatedTarget: document.body })); } catch (_) {}
          await sleep(90 + i * 25);
          if (targetReportTypeMatch(getNativeSelectedText(select))) return true;
        }
        return targetReportTypeMatch(getNativeSelectedText(select));
      };

      const getTargetReportOption = () => {
        const nodes = getReportOptions();
        let exact = null;
        let partial = null;
        for (const node of nodes) {
          const text = getOptionText(node);
          if (!text) continue;
          const t = norm(text);
          if (CFG.TARGET_REPORTTYPE_TEXTS.some((x) => t === norm(x)) && !safeReportTypeMatch(text)) return node;
          if (!exact && targetReportTypeMatch(text)) exact = node;
          if (!partial && /(tidak\s+aman|not\s+safe|isn['’]?t\s+safe|unsafe|phish(?:ing)?)/i.test(t) && !safeReportTypeMatch(text)) partial = node;
        }
        return exact || partial || null;
      };

      const openReportDropdown = async () => {
        const trigger = await waitFor(() => getReportTrigger(), 10000, 120);
        if (!trigger) return false;
        for (let i = 0; i < 5; i++) {
          realClick(trigger);
          await sleep(100 + i * 40);
          if (getTargetReportOption()) return true;
          pressKey(trigger, "Enter");
          await sleep(90 + i * 30);
          if (getTargetReportOption()) return true;
          pressKey(trigger, "ArrowDown");
          await sleep(90 + i * 30);
          if (getTargetReportOption()) return true;
        }
        return false;
      };

      const ensureReportType = async () => {
        const sel = await waitFor(() => getReportSelect(), 12000, 120);
        if (!sel) throw new Error("Pilihan jenis laporan Safe Browsing tidak ditemukan");

        const already = getReportText();
        if (targetReportTypeMatch(already)) return true;

        if (isNativeSelect(sel)) {
          const nativeOk = await selectNativeReportType(sel);
          if (nativeOk) return true;
        }

        for (let attempt = 0; attempt < 10; attempt++) {
          const current = getReportText();
          if (targetReportTypeMatch(current)) return true;

          const freshSel = getReportSelect();
          if (isNativeSelect(freshSel)) {
            const nativeOk = await selectNativeReportType(freshSel);
            if (nativeOk) return true;
          }

          const opened = await openReportDropdown();
          if (!opened) {
            await sleep(120 + attempt * 30);
            continue;
          }

          const opt = await waitFor(() => getTargetReportOption(), 5000, 60);
          if (!opt) {
            await sleep(120 + attempt * 30);
            continue;
          }

          const clicked = await clickAndVerify(
            () => getTargetReportOption() || opt,
            () => targetReportTypeMatch(getReportText()),
            6,
            240
          );

          if (clicked) return true;

          const inner = pick(CFG.SEL.optionText, opt, true);
          if (inner) realClick(inner);
          const verified = await waitTruthy(() => targetReportTypeMatch(getReportText()), 3500, 80);
          if (verified) return true;

          try { realClick(document.body); } catch (_) {}
          await sleep(120 + attempt * 30);
        }

        const finalText = getReportText();
        throw new Error("Safe Browsing gagal memilih jenis laporan ke 'This page is not safe / Halaman ini tidak aman'. Nilai sekarang: " + (finalText || "(kosong)"));
      };

      const ensureDetailsDefault = () => {
        const saved = loadDetails();
        if (saved) return saved;
        const value = prompt("Atur detail tambahan. Auto-save sampai refresh browser", "");
        if (value == null) return null;
        const out = String(value || "").trim();
        if (CFG.REQUIRE_DETAILS && out.length < CFG.MIN_DETAILS_LEN) return "";
        saveDetails(out);
        return out;
      };

      const formReady = () => {
        const url = getUrlInput();
        const det = getDetails();
        return !!url && (!!det || !CFG.REQUIRE_DETAILS);
      };

      const getStatusNodes = () => {
        const all = qsa(CFG.SEL.successScope, document).filter(isVisible);
        const hits = [];
        const seen = new Set();
        for (const el of all) {
          const text = norm(el.textContent || "");
          if (!text) continue;
          if (!CFG.SUCCESS_TEXTS.some((x) => text.includes(norm(x)))) continue;
          let best = el;
          let parent = el.parentElement;
          for (let depth = 0; parent && depth < 3; depth += 1) {
            const pText = norm(parent.textContent || "");
            if (!pText) break;
            const hasSuccess = CFG.SUCCESS_TEXTS.some((x) => pText.includes(norm(x)));
            if (!hasSuccess) break;
            best = parent;
            parent = parent.parentElement;
          }
          if (!seen.has(best)) {
            seen.add(best);
            hits.push(best);
          }
        }
        return hits;
      };

      const successSeen = () => getStatusNodes().length > 0;

      const getSuccessSignature = () => {
        return getStatusNodes().map((el) => limit(norm(el.textContent || ""), 240)).sort().join("||");
      };

      const getErrorText = () => {
        const candidates = qsa('mat-error, .mat-mdc-form-field-error, .mdc-text-field-helper-text, [role="alert"], .error, .errors, .warning, .warn, .alert, .message, status-tile, .form-status-card, mat-card, mat-card-content, .failure, .value', document)
          .filter(isVisible)
          .map((el) => norm(el.textContent || ""))
          .filter(Boolean)
          .filter((text) => !CFG.SUCCESS_TEXTS.some((x) => text.includes(norm(x))));
        return candidates.find((text) => CFG.ERROR_TEXTS.some((x) => text.includes(norm(x)))) || "";
      };

      const getFormSignature = () => {
        const reportText = limit(norm(getReportText()), 120);
        const urlValue = normalizeUrl(getUrlInput()?.value || "");
        const detailsValue = String(getDetails()?.value || "").trim();
        const btn = getSubmit();
        const btnState = btn ? ((isDisabled(btn) ? "d" : "e") + ":" + limit(norm(getText(btn)), 80)) : "none";
        const successSig = limit(getSuccessSignature(), 200);
        return [reportText, urlValue, detailsValue ? "detail:1" : "detail:0", btnState, successSig].join("~");
      };

      const ensureFilled = async (url, detailsText) => {
        const urlEl = await waitFor(() => getUrlInput(), 12000, 120);
        if (!urlEl) throw new Error("URL report tidak tersedia");
        const urlOk = await setInputStable(urlEl, url, 10);
        if (!urlOk) throw new Error("URL gagal diisi di Safe Browsing");

        const detEl = getDetails();
        if (detEl) {
          const current = String(detEl.value || "").trim();
          if (!current && String(detailsText || "").trim()) {
            const detOk = await setInputStable(detEl, detailsText, 8);
            if (!detOk && CFG.REQUIRE_DETAILS) throw new Error("Detail tambahan gagal diisi di Safe Browsing");
          }
          saveDetails(detEl.value);
        } else if (CFG.REQUIRE_DETAILS) {
          throw new Error("Kolom detail Safe Browsing tidak ditemukan");
        }

        const btn = await waitFor(() => {
          const x = getSubmit();
          return x ? x : null;
        }, 10000, 100);
        if (!btn) throw new Error("Tombol submit Safe Browsing tidak ditemukan");

        const ready = await waitTruthy(() => submitEnabled(), 10000, 120);
        if (!ready) throw new Error("Tombol submit Safe Browsing tidak aktif");
      };

      const submitCurrent = async (url) => {
        const targetUrl = normalizeUrl(url);
        let lastError = "";

        for (let attempt = 0; attempt < CFG.SUBMIT_RETRY_MAX; attempt += 1) {
          const btn = await waitFor(() => {
            const x = getSubmit();
            return x && !isDisabled(x) ? x : null;
          }, attempt ? 12000 : 3000, 120);

          if (!btn) {
            lastError = getErrorText() || lastError;
            if (attempt < CFG.SUBMIT_RETRY_MAX - 1) {
              await sleep(CFG.SUBMIT_RETRY_DELAY_MS + attempt * 350);
              continue;
            }
            sbState.submitted = false;
            return false;
          }

          const tx = {
            id: ++sbMeta.txSeq,
            url: targetUrl,
            beforeError: getErrorText(),
            beforeSuccess: getSuccessSignature(),
            beforeForm: getFormSignature(),
            beforeStarted: net.started,
            beforeFinished: net.finished,
            beforeDomTick: sbMeta.domTick,
            beforeBtnTick: sbMeta.btnTick,
            beforeLastChange: net.lastChange,
            startedAt: now(),
            attempt: attempt + 1
          };

          sbState.submitted = true;
          realClick(btn);

          const sawStart = await waitTruthy(() => {
            const err = getErrorText();
            if (err && err !== tx.beforeError) return true;
            return net.started > tx.beforeStarted || net.inflight > 0 || isDisabled(getSubmit()) || sbMeta.domTick > tx.beforeDomTick || sbMeta.btnTick > tx.beforeBtnTick || net.lastChange > tx.beforeLastChange;
          }, 9000, 80);

          if (!sawStart) {
            lastError = getErrorText() || lastError;
            sbState.submitted = false;
            if (attempt < CFG.SUBMIT_RETRY_MAX - 1) {
              await sleep(CFG.SUBMIT_RETRY_DELAY_MS + attempt * 500);
              continue;
            }
            return false;
          }

          const ok = await waitTruthy(() => {
            const successSig = getSuccessSignature();
            const formSig = getFormSignature();
            const domChanged = sbMeta.domTick > tx.beforeDomTick || sbMeta.btnTick > tx.beforeBtnTick || formSig !== tx.beforeForm;
            const newSuccess = !!successSig && successSig !== tx.beforeSuccess;
            const networkSettled = net.inflight === 0 && (net.finished > tx.beforeFinished || net.started > tx.beforeStarted) && now() - net.lastChange > 250;
            const urlValue = normalizeUrl(getUrlInput()?.value || "");
            const urlClearedAfterSubmit = !urlValue || urlValue !== tx.url;

            if (newSuccess) return true;
            if (successSeen() && domChanged) return true;
            if (networkSettled && successSeen()) return true;
            if (networkSettled && domChanged && urlClearedAfterSubmit && !getErrorText()) return true;
            return false;
          }, 22000, 120);

          if (ok) return true;

          lastError = getErrorText() || lastError;
          const retryReady = await waitTruthy(() => {
            const submit = getSubmit();
            const currentUrl = normalizeUrl(getUrlInput()?.value || "");
            return !!submit && !isDisabled(submit) && (!currentUrl || currentUrl === tx.url);
          }, 12000, 150);

          if (retryReady && attempt < CFG.SUBMIT_RETRY_MAX - 1) {
            await sleep(CFG.SUBMIT_RETRY_DELAY_MS + attempt * 500);
            continue;
          }

          sbState.submitted = false;
          return false;
        }

        sbState.submitted = false;
        return false;
      };

      const waitPostSubmitReset = async (previousUrl) => {
        const prev = normalizeUrl(previousUrl);
        const seen = await waitTruthy(() => successSeen() || getFormSignature().includes("status of submission"), 12000, 120);
        if (!seen) return false;

        const resetReady = await waitTruthy(() => {
          const urlEl = getUrlInput();
          const submit = getSubmit();
          if (!urlEl || !submit) return false;
          const currentUrl = normalizeUrl(urlEl.value || "");
          const reportText = getReportText();
          const reportEmptyOrSelectable = !reportText || isPlaceholderSelectText(reportText) || targetReportTypeMatch(reportText) || !!getReportSelect();
          return (!currentUrl || currentUrl !== prev) && reportEmptyOrSelectable;
        }, 14000, 140);

        if (!resetReady) return false;

        let lastSig = "";
        let stable = 0;
        const start = now();
        while (now() - start < 3500) {
          const sig = [
            normalizeUrl(getUrlInput()?.value || ""),
            norm(getReportText()),
            !!getSubmit(),
            submitEnabled() ? "enabled" : "disabled"
          ].join("|");
          if (sig === lastSig) stable += 1;
          else {
            stable = 0;
            lastSig = sig;
          }
          if (stable >= 3) return true;
          await sleep(120);
        }
        return true;
      };

      const prepareNextSafeBrowsingForm = async (nextUrl, defaults, previousUrl) => {
        const resetOk = await waitPostSubmitReset(previousUrl);
        if (!resetOk) {
          throw new Error("Safe Browsing belum reset normal setelah submit sebelumnya.");
        }

        try { realClick(document.body); } catch (_) {}
        await sleep(220);

        await ensureReportType();
        await ensureThreatFlow();

        const urlEl = await waitFor(() => getUrlInput(), 12000, 120);
        if (!urlEl) throw new Error("Input URL hilang setelah reset Safe Browsing");

        await setInputStable(urlEl, "", 6);
        if (String(urlEl.value || "").trim()) {
          await sleep(250);
          await setInputStable(urlEl, "", 6);
        }

        const nextOk = await setInputStable(urlEl, nextUrl, 10);
        if (!nextOk) throw new Error("Safe Browsing gagal mengisi URL berikutnya secara otomatis.");

        const activeDetails = getDetails();
        if (activeDetails && String(defaults || "").trim()) {
          const detOk = await setInputStable(activeDetails, defaults, 8);
          if (!detOk && CFG.REQUIRE_DETAILS) throw new Error("Safe Browsing gagal mengisi ulang detail tambahan.");
        }

        const readyNext = await waitTruthy(() => submitEnabled() && normalizeUrl(getUrlInput()?.value || "") === normalizeUrl(nextUrl), 14000, 120);
        if (!readyNext) {
          const currentReport = getReportText() || "(kosong)";
          const currentUrl = getUrlInput()?.value || "(kosong)";
          throw new Error("Safe Browsing tidak siap untuk URL berikutnya. Report type: " + currentReport + " | URL: " + currentUrl);
        }
        return true;
      };

      await ensureReportType();
      await ensureThreatFlow();

      const defaults = ensureDetailsDefault();
      if (defaults == null) return;
      if (!defaults && CFG.REQUIRE_DETAILS) return;

      const ready = await waitTruthy(() => formReady(), 12000, 100);
      if (!ready) throw new Error("Form Safe Browsing belum siap");

      const detEl = getDetails();
      if (detEl) {
        if (!String(detEl.value || "").trim() && String(defaults || "").trim()) {
          const detOk = await setInputStable(detEl, defaults, 8);
          if (!detOk && CFG.REQUIRE_DETAILS) throw new Error("Detail tambahan gagal diisi di Safe Browsing");
        }
        saveDetails(detEl.value);

        let timer = 0;
        const onEdit = () => {
          try { clearTimeout(timer); } catch (_) {}
          timer = window.setTimeout(() => {
            const v = String(detEl.value || "").trim();
            if (v.length >= CFG.MIN_DETAILS_LEN) saveDetails(v);
          }, 180);
        };
        detEl.addEventListener("input", onEdit, { passive: true });
        detEl.addEventListener("change", onEdit, { passive: true });
        cleanup.add(() => {
          try { clearTimeout(timer); } catch (_) {}
          detEl.removeEventListener("input", onEdit);
          detEl.removeEventListener("change", onEdit);
        });
      } else if (CFG.REQUIRE_DETAILS) {
        throw new Error("Kolom detail Safe Browsing tidak ditemukan");
      }

      try {
        if (String(location.hash || "").startsWith(CFG.HASH_PREFIX)) {
          history.replaceState(null, "", location.pathname + location.search);
        }
      } catch (_) {}

      let processed = 0;
      while (true) {
        const queueNow = getQueue();
        const url = queueNow[0] || "";
        if (!url) break;

        await ensureReportType();
        await ensureThreatFlow();
        await ensureFilled(url, defaults);

        const sent = await submitCurrent(url);
        if (!sent) {
          const errText = getErrorText();
          throw new Error(errText ? ("Submit Safe Browsing gagal: " + errText) : ("Submit Safe Browsing tidak terkonfirmasi untuk URL: " + url));
        }

        processed += 1;
        const rest = queueNow.slice(1);
        saveQueue(rest);

        if (!rest.length) {
          await waitTruthy(() => successSeen() || !!getStatusNodes().length, 5000, 100);
          alert("Selesai: " + processed + " URL berhasil diproses di Safe Browsing.");
          break;
        }

        const nextUrl = rest[0];
        await prepareNextSafeBrowsingForm(nextUrl, defaults, url);
      }

      if (!loadQueue().length && processed > 0) saveQueue([]);
    } finally {
      stop();
    }
  };


  const runGoDaddy = async () => {
    const gdState = state.gd || (state.gd = { busy: false, noteText: "" });
    if (gdState.busy) {
      alert("GoDaddy report sedang berjalan. Selesaikan proses sebelumnya dulu.");
      return;
    }

    gdState.busy = true;
    try {
      const CFG = {
        URL: "https://supportcenter.godaddy.com/abusereport/phishing?plid=1",
        MAX_BATCH: 10,
        LS_EMAIL_KEY: "__IRDG_GD_REPORTER_EMAIL_V726__",
        LS_NOTE_KEY: "__IRDG_GD_REPORTER_NOTE_V730__",
        EMAIL_RE: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        SUCCESS_WORDS: [
          "thank you",
          "thanks",
          "report has been submitted",
          "form has been submitted",
          "request has been submitted",
          "received your report",
          "received your request",
          "case number",
          "success"
        ],
        SEL: {
          email: "#email-field,input[name='email']",
          source: "#source-field,textarea[name='source']",
          targetNo: "#target-no,input[name='targetNo'][value='no']",
          proxyNo: "#proxy-no,input[name='proxyNo'][value='no']",
          country: "#country-field,select[name='country']",
          info: "#info-field,textarea[name='info']",
          attested: "#attested,input[name='confirmation']",
          submit: "#submit-button,button[type='submit']"
        }
      };

      const getEmail = () => pick(CFG.SEL.email, document, true);
      const getSource = () => pick(CFG.SEL.source, document, true);
      const getTargetNo = () => pick(CFG.SEL.targetNo, document, true);
      const getProxyNo = () => pick(CFG.SEL.proxyNo, document, true);
      const getCountry = () => pick(CFG.SEL.country, document, true);
      const getInfo = () => pick(CFG.SEL.info, document, true);
      const getAttested = () => pick(CFG.SEL.attested, document, true);
      const getSubmit = () => pick(CFG.SEL.submit, document, true);

      const loadStoredEmail = () => {
        try {
          return String(localStorage.getItem(CFG.LS_EMAIL_KEY) || "").trim();
        } catch (_) {
          return "";
        }
      };

      const saveStoredEmail = (value) => {
        const clean = String(value || "").trim();
        if (!clean) return;
        try { localStorage.setItem(CFG.LS_EMAIL_KEY, clean); } catch (_) {}
      };

      const loadStoredNote = () => {
        try {
          const raw = localStorage.getItem(CFG.LS_NOTE_KEY);
          return raw == null ? null : String(raw);
        } catch (_) {
          return null;
        }
      };

      const saveStoredNote = (value) => {
        const clean = String(value || "").trim();
        try { localStorage.setItem(CFG.LS_NOTE_KEY, clean); } catch (_) {}
      };

      const getDefaultNote = () => {
        const memoryNote = String(gdState.noteText || "").trim();
        if (memoryNote) return memoryNote;
        const storedNote = loadStoredNote();
        if (storedNote !== null) return String(storedNote || "");
        return String(getInfo()?.value || "").trim();
      };

      const validEmail = (value) => CFG.EMAIL_RE.test(String(value || "").trim());
      const currentEmailValue = () => String(getEmail()?.value || "").trim();

      const resolveReporterEmail = async () => {
        const emailEl = await waitFor(() => getEmail(), 10000, 120);
        if (!emailEl) throw new Error("GoDaddy email field #email-field tidak ditemukan");

        let current = currentEmailValue();
        if (current) {
          if (!validEmail(current)) throw new Error("Format email pelapor dari field GoDaddy tidak valid: " + current);
          saveStoredEmail(current);
          return current;
        }

        realClick(emailEl);
        await sleep(700);
        current = currentEmailValue();
        if (current) {
          if (!validEmail(current)) throw new Error("Format email pelapor dari autofill GoDaddy tidak valid: " + current);
          saveStoredEmail(current);
          return current;
        }

        const stored = loadStoredEmail();
        if (stored) {
          if (!validEmail(stored)) throw new Error("Email default tersimpan tidak valid. Hapus localStorage key " + CFG.LS_EMAIL_KEY + " lalu jalankan ulang.");
          return stored;
        }

        const manual = prompt(
          "Email pelapor belum terisi. Bookmarklet tidak bisa membaca/memilih item dropdown autofill Gmail milik browser.\n\nIsi email default sekali; setelah itu akan auto-terisi di browser ini:",
          ""
        );
        if (manual == null) return null;
        const clean = String(manual || "").trim();
        if (!clean) throw new Error("Email pelapor wajib diisi agar GoDaddy tidak stuck di kolom Your Email Address.");
        if (!validEmail(clean)) throw new Error("Format email pelapor tidak valid: " + clean);
        saveStoredEmail(clean);
        return clean;
      };

      const currentHost = String(location.hostname || "").toLowerCase();
      const currentPath = String(location.pathname || "").toLowerCase();
      if (currentHost !== "supportcenter.godaddy.com" || !currentPath.includes("/abusereport/phishing")) {
        location.href = CFG.URL;
        return;
      }

      const urls = promptUrls(CFG.MAX_BATCH);
      if (urls == null) return;
      if (!urls.length) throw new Error("URL kosong");

      const emailValue = await resolveReporterEmail();
      if (emailValue == null) return;

      const defaultNote = getDefaultNote();
      const noteValue = prompt("Keterangan tambahan untuk GoDaddy:", defaultNote);
      if (noteValue == null) return;
      gdState.noteText = String(noteValue || "").trim();
      saveStoredNote(gdState.noteText);

      const setSelectByText = async (select, wantedText) => {
        if (!select) return false;
        const wanted = norm(wantedText);
        const options = Array.from(select.options || []);
        const found = options.find((opt) => norm(opt.textContent || opt.label || opt.value).includes(wanted));
        if (!found) return false;

        for (let i = 0; i < 5; i++) {
          try {
            select.value = found.value;
            select.selectedIndex = options.indexOf(found);
            found.selected = true;
          } catch (_) {}
          try { select.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) {}
          try { select.dispatchEvent(new Event("change", { bubbles: true })); } catch (_) {}
          await sleep(90 + i * 25);
          try {
            if (select.value === found.value || select.selectedIndex === options.indexOf(found)) return true;
          } catch (_) {}
        }
        return false;
      };

      const fireValidationEvents = async (el) => {
        if (!el) return false;
        try { el.focus?.({ preventScroll: true }); } catch (_) {}
        const fire = (ev) => {
          try { el.dispatchEvent(ev); } catch (_) {}
        };
        try {
          fire(new InputEvent("input", { bubbles: true, composed: true, inputType: "insertText", data: String(el.value || "") }));
        } catch (_) {
          fire(new Event("input", { bubbles: true }));
        }
        fire(new Event("change", { bubbles: true }));
        try { fire(new KeyboardEvent("keyup", { bubbles: true, key: "Tab" })); } catch (_) {}
        try { fire(new FocusEvent("blur", { bubbles: true, composed: true, relatedTarget: document.body })); } catch (_) { fire(new Event("blur", { bubbles: true })); }
        await sleep(80);
        return true;
      };

      const getCheckedSetter = (el) => {
        try {
          let proto = el;
          while ((proto = Object.getPrototypeOf(proto))) {
            const desc = Object.getOwnPropertyDescriptor(proto, "checked");
            if (desc && typeof desc.set === "function") return desc.set;
          }
        } catch (_) {}
        return null;
      };

      const hardCheck = async (input, checked = true) => {
        if (!input) return false;
        const next = !!checked;
        try { input.focus?.({ preventScroll: true }); } catch (_) {}
        try {
          const setter = getCheckedSetter(input);
          if (setter) setter.call(input, next);
          else input.checked = next;
        } catch (_) {
          try { input.checked = next; } catch (_) {}
        }
        try { input.dispatchEvent(new Event("input", { bubbles: true })); } catch (_) {}
        try { input.dispatchEvent(new Event("change", { bubbles: true })); } catch (_) {}
        try { input.dispatchEvent(new FocusEvent("blur", { bubbles: true, composed: true, relatedTarget: document.body })); } catch (_) {}
        await sleep(90);
        return !!input.checked === next;
      };

      const ensureChecked = async (getEl, labelSelector, labelName) => {
        const input = await waitFor(() => getEl(), 10000, 120);
        if (!input) throw new Error(labelName + " tidak ditemukan");

        const label = input.id ? pick("label[for='" + input.id.replace(/'/g, "\\'") + "']", document, true) : null;
        const target = label || (labelSelector ? pick(labelSelector, document, true) : null) || input;
        for (let i = 0; i < 7; i++) {
          if (input.checked) {
            await hardCheck(input, true);
            return true;
          }
          realClick(target);
          await sleep(170 + i * 45);
        }

        const ok = await hardCheck(input, true);
        return ok && !!input.checked;
      };

      const getFormDiagnostics = () => {
        const email = String(getEmail()?.value || "").trim();
        const sourceRaw = String(getSource()?.value || "").trim();
        const parsed = parseUrlList(sourceRaw);
        const btn = getSubmit();
        const country = getCountry();
        return {
          email,
          emailOk: validEmail(email),
          urlCount: parsed.urls.length,
          invalidUrlCount: parsed.invalid.length,
          targetNo: !!getTargetNo()?.checked,
          proxyNo: !!getProxyNo()?.checked,
          country: String(country?.value || country?.options?.[country.selectedIndex]?.textContent || "").trim(),
          attested: !!getAttested()?.checked,
          submitDisabled: !!(btn && isDisabled(btn))
        };
      };

      const formDiagnosticsText = () => {
        const d = getFormDiagnostics();
        return [
          "Email valid: " + (d.emailOk ? "ya" : "tidak") + (d.email ? " (" + d.email + ")" : ""),
          "URL terbaca: " + d.urlCount + (d.invalidUrlCount ? " | invalid: " + d.invalidUrlCount : ""),
          "Target impersonated No: " + (d.targetNo ? "ya" : "tidak"),
          "Mobile proxy No: " + (d.proxyNo ? "ya" : "tidak"),
          "Country: " + (d.country || "kosong"),
          "Confirmation: " + (d.attested ? "ya" : "tidak"),
          "Submit disabled: " + (d.submitDisabled ? "ya" : "tidak")
        ].join("\n");
      };

      const wakeGoDaddyValidation = async () => {
        const fields = [getEmail(), getSource(), getInfo(), getCountry()].filter(Boolean);
        for (const el of fields) await fireValidationEvents(el);
        for (const el of [getTargetNo(), getProxyNo(), getAttested()].filter(Boolean)) await hardCheck(el, true);
        try { document.body?.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, cancelable: true, view: window })); } catch (_) {}
        await sleep(150);
      };

      const waitSubmitReady = async (timeoutMs = 18000) => {
        const start = now();
        while (now() - start < timeoutMs) {
          const btn = getSubmit();
          if (btn && !isDisabled(btn)) return true;
          await wakeGoDaddyValidation();
          await sleep(260);
        }
        const btn = getSubmit();
        return !!btn && !isDisabled(btn);
      };

      const successSeen = () => {
        const nodes = qsa("[role='alert'],[role='dialog'],main,.ux-alert,.ux-dialog,body", document).filter(isVisible);
        return nodes.some((node) => {
          const text = norm(node.textContent || "");
          if (!text) return false;
          if (text.includes("not complete") || text.includes("submitted a report via email")) return false;
          if (text.length > 6000 && node === document.body) return false;
          return CFG.SUCCESS_WORDS.some((word) => text.includes(norm(word)));
        });
      };

      const sourceEl = await waitFor(() => getSource(), 15000, 120);
      if (!sourceEl) throw new Error("GoDaddy source field #source-field tidak ditemukan");
      const sourceOk = await setInputStable(sourceEl, urls.join("\n"), 10);
      if (!sourceOk) throw new Error("GoDaddy gagal mengisi URL di #source-field");

      const emailEl = getEmail();
      const emailNext = String(emailValue || "").trim();
      if (emailEl && emailNext) {
        const emailOk = await setInputStable(emailEl, emailNext, 8);
        if (!emailOk) throw new Error("GoDaddy gagal mengisi email pelapor");
      }

      const infoEl = await waitFor(() => getInfo(), 12000, 120);
      if (!infoEl) throw new Error("GoDaddy info field #info-field tidak ditemukan");
      const infoOk = await setInputStable(infoEl, gdState.noteText, 10);
      if (!infoOk) throw new Error("GoDaddy gagal mengisi keterangan tambahan");
      saveStoredNote(gdState.noteText);

      await ensureChecked(getTargetNo, "label[for='target-no']", "Pilihan target-no");
      await ensureChecked(getProxyNo, "label[for='proxy-no']", "Pilihan proxy-no");

      const countryEl = getCountry();
      if (countryEl) await setSelectByText(countryEl, "Indonesia");

      await ensureChecked(getAttested, "label[for='attested']", "Checkbox confirmation");
      await wakeGoDaddyValidation();

      let submitBtn = await waitFor(() => getSubmit(), 10000, 120);
      if (!submitBtn) throw new Error("GoDaddy submit button tidak ditemukan");

      const readyBeforeConfirm = await waitSubmitReady(18000);
      const summary = "GoDaddy form sudah diisi.\n\nEmail: " + emailValue + "\nURL: " + urls.length + "\nKeterangan tambahan: " + (gdState.noteText ? "terisi" : "kosong") + "\nTarget impersonated: No\nMobile proxy: No\nCountry: Indonesia jika tersedia\nSubmit button: " + (readyBeforeConfirm ? "aktif" : "masih disabled") + "\n\nOK = klik Submit sekarang.\nCancel = berhenti agar kamu cek manual dulu.";
      if (!confirm(summary)) {
        alert("Form GoDaddy sudah siap. Cek manual lalu submit sendiri jika semua data sudah benar.\n\nStatus terakhir:\n" + formDiagnosticsText());
        return;
      }

      submitBtn = getSubmit() || submitBtn;
      const readyAfterConfirm = !isDisabled(submitBtn) || await waitSubmitReady(10000);
      submitBtn = getSubmit() || submitBtn;
      if (!readyAfterConfirm || isDisabled(submitBtn)) {
        throw new Error("Tombol Submit GoDaddy masih disabled setelah validasi ulang.\n\n" + formDiagnosticsText() + "\n\nBiasanya ini terjadi karena validasi React/GoDaddy atau reCAPTCHA belum menerima state otomatis. Klik manual salah satu field, tekan Tab, lalu centang ulang Confirmation jika perlu.");
      }

      const beforeHref = String(location.href || "");
      realClick(submitBtn);

      await sleep(700);
      const done = await waitTruthy(() => {
        if (successSeen()) return true;
        if (String(location.href || "") !== beforeHref) return true;
        const btn = getSubmit();
        return !!btn && isDisabled(btn);
      }, 12000, 180);

      if (done) {
        alert("Submit GoDaddy sudah diklik. Jika halaman menampilkan captcha/verifikasi, selesaikan manual.");
      } else {
        alert("Submit GoDaddy sudah dicoba, tetapi belum ada konfirmasi jelas. Cek halaman manual, terutama jika reCAPTCHA/validasi muncul.");
      }
    } finally {
      gdState.busy = false;
    }
  };

  const route = async () => {
    const host = String(location.hostname || "").toLowerCase();
    const path = String(location.pathname || "").toLowerCase();

    if (host === "search.google.com" && path.includes("/search-console/report-spam")) {
      await runGSC();
      return;
    }

    if ((host === "www.google.com" || host === "google.com" || host === "safebrowsing.google.com") && path.includes("/safebrowsing/report_phish")) {
      await runSafeBrowsing();
      return;
    }

    if (host === "supportcenter.godaddy.com" && path.includes("/abusereport/phishing")) {
      await runGoDaddy();
      return;
    }

    const choice = prompt(
      "Pilih halaman target:\n" +
      "1 = Google Safe Browsing Report Phishing\n" +
      "2 = Google Search Console Report Spam\n" +
      "3 = GoDaddy Abuse Report Phishing\n\n" +
      "Isi 1, 2, atau 3:",
      "1"
    );
    if (choice == null) return;

    const clean = String(choice || "").trim();
    if (clean === "2") {
      location.href = "https://search.google.com/search-console/report-spam";
      return;
    }
    if (clean === "3") {
      location.href = "https://supportcenter.godaddy.com/abusereport/phishing?plid=1";
      return;
    }

    location.href = "https://safebrowsing.google.com/safebrowsing/report_phish/";
  };

  route().catch((err) => alert(APP.NAME + " " + APP.VERSION + "\n" + String(err?.message || err)));
})();
