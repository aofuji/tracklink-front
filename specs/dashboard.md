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
frontend MUST aplicar o comportamento definido em
`specs/authentication.md`, incluindo redirecionamento para `/login` e
preservacao de `returnUrl` quando a rota solicitada for uma rota
interna valida.

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

Com o contrato atual do backend, a classificacao MUST considerar:

- tracking inativo: `isActive` falso;
- tracking expirado: `isActive` verdadeiro e `expiresAt` igual ou
  anterior ao horario atual;
- tracking ativo: `isActive` verdadeiro e `expiresAt` posterior ao
  horario atual.

Quando `isActive` for falso, o estado visual/comportamental MUST ser
inativo, mesmo que `expiresAt` tambem esteja no passado.

O Dashboard MUST exibir o estado derivado do tracking na lista.

### Campos exibidos

No MVP, cada item da lista de trackings MUST exibir:

- estado derivado;
- token de forma abreviada;
- `updatedAt`;
- `expiresAt`;
- acoes permitidas para aquele tracking.

O Dashboard MUST NOT exibir latitude ou longitude na lista.

O Dashboard MUST NOT exibir `createdAt` se esse campo nao fizer parte
do contrato existente retornado pela API.

O Dashboard MUST NOT implementar funcionalidade de copiar link publico
nesta feature.

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

Ao acessar um tracking existente, o Dashboard MUST navegar para a
pagina publica:

```text
/tracking/:token
```

O `:token` usado na rota MUST ser o token do tracking selecionado.

A implementacao da pagina publica `/tracking/:token` pertence a
`specs/public-tracking.md` e MUST NOT ser criada nesta feature.

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
recarregar a lista utilizando:

```http
GET /api/tracking/my
```

A lista recarregada MUST ser usada para atualizar o estado exibido, de
forma que o tracking nao continue aparecendo como ativo quando a API
indicar outro estado.

## Estados e Erros

O Dashboard MUST apresentar uma mensagem especifica e segura de
loading enquanto os trackings do usuario estiverem sendo carregados.

Quando `GET /api/tracking/my` retornar uma lista vazia, o Dashboard
MUST apresentar uma mensagem especifica e segura de lista vazia.

Se a carga dos trackings falhar, o Dashboard MUST apresentar uma
mensagem especifica e segura de falha ao carregar e MUST permitir que
o usuario tente carregar novamente por meio de uma acao "Tentar
novamente".

Se a API responder que a sessao nao e valida ou nao esta autorizada,
o frontend MUST aplicar o comportamento global de sessao definido em
`specs/authentication.md`. Erros `401` continuam sendo
responsabilidade do fluxo global de autenticacao.

Durante o encerramento de um tracking, o Dashboard SHOULD evitar
multiplas tentativas simultaneas de encerramento para o mesmo token.

Se `DELETE /api/tracking/{token}` falhar, o Dashboard MUST informar
com mensagem especifica e segura que o tracking nao foi encerrado e
MUST NOT exibir o encerramento como concluido.

Se `DELETE /api/tracking/{token}` retornar que o tracking nao foi
encontrado, o Dashboard MUST apresentar uma mensagem especifica e
segura informando que o tracking nao foi encontrado e MUST recarregar
a lista via `GET /api/tracking/my` para reconciliar a exibicao com o
backend.

Quando `DELETE /api/tracking/{token}` retornar tracking nao encontrado,
o Dashboard MUST NOT assumir que o tracking foi encerrado.

Mensagens de erro MUST NOT expor tokens completos, stack traces ou
detalhes internos da API.

## Dependências e Decisões Pendentes

Nao ha decisoes pendentes nesta especificacao.

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
- comportamento detalhado da pagina publica de tracking;
- implementacao da pagina publica `/tracking/:token`;
- copia de link publico.
