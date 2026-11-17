// Extração de dados de vaga a partir do texto: localização, salário, anos de
// experiência e domínios de links. Só leitura de texto, sem DOM e sem decisão
// (quem decide é classify.ts). Tudo heurístico: quando não dá para ter
// certeza, devolve "desconhecido" (null/vazio) em vez de chutar.

// Sem acento, mas mantendo maiúsculas — os índices batem com jfNormalize().
export const jfStripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// --- Localização ------------------------------------------------------------
// [id, tipo, pai, nomes (sem acento, minúsculas), UF opcional]
export type PlaceType = "region" | "country" | "state" | "city";
type PlaceRow = [id: string, type: PlaceType, parent: string | null, names: string[], uf?: string];
export interface Place { id: string; type: PlaceType; parent: string | null; names: string[]; uf?: string }

export const JF_PLACES: PlaceRow[] = [
  ["world", "region", null, ["worldwide", "anywhere", "qualquer lugar do mundo", "global remote", "remote global"]],
  ["latam", "region", "world", ["latam", "latin america", "america latina", "latinoamerica"]],
  ["europe", "region", "world", ["europe", "europa", "emea"]],

  ["br", "country", "latam", ["brasil", "brazil"]],
  ["pt", "country", "europe", ["portugal"]],
  ["us", "country", "world", ["estados unidos", "eua", "usa", "united states"]],
  ["ca", "country", "world", ["canada"]],
  ["uk", "country", "europe", ["reino unido", "united kingdom", "inglaterra", "england"]],
  ["de", "country", "europe", ["alemanha", "germany"]],
  ["es", "country", "europe", ["espanha", "spain"]],
  ["fr", "country", "europe", ["franca", "france"]],
  ["nl", "country", "europe", ["holanda", "netherlands", "paises baixos"]],
  ["ie", "country", "europe", ["irlanda", "ireland"]],
  ["mx", "country", "latam", ["mexico"]],
  ["co", "country", "latam", ["colombia"]],
  ["ar", "country", "latam", ["argentina"]],
  ["cl", "country", "latam", ["chile"]],
  ["pe", "country", "latam", ["peru"]],
  ["uy", "country", "latam", ["uruguai", "uruguay"]],
  ["gt", "country", "latam", ["guatemala"]],
  ["hn", "country", "latam", ["honduras"]],
  ["cr", "country", "latam", ["costa rica"]],

  ["ac", "state", "br", ["acre"], "AC"],
  ["al", "state", "br", ["alagoas"], "AL"],
  ["ap", "state", "br", ["amapa"], "AP"],
  ["am", "state", "br", ["amazonas"], "AM"],
  ["ba", "state", "br", ["bahia"], "BA"],
  ["ce", "state", "br", ["ceara"], "CE"],
  ["df", "state", "br", ["distrito federal"], "DF"],
  ["es-br", "state", "br", ["espirito santo"], "ES"],
  ["go", "state", "br", ["goias"], "GO"],
  ["ma", "state", "br", ["maranhao"], "MA"],
  ["mt", "state", "br", ["mato grosso"], "MT"],
  ["ms", "state", "br", ["mato grosso do sul"], "MS"],
  ["mg", "state", "br", ["minas gerais"], "MG"],
  // "Pará" sem acento vira "para" (preposição): só pela UF ou "estado do para".
  ["pa", "state", "br", ["estado do para"], "PA"],
  ["pb", "state", "br", ["paraiba"], "PB"],
  ["pr", "state", "br", ["parana"], "PR"],
  ["pe-br", "state", "br", ["pernambuco"], "PE"],
  ["pi", "state", "br", ["piaui"], "PI"],
  ["rj", "state", "br", ["estado do rio de janeiro", "estado do rio"], "RJ"],
  ["rn", "state", "br", ["rio grande do norte"], "RN"],
  ["rs", "state", "br", ["rio grande do sul"], "RS"],
  ["ro", "state", "br", ["rondonia"], "RO"],
  ["rr", "state", "br", ["roraima"], "RR"],
  ["sc", "state", "br", ["santa catarina"], "SC"],
  ["sp", "state", "br", ["estado de sao paulo"], "SP"],
  ["se", "state", "br", ["sergipe"], "SE"],
  ["to", "state", "br", ["tocantins"], "TO"],

  ["sao-paulo", "city", "sp", ["sao paulo", "sampa"]],
  ["campinas", "city", "sp", ["campinas"]],
  ["barueri", "city", "sp", ["barueri", "alphaville"]],
  ["osasco", "city", "sp", ["osasco"]],
  ["santo-andre", "city", "sp", ["santo andre"]],
  ["sao-bernardo", "city", "sp", ["sao bernardo do campo"]],
  ["sao-caetano", "city", "sp", ["sao caetano do sul"]],
  ["guarulhos", "city", "sp", ["guarulhos"]],
  ["jundiai", "city", "sp", ["jundiai"]],
  ["sorocaba", "city", "sp", ["sorocaba"]],
  ["ribeirao-preto", "city", "sp", ["ribeirao preto"]],
  ["sao-jose-dos-campos", "city", "sp", ["sao jose dos campos"]],
  ["santos", "city", "sp", ["santos"]],
  ["sao-carlos", "city", "sp", ["sao carlos"]],
  ["piracicaba", "city", "sp", ["piracicaba"]],
  ["bauru", "city", "sp", ["bauru"]],
  ["rio-de-janeiro", "city", "rj", ["rio de janeiro"]],
  ["niteroi", "city", "rj", ["niteroi"]],
  ["belo-horizonte", "city", "mg", ["belo horizonte"]],
  ["uberlandia", "city", "mg", ["uberlandia"]],
  ["juiz-de-fora", "city", "mg", ["juiz de fora"]],
  ["contagem", "city", "mg", ["contagem"]],
  ["curitiba", "city", "pr", ["curitiba"]],
  ["londrina", "city", "pr", ["londrina"]],
  ["maringa", "city", "pr", ["maringa"]],
  ["porto-alegre", "city", "rs", ["porto alegre"]],
  ["caxias-do-sul", "city", "rs", ["caxias do sul"]],
  ["florianopolis", "city", "sc", ["florianopolis", "floripa"]],
  ["joinville", "city", "sc", ["joinville"]],
  ["blumenau", "city", "sc", ["blumenau"]],
  ["brasilia", "city", "df", ["brasilia"]],
  ["salvador", "city", "ba", ["salvador"]],
  ["recife", "city", "pe-br", ["recife"]],
  ["fortaleza", "city", "ce", ["fortaleza"]],
  ["manaus", "city", "am", ["manaus"]],
  ["belem", "city", "pa", ["belem"]],
  ["goiania", "city", "go", ["goiania"]],
  ["vitoria", "city", "es-br", ["vitoria"]],
  ["natal", "city", "rn", ["natal"]],
  ["joao-pessoa", "city", "pb", ["joao pessoa"]],
  ["maceio", "city", "al", ["maceio"]],
  ["aracaju", "city", "se", ["aracaju"]],
  ["teresina", "city", "pi", ["teresina"]],
  ["sao-luis", "city", "ma", ["sao luis"]],
  ["cuiaba", "city", "mt", ["cuiaba"]],
  ["campo-grande", "city", "ms", ["campo grande"]],
  ["porto-velho", "city", "ro", ["porto velho"]],
  ["palmas", "city", "to", ["palmas"]],
  ["macapa", "city", "ap", ["macapa"]],
  ["boa-vista", "city", "rr", ["boa vista"]],
  ["rio-branco", "city", "ac", ["rio branco"]],
  ["lisboa", "city", "pt", ["lisboa", "lisbon"]],
  ["porto", "city", "pt", ["porto"]],
  ["braga", "city", "pt", ["braga"]],
  ["coimbra", "city", "pt", ["coimbra"]]
];

export const JF_PLACE = new Map<string, Place>(JF_PLACES.map(([id, type, parent, names, uf]) => [id, { id, type, parent, names, uf }]));

// Nomes ordenados do maior para o menor: "porto alegre" ganha de "porto",
// "mato grosso do sul" ganha de "mato grosso".
export const JF_PLACE_NAMES = JF_PLACES
  .flatMap(([id, , , names]) => names.map((name) => ({ id, name })))
  .sort((a, b) => b.name.length - a.name.length);

export const JF_UF_RE = new RegExp(
  `(?:^|[/(,|–—-]\\s*)(${JF_PLACES.filter((p) => p[4]).map((p) => p[4]).join("|")})(?=\\s*(?:$|[)\\s,.|;:/–—-]))`,
  "g"
);

export const jfPlaceLabel = (id: string) => {
  const place = JF_PLACE.get(id);
  if (!place) return id;
  if (place.uf) return place.uf;
  return place.names[0].replace(/(^|\s)\S/g, (c) => c.toUpperCase());
};

export function jfIsAncestorOrSelf(ancestor: string, id: string) {
  for (let cur: string | null | undefined = id; cur; cur = JF_PLACE.get(cur)?.parent) {
    if (cur === ancestor) return true;
  }
  return false;
}

// País ou região de um lugar (para comparar vaga remota).
export function jfCountryOf(id: string) {
  for (let cur: string | null | undefined = id; cur; cur = JF_PLACE.get(cur)?.parent) {
    const t = JF_PLACE.get(cur)?.type;
    if (t === "country" || t === "region") return cur;
  }
  return id;
}

// Lugares citados no texto. Nome de lugar só conta com inicial maiúscula
// ("Natal" é cidade, "natal" é Natal). Fica só o mais específico: "Barueri/SP"
// vira só Barueri.
export function jfFindPlaces(raw: string): string[] {
  const cased = jfStripAccents(raw);
  const lower = cased.toLowerCase();
  const found = new Set<string>();
  const taken: [number, number][] = [];
  for (const { id, name } of JF_PLACE_NAMES) {
    const re = new RegExp(`(^|[^a-z0-9])${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9])`, "g");
    for (let m = re.exec(lower); m; m = re.exec(lower)) {
      const start = m.index + m[1].length;
      const end = start + name.length;
      if (taken.some(([s, e]) => start < e && end > s)) continue;
      if (cased[start] !== cased[start].toUpperCase()) continue;
      taken.push([start, end]);
      found.add(id);
    }
  }
  JF_UF_RE.lastIndex = 0;
  for (let m = JF_UF_RE.exec(cased); m; m = JF_UF_RE.exec(cased)) {
    const place = JF_PLACES.find((p) => p[4] === m[1]);
    if (place) found.add(place[0]);
  }
  return [...found].filter((id) => ![...found].some((other) => other !== id && jfIsAncestorOrSelf(id, other)));
}

// Entrada do usuário ("SP", "Curitiba", "Brasil", "LATAM") → id conhecido, ou null.
export function jfResolvePlace(entry: string): string | null {
  const e = jfStripAccents(entry.trim()).toLowerCase();
  const byUf = JF_PLACES.find((p) => p[4] && p[4].toLowerCase() === e);
  if (byUf) return byUf[0];
  const byName = JF_PLACES.find((p) => p[3].includes(e));
  if (byName) return byName[0];
  // "São Paulo" o estado: o usuário costuma escrever só o nome.
  const state = JF_PLACES.find((p) => p[1] === "state" && p[3].some((n) => n.endsWith(` ${e}`)));
  return state ? state[0] : null;
}

// --- Salário ----------------------------------------------------------------
export const JF_CURRENCY_RE = "(R\\$|US\\$|U\\$|USD|BRL|EUR|€|£|GBP|\\$)";
export const JF_AMOUNT_RE = "(\\d{1,3}(?:[.,\\s]\\d{3})+(?:[.,]\\d{1,2})?|\\d+(?:[.,]\\d+)?)\\s*(k|mil)?";
export const JF_SALARY_RE = new RegExp(
  `${JF_CURRENCY_RE}\\s*${JF_AMOUNT_RE}(?:\\s*(?:a|até|ate|to|-|–|—)\\s*${JF_CURRENCY_RE}?\\s*${JF_AMOUNT_RE})?`,
  "gi"
);
export const JF_SALARY_WORDS = /(salario|remuneracao|faixa salarial|faixa|salary|compensation|pay range|pagamento|ganhos|bolsa)/;
export const JF_BENEFIT_WORDS = /(vale|\bva\b|\bvr\b|\bvt\b|auxilio|ajuda de custo|bonus|bonificacao|\bplr\b|\bppr\b|desconto|beneficio|refeicao|alimentacao|transporte|reembolso|seguro|plano|vendas|faturamento|investimento|captou|rodada)/;

export function jfParseAmount(num: string, suffix?: string) {
  let n = num.replace(/\s/g, "");
  // "1.736,72" / "15.000" (pt) e "1,000.50" / "50,000" (en).
  if (/^\d{1,3}([.,]\d{3})+([.,]\d{1,2})?$/.test(n)) {
    const dec = n.match(/[.,](\d{1,2})$/);
    const intPart = dec ? n.slice(0, -dec[0].length) : n;
    n = intPart.replace(/[.,]/g, "") + (dec ? `.${dec[1]}` : "");
  } else {
    n = n.replace(",", ".");
  }
  let value = parseFloat(n);
  if (suffix && /^(k|mil)$/i.test(suffix)) value *= 1000;
  return value;
}

export const jfCurrencyCode = (sym?: string) => {
  const s = (sym || "").toUpperCase();
  if (s === "R$" || s === "BRL") return "BRL";
  if (s === "€" || s === "EUR") return "EUR";
  if (s === "£" || s === "GBP") return "GBP";
  return "USD";
};

export type Period = "month" | "year" | "hour";
export interface Salary { min: number; max: number; currency: string; period: Period }

// Devolve { min, max, currency, period: "month"|"year"|"hour" } ou null.
// Valor sem palavra de salário por perto e com cara de benefício é ignorado.
export function jfParseSalary(raw: string): Salary | null {
  const cased = jfStripAccents(raw);
  const lower = cased.toLowerCase();
  const candidates: (Salary & { salaryWord: boolean })[] = [];
  JF_SALARY_RE.lastIndex = 0;
  for (let m = JF_SALARY_RE.exec(cased); m; m = JF_SALARY_RE.exec(cased)) {
    const before = lower.slice(Math.max(0, m.index - 45), m.index);
    const after = lower.slice(m.index + m[0].length, m.index + m[0].length + 30);
    // Benefício colado no valor ("VR R$ 1.042") ganha de "salário" mais longe
    // ("Salário a combinar. Benefícios: VR R$ 1.042").
    if (JF_BENEFIT_WORDS.test(before.slice(-20))) continue;
    const salaryWord = JF_SALARY_WORDS.test(before);
    if (!salaryWord && JF_BENEFIT_WORDS.test(before)) continue;
    const a = jfParseAmount(m[2], m[3]);
    const b = m[5] ? jfParseAmount(m[5], m[6]) : a;
    const currency = jfCurrencyCode(m[1]);
    let period: Period | null = /(\/\s*(mes|month|mo)\b|por mes|mensa|per month|monthly|a month|\bmes\b)/.test(after) ? "month"
      : /(\/\s*(ano|year|yr)\b|por ano|anua|per year|annual|yearly|a year|\bano\b)/.test(after) ? "year"
      : /(\/\s*(h|hora|hour|hr)\b|por hora|per hour|hourly|an hour)/.test(after) ? "hour"
      : null;
    // Sem período: valor alto é anual (US$ 60k, R$ 180 mil), senão mensal.
    if (!period) period = Math.max(a, b) >= (currency === "BRL" ? 100000 : 20000) ? "year" : "month";
    candidates.push({ min: Math.min(a, b), max: Math.max(a, b), currency, period, salaryWord });
  }
  if (!candidates.length) return null;
  const best = candidates.find((c) => c.salaryWord) || candidates[0];
  const { salaryWord, ...salary } = best;
  return salary;
}

// Converte para mensal: ano/12, hora×160 (40h/semana).
export function jfMonthly(value: number, period: Period) {
  if (period === "year") return value / 12;
  if (period === "hour") return value * 160;
  return value;
}

// --- Anos de experiência -----------------------------------------------------
export const JF_NUMBER_WORDS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7,
  oito: 8, nove: 9, dez: 10, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10
};
export const JF_YEARS_RE = new RegExp(
  `(?:^|[^a-z0-9])(\\d{1,2}|${Object.keys(JF_NUMBER_WORDS).join("|")})\\s*(\\+|(?:a|-|–|to)\\s*\\d{1,2})?\\s*(?:anos?|years?|yrs?)(?![a-z])`,
  "g"
);
export const JF_EXPERIENCE_CONTEXT = /(experien|atuacao|atuando|vivencia|hands-on|working|trabalhando|\bexp\b)/;

// Maior "mínimo de anos" pedido no texto (normalizado), ou null se não pede.
export function jfParseExperience(text: string) {
  let most: number | null = null;
  JF_YEARS_RE.lastIndex = 0;
  for (let m = JF_YEARS_RE.exec(text); m; m = JF_YEARS_RE.exec(text)) {
    const around = text.slice(Math.max(0, m.index - 50), m.index + m[0].length + 40);
    if (!JF_EXPERIENCE_CONTEXT.test(around)) continue;
    const years = JF_NUMBER_WORDS[m[1]] ?? Number(m[1]);
    if (years > 30) continue;
    most = Math.max(most ?? 0, years);
  }
  return most;
}

// --- Domínios ----------------------------------------------------------------
// "https://www.Exemplo.com.br/x" → "exemplo.com.br". O LinkedIn embrulha links
// externos em linkedin.com/safety/go/?url=...; desembrulha antes.
export function jfHost(url: string): string | null {
  try {
    const u = new URL(url, "https://www.linkedin.com");
    if (/linkedin\.com$/.test(u.hostname) && u.pathname.startsWith("/safety/go")) {
      const target = u.searchParams.get("url");
      if (target) return jfHost(target);
    }
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Entrada do usuário ("https://www.hotmart.com/x", "hotmart.com") → "hotmart.com".
export function jfDomainEntry(entry: string) {
  const e = entry.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "");
  return e.split(/[/?#\s]/)[0] || null;
}

export const jfHostMatches = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

// Domínios citados como texto ("passabot.com"), para links que não são <a>.
export function jfTextDomains(text: string) {
  return [...text.matchAll(/(?:^|[^a-z0-9.@-])((?:[a-z0-9-]+\.)+(?:com|br|io|app|net|org|dev|ai|co|me|ly|gg|xyz|info|site|online|store|shop)(?:\.br)?)(?![a-z0-9])/g)]
    .map((m) => m[1].replace(/^www\./, ""));
}
