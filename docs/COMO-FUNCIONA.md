# Como o FanficBlock funciona

Referência completa: cada filtro, a ordem em que as regras decidem, como os
posts são lidos do feed e o papel de cada arquivo. Para começar a contribuir,
veja o [CONTRIBUTING.md](../CONTRIBUTING.md).

## Filtros, um por um

**Geral**
- **Só vagas**: esconde o que não for vaga. É vaga se tiver link de vaga do
  LinkedIn, uma palavra **forte** ("estamos contratando", "vaga", "#vagasti") ou
  2 palavras **fracas** diferentes ("oportunidade", "CLT", "benefícios").
- **Post escondido**: **Oculto** (some de vez) ou **Recolhido** (vira uma
  barrinha com "Mostrar"). O "Mostrar" lembra do post pelo conteúdo, porque o
  LinkedIn recria os cards, e troca a barrinha por "Esconder de novo". Card
  que o próprio LinkedIn deixa invisível (anúncio descartado) fica recolhido
  sem barrinha.
- **Exportar posts do feed**: baixa 10, 30, 50, 100 ou todos os posts
  carregados na aba em .md (para ler) ou .json (para script), com o motivo
  de cada um ficar ou sumir.

**Estatísticas (Fanficômetro)**: posts escondidos hoje, nos últimos 7 dias e
no total, por categoria (não era vaga, devaneio, caça-engajamento, anúncio,
vendedor de curso, repost, bloqueios, vaga fora do filtro). Tempo poupado =
posts escondidos × 8 s (estimativa de ler o começo de um post e rolar). Cada
post conta uma vez (hash curto do autor + começo do texto). Fica no
`storage.local`: só números e hashes, nunca o texto; guarda 30 dias e os
últimos 1000 hashes. Grava em lote a cada 3 s, não a cada post.

**Vagas** (com "Só vagas" ligado)
- **Só recrutadores**, **Só tecnologia**, **Esconder vagas em inglês** (conta
  palavras comuns de cada língua depois de tirar links, hashtags e termos
  técnicos: vaga PT cheia de "React, cloud, deploy" não vira inglês).
- **Não mostrar** por modelo, contratação e senioridade. A vaga some se tudo
  que foi detectado nela está marcado ("CLT ou PJ" só some com os dois).
  Vaga híbrida que cita "remoto" conta só como híbrida. Vaga que não diz o
  modelo não some por esse filtro (ausente ≠ incompatível).
- **Precisa ter** (pelo menos uma / todas) e **Não pode ter**. Sinônimos
  contam: "node" pega Node.js, ".net" pega dotnet; C#, C++ e React Native
  funcionam como termos inteiros ("C#" não pega "C", "java" não pega
  "JavaScript").
- **Localização**: cidades, estados (UF ou nome), países ou regiões (LATAM,
  Europa). Compara pela hierarquia: "SP" aceita Barueri; vaga que diz só
  "Brasil" serve para quem quer SP; vaga **remota** vale pelo país/região
  ("Remote LATAM" serve para SP). Nome de lugar só conta com maiúscula
  ("feliz natal" não é Natal/RN). Vaga sem local fica, a não ser com
  **Esconder vaga sem localização** (remoto conta como local).
- **Salário**: "Só com salário informado" e mínimo por mês com moeda.
  Reconhece R$/US$/€/£, faixas ("R$ 8.000 a R$ 10.000", "60k–80k"), "mil" e
  período (mês, ano, hora). Anual ÷ 12, hora × 160. Moeda diferente não é
  comparada (precisaria de cotação) e conta como desconhecido. Benefício
  colado no valor (VR, VA, ajuda de custo, PLR) não é salário. Na faixa,
  vale o teto: some só se até o teto for menor que o mínimo.
- **Máximo de anos de experiência**: só conta número perto de
  "experiência"/"experience" ("empresa com 20 anos de mercado" não conta).
  Em "3 a 5 anos", vale 3.
- **Empresas bloqueadas / favoritas**: pelo nome no texto da vaga. Favorita
  pula os filtros de vaga.
- **Esconder vaga sem informação**: precisa de 2 entre local/modelo,
  contratação, senioridade, salário e link/e-mail de candidatura.
- **Marcar vaga repetida**: etiqueta "possível vaga repetida" quando um post
  com o mesmo texto já apareceu na aba (só em memória). É só um aviso: não
  quer dizer que a vaga é fantasma.

**Antifanfic**
- **Bloquear devaneio**: "fui demitido e agradeci", "lição de liderança",
  "não é sobre X, é sobre Y". Uma frase forte basta; palavras fracas
  ("gratidão", "jornada") precisam ser 3 e nunca derrubam vaga.
- **Caça-engajamento**: "Comenta EU", "comenta \"GUIA\" que eu te mando",
  "marque alguém", "curte e compartilha". Pergunta solta ("Concorda?") é fraca:
  sozinha não derruba ninguém. Nunca derruba vaga — tem recrutador que pede
  "comenta VAGA" e a vaga é real.

**Conteúdo**
- **Vendedor de curso**: curso/mentoria/ebook/imersão **e** sinal de venda
  (preço, "garanta sua vaga", lote, cupom, link na bio) ou link de plataforma
  (Hotmart, Kiwify, Eduzz...). Conteúdo gratuito sem preço fica. Nunca derruba
  vaga — e "garanta sua vaga" não conta como palavra de vaga.
- **Domínios bloqueados**: post com link para o domínio (ou subdomínio) some,
  até vaga. Desembrulha o `linkedin.com/safety/go` e lê domínio escrito no
  texto. Normaliza `https://www.exemplo.com/x` para `exemplo.com`; não pega
  domínio parecido (`meuexemplo.com`).
- **Posts patrocinados**: esconde post com "Promovido"/"Promoted" no cabeçalho
  (lido do texto do card, não de classe CSS). Derruba até anúncio de vaga.
- **Reposts**: esconde "Fulano republicou isso". Repost de vaga fica.
- **Autores e empresas bloqueados / Sempre mostrar**: um por linha. Use o link
  do perfil (`linkedin.com/in/fulano`, `linkedin.com/company/acme`) — o id do
  link não muda, o nome sim. Nome também funciona, comparado com nome + título.

**Avançado**: mostrar motivo, "Esconder sempre se tiver", todas as listas de
palavras, quantas fracas são necessárias e restaurar padrão.

O painel tem busca e mostra quantos filtros estão ativos. Tudo salva sozinho.

## Ordem de precedência

A primeira regra que decide, decide (`jfClassify` em [`classify.js`](../classify.js)):

1. **Esconder sempre se tiver** → some (até vaga e autor liberado)
2. **Autor/empresa bloqueado** → some (até vaga)
3. **Domínio bloqueado** → some (até vaga)
4. **Sempre mostrar** → fica, pula o resto
5. **Patrocinado** → some
6. **Devaneio** → some (vaga só cai com frase forte)
7. **Caça-engajamento** → some (nunca vaga)
8. **Vendedor de curso** → some (nunca vaga)
9. **Repost** → some (nunca vaga)
10. **Só vagas** → o que não é vaga some
11. **Empresa bloqueada** some; **empresa favorita** fica e pula o resto
12. **Filtros de vaga** → recrutador, modelo, contratação, senioridade,
    tecnologia, idioma, precisa ter / não pode ter, local, salário,
    experiência, informação mínima

Campo que a vaga não informa é **desconhecido**, não negativo: vaga sem
salário não cai pelo salário mínimo, vaga sem local não cai pela
localização, vaga sem anos não cai pela experiência — só as opções "exigir"
derrubam por falta de informação.

## Como os posts são lidos

- **Feed novo (SDUI)**: sem classes legíveis. Cada post começa com um título
  invisível "Feed post"; a extensão sobe dele até o card. Dentro do card a ordem
  é fixa — cabeçalho ("Fulano curtiu", autor, título do perfil), horário ("4h")
  ou "Promovido", texto, números de reação, comentários — então até o horário é
  cabeçalho, depois das reações é comentário (`jfSegment`). O perfil do autor é
  o último link `/in/` ou `/company/` antes do horário.
- **Feed antigo**: atributos `data-urn` e classes `update-components-*`.
- Só o texto do post conta para "é vaga?": título do perfil e comentários ficam
  de fora.

## Arquivos

| Arquivo | O que faz |
| --- | --- |
| `manifest.json` | Configuração da extensão (Manifest V3, só permissão `storage`) |
| `defaults.js` | Configuração padrão e listas de palavras |
| `extract.js` | Extrai local, salário, anos de experiência e domínios do texto |
| `classify.js` | Decide se um post fica (sem DOM, testável no Node) |
| `stats.js` | Fanficômetro: categorias, contagem por dia, tempo poupado |
| `query.js` | Gerador de busca do LinkedIn (AND/OR/NOT) do painel |
| `support.js` / `icons/pix-qr.svg` | Pix do card de apoio, gerados por `tools/pix.py` |
| `tools/pix.py` | Gera o Pix: `pip install segno` e `python3 tools/pix.py --key ... --name ... --city ...` |
| `content.js` | Encontra os posts, extrai texto/autor/cabeçalho, esconde |
| `content.css` | Barrinha "Mostrar" e etiqueta de motivo no feed |
| `popup.html` / `popup.css` / `popup.js` | Painel (shadcn, zinc escuro) |
| `icons/` | Ícones gerados do logo transparente |
| `test/run.js` | Testes: `node test/run.js` |
| `test/posts/` | Posts de exemplo: `sim-*` ficam, `nao-*` somem |
| `test/feed-sdui.txt` | Posts do feed real (resumidos, nomes fictícios) com o resultado esperado |
| `test/mock-feed.html` | Feed falso no formato antigo |
| `test/mock-feed-sdui.html` | Feed falso no formato novo (`?rec`, `?block=in/fulano`) |
| `test/popup-preview.html` | Prévia do painel fora da extensão (`?demo`) |

Para os mocks e a prévia: `python3 -m http.server` na pasta do projeto e abra
`/test/<arquivo>.html` (a prévia aceita `?demo` para números de exemplo nas
estatísticas).
