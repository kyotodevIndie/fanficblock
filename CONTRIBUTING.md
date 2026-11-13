# Como contribuir com o FanficBlock

Valeu por querer ajudar! 💜 Dá pra contribuir de vários jeitos, e nem todos
precisam de código.

- [Reportar um post que o filtro errou](#-reportar-um-post-que-o-filtro-errou)
- [Sugerir uma fanfic nova ou um filtro](#-sugerir-uma-fanfic-nova-ou-um-filtro)
- [Mandar código](#-mandar-código)
- [Princípios do projeto](#-princípios-do-projeto)
- [Onde mexer em cada coisa](#-onde-mexer-em-cada-coisa)
- [Testes](#-testes)
- [Abrindo o pull request](#-abrindo-o-pull-request)

## 🐛 Reportar um post que o filtro errou

Esse é o tipo de ajuda mais valioso. O erro pode ser de dois jeitos:

- **Falso positivo:** uma vaga (ou um post que você queria ver) sumiu.
- **Falso negativo:** uma fanfic passou pelo filtro.

Como reportar:

1. No painel da extensão, ligue **Avançado → Mostrar motivo**. Assim cada
   post mostra por que ficou ou sumiu.
2. Abra uma [issue](../../issues/new/choose) com o modelo **"O filtro
   errou"** e conte:
   - o texto do post (ou o trecho que importa);
   - o que aconteceu e o que deveria ter acontecido;
   - o motivo que apareceu;
   - os filtros que estavam ligados.
3. Quer mandar vários posts de uma vez? Use **Geral → Exportar posts do
   feed** (.md ou .json) e anexe o arquivo.

> ⚠️ **Proteja as outras pessoas.** O export traz nome, título e texto de
> quem postou. Antes de anexar numa issue pública, troque nomes, perfis,
> e-mails e telefones por fictícios ("Fulano Silva", `in/fulano`), ou mande
> só o texto do post.

## 💡 Sugerir uma fanfic nova ou um filtro

Viu um padrão de fanfic que se repete ("não é sobre X, é sobre Y", "deixa
eu te contar uma história")? Abra uma issue com o modelo **"Ideia"** e
mande:

- a frase ou o padrão;
- 2 ou 3 exemplos reais (sem o nome de quem postou);
- se ele aparece também em vaga de verdade. Isso é importante: o filtro não
  pode derrubar vaga por causa de uma palavra comum.

## 🛠️ Mandar código

O projeto é JavaScript puro: **sem build, sem npm install, sem
dependências**. Você só precisa de:

- Chrome (ou outro navegador baseado nele);
- [Node.js](https://nodejs.org) 18 ou mais novo, pra rodar os testes;
- Python 3, só se for mexer nos mocks (servidor local) ou no Pix.

```bash
git clone https://github.com/kyotodevIndie/fanficblock.git
cd fanficblock
node test/run.js
```

Pra ver a extensão rodando:

1. `chrome://extensions` → **Modo do desenvolvedor** → **Carregar sem
   compactação** → escolha a pasta.
2. Depois de mudar o código, clique em recarregar na extensão e recarregue a
   aba do LinkedIn.

Pra testar sem LinkedIn (mais rápido e sem mexer na sua conta):

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Depois abra no navegador:

- `http://127.0.0.1:8765/test/mock-feed-sdui.html`: feed falso no formato
  novo do LinkedIn (aceita `?rec` e `?block=in/fulano`);
- `http://127.0.0.1:8765/test/mock-feed.html`: feed falso no formato antigo;
- `http://127.0.0.1:8765/test/popup-preview.html`: o painel fora da extensão
  (`?demo` preenche as estatísticas).

## 🧭 Princípios do projeto

Toda mudança precisa respeitar estes pontos. Se uma ideia esbarra em algum
deles, vale abrir uma issue antes pra gente conversar.

1. **Tudo local e privado.** Nada sai do navegador: nada de servidor,
   analytics, chamada de API ou IA remota.
2. **Só as permissões necessárias.** Hoje é só `storage`. Permissão nova
   precisa de um motivo muito bom.
3. **Sem biblioteca pesada.** Se dá pra fazer em 30 linhas, faça em 30
   linhas.
4. **Na dúvida, a vaga fica.** Esconder uma vaga boa é pior do que deixar
   passar uma fanfic. Regra nova que pode derrubar vaga precisa de teste
   provando que vaga comum continua passando.
5. **Desconhecido não é negativo.** O que o post não diz (salário, local,
   anos) conta como desconhecido, nunca como "não atende".
6. **Nunca afirmar certeza.** O filtro não diz que um post é mentira,
   escrito por IA ou vaga fantasma. Ele diz o que encontrou ("possível vaga
   repetida", "vendedor de curso").
7. **Não guardar texto de post.** As estatísticas guardam só números e
   hashes curtos, com histórico limitado.
8. **Não remover recurso em silêncio.** Se algo sai ou muda de lugar, isso
   fica escrito no PR e no README.

## 🗂️ Onde mexer em cada coisa

| Quero... | Arquivo |
| --- | --- |
| Mudar as palavras e frases de cada filtro | `defaults.js` |
| Mudar como um post é classificado (fica ou some) | `classify.js` |
| Ler local, salário, experiência ou domínio do texto | `extract.js` |
| Mexer em como os posts são achados ou escondidos no feed | `content.js` / `content.css` |
| Mexer no painel | `popup.html` / `popup.css` / `popup.js` |
| Mexer no gerador de query | `query.js` |
| Mexer nas estatísticas | `stats.js` |

`classify.js`, `extract.js`, `query.js` e `stats.js` não usam DOM: dá pra
testar tudo no Node. Lógica nova vai nesses arquivos sempre que possível. O
`content.js` só encontra os posts, extrai o texto e esconde.

A referência completa (cada filtro, a ordem das regras e como o feed é
lido) está em [docs/COMO-FUNCIONA.md](docs/COMO-FUNCIONA.md).

### Estilo

- JavaScript puro, sem build. Funções e constantes globais com prefixo
  `jf` / `JF_` (os scripts da extensão dividem o mesmo escopo).
- Textos da interface e comentários em português, curtos e diretos.
- Siga o jeito do código em volta: nomes, densidade de comentário, formato.
- O painel segue o visual do shadcn (zinc escuro). Reaproveite as classes
  que já existem (`.card`, `.item`, `.switch`, `.segmented`, `.chip`,
  `.btn`).

## ✅ Testes

```bash
node test/run.js
```

Tem que terminar sem nenhum `FALHOU`. Toda mudança no filtro precisa de
teste. Escolha o lugar certo:

- **Post de exemplo simples:** crie um arquivo em `test/posts/`. Se o nome
  começa com `sim-`, o post deve ficar; se começa com `nao-`, deve sumir.
- **Regra com configuração:** adicione uma linha nas listas de
  `test/run.js` (`cases`, `phase1`, `phase2`), no formato
  `[nome, texto, ajustes, deve ficar?, meta]`.
- **Post como aparece no feed real:** adicione um bloco em
  `test/feed-sdui.txt`, começando com `Feed post` e
  `#EXPECT sim|nao [rec]`, **sempre com nomes fictícios**.

Se a mudança mexe no feed ou no painel, teste também nos mocks e na prévia,
e diga no PR o que você testou no LinkedIn de verdade.

## 📬 Abrindo o pull request

1. Faça um fork e crie um branch: `git checkout -b filtro-coach-quantico`.
2. Faça a mudança, com testes.
3. Rode `node test/run.js`.
4. Se mudou algo que a pessoa usuária vê, atualize o README ou o
   `docs/COMO-FUNCIONA.md`.
5. Abra o PR contando o que mudou, por quê e como você testou. O modelo de
   PR tem um checklist.

PR pequeno é revisado mais rápido. Se a ideia é grande, abra uma issue antes.

## 📜 Licença das contribuições

O projeto usa a [PolyForm Noncommercial 1.0.0](LICENSE). Ao mandar uma
contribuição, você concorda que ela seja distribuída sob a mesma licença.

## 🫶 Convivência

Seja gentil. Crítica ao código é bem-vinda; ataque a pessoas, não. Aqui
ninguém precisa de textão motivacional: a gente já tem o LinkedIn pra isso.
