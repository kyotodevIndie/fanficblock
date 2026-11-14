// Página do FanficBlock. O detector e o gerador usam o código da extensão
// (defaults.js, classify.js, stats.js, query.js), carregado antes deste arquivo.

const $ = (sel) => document.querySelector(sel);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
}

// --- Título que troca de palavra ------------------------------------------
const WORDS = ["fanfic corporativa", "coach quântico", "“comenta EU”", "textão de ego", "curso milagroso", "lição do cachorro"];
async function rotate() {
  const box = $("#rotator");
  let i = 0;
  for (;;) {
    await sleep(2200);
    const word = box.querySelector(".word");
    word.classList.add("strike");
    await sleep(650);
    word.classList.add("out");
    await sleep(330);
    i = (i + 1) % WORDS.length;
    const next = document.createElement("span");
    next.className = "word in";
    next.textContent = WORDS[i];
    word.replaceWith(next);
  }
}

// --- Demo: feed fictício sendo filtrado -----------------------------------
const AVATARS = [
  "linear-gradient(135deg,#f97316,#ec4899)", "linear-gradient(135deg,#a855f7,#6366f1)",
  "linear-gradient(135deg,#22c55e,#14b8a6)", "linear-gradient(135deg,#eab308,#f97316)",
  "linear-gradient(135deg,#ec4899,#a855f7)", "linear-gradient(135deg,#0ea5e9,#22c55e)"
];
const FEED = [
  { who: "Fulano Visionário", role: "CEO de Si Mesmo", text: "Fui demitido hoje. E agradeci. 🙏 Uma lição de liderança que nenhuma faculdade ensina...", why: "devaneio" },
  { who: "Ana Recrutadora", role: "Tech Recruiter", text: "🚀 Estamos contratando: Dev Front-end Pleno (React) · 100% remoto · CLT", job: true },
  { who: "Beltrano Growth", role: "Top Voice de Tudo", text: "Montei o guia definitivo pra bombar no feed. Comenta EU que eu te mando 👇", why: "caça-engajamento" },
  { who: "Mentor em 30 Dias", role: "Promovido", text: "Mentoria Dev Sênior: de R$ 1.997 por R$ 997. Últimas vagas, garanta a sua!", why: "vendedor de curso" },
  { who: "Ciclano Inspira", role: "Palestrante", text: "O que meu cachorro me ensinou sobre resiliência corporativa. Concorda? 🐶", why: "devaneio" },
  { who: "Bia Talent", role: "Talent Acquisition", text: "Vaga: Back-end Node.js Sênior · Híbrido em SP · PJ. Candidate-se pelo link!", job: true }
];

function cardHtml(post, i) {
  return `
    <div class="card-body">
      <div class="who"><span class="avatar" style="background:${AVATARS[i % AVATARS.length]}"></span><span><b>${esc(post.who)}</b> · ${esc(post.role)}</span></div>
      <p>${esc(post.text)}</p>
    </div>
    ${post.job ? `<span class="tag">✅ vaga</span>` : `<div class="card-bar">Escondido · ${esc(post.why)} <span class="mini">Mostrar</span></div>`}`;
}

async function runDemo() {
  const feed = $("#demo-feed");
  const count = $("#demo-count");
  let total = 0;
  for (;;) {
    feed.classList.remove("fade");
    feed.innerHTML = "";
    const cards = FEED.map((post, i) => {
      const el = document.createElement("div");
      el.className = "card";
      el.innerHTML = cardHtml(post, i);
      feed.append(el);
      return el;
    });
    for (const el of cards) el.style.maxHeight = `${el.scrollHeight}px`;
    await sleep(900);
    for (const [i, el] of cards.entries()) {
      el.classList.add("scan");
      await sleep(650);
      el.classList.remove("scan");
      if (FEED[i].job) {
        el.classList.add("kept");
      } else {
        el.classList.add("zapped");
        count.textContent = ++total;
        count.classList.remove("bump");
        void count.offsetWidth;
        count.classList.add("bump");
      }
      await sleep(450);
    }
    await sleep(3200);
    feed.classList.add("fade");
    await sleep(600);
  }
}

function staticDemo() {
  const feed = $("#demo-feed");
  feed.innerHTML = FEED.map((post, i) => `<div class="card ${post.job ? "kept" : "zapped"}">${cardHtml(post, i)}</div>`).join("");
  $("#demo-count").textContent = FEED.filter((p) => !p.job).length;
}

// --- Faixa de clichês ------------------------------------------------------
const CLICHES = [
  "Fui demitido e agradeci", "Comenta EU que eu te mando", "Lição de liderança com meu cachorro",
  "Não é sobre o cargo, é sobre o propósito", "Gratidão por essa jornada", "Marque alguém que precisa ler isso",
  "Últimas vagas na mentoria", "Ninguém fala sobre isso", "Recusei uma proposta de R$ 50 mil",
  "Curte e compartilha", "O que o surf me ensinou sobre vendas", "Agree?"
];
const ticker = $("#ticker");
ticker.innerHTML = [...CLICHES, ...CLICHES].map((c) => `<span>${esc(c)}</span>`).join("");

// --- Detector: o mesmo jfClassify da extensão -------------------------------
const compiled = jfCompile({ ...JF_DEFAULTS, blockCourses: true });
const EXAMPLES = [
  ["🐶 Lição do cachorro", "Lição de liderança que aprendi com meu cachorro hoje de manhã. Gratidão 🙏"],
  ["🎣 Comenta EU", "Montei o guia definitivo pra crescer no LinkedIn. Comenta EU que eu te mando no privado 👇"],
  ["🎓 Curso milagroso", "Mentoria Dev Sênior em 30 dias: de R$ 1.997 por R$ 997. Últimas vagas, garanta a sua!"],
  ["🙏 Fui demitido", "Fui demitido hoje. E agradeci. 🙏 Uma lição de liderança que nenhuma faculdade ensina."],
  ["🚀 Vaga de verdade", "🚀 Estamos contratando: Dev Front-end Pleno (React) · 100% remoto · CLT. Candidate-se pelo link na vaga."],
  ["🌎 Hiring", "We're hiring a Senior Backend Engineer (Node.js). Remote LATAM, contractor."]
];
const examples = $("#examples");
for (const [label, text] of EXAMPLES) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "chip";
  b.textContent = label;
  b.addEventListener("click", () => {
    for (const c of examples.children) c.setAttribute("aria-pressed", String(c === b));
    $("#post").value = text;
    judge(true);
  });
  examples.append(b);
}

let lastVerdict = "";
function judge(force = false) {
  const text = $("#post").value.trim();
  const box = $("#verdict");
  if (!text) {
    box.className = "verdict";
    box.innerHTML = `<div class="verdict-idle"><span class="big">🤔</span><p>Escreva ou escolha um post pra ver o veredito.</p></div>`;
    lastVerdict = "";
    return;
  }
  const { keep, reason } = jfClassify(text, false, compiled);
  const key = `${keep}|${reason}`;
  if (key === lastVerdict && !force) return;
  lastVerdict = key;
  const cat = JF_STAT_CATEGORIES[jfStatCategory(reason)];
  box.className = `verdict ${keep ? "ok" : "no shake"}`;
  box.innerHTML = keep
    ? `<div class="stamp ok"><span class="big">✅</span><h3>É vaga! Fica no feed.</h3><p class="muted">Passou pelo filtro padrão.</p><span class="why">motivo: ${esc(reason)}</span></div>`
    : `<div class="stamp no"><span class="big">${cat.emoji}</span><h3>Barrado: ${esc(cat.label.toLowerCase())}</h3><p class="muted">Esse não chega no seu feed.</p><span class="why">motivo: ${esc(reason)}</span></div>`;
}
let judgeTimer;
$("#post").addEventListener("input", () => {
  for (const c of examples.children) c.setAttribute("aria-pressed", "false");
  clearTimeout(judgeTimer);
  judgeTimer = setTimeout(judge, 350);
});

// --- Gerador de query: o mesmo jfBuildQuery da extensão ---------------------
const query = { ...JF_QUERY_EMPTY, techs: ["react", "node"], seniority: "mid", modality: "remote", exclude: ["intern"] };
const QB = [
  ["#qb-techs", "tech", "techs", ["react", "node", "typescript", "python", "java", "flutter", "data", "qa"], true],
  ["#qb-seniority", "seniority", "seniority", ["junior", "mid", "senior"], false],
  ["#qb-modality", "modality", "modality", ["remote", "hybrid", "onsite"], false],
  ["#qb-exclude", "exclude", "exclude", ["intern", "pj", "talents"], true]
];
function renderQuery() {
  for (const [sel, , key, , multi] of QB) {
    for (const chip of $(sel).children) {
      const on = multi ? query[key].includes(chip.dataset.id) : query[key] === chip.dataset.id;
      chip.setAttribute("aria-pressed", String(on));
    }
  }
  const out = $("#qb-output");
  out.textContent = jfBuildQuery(query);
  out.classList.remove("flash");
  void out.offsetWidth;
  out.classList.add("flash");
}
for (const [sel, field, key, ids, multi] of QB) {
  for (const id of ids) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.dataset.id = id;
    chip.textContent = JF_QUERY_OPTIONS[field].options[id].label;
    chip.addEventListener("click", () => {
      if (multi) {
        query[key] = query[key].includes(id) ? query[key].filter((x) => x !== id) : [...query[key], id];
      } else {
        query[key] = query[key] === id ? "" : id;
      }
      renderQuery();
    });
    $(sel).append(chip);
  }
}
renderQuery();
$("#qb-copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("#qb-output").textContent);
    toast("Query copiada. Cola na busca do LinkedIn 🔎");
  } catch {
    toast("Não deu pra copiar");
  }
});

// --- Aparece ao rolar + números que contam ----------------------------------
function countUp(el) {
  const target = Number(el.dataset.count);
  const suffix = el.dataset.suffix || "";
  if (reduced || !target) {
    el.textContent = target + suffix;
    return;
  }
  const start = performance.now();
  const step = (now) => {
    const t = Math.min(1, (now - start) / 1200);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))) + suffix;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    entry.target.classList.add("on");
    for (const n of entry.target.querySelectorAll("[data-count]")) countUp(n);
    observer.unobserve(entry.target);
  }
}, { threshold: 0.15 });
for (const el of document.querySelectorAll(".reveal")) observer.observe(el);

// Brilho que segue o mouse nos cards de recurso.
for (const card of document.querySelectorAll(".feature")) {
  card.addEventListener("pointermove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--x", `${e.clientX - r.left}px`);
    card.style.setProperty("--y", `${e.clientY - r.top}px`);
  });
}

// --- Pix --------------------------------------------------------------------
function hearts(x, y) {
  if (reduced) return;
  for (let i = 0; i < 12; i++) {
    const h = document.createElement("span");
    h.className = "heart";
    h.textContent = ["💜", "🧡", "💖", "☕"][i % 4];
    h.style.left = `${x}px`;
    h.style.top = `${y}px`;
    h.style.setProperty("--dx", `${(Math.random() - 0.5) * 220}px`);
    h.style.setProperty("--r", `${(Math.random() - 0.5) * 90}deg`);
    h.style.animationDelay = `${i * 30}ms`;
    document.body.append(h);
    setTimeout(() => h.remove(), 1400);
  }
}
$("#pix-copy").addEventListener("click", async (e) => {
  try {
    await navigator.clipboard.writeText(JF_PIX);
    toast("Pix copiado. Valeu demais! 💜");
    hearts(e.clientX, e.clientY);
  } catch {
    toast("Não deu pra copiar o Pix");
  }
});

// --- Começa ----------------------------------------------------------------
if (reduced) {
  staticDemo();
} else {
  rotate();
  runDemo();
}
