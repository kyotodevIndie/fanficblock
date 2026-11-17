// Roda: npm test (ou node test/run.ts)
// Arquivos em posts/ começando com "sim-" devem ficar; com "nao-", sumir.
import fs from "node:fs";
import path from "node:path";
import { jfClassify, jfCompile, jfProfileId, jfSegment, type PostMeta } from "../src/classify.ts";
import { JF_DEFAULTS, type Settings } from "../src/defaults.ts";
import * as x from "../src/extract.ts";
import * as q from "../src/query.ts";
import * as st from "../src/stats.ts";

const __dirname = import.meta.dirname;
// [nome, texto, ajustes, deve ficar?, meta, autor ou link de vaga]
type Case = [string, string, Partial<Settings>, boolean, PostMeta?, string?];
type JobCase = [string, string, Partial<Settings>, boolean, PostMeta?, boolean?];

let failed = 0;
const check = (name: string, got: boolean, want: boolean, reason: string) => {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${got ? "fica " : "some "} ${name}  (${reason})`);
};

const compiled = jfCompile(JF_DEFAULTS);
const dir = path.join(__dirname, "posts");
for (const file of fs.readdirSync(dir).sort()) {
  const text = fs.readFileSync(path.join(dir, file), "utf8");
  const { keep, reason } = jfClassify(text, false, compiled);
  check(file, keep, file.startsWith("sim-"), reason);
}

console.log("\n-- só recrutadores --");
const rec = jfCompile({ ...JF_DEFAULTS, recruitersOnly: true });
const vaga = "Estamos contratando dev React!";
for (const [author, want] of ([
  ["Ana Souza • 2º Tech Recruiter | Talent Acquisition na Acme 2h •", true],
  ["Bruno Lima Recrutadora de TI | R&S", true],
  ["Carla Dias Analista de RH 1d", true],
  ["Diego Alves Senior Dev | Open to opportunities", false],
  ["Acme Inc 12.345 seguidores Promovido", false]
] as [string, boolean][])) {
  const { keep, reason } = jfClassify(vaga, false, rec, author);
  check(author, keep, want, reason);
}
const { keep, reason } = jfClassify("Lição do meu cachorro", false, rec, "Tech Recruiter");
check("recrutador postando textão", keep, false, reason);

console.log("\n-- filtros de vaga e devaneio --");
const cielo = "Vaga Analista SRE Júnior | Cielo | Híbrido (Barueri/SP) com auxílio trabalho remoto, CLT";
const cases: [string, string, Partial<Settings>, boolean][] = [
  // [nome, texto, ajustes, deve ficar?]
  ["excluir híbrido: vaga híbrida", cielo, { exclude: { modality: ["hybrid"] } }, false],
  ["excluir remoto: híbrida que cita remoto", cielo, { exclude: { modality: ["remote"] } }, true],
  ["excluir remoto: 100% remoto", "Vaga dev React 100% remoto", { exclude: { modality: ["remote"] } }, false],
  ["excluir CLT: 'CLT ou PJ'", "Vaga dev, CLT ou PJ", { exclude: { contract: ["clt"] } }, true],
  ["excluir CLT e PJ: 'CLT ou PJ'", "Vaga dev, CLT ou PJ", { exclude: { contract: ["clt", "pj"] } }, false],
  ["excluir júnior", cielo, { exclude: { seniority: ["junior"] } }, false],
  ["excluir sênior: vaga júnior", cielo, { exclude: { seniority: ["senior"] } }, true],
  ["sem modelo citado não some", "Vaga de QA de dados", { exclude: { modality: ["remote", "hybrid", "onsite"] } }, true],
  ["só tecnologia: recepcionista", "Estamos contratando Recepcionista para salão de beleza", { techOnly: true }, false],
  ["só tecnologia: dev", "Estamos contratando dev backend Node", { techOnly: true }, true],
  ["esconder inglês: vaga em inglês", "We're hiring a Senior Frontend Engineer to join our team. You will work with the best people and we are fully remote for the region.", { hideEnglish: true }, false],
  ["esconder inglês: vaga em português", "Estamos contratando pessoa dev para o time de dados, com foco em Python e uma rotina remota.", { hideEnglish: true }, true],
  ["precisa ter React: vaga Java", "Vaga dev Java Spring", { mustHave: ["react"] }, false],
  ["precisa ter React: vaga React", "Vaga dev React e Node", { mustHave: ["react"] }, true],
  ["devaneio forte", "Fui demitido e agradeci ao meu chefe. Hoje entendo tudo.", { onlyJobs: false }, false],
  ["devaneio 'não é sobre X, é sobre Y'", "Não é sobre código, é sobre pessoas.", { onlyJobs: false }, false],
  ["devaneio fraco (3 palavras)", "Gratidão pela jornada. Aprendi muito sobre liderança e propósito.", { onlyJobs: false }, false],
  ["post comum com 'só vagas' desligado", "Saiu a versão 5 do framework com suporte a streaming.", { onlyJobs: false }, true],
  ["vaga com palavras de devaneio fracas fica", "Vaga Customer Success: liderança de carteira, jornada de trabalho 6x1, sucesso do cliente, propósito.", {}, true],
  ["devaneio desligado", "Fui demitido e agradeci ao meu chefe.", { onlyJobs: false, blockFluff: false }, true]
];
for (const [name, text, extra, want] of cases) {
  const { keep, reason } = jfClassify(text, false, jfCompile({ ...JF_DEFAULTS, ...extra }));
  check(name, keep, want, reason);
}

console.log("\n-- fase 1: patrocinado, caça-engajamento, repost, autores --");
const off = { onlyJobs: false };
const repostHeader = "Fulano Silva reposted this Ana Souza • 2nd Dev na Acme";
const phase1: Case[] = [
  // [nome, texto, ajustes, deve ficar?, meta, autor]
  ["isca: 'comenta GUIA que eu te mando'", "Montei um guia de prompts. Comenta \"GUIA\" que eu te mando no privado.", off, false],
  ["isca: 'Comenta EU' maiúsculo", "Fiz uma planilha de controle. Comenta EU que eu envio pra você.", off, false],
  ["isca dentro de vaga não derruba", "VAGA Full Stack Java/React, CLT. Comenta aqui embaixo \"PLATFORM\" e eu te mando o link", {}, true],
  ["pergunta solta 'concorda?' fica", "Acho que teste de integração vale mais que unitário. Concorda?", off, true],
  ["duas perguntas de isca somem", "Acho que teste de integração vale mais que unitário. Concorda? Me conta nos comentários.", off, false],
  ["'marque alguém' some", "Marque alguém que precisa ler isso hoje.", off, false],
  ["sigla maiúscula sem promessa não é isca", "Comente sobre AWS e GCP: qual vocês usam no trabalho?", off, true],
  ["isca desligada", "Marque alguém que precisa ler isso hoje.", { ...off, blockBait: false }, true],
  ["patrocinado some", "Conheça a nova plataforma de dados.", off, false, { sponsored: true }],
  ["patrocinado de vaga também some", "Estamos contratando dev React!", {}, false, { sponsored: true }],
  ["patrocinado com filtro desligado", "Conheça a nova plataforma de dados.", { ...off, hideSponsored: false }, true, { sponsored: true }],
  ["repost some (ligado)", "Artigo ótimo sobre arquitetura.", { ...off, hideReposts: true }, false, { header: repostHeader }],
  ["repost de vaga fica", "Estamos contratando dev React!", { hideReposts: true }, true, { header: repostHeader }],
  ["repost com filtro desligado fica", "Artigo ótimo sobre arquitetura.", off, true, { header: repostHeader }],
  ["'compartilhou' no texto não é repost", "Minha colega compartilhou um artigo ótimo.", { ...off, hideReposts: true }, true, { header: "Ana Souza • 2nd Dev" }],
  ["autor bloqueado por URL some (até vaga)", "Estamos contratando dev React!", { blockedAuthors: ["https://www.linkedin.com/in/marcosinfluencer/"] }, false, { authorId: "in/marcosinfluencer" }],
  ["autor bloqueado por nome some", "Uma vaca fugiu do matadouro.", { ...off, blockedAuthors: ["Marcos Influencer"] }, false, {}, "Marcos Influencer • 2nd Influencer"],
  ["nome bloqueado não pega outra pessoa", "Uma vaca fugiu do matadouro.", { ...off, blockedAuthors: ["Marcos Influencer"] }, true, {}, "Ana Souza • 2nd Dev"],
  ["empresa liberada fica mesmo sem ser vaga", "Lançamos nosso relatório anual.", { allowedAuthors: ["linkedin.com/company/acme"] }, true, { authorId: "company/acme" }],
  ["liberado perde para 'esconder sempre'", "Novo curso de liderança!", { allowedAuthors: ["in/ana"], blocklist: ["curso"] }, false, { authorId: "in/ana" }],
  ["bloqueado e liberado: bloqueado ganha", "Estamos contratando!", { allowedAuthors: ["in/ana"], blockedAuthors: ["in/ana"] }, false, { authorId: "in/ana" }],
  ["liberado passa por cima de patrocinado", "Conheça nosso produto.", { allowedAuthors: ["company/acme"] }, true, { authorId: "company/acme", sponsored: true }],
  ["sem perfil detectado: URL bloqueada não derruba", "Estamos contratando!", { blockedAuthors: ["in/ana"] }, true, { authorId: null }]
];
for (const [name, text, extra, want, meta = {}, author = ""] of phase1) {
  const { keep, reason } = jfClassify(text, false, jfCompile({ ...JF_DEFAULTS, ...extra }), author, meta);
  check(name, keep, want, reason);
}
for (const [input, want] of ([
  ["https://br.linkedin.com/in/Fulano-123/?trk=x", "in/fulano-123"],
  ["/in/jo%C3%A3o/", "in/joão"],
  ["linkedin.com/company/acme/posts", "company/acme"],
  ["Marcos Influencer", null]
] as [string, string | null][])) {
  const got = jfProfileId(input);
  check(`perfil: ${input}`, got === want, true, String(got));
}

console.log("\n-- fase 2: vagas avançadas --");
const N = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const cieloSP = "Vaga Analista SRE Júnior | Cielo | Híbrido (Barueri/SP), CLT";
const recife = "Estamos contratando dev React para atuar presencialmente em Recife - PE. CLT.";
const remoteBR = "Vaga dev Node 100% remoto, Brasil. PJ.";
const remoteLatam = "We're hiring! Senior Backend Engineer, Remote LATAM, contractor.";
const noPlace = "Vaga de QA de dados, CLT, júnior.";
const jns = "Vaga Assistente Administrativo. Salário a combinar. Benefícios: VR R$ 1.042,00 por mês, VT.";
const phase2: JobCase[] = [
  // [nome, texto, ajustes, deve ficar?, meta]
  ["local: Barueri/SP com filtro SP", cieloSP, { locations: ["SP"] }, true],
  ["local: Recife com filtro SP", recife, { locations: ["SP"] }, false],
  ["local: Recife com filtro SP, Recife", recife, { locations: ["SP", "Recife"] }, true],
  ["local: Recife com filtro Brasil", recife, { locations: ["Brasil"] }, true],
  ["local: remoto Brasil com filtro Curitiba", remoteBR, { locations: ["Curitiba"] }, true],
  ["local: remoto LATAM com filtro SP", remoteLatam, { locations: ["SP"] }, true],
  ["local: remoto LATAM com filtro Portugal", remoteLatam, { locations: ["Portugal"] }, false],
  ["local: sem local fica (desconhecido)", noPlace, { locations: ["SP"] }, true],
  ["local: sem local + exigir some", noPlace, { locations: ["SP"], requireLocation: true }, false],
  ["local: remoto sem país + exigir fica", "Vaga dev Java, 100% remoto, CLT.", { requireLocation: true }, true],
  ["local: 'feliz natal' não é Natal", "Vaga dev Java em Natal - RN. Feliz natal a todos!", { locations: ["Natal"] }, true],
  ["local: lugar desconhecido por texto", "Vaga dev em Itapecerica da Serra, CLT", { locations: ["Itapecerica da Serra"] }, true],
  ["salário: exigir, sem salário some", noPlace, { requireSalary: true }, false],
  ["salário: exigir, com faixa fica", "Vaga dev React, CLT. Salário: R$ 8.000 a R$ 10.000", { requireSalary: true }, true],
  ["salário: VR não conta como salário", jns, { requireSalary: true }, false],
  ["salário: faixa abaixo do mínimo some", "Vaga dev React, CLT. Faixa salarial: R$ 3.000 - R$ 4.500", { minSalary: 6000 }, false],
  ["salário: faixa que alcança o mínimo fica", "Vaga dev React, CLT. Faixa salarial: R$ 5.000 - R$ 7.000", { minSalary: 6000 }, true],
  ["salário: anual convertido (120k/ano = 10k/mês)", "Vaga dev, salário R$ 120.000 por ano", { minSalary: 9000 }, true],
  ["salário: anual abaixo (60k/ano)", "Vaga dev, salário R$ 60.000/ano", { minSalary: 9000 }, false],
  ["salário: 'R$ 15 mil/mês' acima", "Vaga dev sênior, salário R$ 15 mil/mês", { minSalary: 9000 }, true],
  ["salário: moeda diferente não compara", "We're hiring a Senior Engineer. Salary: US$ 3,000/month", { minSalary: 9000 }, true],
  ["salário: sem salário + mínimo fica", noPlace, { minSalary: 9000 }, true],
  ["tech ANY: tem uma", "Vaga dev React e Node", { mustHave: ["react", "vue"] }, true],
  ["tech ALL: falta uma", "Vaga dev React", { mustHave: ["react", "typescript"], mustHaveMode: "all" }, false],
  ["tech ALL: tem todas (sinônimo TS)", "Vaga dev React + TS", { mustHave: ["react", "typescript"], mustHaveMode: "all" }, true],
  ["tech: node pega Node.js", "Vaga backend Node.js", { mustHave: ["node"] }, true],
  ["tech: C# não pega C", "Vaga dev C, sistemas embarcados", { mustHave: ["c#"] }, false],
  ["tech: C# pega C#", "Vaga dev C# .NET", { mustHave: ["c#"] }, true],
  ["tech: C++ pega C++", "Vaga dev C++ jogos", { mustHave: ["c++"] }, true],
  ["tech: java não pega javascript", "Vaga dev JavaScript", { mustHave: ["java"] }, false],
  ["tech: React Native", "Vaga dev mobile React Native", { mustHave: ["react native"] }, true],
  ["tech: .net pega dotnet", "Vaga dev dotnet", { mustHave: [".net"] }, true],
  ["proibida: PHP some", "Vaga dev PHP Laravel", { mustNotHave: ["php"] }, false],
  ["proibida: não pega parte de palavra", "Vaga dev Phpunit? não, Python", { mustNotHave: ["php"] }, true],
  ["empresa bloqueada some", cieloSP, { blockedCompanies: ["Cielo"] }, false],
  ["empresa liberada passa por cima de filtro", cieloSP, { allowedCompanies: ["Cielo"], exclude: { modality: ["hybrid"] } }, true],
  ["experiência: pede 5, máx 3 some", "Vaga dev, experiência de 5+ anos com Java", { maxExperience: 3 }, false],
  ["experiência: pede 2, máx 3 fica", "Vaga dev, 2 anos de experiência", { maxExperience: 3 }, true],
  ["experiência: 'empresa com 20 anos' fica", "Vaga dev em empresa com 20 anos de mercado", { maxExperience: 3 }, true],
  ["experiência: em inglês", "We're hiring: 7+ years of experience with Go", { maxExperience: 3 }, false],
  ["incompleta: só 'vaga' some", "Vaga de dev, chama no privado", { hideIncomplete: true }, false],
  ["incompleta: local + contratação fica", "Vaga dev em Curitiba, CLT", { hideIncomplete: true }, true],
  ["incompleta: link de vaga + local fica", "Vaga dev remoto", { hideIncomplete: true }, true, {}, true],
  ["curso: venda some", "Nova turma da mentoria de carreira tech! Garanta sua vaga, últimas vagas no primeiro lote.", { ...off, blockCourses: true }, false],
  ["curso: 'garanta sua vaga' não vira vaga", "Mentoria de carreira: garanta sua vaga!", { blockCourses: true }, false],
  ["curso: conteúdo gratuito fica", "Montei um curso gratuito de Python no YouTube, aproveitem!", { ...off, blockCourses: true }, true],
  ["curso: link de plataforma", "Meu ebook de entrevistas saiu!", { ...off, blockCourses: true }, false, { links: ["https://pay.hotmart.com/abc"] }],
  ["curso: vaga de instrutor não cai", "Vaga: instrutor de curso de Excel, CLT, desconto em cursos", { blockCourses: true }, true],
  ["domínio bloqueado por link (subdomínio)", "Olha esse site", { ...off, blockedDomains: ["exemplo.com"] }, false, { links: ["https://www.linkedin.com/safety/go/?url=https%3A%2F%2Fblog.exemplo.com%2Fx"] }],
  ["domínio bloqueado no texto", "Acesse exemplo.com.br agora", { ...off, blockedDomains: ["https://www.exemplo.com.br/"] }, false],
  ["domínio parecido não bloqueia", "Acesse meuexemplo.com", { ...off, blockedDomains: ["exemplo.com"] }, true],
  ["inglês: vaga PT cheia de termos tech fica", "Vaga dev backend: Node, React, cloud, deploy, CI/CD, Kubernetes, AWS, microservices, the best stack. Trabalho remoto com o time de dados, você vai atuar na plataforma.", { hideEnglish: true }, true]
];
for (const [name, text, extra, want, meta = {}, jobLink = false] of phase2) {
  const { keep, reason } = jfClassify(text, jobLink, jfCompile({ ...JF_DEFAULTS, ...extra }), "", meta);
  check(name, keep, want, reason);
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
for (const [name, got, want] of ([
  ["places: Barueri/SP", x.jfFindPlaces("Híbrido (Barueri/SP)"), ["barueri"]],
  ["places: Porto Alegre ganha de Porto", x.jfFindPlaces("Porto Alegre - RS"), ["porto-alegre"]],
  ["salary: 'R$ 1.736,72'", x.jfParseSalary("Salário: R$ 1.736,72"), { min: 1736.72, max: 1736.72, currency: "BRL", period: "month" }],
  ["salary: 'US$ 60k - 80k per year'", x.jfParseSalary("US$ 60k - 80k per year"), { min: 60000, max: 80000, currency: "USD", period: "year" }],
  ["salary: '€ 25/hora'", x.jfParseSalary("Remuneração: € 25/hora"), { min: 25, max: 25, currency: "EUR", period: "hour" }],
  ["salary: rodada de investimento não é salário", x.jfParseSalary("A empresa captou R$ 50 milhões em rodada"), null],
  ["experience: 'três anos de experiência'", x.jfParseExperience(N("três anos de experiência")), 3],
  ["experience: '3 a 5 anos de experiência' = 3", x.jfParseExperience(N("de 3 a 5 anos de experiência")), 3]
] as [string, unknown, unknown][])) {
  check(name, same(got, want), true, JSON.stringify(got));
}

console.log("\n-- gerador de busca --");
for (const [name, state, want] of ([
  ["vazio", {}, '(vaga OR contratando)'],
  ["uma tecnologia", { techs: ["react"] }, '(vaga OR contratando) AND React'],
  ["tecnologias, qualquer uma", { techs: ["react", "node"] }, '(vaga OR contratando) AND (React OR Node OR "Node.js")'],
  ["tecnologias, todas", { techs: ["react", "typescript"], techMode: "all" }, '(vaga OR contratando) AND React AND TypeScript'],
  ["C# e C++ entre aspas", { techs: ["csharp", "cpp"] }, '(vaga OR contratando) AND ("C#" OR "C++")'],
  ["completo", { lang: "both", techs: ["python"], seniority: "mid", modality: "remote", contract: "clt", location: "sp", exclude: ["intern", "talents"] },
    '(vaga OR contratando OR hiring) AND Python AND (pleno OR "mid-level") AND (remoto OR remote OR "home office") AND CLT AND ("São Paulo" OR SP) NOT estágio NOT "banco de talentos"'],
  ["opção desconhecida é ignorada", { seniority: "nada", techs: ["x"] }, '(vaga OR contratando)']
] as [string, Partial<q.QueryState>, string][])) {
  const got = q.jfBuildQuery(state);
  check(`busca: ${name}`, got === want, true, got);
}
check("busca: contagem", q.jfQueryCount({ techs: ["react", "node"], seniority: "mid", exclude: ["pj"] }) === 4, true, "4");

console.log("\n-- fanficômetro --");
for (const [reason, want] of [
  ["patrocinado", "ads"], ["devaneio: fui demitido", "fluff"], ["caça-engajamento: marque alguem", "bait"],
  ["vendedor de curso: mentoria + lote", "course"], ["repost", "repost"], ["autor bloqueado: in/x", "blocked"],
  ["link bloqueado: x.com", "blocked"], ["bloqueado: curso", "blocked"], ["nada de vaga", "notJob"],
  ["só 1 fraca: clt", "notJob"], ["vaga Híbrido", "jobFilter"], ["vaga sem salário", "jobFilter"]
]) check(`categoria: ${reason}`, st.jfStatCategory(reason) === want, true, st.jfStatCategory(reason));
let stats = st.jfStatsAdd({}, [{ hash: "a", cat: "ads" }, { hash: "b", cat: "fluff" }, { hash: "a", cat: "ads" }], "2026-11-13");
check("stats: mesmo post conta uma vez", stats.total === 2, true, String(stats.total));
stats = st.jfStatsAdd(stats, [{ hash: "a", cat: "ads" }, { hash: "c", cat: "ads" }], "2026-11-14");
check("stats: hash repetido em outro dia não conta", stats.total === 3 && stats.cats.ads === 2, true, JSON.stringify(stats.cats));
stats = st.jfStatsAdd(stats, [{ hash: "d", cat: "bait" }], "2026-11-01");
const sum = st.jfStatsSummary(stats, "2026-11-14");
check("stats: hoje / 7 dias / total", sum.today === 1 && sum.week === 3 && sum.total === 4, true, JSON.stringify(sum));
check("stats: tempo = 8 s por post", sum.seconds === 32, true, String(sum.seconds));
let many: st.Stats = st.JF_STATS_EMPTY;
for (let i = 0; i < 40; i++) many = st.jfStatsAdd(many, [{ hash: `h${i}`, cat: "ads" }], `2026-10-${String(i % 31 + 1).padStart(2, "0")}`);
check("stats: guarda no máximo 30 dias", Object.keys(many.days).length === 30, true, String(Object.keys(many.days).length));
check("duração: 40 s / 12 min / 1 h 05 min", [st.jfDuration(40), st.jfDuration(720), st.jfDuration(3900)].join("|") === "40 s|12 min|1 h 05 min", true, "");

console.log("\n-- feed novo (SDUI), separando autor/post/comentários --");
const feed = fs.readFileSync(path.join(__dirname, "feed-sdui.txt"), "utf8")
  .split("\n").filter((l) => !l.startsWith("# "));
const blocks: string[][] = [];
for (const line of feed) {
  if (line.trim() === "Feed post") blocks.push([line]);
  else if (blocks.length && line.trim()) blocks[blocks.length - 1].push(line);
}
for (const block of blocks) {
  const expect = block.splice(1, 1)[0].split(" ");
  const { author, body, sponsored } = jfSegment(block);
  const meta = { header: author, sponsored };
  const name = (author.split(/likes this|Followed by/).pop()!.trim() || body).slice(0, 40);
  const normal = jfClassify(body, false, compiled, author, meta);
  check(name, normal.keep, expect[1] === "sim", normal.reason);
  const recruiter = jfClassify(body, false, rec, author, meta);
  check(`${name} [rec]`, recruiter.keep, expect[2] === "rec", recruiter.reason);
}

process.exit(failed ? 1 : 0);
