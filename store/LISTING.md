# Ficha das lojas

Textos e respostas prontos para copiar e colar na **Chrome Web Store** e no
**Microsoft Edge Add-ons**. Pacote: `tools/pack.sh` (gera
`dist/fanficblock-<versão>.zip`). Imagens: `tools/store-assets.sh`.

## Arquivos

| Campo | Arquivo | Tamanho |
| --- | --- | --- |
| Pacote | `dist/fanficblock-0.1.1.zip` | — |
| Ícone da loja | `icons/icon-128.png` | 128×128 |
| Capturas de tela | `store/screenshot-1.png` a `store/screenshot-4.png` | 1280×800 |
| Bloco promocional pequeno | `store/promo-small.png` | 440×280 |
| Bloco de destaque (marquee) | `store/promo-marquee.png` | 1400×560 |

## Dados gerais

- **Nome:** FanficBlock
- **Idioma:** Português (Brasil)
- **Categoria:** Produtividade (na Chrome Web Store, a subcategoria mais
  próxima de "ferramentas"; no Edge, "Productivity")
- **Site:** https://github.com/kyotodevIndie/fanficblock
- **Suporte:** https://github.com/kyotodevIndie/fanficblock/issues
- **Política de privacidade:**
  https://github.com/kyotodevIndie/fanficblock/blob/main/PRIVACY.md
- **Preço:** gratuito
- **Público adulto:** não

## Resumo (até 132 caracteres)

```
Tira as fanfics corporativas do seu feed do LinkedIn e deixa só o que importa: vaga.
```

## Descrição

```
Chega de fanfic corporativa.

Você abre o LinkedIn atrás de vaga e encontra a lição de liderança que alguém aprendeu com o cachorro, o "comenta GUIA que eu te mando no privado", o curso de R$ 997 com "vagas limitadas"... e a vaga que você queria lá embaixo, se tiver sorte.

O FanficBlock limpa o seu feed:

📭 SÓ VAGAS
Esconde tudo que não é vaga de emprego. Tem também um modo que só deixa vaga postada por recrutador.

🦄 ANTIFANFIC
Barra devaneio motivacional, caça-engajamento ("comenta EU"), vendedor de curso, post patrocinado e repost.

🎯 VAGAS DO SEU JEITO
Filtre por tecnologia, senioridade, modelo (remoto, híbrido, presencial), contratação (CLT, PJ, freela), localização, salário mínimo, anos de experiência e empresas bloqueadas ou favoritas.

🔎 GERADOR DE QUERY
Escolha as opções e ele monta a busca booleana do LinkedIn, como (React OR Node) AND pleno NOT estágio, e coloca direto no campo de busca. É só apertar Enter.

📊 FANFICÔMETRO
Veja quantas fanfics você deixou de ler hoje, na semana e no total, por categoria, e quanto tempo isso te poupou.

👀 VOCÊ NO CONTROLE
O post escondido some de vez ou vira uma barrinha com o motivo e o botão "Mostrar". Mostrou e se arrependeu? "Esconder de novo".

🔒 PRIVACIDADE DE VERDADE
• Tudo roda no seu navegador: nenhum post, nome ou clique sai do seu computador.
• Sem servidor, sem analytics, sem rastreador.
• Uma permissão só (storage), para lembrar das suas configurações.
• As estatísticas guardam só números, nunca o texto dos posts.

Na dúvida, a vaga fica: o filtro foi feito para não esconder vaga boa. E ele nunca afirma que um post é falso ou que uma vaga é fantasma; só diz por que escondeu.

Código aberto para uso não comercial: https://github.com/kyotodevIndie/fanficblock

O FanficBlock é um projeto independente e não tem relação com o LinkedIn.
```

## Práticas de privacidade (Chrome Web Store)

**Finalidade única:**

```
Filtrar o feed do LinkedIn: esconder posts que não são vagas de emprego ou que são conteúdo de baixo valor (motivacional, caça-engajamento, venda de curso, anúncio, repost), conforme as preferências do usuário, e ajudar a montar buscas de vagas.
```

**Justificativa da permissão `storage`:**

```
Guardar localmente as configurações do usuário (filtros ligados, listas de palavras, autores e empresas) e as estatísticas de posts escondidos (só contagens e hashes curtos, sem texto de posts).
```

**Justificativa do acesso ao site (content script em https://www.linkedin.com/*):**

```
A extensão precisa ler o texto dos posts do feed do LinkedIn, na própria página, para decidir quais esconder, e escrever a busca montada pelo usuário no campo de pesquisa. Ela só roda no LinkedIn e nada é enviado para fora do navegador.
```

**Código remoto:** Não, não uso código remoto. Todo o JavaScript vem
dentro do pacote.

**Uso de dados:** não marque nenhuma categoria. A extensão não coleta nem
transmite dados do usuário: o texto do feed é lido e processado só na
página, no computador do usuário. Marque as três declarações:

- não vendo nem transfiro dados de usuários a terceiros, fora dos casos
  de uso aprovados;
- não uso nem transfiro dados de usuários para fins não relacionados à
  finalidade única do item;
- não uso nem transfiro dados de usuários para determinar
  capacidade de crédito ou para fins de empréstimo.

## Observações para a revisão (campo opcional)

```
A extensão funciona só no feed do LinkedIn (www.linkedin.com/feed). Para testar: instale, abra o feed e clique no ícone. "Só vagas" esconde posts que não são vagas; com "Post escondido = Recolhido", cada post escondido vira uma barra com o motivo e o botão "Mostrar". Não há login, servidor nem coleta de dados.
```

## Edge Add-ons (Partner Center)

Use os mesmos textos acima. Campos a mais:

- **Descrição curta:** o mesmo resumo de 132 caracteres.
- **Palavras de busca** (até 7):
  `linkedin`, `vagas`, `emprego`, `filtro de feed`, `job search`,
  `bloqueador`, `produtividade`
- **Notas para certificação:** o mesmo texto de "Observações para a
  revisão".
