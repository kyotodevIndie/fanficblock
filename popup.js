const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => [...document.querySelectorAll(sel)];

let settings = { ...JF_DEFAULTS };

// Versão do manifest ("version_name" quando houver, ex.: beta.0.1.2).
const manifest = chrome.runtime?.getManifest?.();
$("#version").textContent = manifest ? manifest.version_name || `v${manifest.version}` : "";

const save = (data) => {
  Object.assign(settings, data);
  chrome.storage.sync.set(data);
};

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

// Monta os grupos de "Não mostrar" a partir de JF_FACETS (classify.js).
function buildFacets() {
  const root = $("#facets");
  for (const [name, facet] of Object.entries(JF_FACETS)) {
    const group = document.createElement("div");
    group.className = "facet";
    group.innerHTML = `<div class="facet-title"></div><div class="chips"></div>`;
    group.querySelector(".facet-title").textContent = facet.label;
    for (const [id, option] of Object.entries(facet.options)) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.dataset.facet = name;
      chip.dataset.option = id;
      chip.textContent = option.label;
      group.querySelector(".chips").append(chip);
    }
    root.append(group);
  }
}

function render() {
  for (const el of $$(".switch")) el.setAttribute("aria-checked", String(Boolean(settings[el.dataset.setting])));
  for (const el of $$(".segmented[data-setting] button")) {
    el.setAttribute("aria-pressed", String(settings[el.parentElement.dataset.setting] === el.dataset.value));
  }
  for (const el of $$(".chip[data-facet]")) {
    const excluded = settings.exclude?.[el.dataset.facet] || [];
    el.setAttribute("aria-pressed", String(excluded.includes(el.dataset.option)));
  }
  for (const el of $$("[data-list]")) {
    if (document.activeElement !== el) el.value = (settings[el.dataset.list] || []).join(el.dataset.sep ? ", " : "\n");
  }
  for (const el of $$("[data-number]")) el.value = settings[el.dataset.number];
  // Desligado: o resto fica apagado.
  $("#body").classList.toggle("off", !settings.enabled);
  // "Só vagas" desligado: filtros de vaga não se aplicam.
  $("#jobs-note").hidden = settings.onlyJobs;
  for (const el of $$("#jobs .item")) el.style.opacity = settings.onlyJobs ? "" : "0.5";
  $("#active-count").textContent = activeSummary();
  const advanced = advancedActive();
  $("#advanced-count").textContent = advanced ? `· ${advanced} ${advanced === 1 ? "ativa" : "ativas"}` : "";
}

// Filtros dentro de "Opções avançadas" de Vagas que estão ligados — para dar
// para ver que tem coisa filtrando mesmo com o bloco fechado.
function advancedActive() {
  const switches = ["requireLocation", "requireSalary", "hideIncomplete"].filter((k) => settings[k]).length;
  const lists = ["mustNotHave", "locations", "blockedCompanies", "allowedCompanies"].filter((k) => (settings[k] || []).length).length;
  const numbers = ["minSalary", "maxExperience"].filter((k) => Number(settings[k]) > 0).length;
  return switches + lists + numbers;
}

// Switches que são filtro (não contam "Ativado", "Mostrar motivo"...).
const FILTER_SWITCHES = [
  "onlyJobs", "recruitersOnly", "techOnly", "hideEnglish",
  "blockFluff", "blockBait", "hideSponsored", "hideReposts",
  "requireLocation", "requireSalary", "hideIncomplete", "blockCourses"
];

function activeSummary() {
  if (!settings.enabled) return "Desligado — seu feed está sem proteção 😬";
  const lists = [
    "mustHave", "mustNotHave", "locations", "blockedCompanies", "allowedCompanies",
    "blockedDomains", "blockedAuthors", "allowedAuthors", "blocklist"
  ];
  const numbers = ["minSalary", "maxExperience"];
  const chips = Object.values(settings.exclude || {}).reduce((n, list) => n + list.length, 0);
  const total = FILTER_SWITCHES.filter((k) => settings[k]).length
    + lists.filter((k) => (settings[k] || []).length).length
    + numbers.filter((k) => Number(settings[k]) > 0).length
    + chips;
  return total === 1 ? "1 filtro ativo" : `${total} filtros ativos`;
}

// Busca: mostra só os itens cujo texto bate, abrindo as seções que têm resultado.
function applySearch() {
  const query = jfNormalize($("#search").value.trim());
  let any = false;
  for (const section of $$(".section")) {
    const title = jfNormalize(section.querySelector("summary").textContent);
    let hits = 0;
    for (const item of section.querySelectorAll(".item")) {
      const match = !query || title.includes(query) || jfNormalize(item.textContent).includes(query);
      item.hidden = !match;
      if (match) hits++;
    }
    for (const advanced of section.querySelectorAll(".advanced")) {
      const inner = [...advanced.querySelectorAll(".item")].filter((i) => !i.hidden).length;
      advanced.hidden = Boolean(query) && inner === 0;
      if (query && inner) advanced.open = true;
    }
    section.hidden = Boolean(query) && hits === 0;
    if (query && hits) section.open = true;
    any ||= hits > 0;
  }
  $("#no-results").hidden = !query || any;
  if (typeof JF_PIX !== "undefined") $("#support").hidden = Boolean(query);
}

buildFacets();
$("#search").addEventListener("input", applySearch);

chrome.storage.sync.get(JF_DEFAULTS, (stored) => {
  settings = stored;
  render();
});

// Switches, segmentado e chips salvam na hora.
document.addEventListener("click", (e) => {
  const sw = e.target.closest(".switch");
  if (sw) {
    save({ [sw.dataset.setting]: !settings[sw.dataset.setting] });
    return render();
  }
  const seg = e.target.closest(".segmented[data-setting] button");
  if (seg) {
    save({ [seg.parentElement.dataset.setting]: seg.dataset.value });
    return render();
  }
  const chip = e.target.closest(".chip[data-facet]");
  if (chip) {
    const exclude = structuredClone(settings.exclude || {});
    const list = new Set(exclude[chip.dataset.facet] || []);
    if (list.has(chip.dataset.option)) list.delete(chip.dataset.option);
    else list.add(chip.dataset.option);
    exclude[chip.dataset.facet] = [...list];
    save({ exclude });
    return render();
  }
});

// Listas e números salvam sozinhos, meio segundo depois de parar de digitar.
const timers = {};
function debounced(key, fn) {
  clearTimeout(timers[key]);
  timers[key] = setTimeout(fn, 500);
}

for (const el of $$("[data-list]")) {
  el.addEventListener("input", () => debounced(el.dataset.list, () => {
    const parts = el.value.split(el.dataset.sep || "\n").map((s) => s.trim()).filter(Boolean);
    save({ [el.dataset.list]: parts });
    render();
    toast("Salvo");
  }));
}

for (const el of $$("[data-number]")) {
  el.addEventListener("input", () => debounced(el.dataset.number, () => {
    // min="0" aceita 0 (= desligado); os outros caem no padrão se ficar vazio.
    const min = Number(el.min || 1);
    const value = Number(el.value);
    save({ [el.dataset.number]: Math.max(min, Number.isFinite(value) && el.value !== "" ? value : JF_DEFAULTS[el.dataset.number]) });
    render();
    toast("Salvo");
  }));
}

$("#reset").addEventListener("click", () => {
  const keep = { enabled: settings.enabled };
  chrome.storage.sync.set({ ...JF_DEFAULTS, ...keep }, () => {
    settings = { ...JF_DEFAULTS, ...keep };
    render();
    toast("Configurações padrão restauradas");
  });
});

// --- Gerador de query ------------------------------------------------------
// Estado guardado em storage.local (é só conveniência deste navegador).
let query = { ...JF_QUERY_EMPTY };

function buildQueryOptions() {
  const fill = (select, field, first) => {
    select.innerHTML = "";
    if (first) select.append(new Option(first, ""));
    for (const [id, o] of Object.entries(JF_QUERY_OPTIONS[field].options)) select.append(new Option(o.label, id));
  };
  for (const el of $$("[data-q]")) fill(el, el.dataset.q, el.dataset.q === "lang" ? null : "Qualquer");
  for (const el of $$("[data-q-add]")) fill(el, el.dataset.qField, "+ Adicionar");
}

function renderQuery() {
  for (const el of $$("[data-q]")) el.value = query[el.dataset.q];
  for (const el of $$("[data-q-mode] button")) el.setAttribute("aria-pressed", String(query.techMode === el.dataset.value));
  for (const box of $$("[data-q-chips]")) {
    box.innerHTML = "";
    for (const id of query[box.dataset.qChips]) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.dataset.qRemove = id;
      chip.title = "Remover";
      chip.textContent = JF_QUERY_OPTIONS[box.dataset.qField].options[id].label;
      box.append(chip);
    }
  }
  $("#q-output").value = jfBuildQuery(query);
  const n = jfQueryCount(query);
  $("#q-level").textContent = n >= 5 ? `${n} opções: busca bem específica, pode vir pouca vaga 😬`
    : n >= 3 ? `${n} opções: busca específica` : "";
}

function saveQuery() {
  chrome.storage.local?.set({ jfQuery: query });
  renderQuery();
}

$("#query-builder").addEventListener("change", (e) => {
  const el = e.target;
  if (el.dataset.q) query[el.dataset.q] = el.value;
  if (el.dataset.qAdd && el.value) {
    const list = query[el.dataset.qAdd];
    if (!list.includes(el.value)) query[el.dataset.qAdd] = [...list, el.value];
    el.value = "";
  }
  saveQuery();
});

$("#query-builder").addEventListener("click", (e) => {
  const mode = e.target.closest("[data-q-mode] button");
  if (mode) {
    query.techMode = mode.dataset.value;
    return saveQuery();
  }
  const remove = e.target.closest("[data-q-remove]");
  if (remove) {
    const key = remove.parentElement.dataset.qChips;
    query[key] = query[key].filter((id) => id !== remove.dataset.qRemove);
    saveQuery();
  }
});

$("#q-clear").addEventListener("click", () => {
  query = { ...JF_QUERY_EMPTY, techs: [], exclude: [] };
  saveQuery();
});

async function copyQuery() {
  try {
    await navigator.clipboard.writeText($("#q-output").value);
    return true;
  } catch {
    return false;
  }
}

$("#q-copy").addEventListener("click", async () => toast((await copyQuery()) ? "Busca copiada" : "Não deu para copiar"));

// Coloca a busca no campo de pesquisa do LinkedIn (sem pesquisar: a pessoa
// confere e aperta Enter). Se não achar o campo, copia.
$("#q-apply").addEventListener("click", async () => {
  const text = $("#q-output").value;
  let filled = false;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    filled = (await chrome.tabs.sendMessage(tab.id, { type: "jf-search", query: text }))?.ok;
  } catch { /* aba que não é do LinkedIn */ }
  if (filled) return toast("Busca no campo de pesquisa: é só apertar Enter");
  toast((await copyQuery()) ? "Abra o LinkedIn e cole no campo de busca (já copiei)" : "Abra o LinkedIn para aplicar a busca");
});

buildQueryOptions();
renderQuery();
chrome.storage.local?.get({ jfQuery: JF_QUERY_EMPTY }, ({ jfQuery }) => {
  query = { ...JF_QUERY_EMPTY, ...jfQuery };
  renderQuery();
});

// --- Fanficômetro ------------------------------------------------------------
// Os números vêm do content script (storage.local, chave jfStats).
function renderStats(stats) {
  const sum = jfStatsSummary(stats || {});
  $("#stat-today").textContent = sum.today;
  $("#stat-week").textContent = sum.week;
  $("#stat-total").textContent = sum.total;
  $("#stat-time").textContent = jfDuration(sum.seconds);
  $("#stats-badge").textContent = sum.today ? `· ${sum.today} hoje` : "";
  $("#stats-headline").textContent = !sum.total
    ? "Nenhuma fanfic barrada ainda. Bora rolar esse feed."
    : sum.total === 1
      ? "1 fanfic corporativa não sobreviveu ao seu feed."
      : `${sum.total} fanfics corporativas não sobreviveram ao seu feed.`;

  const cats = Object.entries(sum.cats).filter(([id, n]) => n && JF_STAT_CATEGORIES[id]).sort((a, b) => b[1] - a[1]);
  const max = cats[0]?.[1] || 1;
  const list = $("#stat-cats");
  list.innerHTML = "";
  for (const [id, n] of cats) {
    const { label, emoji } = JF_STAT_CATEGORIES[id];
    const row = document.createElement("div");
    row.className = "stat-cat";
    row.innerHTML = `<span></span><strong></strong><div class="bar"><span></span></div>`;
    row.children[0].textContent = `${emoji} ${label}`;
    row.children[1].textContent = n;
    row.querySelector(".bar span").style.width = `${Math.max(4, (n / max) * 100)}%`;
    list.append(row);
  }
}

chrome.storage.local?.get({ jfStats: null }, ({ jfStats }) => renderStats(jfStats));
chrome.storage.onChanged?.addListener((changes, area) => {
  if (area === "local" && changes.jfStats) renderStats(changes.jfStats.newValue);
});

// Zerar pede um segundo clique (sem confirm(), que trava o popup).
let resetArmed = null;
$("#stats-reset").addEventListener("click", (e) => {
  const btn = e.currentTarget;
  if (!resetArmed) {
    btn.textContent = "Clique de novo para zerar";
    resetArmed = setTimeout(() => {
      resetArmed = null;
      btn.textContent = "Zerar estatísticas";
    }, 3000);
    return;
  }
  clearTimeout(resetArmed);
  resetArmed = null;
  btn.textContent = "Zerar estatísticas";
  chrome.storage.local.set({ jfStats: null });
  renderStats(null);
  toast("Fanficômetro zerado");
});

// --- Apoio (Pix) -------------------------------------------------------------
// JF_PIX vem de support.js (tools/pix.py). Sem ele, o card não aparece.
if (typeof JF_PIX !== "undefined") {
  $("#support").hidden = false;
  $("#pix-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(JF_PIX);
      toast("Pix copiado. Valeu demais! 💜");
    } catch {
      toast("Não deu para copiar o Pix");
    }
  });
}

// Formato do export: .md (para ler) ou .json (para script).
let exportFormat = "md";
$("#export-format").addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  exportFormat = btn.dataset.value;
  for (const el of $$("#export-format button")) el.setAttribute("aria-pressed", String(el === btn));
});

// Pede os posts para a aba do LinkedIn e baixa no formato escolhido. Limite 0 = todos.
$("#export").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const limit = Number($("#export-limit").value);
  const type = exportFormat === "json" ? "application/json" : "text/markdown";
  try {
    const { count, content } = await chrome.tabs.sendMessage(tab.id, { type: "jf-export", limit, format: exportFormat });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = `fanficblock-posts-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.${exportFormat}`;
    a.click();
    toast(`${count} posts baixados`);
  } catch {
    toast("Abra o feed do LinkedIn e recarregue a aba");
  }
});
