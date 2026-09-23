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
- visualize a localização atual em mapa;
- visualize o histórico disponível como rota no mapa;
- veja quando o tracking estiver inativo, expirado, encerrado,
  indisponível ou não existir.

A página pública MUST NOT exigir autenticação.

A página pública MUST NOT usar `authGuard`.

A página pública MUST NOT permitir operações exclusivas do
proprietário, como atualizar localização, encerrar tracking ou alterar
qualquer dado do tracking.

O frontend MUST usar os seguintes contratos REST públicos:

```http
GET /api/tracking/{token}
GET /api/tracking/{token}/history
```

Os GETs públicos MUST NOT depender de sessão autenticada, access token,
refresh token ou refresh cookie.

O frontend MUST usar o seguinte endpoint SignalR quando acompanhar um
tracking ativo em tempo real:

```http
/hubs/tracking
```

A conexão SignalR pública MUST NOT depender de sessão autenticada,
access token, refresh token ou refresh cookie.

## Comportamentos Esperados

### Link público, rota e token

A URL pública do tracking MUST ser:

```text
/tracking/:token
```

O token MUST ser obtido da rota pública.

A rota `/tracking/:token` MUST ser pública e MUST NOT usar
`authGuard`.

A rota protegida `/tracking/new` MUST permanecer registrada antes de
`/tracking/:token`, para que `new` não seja interpretado como token
público.

O frontend MUST NOT exigir sessão autenticada, access token ou refresh
token para carregar a página pública.

Se a rota pública não fornecer um token utilizável, o frontend MUST
tratar o acesso como inválido e MUST NOT consultar histórico nem tentar
entrar em um grupo SignalR.

### Estado inicial via REST

Ao carregar a página pública com um token utilizável, o frontend MUST
consultar a API para obter o estado inicial do tracking:

```http
GET /api/tracking/{token}
```

Esse endpoint MUST ser tratado como público pelo frontend.

O contrato atual de sucesso é:

```http
200 OK
```

```json
{
  "token": "string",
  "latitude": 0,
  "longitude": 0,
  "updatedAt": "2026-09-23T00:00:00Z",
  "isActive": true,
  "expiresAt": "2026-09-24T00:00:00Z"
}
```

O frontend MUST tratar os seguintes status definitivos:

- `404 Not Found`: tracking não encontrado;
- `409 Conflict`: tracking inativo ou encerrado;
- `410 Gone`: tracking expirado.

Um token inexistente MUST ser tratado como tracking não encontrado.

Se a API retornar um tracking ativo, o frontend MUST apresentar a
localização atual disponível e MUST iniciar o acompanhamento em tempo
real via SignalR.

Tracking inativo ou expirado MUST NOT ser apresentado como
compartilhamento ativo.

Quando os dados retornados pela API permitirem, a classificação MUST
seguir a mesma regra usada em `specs/dashboard.md`:

- tracking inativo: `isActive` falso;
- tracking expirado: `isActive` verdadeiro e `expiresAt` igual ou
  anterior ao horário atual;
- tracking ativo: `isActive` verdadeiro e `expiresAt` posterior ao
  horário atual.

Quando mais de uma condição puder ser inferida localmente, tracking
inativo MUST ter precedência sobre tracking expirado.

### Histórico público

O frontend SHOULD consultar o histórico público do tracking usando:

```http
GET /api/tracking/{token}/history
```

Esse endpoint MUST ser tratado como público pelo frontend.

O frontend MUST carregar o histórico somente depois que
`GET /api/tracking/{token}` confirmar um tracking válido e ativo.

O contrato atual de sucesso é:

```http
200 OK
```

```json
[
  {
    "latitude": 0,
    "longitude": 0,
    "recordedAt": "2026-09-23T00:00:00Z"
  }
]
```

O histórico retornado pela API está ordenado por `recordedAt`
crescente.

No contrato atual, a API retorna todo o histórico disponível, sem
paginação ou limite.

O frontend MUST tratar os seguintes status definitivos para histórico:

- `404 Not Found`: tracking não encontrado;
- `409 Conflict`: tracking inativo ou encerrado;
- `410 Gone`: tracking expirado.

O frontend MUST desenhar o histórico disponível como uma polyline no
mapa.

Paginação ou limitação do histórico fica fora do escopo deste MVP.

Se o histórico falhar por uma falha temporária, o frontend MUST tratar
a falha sem impedir necessariamente a exibição do estado atual quando
`GET /api/tracking/{token}` tiver sido bem-sucedido.

### Mapa

A página pública MUST usar Leaflet para renderização do mapa.

A página pública MUST usar OpenStreetMap como provedor de mapa.

O zoom inicial do mapa MUST ser 16.

O mapa MUST exibir um marcador simples para a posição atual.

Quando houver histórico disponível, o frontend MUST desenhar a rota
como polyline.

O marcador e a polyline MUST refletir somente localizações válidas
confirmadas pela API REST ou por eventos SignalR válidos.

### Conexão SignalR

Para tracking ativo, o frontend MUST acompanhar atualizações em tempo
real através do SignalR.

O frontend MUST usar o cliente oficial `@microsoft/signalr`.

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

O frontend MUST usar reconexão automática do cliente SignalR.

Após `onreconnected`, o frontend MUST chamar `JoinTracking(token)`
novamente.

Ao destruir o componente responsável pela página pública, o frontend
MUST parar a conexão SignalR.

Falhas temporárias de conexão ou reconexão SignalR MUST ser
diferenciadas dos estados definitivos de tracking não encontrado,
inativo ou expirado.

### Atualizações em tempo real

O evento SignalR:

```text
LocationUpdated
```

MUST atualizar a localização apresentada para o visitante.

O payload atual de `LocationUpdated` MUST ser tratado como:

```json
{
  "token": "string",
  "latitude": 0,
  "longitude": 0,
  "updatedAt": "2026-09-23T00:00:00Z",
  "isActive": true,
  "expiresAt": "2026-09-24T00:00:00Z"
}
```

O frontend MUST ignorar `LocationUpdated` cujo `payload.token` seja
diferente do token da página.

Uma atualização recebida via `LocationUpdated` MUST NOT ser
apresentada como operação realizada pelo visitante público.

O frontend MUST tratar payloads de atualização inválidos ou
incompletos sem substituir uma localização válida por dados inválidos.

Cada `LocationUpdated` válido MUST mover o marcador para a nova
posição e adicionar a localização à rota apresentada.

### Encerramento em tempo real

O evento SignalR:

```text
TrackingEnded
```

MUST fazer a interface deixar de apresentar o tracking como ativo.

O evento `TrackingEnded` não possui payload no contrato atual.

Como a conexão participa somente do grupo correspondente ao token
exibido, `TrackingEnded` MUST ser considerado referente ao tracking
atual.

Após receber `TrackingEnded`, o frontend MUST manter a última
localização e a rota visíveis no mapa.

Após receber `TrackingEnded`, o frontend MUST apresentar o tracking
como encerrado e MUST desconectar do SignalR.

Após receber `TrackingEnded`, o frontend MUST NOT continuar
apresentando novas atualizações como parte de um compartilhamento
ativo para esse token.

## Estados e Erros

A página pública MUST representar estados coerentes para:

- token ausente ou inválido;
- carregamento do estado inicial;
- tracking não encontrado;
- tracking ativo;
- tracking inativo ou encerrado;
- tracking expirado;
- carregamento de histórico, quando aplicável;
- falha ao carregar histórico;
- conexão SignalR em andamento;
- conexão SignalR ativa;
- falha temporária de conexão SignalR;
- reconexão SignalR em andamento;
- atualização em tempo real recebida;
- tracking encerrado por evento em tempo real;
- falha temporária de comunicação com a API.

Falhas em `GET /api/tracking/{token}` MUST ser tratadas e MUST NOT
ser apresentadas como tracking ativo.

Falhas temporárias de REST ou SignalR MUST ser diferenciadas dos
estados definitivos de tracking não encontrado, inativo e expirado.

Falhas na conexão SignalR MUST ser tratadas sem permitir que a
interface afirme estar recebendo atualizações em tempo real quando a
conexão não estiver funcional.

Se a conexão SignalR falhar após o estado inicial ter sido carregado,
o frontend SHOULD manter visível o último estado confirmado pela API
ou pelo último evento válido recebido, indicando que o acompanhamento
em tempo real não está disponível.

Após `TrackingEnded`, o frontend MUST preservar a última localização
e rota no mapa.

Mensagens de erro MUST NOT expor tokens completos, stack traces ou
detalhes internos da API.

As mensagens apresentadas ao visitante MUST ser curtas, seguras e
específicas em português. O MVP MUST usar mensagens equivalentes a:

- carregamento: "Carregando tracking...";
- não encontrado: "Tracking não encontrado.";
- encerrado ou inativo: "Este tracking foi encerrado.";
- expirado: "Este tracking expirou.";
- falha de carregamento: "Não foi possível carregar o tracking.";
- falha em tempo real: "Atualizações em tempo real indisponíveis.";
- reconexão em tempo real: "Reconectando atualizações em tempo real...".

## Dependências e Decisões Pendentes

Não há decisões pendentes nesta especificação.

Decisões registradas:

- URL pública: `/tracking/:token`.
- A rota pública não usa `authGuard`.
- `/tracking/new` deve permanecer antes de `/tracking/:token`.
- Mapa: Leaflet.
- Provedor de mapa: OpenStreetMap.
- Zoom inicial: 16.
- Marcador: simples para posição atual.
- Histórico disponível: desenhado como polyline.
- Histórico no MVP: todo o histórico retornado pela API, sem paginação
  ou limite no frontend.
- SignalR: cliente oficial `@microsoft/signalr`.
- SignalR: reconexão automática.
- SignalR: `JoinTracking(token)` após conectar e após
  `onreconnected`.
- `LocationUpdated` contém token e deve ser ignorado quando o token
  divergir da página.
- `TrackingEnded` não possui payload e é considerado referente ao
  tracking atual porque a conexão participa somente do grupo do token
  exibido.
- Após `TrackingEnded`, a última localização e rota permanecem
  visíveis e a conexão SignalR deve ser encerrada.
- Inativo tem precedência sobre expirado quando ambas as condições
  puderem ser inferidas localmente.
- GETs públicos e conexão SignalR pública não dependem de sessão ou
  refresh cookie.

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
- paginação ou limitação de histórico no MVP;
- edição visual avançada de mapa, marcador ou rota.
