// Content script: acha os posts do feed, classifica e esconde.
import { jfClassify, jfCompile, jfNormalize, jfProfileId, jfSegment } from "./classify.ts";
import { JF_DEFAULTS, type Settings } from "./defaults.ts";
import { jfHash, jfStatCategory, jfStatsAdd, type StatEvent, type Stats } from "./stats.ts";

// Card de post, com o que a extensão pendura nele: a barra/etiqueta antes do
// card e a chave do post que a pessoa mandou mostrar.
interface Post extends HTMLElement {
  _jfExtra?: HTMLElement | null;
  _jfKey?: string;
}

export interface ExportRecord {
  keep: boolean;
  reason: string;
  feed: "antigo" | "novo";
  jobLink: boolean;
  links: string[];
  sponsored: boolean;
  authorId: string | null;
  author: string | null;
  header: string | null;
  body: string;
  card: string;
}

// Feed antigo: os atributos data-urn/data-id com "urn:li:activity" marcam cada post.
const POST_SELECTOR = [
  '[data-urn*="urn:li:activity"]',
  '[data-id*="urn:li:activity"]',
  '[data-urn*="urn:li:aggregate"]',
  '[data-id*="urn:li:aggregate"]',
  "div.feed-shared-update-v2"
].join(",");

// Feed novo (SDUI, sem classes legíveis): cada post começa com um título
// invisível "Feed post". A partir dele sobe-se até o card do post.
const MARKER_TEXTS = ["Feed post", "Publicação no feed", "Post do feed", "Publicación del feed"];
const MARKER_XPATH =
  "//text()[" + MARKER_TEXTS.map((t) => `normalize-space()='${t}'`).join(" or ") + "]";
// O título muda com o idioma da conta; o card do post também tem um
// componentkey que começa com "update-card", em qualquer idioma.
const CARD_SELECTOR = '[componentkey^="update-card"]';

// Feed antigo: partes do card que não são o post (autor, comentários, botões).
// No feed novo essas classes não existem e quem separa é o jfSegment.
const NOISE_SELECTOR = [
  '[class*="update-components-actor"]',
  '[class*="update-components-header"]',
  '[class*="feed-shared-actor"]',
  '[class*="comments-"]',
  '[class*="social-details"]',
  '[class*="social-activity"]',
  '[class*="feed-shared-social"]',
  '[class*="feed-shared-control-menu"]',
  "button"
].join(",");

const ACTOR_SELECTOR = '[class*="update-components-actor"], [class*="feed-shared-actor"]';

// Link para uma vaga dentro do post é o sinal mais forte que existe.
const JOB_LINK_SELECTOR = 'a[href*="/jobs/view/"], a[href*="/jobs/collections/"], a[href*="currentJobId="]';

let settings: Settings = { ...JF_DEFAULTS };
let compiled = jfCompile(settings);
let scheduled = false;
// Tudo que a extensão escondeu, para reexibir se o container mudar.
const concealed = new Set<Post>();

const isNoise = (el: Element, post: Element) => {
  const hit = el.closest(NOISE_SELECTOR);
  return hit !== null && post.contains(hit);
};

function sduiPosts(): Post[] {
  const snap = document.evaluate(MARKER_XPATH, document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  const markers: Post[] = [];
  for (let i = 0; i < snap.snapshotLength; i++) {
    const el = snap.snapshotItem(i)?.parentElement;
    if (el) markers.push(el);
  }
  for (const card of document.querySelectorAll<Post>(CARD_SELECTOR)) {
    if (!markers.some((m) => card.contains(m))) markers.push(card.querySelector<Post>("h2") ?? card);
  }
  markers.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  // Com um post só não dá para saber onde o card termina.
  if (markers.length < 2) return [];

  // Sobe enquanto o pai não engloba o post vizinho. Os marcadores estão em
  // ordem no documento, então basta olhar o anterior e o seguinte.
  return markers.map((marker, i) => {
    const prev = markers[i - 1];
    const next = markers[i + 1];
    let el = marker;
    while (el.parentElement && el.parentElement !== document.body && el.parentElement.tagName !== "MAIN") {
      const parent = el.parentElement;
      if ((prev && parent.contains(prev)) || (next && parent.contains(next))) break;
      el = parent;
    }
    return el;
  });
}

function findPosts(): Post[] {
  const legacy = [...document.querySelectorAll<Post>(POST_SELECTOR)]
    // Só o container mais externo: o feed aninha elementos com data-urn.
    .filter((p) => !p.parentElement?.closest(POST_SELECTOR));
  const sdui = sduiPosts().filter((p) => !legacy.some((l) => l.contains(p) || p.contains(l)));
  return [...legacy, ...sdui];
}

// Separa autor e texto do post e decide se fica.
function analyze(post: Post) {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(post, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    if (node.data.trim() && node.parentElement && !isNoise(node.parentElement, post)) nodes.push(node);
  }
  const seg = jfSegment(nodes.map((n) => n.data));

  // Links depois do fim do post (nos comentários) não contam.
  const endNode = nodes[seg.bodyEnd];
  const beforeEnd = (el: Element) => !endNode || el.compareDocumentPosition(endNode) & Node.DOCUMENT_POSITION_FOLLOWING;
  const jobLink = [...post.querySelectorAll(JOB_LINK_SELECTOR)].some((a) => !isNoise(a, post) && beforeEnd(a));
  // Links do texto do post (para domínios bloqueados e plataformas de curso):
  // depois do cabeçalho, antes das reações.
  const headerNode = nodes[seg.headerEnd];
  const afterHeader = (el: Element) => !headerNode || headerNode.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING;
  const links = [...post.querySelectorAll<HTMLAnchorElement>("a[href]")]
    .filter((a) => !isNoise(a, post) && afterHeader(a) && beforeEnd(a))
    .map((a) => a.href);

  const actor = post.querySelector(ACTOR_SELECTOR);
  const author = actor ? (actor.textContent ?? "").replace(/\s+/g, " ") : seg.author;
  const legacyHeader = post.querySelector(LEGACY_HEADER_SELECTOR);
  const header = legacyHeader ? (legacyHeader.textContent ?? "").replace(/\s+/g, " ") : seg.author;
  const sponsored = seg.sponsored || (actor !== null && PROMOTED_IN_ACTOR_RE.test(jfNormalize(author)));
  const authorId = authorProfileId(post, actor, nodes[seg.headerEnd]);

  // Identifica o post pelo conteúdo: o LinkedIn recria o elemento do card,
  // então marcar o elemento não basta para lembrar do "mostrar".
  const key = jfNormalize(`${author.slice(0, 60)}|${seg.body.slice(0, 120)}`);

  const meta = { authorId, header, sponsored, links };
  return { body: seg.body, author, jobLink, key, ...meta, ...jfClassify(seg.body, jobLink, compiled, author, meta) };
}

// Feed antigo: "Fulano compartilhou isso" fica num cabeçalho separado do autor.
const LEGACY_HEADER_SELECTOR = '[class*="update-components-header"]';
// Feed antigo: "Promovido" vem junto do bloco do autor.
const PROMOTED_IN_ACTOR_RE = /(^|\s)(promoted|promovido|patrocinado)(\s|$)/;
const PROFILE_LINK_SELECTOR = 'a[href*="/in/"], a[href*="/company/"], a[href*="/school/"], a[href*="/showcase/"]';

// "in/fulano" ou "company/acme" de quem postou: estável, ao contrário do nome.
// Feed antigo: primeiro link de perfil do bloco do autor. Feed novo: último
// link de perfil antes do horário (antes dele vêm "Fulano curtiu", "Seguido por").
function authorProfileId(post: Post, actor: Element | null, timeNode: Node | undefined) {
  if (actor) {
    const link = actor.querySelector(PROFILE_LINK_SELECTOR);
    return link ? jfProfileId(link.getAttribute("href")) : null;
  }
  if (!timeNode) return null;
  let id: string | null = null;
  for (const link of post.querySelectorAll(PROFILE_LINK_SELECTOR)) {
    if (!(link.compareDocumentPosition(timeNode) & Node.DOCUMENT_POSITION_FOLLOWING)) break;
    id = jfProfileId(link.getAttribute("href")) || id;
  }
  return id;
}

// Posts que a pessoa mandou mostrar (pela chave de conteúdo).
const forcedKeys = new Set<string>();

function onFeed() {
  return location.pathname.startsWith("/feed");
}

function removeExtra(post: Post) {
  post._jfExtra?.remove();
  post._jfExtra = null;
}

function addExtra(post: Post, html: string) {
  removeExtra(post);
  const el = document.createElement("div");
  el.innerHTML = html;
  const extra = el.firstElementChild as HTMLElement;
  post.before(extra);
  post._jfExtra = extra;
  return extra;
}

function reveal(post: Post, reason?: string, duplicate?: boolean) {
  post.classList.remove("jf-hidden", "jf-collapsed");
  delete post.dataset.jfPending;
  concealed.delete(post);
  removeExtra(post);
  const tags: string[] = [];
  if (duplicate) tags.push("🔁 Possível vaga repetida: um post com o mesmo texto já apareceu no feed");
  if (settings.debug && reason) tags.push(`✅ ficou — ${reason}`);
  if (tags.length) addExtra(post, '<div class="jf-tag"></div>').textContent = tags.join(" · ");
}

// Vagas repetidas: impressão digital do texto → chave do primeiro post que
// teve esse texto. Só na memória da aba, nada é salvo.
const seenBodies = new Map<string, string>();
function isDuplicate(body: string, key: string) {
  if (!settings.flagDuplicates || !settings.onlyJobs) return false;
  const print = jfNormalize(body).replace(/[^a-z]/g, "").slice(0, 300);
  if (print.length < 80) return false;
  if (!seenBodies.has(print)) seenBodies.set(print, key);
  return seenBodies.get(print) !== key;
}

// Altura do conteúdo do card. Com .jf-collapsed o card vira bloco e o
// scrollHeight mede o conteúdo mesmo recolhido; "display: contents" não tem
// caixa, então soma as caixas de dentro.
function contentHeight(el: Element): number {
  if (getComputedStyle(el).display !== "contents") return el.scrollHeight;
  let total = 0;
  for (const child of el.children) total += contentHeight(child);
  return total;
}

function conceal(post: Post, reason: string | undefined, key: string) {
  concealed.add(post);
  if (settings.mode === "collapse") {
    post.classList.remove("jf-hidden");
    post.classList.add("jf-collapsed");
    // O LinkedIn deixa no DOM alguns cards que ele mesmo não mostra (anúncio
    // descartado, por exemplo). Barrinha ali abriria um "Mostrar" vazio:
    // fica recolhido sem barra até o LinkedIn desenhar o conteúdo.
    if (contentHeight(post) <= 4) {
      removeExtra(post);
      post.dataset.jfPending = "1";
      return;
    }
    delete post.dataset.jfPending;
    const bar = addExtra(post, '<div class="jf-bar"><span></span><button type="button">Mostrar</button></div>');
    bar.querySelector("span")!.textContent = settings.debug
      ? `Post escondido por não se encaixar no filtro — ${reason}`
      : "Post escondido por não se encaixar no filtro";
    bar.querySelector("button")!.addEventListener("click", () => {
      forcedKeys.add(key);
      showForced(post, key);
      nudgeFeed();
    });
  } else {
    removeExtra(post);
    post.classList.remove("jf-collapsed");
    post.classList.add("jf-hidden");
  }
}

// Avisa o feed que o card mudou de tamanho, para ele redesenhar.
function nudgeFeed() {
  window.dispatchEvent(new Event("scroll"));
  window.dispatchEvent(new Event("resize"));
}

// Post que a pessoa mandou mostrar: fica visível com uma barra para
// esconder de novo.
function showForced(post: Post, key: string) {
  post.dataset.jfForced = "1";
  post._jfKey = key;
  post.classList.remove("jf-hidden", "jf-collapsed");
  delete post.dataset.jfPending;
  concealed.delete(post);
  if (post._jfExtra?.classList.contains("jf-bar-shown")) return;
  const bar = addExtra(post, '<div class="jf-bar jf-bar-shown"><span>Post mostrado (não se encaixa no filtro)</span><button type="button">Esconder de novo</button></div>');
  bar.querySelector("button")!.addEventListener("click", () => {
    forcedKeys.delete(key);
    delete post.dataset.jfForced;
    conceal(post, post.dataset.jfReason, key);
    nudgeFeed();
  });
}

function scan() {
  scheduled = false;
  const posts = findPosts();
  const current = new Set(posts);

  // Container que deixou de ser post (o feed cresceu e o card foi recalculado).
  for (const el of [...concealed]) {
    if (!current.has(el)) {
      reveal(el);
      delete el.dataset.jfLen;
    }
  }

  for (const post of posts) {
    if (!settings.enabled || !onFeed()) {
      reveal(post);
      continue;
    }
    if (post.dataset.jfForced) {
      showForced(post, post._jfKey ?? "");
      continue;
    }

    // Card que o LinkedIn não desenhava: quando ganhar conteúdo, reavalia
    // para pôr a barrinha.
    if (post.dataset.jfPending && contentHeight(post) > 4) delete post.dataset.jfLen;

    // O texto do post carrega aos poucos; reclassifica quando ele muda.
    const len = String(post.textContent?.length ?? 0);
    if (post.dataset.jfLen === len) continue;
    post.dataset.jfLen = len;

    const { keep, reason, key, body, author } = analyze(post);
    post.dataset.jfReason = reason;
    if (forcedKeys.has(key)) showForced(post, key); else if (keep) reveal(post, reason, isDuplicate(body, key));
    else {
      conceal(post, reason, key);
      countHidden(author, body, reason);
    }
  }
  updateNotice(posts);
}

// No modo oculto os posts somem sem deixar rastro: um aviso no topo do feed
// diz quantos foram escondidos e oferece trocar para recolhido.
let notice: HTMLElement | null = null;
function updateNotice(posts: Post[]) {
  const count = settings.enabled && settings.mode === "hide" && onFeed() ? concealed.size : 0;
  if (!count || !posts.length) {
    notice?.remove();
    notice = null;
    return;
  }
  if (!notice) {
    notice = document.createElement("div");
    notice.className = "jf-bar jf-notice";
    notice.innerHTML = '<span></span><button type="button">Mudar para recolhido</button>';
    notice.querySelector("button")!.addEventListener("click", () => chrome.storage.sync.set({ mode: "collapse" }));
  }
  // Só mexe no DOM quando muda: cada mudança dispara outra varredura.
  const text = `O FanficBlock está ocultando ${count} ${count === 1 ? "post" : "posts"}. Para ver quais, mude para Recolhido.`;
  const span = notice.querySelector("span")!;
  if (span.textContent !== text) span.textContent = text;
  const first = posts[0]._jfExtra ?? posts[0];
  if (notice.nextElementSibling !== first) first.before(notice);
}

// Fanficômetro: junta os posts escondidos e grava de tempos em tempos (não
// a cada post). Só vai para o storage um hash e a categoria, nunca o texto.
// O hash usa o começo do texto, que não muda enquanto o post carrega.
const statEvents: StatEvent[] = [];
const countedHashes = new Set<string>();
let statTimer: ReturnType<typeof setTimeout> | null = null;
function countHidden(author: string, body: string, reason: string) {
  const hash = jfHash(jfNormalize(`${author.slice(0, 40)}|${body.slice(0, 80)}`));
  if (countedHashes.has(hash)) return;
  countedHashes.add(hash);
  statEvents.push({ hash, cat: jfStatCategory(reason) });
  statTimer ||= setTimeout(flushStats, 3000);
}

function flushStats() {
  statTimer = null;
  const events = statEvents.splice(0);
  if (!events.length) return;
  chrome.storage.local.get({ jfStats: null }, ({ jfStats }: { jfStats: Stats | null }) => {
    chrome.storage.local.set({ jfStats: jfStatsAdd(jfStats || {}, events) });
  });
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  // Agrupa as mutações de um mesmo instante numa varredura só.
  setTimeout(scan, 50);
}

function resetAndScan() {
  for (const post of findPosts()) delete post.dataset.jfLen;
  schedule();
}

// Exporta os primeiros posts do feed em .md ou .json, para entender o
// filtro fora do navegador. Chamado pelo botão "Baixar" do popup.
// limit 0 = todos os carregados. onlyKept: só os posts que ficam no feed
// (as vagas, com "só vagas" ligado); o limite conta depois do filtro.
function exportPosts(limit: number, format: string, onlyKept = false) {
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  const all = findPosts().map((post): ExportRecord => {
    const { keep, reason, author, body, jobLink, authorId, header, sponsored, links } = analyze(post);
    return {
      keep,
      reason,
      feed: post.matches(POST_SELECTOR) ? "antigo" : "novo",
      jobLink: Boolean(jobLink),
      links,
      sponsored,
      authorId: authorId || null,
      author: clean(author) || null,
      header: clean(header) || null,
      body: clean(body),
      card: clean(post.textContent ?? "")
    };
  });
  const kept = onlyKept ? all.filter((r) => r.keep) : all;
  const records = limit > 0 ? kept.slice(0, limit) : kept;
  const info = { url: location.href, date: new Date().toISOString(), recruitersOnly: settings.recruitersOnly };

  if (format === "json") {
    return { count: records.length, content: JSON.stringify({ ...info, posts: records }, null, 2) };
  }

  const lines = [
    `# FanficBlock — export de ${records.length} posts${onlyKept ? " (só os que ficam no feed)" : ""}`,
    "",
    `- URL: ${info.url}`,
    `- Data: ${info.date}`,
    `- Só recrutadores: ${info.recruitersOnly ? "sim" : "não"}`,
    ""
  ];
  records.forEach((r, i) => {
    lines.push(
      `## ${i + 1}. ${r.keep ? "✅ FICA" : "🚫 SOME"} — ${r.reason}`,
      "",
      `- tipo: ${r.feed === "antigo" ? "feed antigo" : "feed novo (Feed post)"}`,
      `- link de vaga: ${r.jobLink ? "sim" : "não"}`,
      `- links: ${r.links.join(" ") || "—"}`,
      `- patrocinado: ${r.sponsored ? "sim" : "não"}`,
      `- perfil do autor: ${r.authorId || "NÃO ENCONTRADO"}`,
      `- autor: ${r.author || "NÃO ENCONTRADO"}`,
      `- cabeçalho: ${r.header || "—"}`,
      "",
      "**Texto analisado:**",
      "",
      "```",
      r.body || "(vazio)",
      "```",
      "",
      "<details><summary>Card inteiro</summary>",
      "",
      "```",
      r.card,
      "```",
      "",
      "</details>",
      ""
    );
  });
  lines.push(domDiagnostic());
  return { count: records.length, content: lines.join("\n") };
}

// TEMPORÁRIO: estrutura da página (só tags e atributos, sem texto de post)
// para achar o container de post quando o LinkedIn muda o HTML.
function domDiagnostic() {
  const describe = (el: Element) => {
    const attrs = [...el.attributes]
      .filter((a) => /^(class|role|id|data-[\w-]+|componentkey|aria-label)$/.test(a.name))
      .map((a) => `${a.name}="${a.value.slice(0, 80)}"`);
    return `<${el.tagName.toLowerCase()} ${attrs.join(" ")}>`;
  };

  const count = (sel: string) => {
    try { return document.querySelectorAll(sel).length; } catch { return "erro"; }
  };
  const probes = [
    '[data-urn*="urn:li:activity"]', '[data-id*="urn:li:activity"]',
    '[data-urn]', '[data-id]', '[data-view-name]', '[componentkey]',
    '[role="article"]', '[role="listitem"]', "div.feed-shared-update-v2",
    '[class*="update-components-actor"]', '[class*="update-components-text"]',
    '[class*="feed-shared"]', "main", "article",
    // O que a própria extensão escondeu.
    ".jf-hidden", ".jf-collapsed"
  ];

  // Valores distintos de atributos que costumam marcar componentes.
  const histogram = (attr: string) => {
    const counts = new Map<string, number>();
    for (const el of document.querySelectorAll(`[${attr}]`)) {
      const v = (el.getAttribute(attr) ?? "").replace(/\d{6,}/g, "#").slice(0, 80);
      counts.set(v, (counts.get(v) || 0) + 1);
    }
    return [...counts].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([v, n]) => `${n}× ${v}`);
  };

  // Todo post tem botão de comentar: subir a partir dele mostra o container.
  const commentButtons = [...document.querySelectorAll<HTMLElement>("button, [role=button]")]
    .filter((b) => /^(comentar|comment)$/i.test((b.innerText || b.getAttribute("aria-label") || "").trim()))
    .slice(0, 3);
  const chains = commentButtons.map((btn, i) => {
    const chain: string[] = [];
    for (let el: HTMLElement | null = btn; el && el !== document.body && chain.length < 25; el = el.parentElement) {
      chain.push(`${"  ".repeat(chain.length)}${describe(el)}`);
    }
    return [`### Botão comentar ${i + 1} → ancestrais`, "```", ...chain, "```"].join("\n");
  });

  return [
    "---",
    "## Diagnóstico da página (sem texto de post)",
    "",
    "### Contagem de seletores",
    "```",
    ...probes.map((p) => `${String(count(p)).padStart(4)}  ${p}`),
    "```",
    "### data-view-name",
    "```",
    ...histogram("data-view-name"),
    "```",
    "### role",
    "```",
    ...histogram("role"),
    "```",
    `Títulos "Feed post" encontrados: ${document.evaluate(MARKER_XPATH, document.body, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength}`,
    `Botões "Comentar" encontrados: ${commentButtons.length}`,
    "",
    ...chains,
    ""
  ].join("\n");
}

// Gerador de busca do popup: escreve no campo de pesquisa do LinkedIn sem
// pesquisar. O campo é React, então o valor vai pelo setter nativo + "input".
const SEARCH_INPUT_SELECTOR = [
  "input.search-global-typeahead__input",
  'header input[role="combobox"]',
  'input[aria-label*="Search" i]',
  'input[aria-label*="Pesquis" i]',
  'input[placeholder*="Search" i]',
  'input[placeholder*="Pesquis" i]'
].join(", ");

function fillSearch(query: string) {
  const input = [...document.querySelectorAll<HTMLInputElement>(SEARCH_INPUT_SELECTOR)].find((el) => el.offsetParent !== null);
  if (!input) return false;
  input.focus();
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, query);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === "jf-export") reply(exportPosts(msg.limit ?? 30, msg.format, msg.onlyKept));
  if (msg?.type === "jf-search") reply({ ok: fillSearch(msg.query) });
});

chrome.storage.sync.get(JF_DEFAULTS, (stored) => {
  settings = stored as Settings;
  compiled = jfCompile(settings);
  schedule();
  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  settings = { ...settings, ...Object.fromEntries(Object.entries(changes).map(([key, { newValue }]) => [key, newValue])) };
  compiled = jfCompile(settings);
  resetAndScan();
});
