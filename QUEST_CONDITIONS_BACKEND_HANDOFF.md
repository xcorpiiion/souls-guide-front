# Condições entre quests — Backend Handoff

> **Status: especificado, ainda não implementado.** Funcionalidade nova: quests "souls-like" frequentemente têm consequências (matar um NPC esconde a questline dele) e dependências (precisar fazer algo em outra quest pra desbloquear esta). Este documento descreve o modelo de dados e os endpoints necessários.

---

## Conceito

Uma **condição** é uma regra: "quando TODAS estas etapas (de quaisquer quests do mesmo jogo) estiverem marcadas como concluídas pelo jogador, esta quest specific fica escondida / revelada / com um final forçado".

Importante: **não existe um estado "efeito aplicado" persistido.** A visibilidade de uma quest é sempre recalculada a partir de duas coisas que já existem:
1. As condições cadastradas para o jogo
2. O progresso atual do jogador (`UserQuestProgress.completedNodeIds`) em todas as quests daquele jogo

Isso significa: se o jogador desmarcar uma etapa que era gatilho de uma condição, a quest afetada volta a aparecer automaticamente — sem precisar de nenhuma lógica de "desfazer".

---

## 1. Novo modelo: `QuestCondition`

```java
@Entity
@Table(name = "quest_conditions")
public class QuestCondition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "game_id", nullable = false)
    private Long gameId;

    @ElementCollection
    @CollectionTable(name = "quest_condition_triggers", joinColumns = @JoinColumn(name = "condition_id"))
    @Column(name = "node_id")
    private List<String> triggerNodeIds; // TODOS precisam estar concluídos (E lógico)

    @Column(name = "affected_quest_id", nullable = false)
    private Long affectedQuestId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ConditionEffect effect; // HIDE, REVEAL, FORCE_ENDING

    @Column(name = "ending_node_id")
    private String endingNodeId; // obrigatório só quando effect = FORCE_ENDING

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description; // explicação narrativa, ex: "Ranni nunca perdoa esse golpe..."

    @Column(name = "is_spoiler", nullable = false)
    private boolean isSpoiler = true;
}
```

### Regra do enum `effect`

| Valor | Significado |
|---|---|
| `HIDE` | Se satisfeita, `affectedQuestId` fica oculta da listagem pro jogador |
| `REVEAL` | Se **não** satisfeita, `affectedQuestId` fica oculta (é um pré-requisito — a quest só aparece quando a condição é cumprida) |
| `FORCE_ENDING` | Se satisfeita, sinaliza qual `endingNodeId` (um nó tipo `end` da quest afetada) é o final "travado" — usado só para exibição, não bloqueia mecanicamente outros finais |

### Regra de avaliação por quest

Para uma quest `Q` num jogo, dado o conjunto `completed` = união de `completedNodeIds` de **todas** as quests daquele jogo para o usuário atual:

```
revealConditions = condições com effect=REVEAL e affectedQuestId=Q.id
hideConditions    = condições com effect=HIDE e affectedQuestId=Q.id

satisfied(condition) = condition.triggerNodeIds.every(nodeId -> completed.contains(nodeId))

isHidden =
  (revealConditions.length > 0 && revealConditions.none(satisfied))
  || hideConditions.any(satisfied)

hiddenReason = a description da primeira condição satisfeita relevante (a de HIDE tem prioridade sobre a de REVEAL não satisfeita)
```

Se o usuário não estiver autenticado, ou não tiver progresso algum no jogo, trate `completed` como vazio (logo, qualquer `REVEAL` não satisfeita já esconde a quest — pré-requisitos não satisfeitos por padrão).

---

## 2. Endpoints (CRUD de condições, escopo por jogo)

Condições são por **jogo**, não por quest — porque o gatilho pode estar em uma quest e o efeito em outra.

```
GET    /games/{gameId}/conditions
POST   /games/{gameId}/conditions
PUT    /conditions/{id}
DELETE /conditions/{id}
```

Todos exigem `Authorization: Bearer {token}` e (sugestão) `@PreAuthorize` restringindo a usuários com permissão de editar conteúdo do jogo (mesma regra que já vale pra criar/editar quests da comunidade).

### `QuestConditionDTO` (response)

```json
{
  "id": 12,
  "gameId": 1,
  "triggerNodeIds": ["87", "92"],
  "affectedQuestId": 45,
  "affectedQuestTitle": "Questline de Ranni, a Bruxa",
  "effect": "HIDE",
  "endingNodeId": null,
  "description": "Ranni nunca perdoa esse golpe — ela foge e a relação com ela se rompe pra sempre, encerrando essa linha de quests.",
  "isSpoiler": true
}
```

`affectedQuestTitle` é só pra conveniência de exibição na tela de gerenciamento — não precisa em outros contextos.

### `QuestConditionRequest` (create/update)

```json
{
  "triggerNodeIds": ["87", "92"],
  "affectedQuestId": 45,
  "effect": "HIDE",
  "endingNodeId": null,
  "description": "...",
  "isSpoiler": true
}
```

Validação: `triggerNodeIds` não vazio; se `effect == FORCE_ENDING`, `endingNodeId` obrigatório e deve ser um nó tipo `end` pertencente a `affectedQuestId`.

---

## 3. Mudança nos endpoints existentes de quest

Adicionar a `QuestGuideDTO` (usado em `GET /quests` e `GET /quests/following`, `GET /quests/liked`) e a `QuestGuideDetailDTO` (`GET /quests/{id}`):

```java
boolean hidden,
String hiddenReason,     // null se não estiver escondida
boolean hiddenIsSpoiler  // true por padrão — frontend decide se borra o texto até o usuário clicar em "revelar"
```

### Cálculo

No momento de montar a resposta (no `QuestGuideAssembler` ou serviço equivalente):

1. Buscar todas as `QuestCondition` do `gameId` da quest.
2. Se `principal` autenticado: buscar todos os `UserQuestProgress` do usuário cujas `questId` pertencem a quests daquele `gameId`, e unir os `completedNodeIds` num único `Set<String>`. Se não autenticado, usar `Set.of()`.
3. Aplicar a regra de avaliação descrita na seção 1.
4. Preencher `hidden`/`hiddenReason`/`hiddenIsSpoiler` (este último = `condition.isSpoiler()` da condição que decidiu o resultado).

### Sobre `GET /quests` (listagem paginada)

Isso é uma N+1 em potencial (uma quest por vez). Como o volume de condições por jogo deve ser pequeno (dezenas, não milhares), sugiro: carregar todas as condições do(s) `gameId`(s) presentes na página de uma vez (uma query agrupando por `gameId`), e o progresso do usuário também de uma vez (uma query por `gameId` distinto na página, não por quest). Evita N+1 sem precisar de cache.

---

## Resumo das mudanças de contrato

| Endpoint | Mudança |
|---|---|
| `GET/POST /games/{gameId}/conditions` | **Novo** — lista e cria condições do jogo |
| `PUT/DELETE /conditions/{id}` | **Novo** — edita e remove uma condição |
| `GET /quests`, `GET /quests/following`, `GET /quests/liked` | Cada item passa a incluir `hidden`, `hiddenReason`, `hiddenIsSpoiler` |
| `GET /quests/{id}` | Mesmo campo adicional, calculado para a quest individual |
