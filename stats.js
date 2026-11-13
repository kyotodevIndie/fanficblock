// Fanficômetro: conta os posts escondidos, por dia e por categoria.
// Sem DOM, para testar no Node. Não guarda texto de post: só um hash curto
// (para não contar o mesmo post duas vezes) e números.

const JF_STAT_CATEGORIES = {
  notJob: { label: "Não era vaga", emoji: "📭" },
  fluff: { label: "Devaneio", emoji: "🦄" },
  bait: { label: "Caça-engajamento", emoji: "🎣" },
  ads: { label: "Anúncio", emoji: "📢" },
  course: { label: "Vendedor de curso", emoji: "🎓" },
  repost: { label: "Repost", emoji: "🔁" },
  blocked: { label: "Bloqueios seus", emoji: "🚫" },
  jobFilter: { label: "Vaga fora do seu filtro", emoji: "🎯" }
};

// Tempo economizado = posts escondidos × 8 s. Oito segundos é uma estimativa
// do tempo de ler o começo de um post do LinkedIn e rolar para o próximo.
const JF_SECONDS_PER_POST = 8;
// Histórico limitado: só os últimos 30 dias e os últimos 1000 hashes.
const JF_STATS_DAYS = 30;
const JF_STATS_SEEN = 1000;

const JF_STATS_EMPTY = { total: 0, cats: {}, days: {}, seen: [] };

// Motivo do jfClassify → categoria.
function jfStatCategory(reason) {
  const r = reason || "";
  if (r.startsWith("patrocinado")) return "ads";
  if (r.startsWith("devaneio")) return "fluff";
  if (r.startsWith("caça-engajamento")) return "bait";
  if (r.startsWith("vendedor de curso")) return "course";
  if (r.startsWith("repost")) return "repost";
  if (/^(bloqueado|autor bloqueado|empresa bloqueada|link bloqueado)/.test(r)) return "blocked";
  if (r.startsWith("nada de vaga") || /^só \d+ fraca/.test(r)) return "notJob";
  return "jobFilter";
}

// FNV-1a de 32 bits em hexa: identifica o post sem guardar o texto.
function jfHash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

// Data local "AAAA-MM-DD".
const jfDay = (date = new Date()) => date.toLocaleDateString("sv-SE");

// events: [{ hash, cat }]. Devolve estatísticas novas (não altera as antigas).
function jfStatsAdd(stats, events, today = jfDay()) {
  const next = structuredClone({ ...JF_STATS_EMPTY, ...stats });
  const seen = new Set(next.seen);
  for (const { hash, cat } of events) {
    if (seen.has(hash)) continue;
    seen.add(hash);
    next.seen.push(hash);
    const day = (next.days[today] ||= { total: 0, cats: {} });
    day.total++;
    day.cats[cat] = (day.cats[cat] || 0) + 1;
    next.total++;
    next.cats[cat] = (next.cats[cat] || 0) + 1;
  }
  next.seen = next.seen.slice(-JF_STATS_SEEN);
  const keep = Object.keys(next.days).sort().slice(-JF_STATS_DAYS);
  next.days = Object.fromEntries(keep.map((d) => [d, next.days[d]]));
  return next;
}

// Hoje, últimos 7 dias (contando hoje), total e tempo economizado.
function jfStatsSummary(stats, today = jfDay()) {
  const s = { ...JF_STATS_EMPTY, ...stats };
  const from = new Date(`${today}T12:00:00`);
  from.setDate(from.getDate() - 6);
  const weekStart = jfDay(from);
  const week = Object.entries(s.days)
    .filter(([d]) => d >= weekStart && d <= today)
    .reduce((n, [, day]) => n + day.total, 0);
  return {
    today: s.days[today]?.total || 0,
    week,
    total: s.total,
    cats: s.cats,
    seconds: s.total * JF_SECONDS_PER_POST
  };
}

// "1 h 05 min", "12 min", "40 s".
function jfDuration(seconds) {
  if (seconds < 60) return `${seconds} s`;
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
}

if (typeof module !== "undefined") {
  module.exports = {
    JF_STAT_CATEGORIES, JF_SECONDS_PER_POST, jfStatCategory, jfHash, jfDay,
    jfStatsAdd, jfStatsSummary, jfDuration
  };
}
