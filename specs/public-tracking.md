# Public Tracking

## Objetivo

Definir o comportamento da página pública de visualização de um
tracking no TrackLink, permitindo que visitantes acompanhem a
localização compartilhada a partir de um link público, sem exigir
autenticação.

O fluxo coberto por esta especificação é:

```text
link público -> token -> localização inicial via REST -> conexão SignalR -> atualizações em tempo real -> encerramento
```

## Escopo

A página pública MUST permitir que um visitante:

- acesse um tracking por meio de um link público;
- tenha o token do tracking obtido a partir da rota pública;
- consulte o estado e a localização inicial usando a API REST;
- acompanhe atualizações em tempo real quando o tracking estiver
  ativo;
- veja quando o tracking estiver inativo, expirado, encerrado,
  indisponível ou não existir.

A página pública MUST NOT exigir autenticação.

A página pública MUST NOT permitir operações exclusivas do
proprietário, como atualizar localização, encerrar tracking ou alterar
qualquer dado do tracking.

O frontend MUST usar os seguintes contratos REST públicos:

```http
GET /api/tracking/{token}
GET /api/tracking/{token}/history
```

O frontend MUST usar o seguinte endpoint SignalR quando acompanhar um
tracking ativo em tempo real:

```http
/hubs/tracking
```

## Comportamentos Esperados

### Link público e token

O token MUST ser obtido da rota pública.

A URL pública definitiva ainda é `TBD`.

O frontend MUST NOT exigir sessão autenticada, access token ou refresh
token para carregar a página pública.

Se a rota pública não fornecer um token utilizável, o frontend MUST
tratar o acesso como inválido e MUST NOT tentar entrar em um grupo
SignalR.

### Estado inicial via REST

Ao carregar a página pública com um token utilizável, o frontend MUST
consultar a API para obter o estado inicial do tracking:

```http
GET /api/tracking/{token}
```

Esse endpoint MUST ser tratado como público pelo frontend.

Um token inexistente MUST ser tratado como tracking não encontrado.

Se a API retornar um tracking ativo, o frontend MUST apresentar a
localização atual disponível e MUST poder iniciar o acompanhamento em
tempo real via SignalR.

Tracking inativo ou expirado MUST NOT ser apresentado como
compartilhamento ativo.

Quando os dados retornados pela API permitirem, a classificação SHOULD
seguir a mesma regra usada em `specs/dashboard.md`:

- tracking ativo: `isActive` verdadeiro e `expiresAt` posterior ao
  horário atual;
- tracking inativo: `isActive` falso;
- tracking expirado: `expiresAt` igual ou anterior ao horário atual.

Quando um tracking puder ser classificado como inativo e expirado ao
mesmo tempo, a precedência de exibição do estado ainda é `TBD`.

### Histórico público

O frontend SHOULD poder consultar o histórico público do tracking
usando:

```http
GET /api/tracking/{token}/history
```

Esse endpoint MUST ser tratado como público pelo frontend.

A quantidade de histórico exibida é `TBD`.

O desenho ou não da rota completa é `TBD`.

Se o histórico falhar, o frontend MUST tratar a falha sem impedir
necessariamente a exibição do estado atual quando `GET
/api/tracking/{token}` tiver sido bem-sucedido.

### Conexão SignalR

Para tracking ativo, o frontend MUST poder acompanhar atualizações em
tempo real através do SignalR.

Quando o acompanhamento em tempo real for iniciado, o frontend MUST
conectar-se a:

```http
/hubs/tracking
```

Após estabelecer a conexão SignalR, o frontend MUST entrar no grupo
correspondente ao token chamando:

```text
JoinTracking(token)
```

O frontend MUST NOT entrar em grupo SignalR quando o token estiver
ausente, inválido, não encontrado, inativo ou expirado.

A política de reconexão SignalR é `TBD`.

### Atualizações em tempo real

O evento SignalR:

```text
LocationUpdated
```

MUST atualizar a localização apresentada para o visitante.

Uma atualização recebida via `LocationUpdated` MUST NOT ser apresentada
como operação realizada pelo visitante público.

O frontend MUST tratar payloads de atualização inválidos ou
incompletos sem substituir uma localização válida por dados inválidos.

O formato exato do payload de `LocationUpdated` é `TBD`, exceto pela
expectativa de conter dados suficientes para atualizar a localização
apresentada.

### Encerramento em tempo real

O evento SignalR:

```text
TrackingEnded
```

MUST fazer a interface deixar de apresentar o tracking como ativo.

Após receber `TrackingEnded`, o frontend MUST NOT continuar
apresentando novas atualizações como parte de um compartilhamento
ativo para esse token.

O comportamento exato da conexão SignalR após `TrackingEnded` é `TBD`.

## Estados e Erros

A página pública MUST representar estados coerentes para:

- token ausente ou inválido;
- carregamento do estado inicial;
- tracking não encontrado;
- tracking ativo;
- tracking inativo;
- tracking expirado;
- carregamento de histórico, quando aplicável;
- falha ao carregar histórico;
- conexão SignalR em andamento;
- conexão SignalR ativa;
- falha de conexão SignalR;
- atualização em tempo real recebida;
- tracking encerrado;
- falha de comunicação com a API.

Falhas em `GET /api/tracking/{token}` MUST ser tratadas e MUST NOT
ser apresentadas como tracking ativo.

Falhas na conexão SignalR MUST ser tratadas sem permitir que a
interface afirme estar recebendo atualizações em tempo real quando a
conexão não estiver funcional.

Se a conexão SignalR falhar após o estado inicial ter sido carregado,
o frontend SHOULD manter visível o último estado confirmado pela API
ou pelo último evento válido recebido, indicando que o acompanhamento
em tempo real não está disponível.

Se `LocationUpdated` ou `TrackingEnded` for recebido para um token que
não corresponde ao tracking exibido, o frontend MUST ignorar o evento.

Mensagens de erro MUST NOT expor tokens completos, stack traces ou
detalhes internos da API.

## Dependências e Decisões Pendentes

- TBD: URL pública definitiva do tracking.
- TBD: biblioteca de mapas.
- TBD: provedor de mapas.
- TBD: nível de zoom.
- TBD: aparência do marcador.
- TBD: política de reconexão SignalR.
- TBD: quantidade de histórico exibida.
- TBD: desenho ou não da rota completa.
- TBD: formato visual dos estados de erro.
- TBD: precedência visual/comportamental quando um tracking estiver
  inativo e expirado ao mesmo tempo.
- TBD: formato exato do payload de `GET /api/tracking/{token}`.
- TBD: formato exato do payload de
  `GET /api/tracking/{token}/history`.
- TBD: formato exato do payload de `LocationUpdated`.
- TBD: formato exato do payload de `TrackingEnded`.
- TBD: comportamento da conexão SignalR após `TrackingEnded`.
- TBD: estratégia para validar se um evento SignalR recebido pertence
  ao token exibido, caso o payload do evento não inclua o token.
- TBD: formato das mensagens apresentadas ao visitante.

## Fora de Escopo

Esta especificação não define:

- implementação Angular;
- components Angular;
- services Angular;
- guards Angular;
- interceptors;
- instalação de bibliotecas;
- autenticação, login, logout ou sessão do visitante;
- criação de tracking;
- atualização de localização pelo visitante público;
- encerramento de tracking pelo visitante público;
- operações exclusivas do proprietário;
- alteração de contratos do backend;
- persistência local de dados públicos;
- compartilhamento social do link;
- permissões de geolocalização do visitante público;
- edição visual de mapa, marcador ou rota.
