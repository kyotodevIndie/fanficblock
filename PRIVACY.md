# Política de privacidade do FanficBlock

_Última atualização: 13 de novembro de 2026_

O FanficBlock foi feito pra não saber nada sobre você.

## O que a extensão lê

Ela lê o texto dos posts **do feed do LinkedIn aberto no seu navegador**,
pra decidir se cada post fica ou some. Essa leitura acontece só na página,
no seu computador, e não é enviada a ninguém.

## O que a extensão guarda

Tudo fica no armazenamento da própria extensão (`chrome.storage`), no seu
navegador:

- **Suas configurações:** filtros ligados, listas de palavras, autores e
  empresas. Se a sincronização do Chrome estiver ligada, o próprio Chrome
  pode sincronizar essas configurações entre os seus dispositivos.
- **Estatísticas:** quantidades de posts escondidos por dia e por
  categoria, nos últimos 30 dias, e até 1000 hashes curtos (uma "impressão
  digital" do começo do post, só pra não contar o mesmo post duas vezes). O
  texto dos posts **nunca** é guardado.
- **O estado do gerador de busca:** as opções que você escolheu.

## O que a extensão não faz

- Não envia dados a nenhum servidor: não tem servidor.
- Não usa analytics, cookies de rastreamento nem anúncios.
- Não vende nem compartilha dados.
- Não lê nada fora do LinkedIn.

## Export de posts

O botão **Exportar posts do feed** gera um arquivo (.md ou .json) com os
posts carregados na aba e **baixa direto no seu computador**. Nada é enviado
a lugar nenhum. O arquivo traz nomes e textos de outras pessoas: cuide dele
como cuidaria de um print.

## Permissões

- `storage`: guardar as configurações e as estatísticas.
- Acesso a `linkedin.com`: ler e esconder posts do feed.

## Como apagar tudo

- **Estatísticas:** painel → Estatísticas → **Zerar estatísticas**.
- **Configurações:** painel → Avançado → **Restaurar padrão**.
- **Tudo:** remova a extensão em `chrome://extensions`.

## Contato

Dúvidas? Abra uma issue em
<https://github.com/kyotodevIndie/fanficblock/issues>.
