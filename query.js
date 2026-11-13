// Gerador de busca do LinkedIn: monta uma busca booleana (AND, OR, NOT, aspas)
// a partir das opções escolhidas no painel. Sem DOM, para testar no Node.

// Cada opção vira um grupo "(a OR b)". Valor com espaço ou símbolo vai entre aspas.
const JF_QUERY_OPTIONS = {
  lang: {
    label: "Idioma da vaga",
    options: {
      pt: { label: "Português", terms: ["vaga", "contratando"] },
      en: { label: "Inglês", terms: ["hiring", "job opening"] },
      both: { label: "Os dois", terms: ["vaga", "contratando", "hiring"] }
    }
  },
  tech: {
    label: "Tecnologia",
    options: {
      react: { label: "React", terms: ["React"] },
      "react-native": { label: "React Native", terms: ["React Native"] },
      angular: { label: "Angular", terms: ["Angular"] },
      vue: { label: "Vue", terms: ["Vue"] },
      node: { label: "Node.js", terms: ["Node", "Node.js"] },
      typescript: { label: "TypeScript", terms: ["TypeScript"] },
      javascript: { label: "JavaScript", terms: ["JavaScript"] },
      java: { label: "Java", terms: ["Java"] },
      kotlin: { label: "Kotlin", terms: ["Kotlin"] },
      swift: { label: "Swift", terms: ["Swift"] },
      flutter: { label: "Flutter", terms: ["Flutter"] },
      python: { label: "Python", terms: ["Python"] },
      go: { label: "Go", terms: ["Golang"] },
      csharp: { label: "C#", terms: ["C#"] },
      dotnet: { label: ".NET", terms: [".NET", "dotnet"] },
      cpp: { label: "C++", terms: ["C++"] },
      php: { label: "PHP", terms: ["PHP"] },
      ruby: { label: "Ruby", terms: ["Ruby"] },
      rust: { label: "Rust", terms: ["Rust"] },
      sql: { label: "SQL", terms: ["SQL"] },
      aws: { label: "AWS", terms: ["AWS"] },
      azure: { label: "Azure", terms: ["Azure"] },
      gcp: { label: "GCP", terms: ["GCP"] },
      devops: { label: "DevOps / SRE", terms: ["DevOps", "SRE"] },
      data: { label: "Dados", terms: ["dados", "data"] },
      qa: { label: "QA / Testes", terms: ["QA", "testes"] },
      ux: { label: "UX / UI", terms: ["UX", "UI"] },
      product: { label: "Produto", terms: ["product manager", "product owner"] }
    }
  },
  seniority: {
    label: "Senioridade",
    options: {
      intern: { label: "Estágio", terms: ["estágio", "estagiário", "internship"] },
      junior: { label: "Júnior", terms: ["júnior", "junior", "jr"] },
      mid: { label: "Pleno", terms: ["pleno", "mid-level"] },
      senior: { label: "Sênior", terms: ["sênior", "senior", "sr"] },
      lead: { label: "Liderança", terms: ["tech lead", "líder técnico", "head"] }
    }
  },
  modality: {
    label: "Modelo",
    options: {
      remote: { label: "Remoto", terms: ["remoto", "remote", "home office"] },
      hybrid: { label: "Híbrido", terms: ["híbrido", "hybrid"] },
      onsite: { label: "Presencial", terms: ["presencial", "on-site"] }
    }
  },
  contract: {
    label: "Contratação",
    options: {
      clt: { label: "CLT", terms: ["CLT"] },
      pj: { label: "PJ", terms: ["PJ", "contractor"] },
      freela: { label: "Freela", terms: ["freela", "freelancer"] }
    }
  },
  location: {
    label: "Local",
    options: {
      brasil: { label: "Brasil", terms: ["Brasil", "Brazil"] },
      sp: { label: "São Paulo", terms: ["São Paulo", "SP"] },
      rj: { label: "Rio de Janeiro", terms: ["Rio de Janeiro", "RJ"] },
      bh: { label: "Belo Horizonte", terms: ["Belo Horizonte"] },
      curitiba: { label: "Curitiba", terms: ["Curitiba"] },
      poa: { label: "Porto Alegre", terms: ["Porto Alegre"] },
      floripa: { label: "Florianópolis", terms: ["Florianópolis"] },
      brasilia: { label: "Brasília", terms: ["Brasília"] },
      campinas: { label: "Campinas", terms: ["Campinas"] },
      recife: { label: "Recife", terms: ["Recife"] },
      salvador: { label: "Salvador", terms: ["Salvador"] },
      fortaleza: { label: "Fortaleza", terms: ["Fortaleza"] },
      portugal: { label: "Portugal", terms: ["Portugal"] },
      latam: { label: "LATAM", terms: ["LATAM"] }
    }
  },
  exclude: {
    label: "Sem",
    options: {
      intern: { label: "Estágio", terms: ["estágio"] },
      trainee: { label: "Trainee", terms: ["trainee"] },
      senior: { label: "Sênior", terms: ["sênior", "senior"] },
      onsite: { label: "Presencial", terms: ["presencial"] },
      hybrid: { label: "Híbrido", terms: ["híbrido"] },
      pj: { label: "PJ", terms: ["PJ"] },
      freela: { label: "Freela", terms: ["freela"] },
      talents: { label: "Banco de talentos", terms: ["banco de talentos"] },
      course: { label: "Curso / mentoria", terms: ["curso", "mentoria"] }
    }
  }
};

// Estado vazio do gerador. techs e exclude aceitam várias opções.
const JF_QUERY_EMPTY = {
  lang: "pt", techs: [], techMode: "any", seniority: "", modality: "", contract: "", location: "", exclude: []
};

const jfQuoteTerm = (term) => (/^[\p{L}\p{N}]+$/u.test(term) ? term : `"${term.replace(/"/g, "")}"`);

function jfQueryGroup(field, id) {
  const terms = JF_QUERY_OPTIONS[field].options[id]?.terms;
  if (!terms) return null;
  const quoted = terms.map(jfQuoteTerm);
  return quoted.length === 1 ? quoted[0] : `(${quoted.join(" OR ")})`;
}

// Quantas escolhas restringem a busca (idioma não conta: é a base).
function jfQueryCount(state) {
  const s = { ...JF_QUERY_EMPTY, ...state };
  return s.techs.length + s.exclude.length + ["seniority", "modality", "contract", "location"].filter((k) => s[k]).length;
}

function jfBuildQuery(state) {
  const s = { ...JF_QUERY_EMPTY, ...state };
  const parts = [jfQueryGroup("lang", s.lang) || jfQueryGroup("lang", "pt")];

  const techs = s.techs.filter((id) => JF_QUERY_OPTIONS.tech.options[id]);
  if (techs.length && s.techMode === "all") {
    parts.push(...techs.map((id) => jfQueryGroup("tech", id)));
  } else if (techs.length) {
    // "Qualquer uma": um grupo só, (React OR Node OR "Node.js").
    const terms = techs.flatMap((id) => JF_QUERY_OPTIONS.tech.options[id].terms).map(jfQuoteTerm);
    parts.push(terms.length === 1 ? terms[0] : `(${terms.join(" OR ")})`);
  }

  for (const field of ["seniority", "modality", "contract", "location"]) {
    const group = s[field] && jfQueryGroup(field, s[field]);
    if (group) parts.push(group);
  }

  const query = parts.join(" AND ");
  const not = s.exclude.map((id) => jfQueryGroup("exclude", id)).filter(Boolean);
  return not.length ? `${query} ${not.map((g) => `NOT ${g}`).join(" ")}` : query;
}

if (typeof module !== "undefined") {
  module.exports = { JF_QUERY_OPTIONS, JF_QUERY_EMPTY, jfBuildQuery, jfQueryCount };
}
