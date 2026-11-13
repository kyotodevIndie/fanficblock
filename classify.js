// Decide se um post fica ou some. Sem DOM aqui, para dar para testar no Node.
// Extração de local/salário/experiência/domínios fica em extract.js.

if (typeof module !== "undefined") {
  Object.assign(globalThis, require("./extract.js"));
}

const jfNormalize = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const jfEscapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Limite de palavra "manual": \b não funciona com # nem com caracteres acentuados.
const jfToRegex = (word) =>
  new RegExp(`(^|[^a-z0-9#])${jfEscapeRe(jfNormalize(word.trim()))}(?![a-z0-9])`);

// "emprego", "empregos" e "#emprego" contam como a mesma palavra fraca.
const jfGroup = (word) => jfNormalize(word.trim()).replace(/^#/, "").replace(/s$/, "");

// --- Filtros de vaga --------------------------------------------------------
// Cada grupo tem opções; a pessoa marca as que NÃO quer ver. Uma vaga some se
// tudo que foi detectado nela está marcado ("CLT ou PJ" só some se os dois estiverem).
const JF_FACETS = {
  modality: {
    label: "Modelo",
    options: {
      remote: { label: "Remoto", words: ["remoto", "remota", "100% remoto", "home office", "homeoffice", "remote", "fully remote", "work from home", "teletrabalho", "anywhere"] },
      hybrid: { label: "Híbrido", words: ["hibrido", "hibrida", "hybrid"] },
      onsite: { label: "Presencial", words: ["presencial", "on-site", "onsite", "in-office", "no escritorio"] }
    }
  },
  contract: {
    label: "Contratação",
    options: {
      clt: { label: "CLT", words: ["clt", "efetivo", "efetiva"] },
      pj: { label: "PJ", words: ["pj", "pessoa juridica", "contractor"] },
      freela: { label: "Freela", words: ["freela", "freelancer", "freelance", "temporario", "temporaria"] }
    }
  },
  seniority: {
    label: "Senioridade",
    options: {
      intern: { label: "Estágio", words: ["estagio", "estagiario", "estagiaria", "trainee", "jovem aprendiz", "internship", "intern"] },
      junior: { label: "Júnior", words: ["junior", "jr", "entry level", "entry-level"] },
      mid: { label: "Pleno", words: ["pleno", "plena", "mid-level", "mid level"] },
      senior: { label: "Sênior", words: ["senior", "sr", "especialista"] },
      lead: { label: "Liderança", words: ["tech lead", "team lead", "lider tecnico", "head of", "head de", "gerente", "coordenador", "coordenadora", "diretor", "diretora", "staff engineer", "principal engineer"] }
    }
  }
};

// Palavras que indicam inglês ou português, para "esconder vagas em inglês".
const JF_EN_WORDS = ["the", "and", "to", "of", "you", "we", "for", "with", "is", "are", "our", "your", "will", "in", "be", "this"];
const JF_PT_WORDS = ["de", "que", "para", "com", "voce", "uma", "nao", "por", "os", "as", "no", "na", "em", "do", "da", "e"];

// "Não é sobre X, é sobre Y" — o clássico do devaneio.
const JF_FLUFF_PATTERNS = [/(^|[^a-z])nao e sobre [^.!?\n]{1,60}e sobre /, /(^|[^a-z])it'?s not about [^.!?\n]{1,60}it'?s about /];

// Caça-engajamento clássico: pede para comentar uma PALAVRA ou "palavra" e
// promete mandar algo em troca. Roda no texto original (precisa das maiúsculas),
// por isso o verbo aceita inicial maiúscula ou minúscula explicitamente.
const JF_BAIT_CTA_RE =
  /(^|[^\p{L}])([Cc]omenta|[Cc]omente|[Dd]igite|[Ee]screva|[Rr]esponda|[Cc]omment|[Tt]ype|[Ww]rite|[Rr]eply)(?![\p{L}])[^.!?\n]{0,30}?(["“”'«][^"“”'»]{2,20}["“”'»]|(?<![\p{L}])\p{Lu}{3,}(?![\p{L}]))[^.!?\n]{0,80}?(te mando|te envio|eu mando|eu envio|vou te mandar|vou mandar|vou enviar|receber|recebe|i'?ll send|send you|dm you|i'?ll dm)/u;

// Frases de venda que têm "vaga" mas não são vaga de emprego.
const JF_NOT_JOB_RE =
  /(garanta (a )?sua vaga|reserve (a )?sua vaga|vagas limitadas|ultimas vagas|poucas vagas|vagas esgotadas|vagas para (a )?(turma|mentoria|imersao|comunidade)|vaga na (turma|mentoria|imersao|comunidade))/g;

// Sinônimos de tecnologia: escrever um conta como qualquer outro do grupo.
const JF_TECH_ALIASES = [
  ["node", "node.js", "nodejs", "node js"],
  ["react native", "react-native", "reactnative"],
  ["react", "react.js", "reactjs"],
  ["vue", "vue.js", "vuejs"],
  ["next", "next.js", "nextjs"],
  ["c#", "csharp", "c sharp"],
  ["c++", "cpp"],
  [".net", "dotnet", "dot net", "asp.net"],
  ["javascript", "js"],
  ["typescript", "ts"],
  ["golang", "go lang"],
  ["postgres", "postgresql"],
  ["kubernetes", "k8s"]
];

// Cabeçalho de repost: "Fulano reposted this", "Fulano republicou isso".
const JF_REPOST_RE = /(^|\s)(reposted|repostou|republicou|compartilhou|reshared)(\s|$)/;

// "in/fulano", "company/acme" a partir de URL, caminho ou slug.
function jfProfileId(value) {
  const m = String(value).toLowerCase().match(/(?:^|\/)(in|company|school|showcase)\/([^/?#\s]+)/);
  if (!m) return null;
  let slug = m[2];
  try { slug = decodeURIComponent(slug); } catch { /* slug com % solto: usa como veio */ }
  return `${m[1]}/${slug}`;
}

// Entrada de lista de autores: URL/caminho de perfil vira id estável; o resto
// é tratado como nome (comparado com nome + título de quem postou).
function jfAuthorEntries(list) {
  return (list || []).filter((w) => w.trim()).map((entry) => {
    const id = jfProfileId(entry);
    return id ? { entry, id } : { entry, re: jfToRegex(entry) };
  });
}

function jfAuthorMatch(entries, authorId, authorText) {
  const text = jfNormalize(authorText || "");
  return entries.find((e) => (e.id ? e.id === authorId : e.re.test(text)));
}

// Termo de tecnologia com sinônimos: "node" também pega "Node.js" e "nodejs".
function jfTermRegex(word) {
  const norm = jfNormalize(word.trim());
  const variants = JF_TECH_ALIASES.find((group) => group.includes(norm)) || [norm];
  return new RegExp(`(^|[^a-z0-9#+.])(${variants.map(jfEscapeRe).join("|")})(?![a-z0-9#+]|\\.[a-z])`);
}

// Lugar que o usuário digitou: id conhecido ou, se não reconhecer, o texto.
function jfLocationEntries(list) {
  return (list || []).filter((w) => w.trim()).map((entry) => {
    const id = jfResolvePlace(entry);
    return id ? { entry, id } : { entry, re: jfToRegex(entry) };
  });
}

function jfCompile(settings) {
  const clean = (list) => (list || []).filter((w) => w.trim());
  const words = (list) => clean(list).map((w) => ({ word: w, re: jfToRegex(w), group: jfGroup(w) }));
  const terms = (list) => clean(list).map((w) => ({ word: w, re: jfTermRegex(w) }));

  const exclude = settings.exclude || {};
  const facets = Object.entries(JF_FACETS).map(([name, facet]) => ({
    name,
    excluded: new Set(exclude[name] || []),
    options: Object.entries(facet.options).map(([id, o]) => ({ id, label: o.label, words: words(o.words) }))
  }));

  return {
    onlyJobs: settings.onlyJobs !== false,
    strong: words(settings.strong),
    weak: words(settings.weak),
    weakNeeded: Math.max(1, Number(settings.weakNeeded) || 2),
    block: words(settings.blocklist),
    recruitersOnly: Boolean(settings.recruitersOnly),
    recruiter: words(settings.recruiterWords),
    facets,
    techOnly: Boolean(settings.techOnly),
    tech: words(settings.techWords),
    hideEnglish: Boolean(settings.hideEnglish),
    mustHave: terms(settings.mustHave),
    mustHaveAll: settings.mustHaveMode === "all",
    mustNotHave: terms(settings.mustNotHave),
    locations: jfLocationEntries(settings.locations),
    requireLocation: Boolean(settings.requireLocation),
    requireSalary: Boolean(settings.requireSalary),
    minSalary: Math.max(0, Number(settings.minSalary) || 0),
    salaryCurrency: settings.salaryCurrency || "BRL",
    maxExperience: Math.max(0, Number(settings.maxExperience) || 0),
    blockedCompanies: words(settings.blockedCompanies),
    allowedCompanies: words(settings.allowedCompanies),
    hideIncomplete: Boolean(settings.hideIncomplete),
    blockCourses: Boolean(settings.blockCourses),
    courseWords: words(settings.courseWords),
    courseSaleWords: words(settings.courseSaleWords),
    courseDomains: clean(settings.courseDomains).map(jfDomainEntry).filter(Boolean),
    blockedDomains: clean(settings.blockedDomains).map(jfDomainEntry).filter(Boolean),
    blockFluff: Boolean(settings.blockFluff),
    fluffStrong: words(settings.fluffStrong),
    fluffWeak: words(settings.fluffWeak),
    fluffNeeded: Math.max(1, Number(settings.fluffNeeded) || 3),
    blockBait: Boolean(settings.blockBait),
    baitStrong: words(settings.baitStrong),
    baitWeak: words(settings.baitWeak),
    baitNeeded: Math.max(1, Number(settings.baitNeeded) || 2),
    hideSponsored: Boolean(settings.hideSponsored),
    hideReposts: Boolean(settings.hideReposts),
    blockedAuthors: jfAuthorEntries(settings.blockedAuthors),
    allowedAuthors: jfAuthorEntries(settings.allowedAuthors),
    en: JF_EN_WORDS.map(jfToRegex),
    pt: JF_PT_WORDS.map(jfToRegex)
  };
}

const firstHit = (list, text) => list.find((k) => k.re.test(text));

// Palavras diferentes (por grupo) da lista que aparecem no texto.
function distinctHits(list, text) {
  const hits = new Map();
  for (const k of list) {
    if (!hits.has(k.group) && k.re.test(text)) hits.set(k.group, k.word);
  }
  return [...hits.values()];
}

// Devolve { keep, reason } — reason explica a decisão (aparece no modo debug).
// authorText: nome + título de quem postou (para "só recrutadores" e listas de autores).
// meta: { authorId: "in/fulano", header: cabeçalho do card, sponsored: bool }.
//
// Ordem de precedência (a primeira regra que decide, decide):
//   1. "Esconder sempre se tiver"            → some (derruba até vaga)
//   2. Autor/empresa bloqueado               → some
//   3. Link de domínio bloqueado             → some
//   4. Autor/empresa sempre mostrar          → fica (pula o resto)
//   5. Patrocinado                           → some
//   6. Devaneio  (vaga só cai com frase forte)
//   7. Caça-engajamento (nunca derruba vaga)
//   8. Vendedor de curso (nunca derruba vaga)
//   9. Repost   (nunca derruba vaga)
//  10. Só vagas → o que não é vaga some
//  11. Empresa bloqueada some; empresa liberada fica (pula o resto)
//  12. Filtros de vaga (recrutador, modelo, contratação, senioridade, tech,
//      idioma, palavras, local, salário, experiência, informação mínima)
// meta.links: URLs dos links do post (para domínios).
function jfClassify(rawText, hasJobLink, c, authorText = "", meta = {}) {
  const text = jfNormalize(rawText);

  const blocked = firstHit(c.block, text);
  if (blocked) return { keep: false, reason: `bloqueado: ${blocked.word}` };

  const blockedAuthor = jfAuthorMatch(c.blockedAuthors, meta.authorId, authorText);
  if (blockedAuthor) return { keep: false, reason: `autor bloqueado: ${blockedAuthor.entry}` };

  if (c.blockedDomains.length) {
    const hosts = jfPostHosts(text, meta.links);
    const domain = c.blockedDomains.find((d) => hosts.some((h) => jfHostMatches(h, d)));
    if (domain) return { keep: false, reason: `link bloqueado: ${domain}` };
  }

  const allowedAuthor = jfAuthorMatch(c.allowedAuthors, meta.authorId, authorText);
  if (allowedAuthor) return { keep: true, reason: `autor liberado: ${allowedAuthor.entry}` };

  if (c.hideSponsored && meta.sponsored) return { keep: false, reason: "patrocinado" };

  const job = jfJobSignal(text, hasJobLink, c);

  if (c.blockFluff) {
    const fluff = jfFluffSignal(text, c, job.keep);
    if (fluff) return { keep: false, reason: `devaneio: ${fluff}` };
  }

  if (c.blockBait && !job.keep) {
    const bait = jfBaitSignal(rawText, text, c);
    if (bait) return { keep: false, reason: `caça-engajamento: ${bait}` };
  }

  if (c.blockCourses && !job.keep) {
    const course = jfCourseSignal(text, c, meta.links);
    if (course) return { keep: false, reason: `vendedor de curso: ${course}` };
  }

  if (c.hideReposts && !job.keep && JF_REPOST_RE.test(jfNormalize(meta.header || ""))) {
    return { keep: false, reason: "repost" };
  }

  if (!c.onlyJobs) return { keep: true, reason: job.keep ? job.reason : "filtro de vagas desligado" };
  if (!job.keep) return job;

  const blockedCompany = firstHit(c.blockedCompanies, text);
  if (blockedCompany) return { keep: false, reason: `empresa bloqueada: ${blockedCompany.word}` };
  const allowedCompany = firstHit(c.allowedCompanies, text);
  if (allowedCompany) return { keep: true, reason: `${job.reason} · empresa liberada: ${allowedCompany.word}` };

  if (c.recruitersOnly) {
    const recruiter = firstHit(c.recruiter, jfNormalize(authorText));
    if (!recruiter) return { keep: false, reason: "vaga, mas quem postou não é recrutador" };
    job.reason += ` · recrutador: ${recruiter.word}`;
  }

  for (const facet of c.facets) {
    if (!facet.excluded.size) continue;
    const found = facet.options.filter((o) => firstHit(o.words, text)).map((o) => o.id);
    // Híbrido costuma citar "remoto" e "presencial" juntos; nesse caso vale só o híbrido.
    const detected = facet.name === "modality" && found.includes("hybrid") ? ["hybrid"] : found;
    if (detected.length && detected.every((id) => facet.excluded.has(id))) {
      const labels = facet.options.filter((o) => detected.includes(o.id)).map((o) => o.label);
      return { keep: false, reason: `vaga ${labels.join("/")}` };
    }
  }

  if (c.techOnly && !firstHit(c.tech, text)) return { keep: false, reason: "vaga fora de tecnologia" };

  if (c.hideEnglish && jfIsEnglish(text, c)) return { keep: false, reason: "vaga em inglês" };

  if (c.mustHave.length) {
    const missing = c.mustHave.filter((k) => !k.re.test(text));
    const fails = c.mustHaveAll ? missing.length > 0 : missing.length === c.mustHave.length;
    if (fails) return { keep: false, reason: `vaga sem: ${missing.map((k) => k.word).join(c.mustHaveAll ? ", " : " / ")}` };
  }

  const forbidden = firstHit(c.mustNotHave, text);
  if (forbidden) return { keep: false, reason: `vaga com: ${forbidden.word}` };

  const info = jfJobInfo(rawText, text, hasJobLink, c);

  if (c.locations.length || c.requireLocation) {
    const location = jfLocationCheck(rawText, text, info, c);
    if (location) return { keep: false, reason: location };
  }

  if (c.requireSalary && !info.salary) return { keep: false, reason: "vaga sem salário" };
  if (c.minSalary && info.salary && info.salary.currency === c.salaryCurrency) {
    const monthly = jfMonthly(info.salary.max, info.salary.period);
    if (monthly < c.minSalary) return { keep: false, reason: `salário abaixo do mínimo (~${Math.round(monthly)}/mês)` };
  }

  if (c.maxExperience) {
    const years = jfParseExperience(text);
    if (years !== null && years > c.maxExperience) return { keep: false, reason: `pede ${years}+ anos de experiência` };
  }

  if (c.hideIncomplete && info.known.length < 2) {
    return { keep: false, reason: `vaga sem informação mínima${info.known.length ? ` (só ${info.known[0]})` : ""}` };
  }

  if (info.salary) job.reason += " · salário informado";
  return job;
}

// O que a vaga informa. "known" lista os campos achados, para "informação mínima":
// local ou modelo, contratação, senioridade, salário, link/e-mail para candidatura.
function jfJobInfo(rawText, text, hasJobLink, c) {
  const salary = jfParseSalary(rawText);
  const places = jfFindPlaces(rawText);
  const facet = (name) => c.facets.find((f) => f.name === name).options.filter((o) => firstHit(o.words, text)).map((o) => o.id);
  const modality = facet("modality");
  const known = [];
  if (places.length || modality.length) known.push("local");
  if (facet("contract").length) known.push("contratação");
  if (facet("seniority").length) known.push("senioridade");
  if (salary) known.push("salário");
  if (hasJobLink || /[a-z0-9._-]+@[a-z0-9-]+\.[a-z]/.test(text) || /(link|candidate-se|apply|inscreva-se)/.test(text) && /https?:|lnkd\.in|\.com/.test(text)) {
    known.push("link de candidatura");
  }
  return { salary, places, remote: modality.includes("remote") && !modality.includes("hybrid"), known };
}

// Devolve o motivo se a vaga é de um lugar fora da lista, ou null.
// Sem lugar no texto = desconhecido (fica, a não ser com "exigir localização").
// Vaga remota compara só o país/região: "Remote LATAM" serve para quem quer SP.
function jfLocationCheck(rawText, text, info, c) {
  if (!info.places.length) {
    // Remoto sem país também é resposta para "onde é".
    if (info.remote || c.locations.some((l) => l.re && l.re.test(text))) return null;
    return c.requireLocation ? "vaga sem localização" : null;
  }
  if (!c.locations.length) return null;
  const near = (a, b) => jfIsAncestorOrSelf(a, b) || jfIsAncestorOrSelf(b, a);
  const ok = c.locations.some((l) => {
    if (l.re) return l.re.test(text);
    return info.places.some((p) => near(l.id, p) || (info.remote && near(jfCountryOf(l.id), jfCountryOf(p))));
  });
  if (ok) return null;
  return `vaga em ${info.places.map(jfPlaceLabel).join("/")} (fora de: ${c.locations.map((l) => l.entry).join(", ")})`;
}

// Hosts dos links do post, mais domínios escritos no texto.
function jfPostHosts(text, links) {
  return [...(links || []).map(jfHost).filter(Boolean), ...jfTextDomains(text)];
}

// Venda de curso/mentoria/ebook: precisa de produto E sinal de venda (ou link de
// plataforma de venda). Conteúdo gratuito sem preço não é venda.
function jfCourseSignal(text, c, links) {
  const hosts = jfPostHosts(text, links);
  const platform = c.courseDomains.find((d) => hosts.some((h) => jfHostMatches(h, d)));
  const product = firstHit(c.courseWords, text);
  if (platform && product) return `${product.word} + ${platform}`;
  if (!product) return null;
  const price = /(r\$|us\$|\$|€)\s*\d/.test(text);
  if (!price && /(gratuit|gratis|de graca|free|sem custo)/.test(text)) return null;
  const sale = firstHit(c.courseSaleWords, text);
  if (sale) return `${product.word} + ${sale.word}`;
  return price ? `${product.word} + preço` : null;
}

function jfJobSignal(rawNormText, hasJobLink, c) {
  if (hasJobLink) return { keep: true, reason: "link de vaga" };
  const text = rawNormText.replace(JF_NOT_JOB_RE, " ");

  const strong = firstHit(c.strong, text);
  if (strong) return { keep: true, reason: `forte: ${strong.word}` };

  const words = distinctHits(c.weak, text);
  if (words.length >= c.weakNeeded) return { keep: true, reason: `fracas: ${words.join(", ")}` };
  return { keep: false, reason: words.length ? `só ${words.length} fraca: ${words.join(", ")}` : "nada de vaga" };
}

// Devolve o motivo se for devaneio, ou null. Em vaga, só frase forte derruba:
// vaga de verdade fala "liderança", "jornada de trabalho", "sucesso do cliente"...
function jfFluffSignal(text, c, isJob) {
  if (JF_FLUFF_PATTERNS.some((re) => re.test(text))) return "\"não é sobre X, é sobre Y\"";
  const strong = firstHit(c.fluffStrong, text);
  if (strong) return strong.word;
  if (isJob) return null;
  const words = distinctHits(c.fluffWeak, text);
  return words.length >= c.fluffNeeded ? words.join(", ") : null;
}

// Devolve o motivo se for caça-engajamento, ou null. Pergunta solta
// ("concorda?") é fraca: sozinha não derruba ninguém.
function jfBaitSignal(rawText, text, c) {
  if (JF_BAIT_CTA_RE.test(rawText)) return "\"comenta PALAVRA que eu te mando\"";
  const strong = firstHit(c.baitStrong, text);
  if (strong) return strong.word;
  const words = distinctHits(c.baitWeak, text);
  return words.length >= c.baitNeeded ? words.join(", ") : null;
}

// Conta ocorrências de palavras comuns de cada língua, depois de tirar links,
// hashtags e termos técnicos (React, cloud, deploy...) — esses aparecem em
// inglês em qualquer vaga de tecnologia e não dizem nada sobre a língua.
function jfIsEnglish(text, c) {
  let clean = text.replace(/https?:\S+|#\S+|\S+@\S+/g, " ");
  for (const k of c.tech) clean = clean.replace(new RegExp(k.re.source, "g"), " ");
  const count = (list) => list.reduce((n, re) => n + (clean.match(new RegExp(re.source, "g")) || []).length, 0);
  const en = count(c.en);
  const pt = count(c.pt);
  return en >= 5 && en > pt * 1.5;
}

// --- Separar autor / texto / comentários pela ordem do texto ---------------
// O feed novo do LinkedIn (SDUI) não tem classes legíveis, mas a ordem é fixa:
//   [Fulano curtiu]  Nome  • 2nd  Título do perfil  [site]  4h  Follow
//   texto do post ...  [card de link]  324  9  19  [comentários ...]
// Então: até o horário é autor; depois, até os números de reação, é o post.

// "4h", "6d", "• 5h", "2h • Edited", "4 hours ago", "1 sem", "3 d" ...
const JF_TIME_RE =
  /(^|•\s*)\d{1,2}\s?(minutes?|minutos?|hours?|horas?|days?|dias?|weeks?|semanas?|months?|meses|years?|anos?|min|mo|yr|sem|s|m|h|d|w|y|a)(\s|•|$)/;
const JF_PROMOTED_RE = /^(promoted|promovido|patrocinado)(\s+(by|por)\s.*)?$/;
// Linha que é só número de reação/comentário: "324", "2,548", "21 reactions21".
const JF_COUNT_RE =
  /^\d[\d.,]*\s*(k|mil|reactions?|reacoes|comments?|comentarios|reposts?|compartilhamentos?)?\s*\d*$/;
// Linhas de interface que não são conteúdo.
const JF_SKIP_RE =
  /^(feed post|publicacao no feed|post do feed|follow|seguir|connect|conectar|show translation|see translation|ver traducao|(…|\.\.\.)\s*(more|mais|ver mais)|visit my website|view my services|•\s*(1st|2nd|3rd\+?|following|1º|2º|3º\+?|seguindo)|\*)$/;

// lines: textos não vazios na ordem do DOM.
// Devolve { author, body, bodyEnd, headerEnd, sponsored } — bodyEnd é o índice
// (exclusivo) onde o post acaba; headerEnd, o índice do horário (-1 se não achou).
function jfSegment(lines) {
  const norm = lines.map((l) => jfNormalize(l.replace(/\s+/g, " ").trim()));
  const keep = (from, to) =>
    lines.slice(from, to).filter((_, i) => !JF_SKIP_RE.test(norm[from + i])).join(" ");

  // Em anúncio, "Promoted" aparece no cabeçalho, no lugar do horário.
  const sponsored = norm.slice(0, 15).some((l) => JF_PROMOTED_RE.test(l));
  const time = norm.findIndex((l, i) => i < 15 && l.length < 40 && (JF_TIME_RE.test(l) || JF_PROMOTED_RE.test(l)));
  if (time < 0) return { author: "", body: keep(0, lines.length), bodyEnd: lines.length, headerEnd: -1, sponsored };

  let end = lines.length;
  for (let i = time + 2; i < lines.length; i++) {
    if (JF_COUNT_RE.test(norm[i])) { end = i; break; }
  }
  return { author: keep(0, time), body: keep(time + 1, end), bodyEnd: end, headerEnd: time, sponsored };
}

if (typeof module !== "undefined") {
  module.exports = { jfCompile, jfClassify, jfSegment, jfProfileId, jfTermRegex, JF_FACETS };
}
