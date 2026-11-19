// Configuração padrão, compartilhada entre o content script e o popup.
// Palavras-chave são comparadas sem acento e em minúsculas.
export type Settings = {
  enabled: boolean;
  onlyJobs: boolean;
  blockFluff: boolean;
  blockBait: boolean;
  hideSponsored: boolean;
  hideReposts: boolean;
  blockedAuthors: string[];
  allowedAuthors: string[];
  exclude: Record<string, string[]>;
  techOnly: boolean;
  hideEnglish: boolean;
  mustHave: string[];
  mustHaveMode: "any" | "all";
  mustNotHave: string[];
  locations: string[];
  requireLocation: boolean;
  requireSalary: boolean;
  minSalary: number;
  salaryCurrency: string;
  maxExperience: number;
  blockedCompanies: string[];
  allowedCompanies: string[];
  hideIncomplete: boolean;
  flagDuplicates: boolean;
  blockCourses: boolean;
  courseWords: string[];
  courseSaleWords: string[];
  courseDomains: string[];
  blockedDomains: string[];
  mode: "hide" | "collapse";
  debug: boolean;
  weakNeeded: number;
  strong: string[];
  weak: string[];
  blocklist: string[];
  recruitersOnly: boolean;
  recruiterWords: string[];
  techWords: string[];
  fluffNeeded: number;
  fluffStrong: string[];
  baitNeeded: number;
  baitStrong: string[];
  baitWeak: string[];
  fluffWeak: string[];
};

export const JF_DEFAULTS: Settings = {
  enabled: true,
  // Esconde tudo que não for vaga.
  onlyJobs: true,
  // Esconde post de devaneio/ego (funciona também com "só vagas" desligado).
  blockFluff: true,
  // Esconde post pedindo comentário/curtida/marcação ("comenta EU", "marque alguém").
  // Nunca derruba vaga.
  blockBait: true,
  // Esconde anúncio (post "Promovido"/"Promoted"), mesmo que seja de vaga.
  hideSponsored: true,
  // Esconde repost ("Fulano republicou isso"). Nunca derruba vaga.
  hideReposts: false,
  // Autores/empresas: URL do perfil (linkedin.com/in/fulano, /company/acme) ou nome.
  // Bloqueado some sempre; liberado fica sempre (exceto "esconder sempre se tiver").
  blockedAuthors: [],
  allowedAuthors: [],
  // Opções de vaga que NÃO quero ver, por grupo (ids em JF_FACETS, classify.ts).
  exclude: { modality: [], contract: [], seniority: [] },
  // Só vagas de tecnologia (precisa ter alguma palavra de techWords).
  techOnly: false,
  // Esconde vagas escritas em inglês.
  hideEnglish: false,
  // Tecnologias/palavras que a vaga precisa ter. "any": pelo menos uma;
  // "all": todas. Sinônimos contam ("node" pega "Node.js").
  mustHave: [],
  mustHaveMode: "any",
  // Vaga com qualquer uma dessas some.
  mustNotHave: [],
  // Onde quero trabalhar: cidade, estado (SP, "Paraná"), país ou região (LATAM).
  // Vaga sem local fica, a não ser com requireLocation.
  locations: [],
  requireLocation: false,
  // Salário: exigir que a vaga informe; mínimo mensal na moeda escolhida
  // (vaga anual é dividida por 12; moeda diferente não é comparada).
  requireSalary: false,
  minSalary: 0,
  salaryCurrency: "BRL",
  // Esconde vaga que pede mais anos de experiência que isso (0 = desligado).
  // Só conta quando a vaga diz o número.
  maxExperience: 0,
  // Empresas citadas no texto da vaga. Bloqueada some; liberada pula os filtros de vaga.
  blockedCompanies: [],
  allowedCompanies: [],
  // Esconde vaga com menos de 2 informações entre: local/modelo, contratação,
  // senioridade, salário, link ou e-mail de candidatura.
  hideIncomplete: false,
  // Etiqueta "possível vaga repetida" quando o mesmo texto aparece de novo no feed.
  flagDuplicates: true,
  // Esconde venda de curso/mentoria/ebook (produto + sinal de venda). Nunca derruba vaga.
  blockCourses: false,
  courseWords: [
    "curso", "cursos", "mentoria", "mentorias", "ebook", "e-book", "imersao",
    "masterclass", "bootcamp", "treinamento", "formacao", "comunidade vip",
    "comunidade paga", "turma", "workshop", "infoproduto", "metodo"
  ],
  courseSaleWords: [
    "garanta sua vaga", "garanta a sua vaga", "vagas limitadas", "ultimas vagas",
    "inscreva-se", "inscricoes abertas", "matriculas abertas", "matricula",
    "lote", "primeiro lote", "desconto", "cupom", "oferta", "black friday",
    "parcelas", "12x", "link na bio", "link nos comentarios", "compre",
    "adquira", "investimento de", "preco especial", "bonus exclusivo"
  ],
  courseDomains: ["hotmart.com", "kiwify.com.br", "eduzz.com", "monetizze.com.br", "pay.hotmart.com", "lastlink.com"],
  // Esconde post com link para estes domínios (subdomínios incluídos). Até vaga.
  blockedDomains: [],
  // "hide": some de vez | "collapse": deixa uma barrinha com botão "mostrar"
  mode: "collapse",
  // Mostra uma etiqueta em cada post que ficou dizendo por que ele ficou.
  debug: false,
  // Quantas palavras fracas DIFERENTES o post precisa ter para ficar.
  // "emprego" e "empregos" contam como uma só.
  weakNeeded: 2,
  // Uma só já basta para o post ficar.
  strong: [
    "vaga", "vagas", "vaga aberta", "vagas abertas", "vaga remota",
    "estamos contratando", "contratando", "contrata-se", "precisa-se",
    "estamos a recrutar", "a recrutar", "estamos a contratar",
    "procura-se", "estamos selecionando", "banco de talentos",
    "posicao aberta", "posicoes abertas", "oportunidade de emprego",
    "processo seletivo", "candidate-se",
    "envie seu curriculo", "envie seu cv", "mande seu cv",
    "link para candidatura", "link da vaga", "aplique aqui",
    "junte-se ao nosso time", "venha fazer parte do nosso time",
    "faca parte do nosso time", "regime de contratacao", "faixa salarial",
    "we're hiring", "we are hiring", "now hiring", "is hiring",
    "job opening", "job opportunity", "open position",
    "open role", "apply now", "apply here", "how to apply",
    "send your resume", "send your cv", "join our team",
    "#vaga", "#vagas", "#vagasti", "#vagastech", "#vagasdev", "#vagasabertas",
    "#contratando", "#recrutamento", "#hiring", "#nowhiring", "#jobopening",
    "#remotejobs", "#vagaremota", "#vagati", "#vagasdeti"
  ],
  // Sozinhas não bastam: aparecem demais em post que não é vaga.
  weak: [
    "oportunidade", "oportunidades", "emprego", "empregos",
    "buscamos", "procuramos", "estamos buscando", "estamos procurando",
    "contratamos", "recrutando", "recrutamento", "selecionando",
    "candidatar", "candidatura", "candidaturas", "inscreva-se", "inscricoes abertas", "curriculo",
    "venha trabalhar", "time esta crescendo", "junte-se a nos",
    "requisitos", "diferenciais", "responsabilidades", "atribuicoes",
    "beneficios", "remuneracao", "salario", "clt", "contrato pj",
    "modelo de trabalho", "100% remoto", "trabalho remoto", "home office",
    "hibrido", "presencial", "estagio", "estagiario", "estagiaria",
    "trainee", "jovem aprendiz", "freela", "temporario",
    "hiring", "job", "jobs", "opportunity", "open roles", "open positions", "we're looking for",
    "we are looking for", "join us", "requirements", "responsibilities",
    "salary", "benefits", "full-time", "full time", "part-time", "part time",
    "internship", "remote", "fully remote", "hybrid", "on-site",
    "#oportunidade", "#oportunidades", "#emprego", "#empregos",
    "#estagio", "#trainee", "#job", "#jobs"
  ],
  // Se o post tiver qualquer uma dessas, é escondido mesmo com palavra de vaga.
  blocklist: [],
  // "Só recrutadores": além de ser vaga, quem postou precisa ter uma dessas
  // no título do perfil. Posts de página de empresa somem nesse modo.
  recruitersOnly: false,
  recruiterWords: [
    "recruiter", "tech recruiter", "it recruiter", "technical recruiter",
    "recrutador", "recrutadora", "recrutamento", "recrutamento e selecao",
    "r&s", "headhunter", "head hunter", "hunter", "tech hunter",
    "talent acquisition", "talent partner", "talent sourcer", "sourcer",
    "aquisicao de talentos", "atracao de talentos", "atracao e selecao",
    "people partner", "hrbp", "hr business partner", "human resources",
    "recursos humanos", "rh", "analista de rh", "gestao de pessoas",
    "hiring manager", "staffing"
  ],
  techWords: [
    "dev", "devs", "desenvolvedor", "desenvolvedora", "developer", "programador",
    "programadora", "software", "engineer", "engenheiro de software",
    "engenheira de software", "frontend", "front-end", "front end", "backend",
    "back-end", "back end", "fullstack", "full stack", "full-stack", "mobile",
    "android", "ios", "react", "react native", "angular", "vue", "node", "node.js",
    "java", "kotlin", "swift", "python", "golang", ".net", "c#", "php", "ruby",
    "typescript", "javascript", "devops", "sre", "cloud", "aws", "azure", "gcp",
    "kubernetes", "dados", "data", "analytics", "bi", "machine learning", "ml",
    "ia", "ai", "llm", "qa", "testes", "tester", "ux", "ui", "product designer",
    "product manager", "product owner", "scrum", "ti", "t.i", "tecnologia", "tech",
    "infraestrutura", "seguranca da informacao", "cybersecurity", "appsec",
    "sap", "erp", "salesforce", "protheus", "sistemas", "sql"
  ],
  // Devaneio: uma frase forte já basta; fracas precisam de fluffNeeded
  // diferentes (e nunca derrubam vaga, só as fortes).
  fluffNeeded: 3,
  fluffStrong: [
    "fui demitido", "fui demitida", "pedi demissao", "recusei uma proposta",
    "recusei a proposta", "licao de lideranca", "licoes de lideranca",
    "meu filho me ensinou", "minha filha me ensinou", "o que aprendi com meu filho",
    "o que aprendi com minha filha", "o porteiro me ensinou", "motorista de uber",
    "saia da zona de conforto", "sai da zona de conforto", "nunca desista",
    "deus no comando", "gratidao a deus", "isso mudou minha vida", "chorei",
    "opiniao impopular", "humbled to announce", "thrilled to announce",
    "unpopular opinion", "never give up", "hot take",
    "this changed my life", "i got fired", "i was fired", "i was laid off"
  ],
  // Caça-engajamento: uma forte basta; fracas (pergunta solta) precisam de
  // baitNeeded diferentes. "Comenta PALAVRA que eu te mando" é detectado à parte.
  baitNeeded: 2,
  baitStrong: [
    "comenta eu", "comente eu", "comenta quero", "comente quero", "digite eu",
    "digite quero", "escreva eu", "escreva quero", "comente para receber",
    "comenta para receber", "comente e receba", "comenta que eu te mando",
    "comente que eu te mando", "marque alguem", "marque um amigo",
    "marque uma amiga", "marque quem", "marca alguem", "marca quem",
    "deixe seu like", "deixa seu like", "curta e compartilhe",
    "repost se", "♻️ repost", "♻️ compartilhe", "me siga para mais",
    "tag someone", "tag a friend", "comment yes", "type yes",
    "comment below to get", "follow me for more", "like and share", "like and reshare",
    "like and repost", "curte e compartilha"
  ],
  baitWeak: [
    "concorda?", "concordam?", "voce concorda?", "o que voce acha?",
    "o que voces acham?", "comenta aqui", "comente aqui", "deixe nos comentarios",
    "conta nos comentarios", "me conta nos comentarios", "curte se", "compartilhe se",
    "agree?", "thoughts?", "what do you think?", "let me know in the comments",
    "drop a comment", "♻️"
  ],
  fluffWeak: [
    "gratidao", "grato", "grata", "humildade", "jornada", "mindset", "proposito",
    "resiliencia", "lideranca", "licao", "licoes", "aprendi", "sucesso",
    "disciplina", "sonho", "acredite", "inspiracao", "motivacao", "transformacao",
    "conquista", "orgulho", "vulnerabilidade", "feliz em compartilhar",
    "happy to share", "excited to share", "journey", "grateful", "blessed",
    "lessons", "leadership", "humble", "motivation", "hustle", "success", "dream"
  ]
};
