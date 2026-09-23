# Dashboard

## Objetivo

Definir o comportamento do Dashboard do TrackLink como area protegida
onde o usuario autenticado visualiza e gerencia seus proprios
trackings.

## Escopo

O Dashboard MUST permitir que o usuario autenticado:

- visualize os trackings pertencentes a sua conta;
- inicie o fluxo para criar um novo compartilhamento de localizacao;
- acesse um tracking existente;
- encerre um tracking ativo do qual seja proprietario;
- veja estados coerentes de carregamento, lista vazia e erro.

O Dashboard MUST usar o endpoint existente:

```http
GET /api/tracking/my
```

para carregar os trackings do usuario autenticado.

O Dashboard MUST usar o endpoint existente:

```http
DELETE /api/tracking/{token}
```

para encerrar um tracking ativo pertencente ao usuario autenticado.

## Comportamentos Esperados

### Acesso autenticado

O Dashboard MUST ser acessivel somente para usuarios autenticados.

Quando um usuario nao autenticado tentar acessar o Dashboard, o
frontend MUST redireciona-lo para:

```text
/login
```

O Dashboard MUST NOT implementar uma logica independente de
autenticacao. Ele MUST depender do comportamento definido em
`specs/authentication.md` para determinar se existe uma sessao
autenticada e para enviar o access token em requisicoes protegidas.

### Carregamento dos trackings

Ao ser acessado por um usuario autenticado, o Dashboard MUST carregar
os trackings pertencentes ao usuario utilizando:

```http
GET /api/tracking/my
```

A requisicao MUST ser autenticada com o access token conforme definido
em `specs/authentication.md`.

O Dashboard MUST NOT exibir trackings de outros usuarios.

O Dashboard SHOULD preservar a ordenacao retornada pela API, a menos
que uma regra de produto diferente seja definida.

### Estados dos trackings

Quando os dados retornados pela API permitirem, o Dashboard MUST
distinguir entre:

- tracking ativo;
- tracking inativo;
- tracking expirado.

Com o contrato atual do backend, a classificacao SHOULD considerar:

- tracking ativo: `isActive` verdadeiro e `expiresAt` posterior ao
  horario atual;
- tracking inativo: `isActive` falso;
- tracking expirado: `expiresAt` igual ou anterior ao horario atual.

Quando um tracking puder ser classificado como inativo e expirado ao
mesmo tempo, a precedencia de exibicao do estado ainda e `TBD`.

### Novo compartilhamento

O Dashboard MUST oferecer uma acao para iniciar um novo
compartilhamento de localizacao.

Essa acao SHOULD direcionar o usuario para o fluxo definido pela spec
de compartilhamento de localizacao.

O Dashboard MUST NOT definir nesta spec o contrato de criacao,
captura de localizacao ou atualizacao continua de posicao.

### Acesso a tracking existente

O Dashboard MUST permitir que o usuario acesse um tracking existente
a partir da lista de trackings carregada.

O identificador usado para acesso SHOULD ser o `token` retornado pela
API.

O destino exato ao acessar um tracking existente e `TBD`.

### Encerramento de tracking

O Dashboard MUST permitir que o proprietario encerre um tracking ativo.

Para encerrar um tracking, o frontend MUST chamar:

```http
DELETE /api/tracking/{token}
```

O `token` usado na URL MUST ser o token do tracking selecionado.

O frontend MUST NOT permitir a tentativa de encerramento quando nao
houver um token disponivel para o tracking.

Quando o encerramento for concluido com sucesso, o Dashboard MUST
atualizar o estado exibido para que o tracking nao continue aparecendo
como ativo.

A estrategia de atualizacao apos encerramento e `TBD`: a aplicacao
pode recarregar a lista via `GET /api/tracking/my` ou atualizar o
estado localmente, desde que a exibicao final fique consistente com a
API.

## Estados e Erros

O Dashboard MUST apresentar um estado de loading enquanto os trackings
do usuario estiverem sendo carregados.

Quando `GET /api/tracking/my` retornar uma lista vazia, o Dashboard
MUST apresentar um estado de lista vazia.

Se a carga dos trackings falhar, o Dashboard MUST apresentar um estado
de erro e MUST permitir que o usuario tente carregar novamente.

Se a API responder que a sessao nao e valida ou nao esta autorizada,
o frontend MUST aplicar o comportamento de sessao definido em
`specs/authentication.md`.

Durante o encerramento de um tracking, o Dashboard SHOULD evitar
multiplas tentativas simultaneas de encerramento para o mesmo token.

Se `DELETE /api/tracking/{token}` falhar, o Dashboard MUST informar
que o tracking nao foi encerrado e MUST NOT exibir o encerramento como
concluido.

Se `DELETE /api/tracking/{token}` retornar que o tracking nao foi
encontrado, a mensagem e a estrategia de reconciliacao da lista ainda
sao `TBD`.

Mensagens de erro MUST NOT expor tokens completos, stack traces ou
detalhes internos da API.

## Dependências e Decisões Pendentes

- TBD: destino exato ao acessar um tracking existente.
- TBD: precedencia visual/comportamental quando um tracking estiver
  inativo e expirado ao mesmo tempo.
- TBD: estrategia de atualizacao apos encerramento: recarregar a lista
  ou atualizar estado localmente.
- TBD: mensagem e reconciliacao da lista quando o encerramento retornar
  tracking nao encontrado.
- TBD: formato das mensagens apresentadas ao usuario.
- TBD: quais campos de tracking, alem de estado e token, devem ser
  exibidos no Dashboard.

## Fora de Escopo

Esta especificacao nao define:

- layout visual, cores, cards, icones ou biblioteca de UI;
- componentes Angular;
- services Angular;
- guards Angular;
- rotas Angular;
- interceptors;
- estrategia de armazenamento de tokens;
- criacao tecnica de um tracking;
- captura, permissao ou envio de localizacao;
- atualizacao em tempo real;
- mapa;
- comportamento detalhado da pagina publica de tracking.
