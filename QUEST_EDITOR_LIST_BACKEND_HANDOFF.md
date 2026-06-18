# Quest Editor em Lista (remoção do BPMN) — Backend Handoff

> **Status: frontend implementado e commitado.** O canvas BPMN de edição/visualização de quests foi removido por completo (ficava ruim no mobile). O contrato de `nodes`/`edges` enviado em `POST /quests` e `PUT /quests/:id` **não mudou de formato** — mas a análise do código do back-end (`soulsguide`) encontrou uma lacuna real que vale corrigir.

---

## O que mudou no frontend (contexto, sem ação do back-end)

- O canvas BPMN (zoom/pan/arrastar nós) foi substituído por um editor em lista vertical (`quest-editor-list`), no mesmo espírito do checklist que já existe na página de detalhe da quest.
- Bifurcações deixaram de ser criadas escolhendo manualmente o tipo `gateway` — agora é um botão "adicionar bifurcação" que cria 2 nós `task` e os conecta. Um nó é tratado como ponto de bifurcação simplesmente quando tem mais de uma aresta saindo dele (isso já é assim há tempos no `quest-checklist`, não é novo).
- O editor agora aceita nativamente que **múltiplos ramos terminem em finais diferentes** (cada ramo com seu próprio nó `end`), em vez de assumir um único final compartilhado.
- Posições (x/y) de nós **nunca foram enviadas para o back-end** — eram um detalhe puramente visual do canvas antigo, recalculadas no frontend a cada load via BFS. Confirmei isso lendo `QuestGuideRequest`/`QuestNodeSyncItem` no back-end: não há campo de posição lá. Então a remoção do canvas não deixa nada órfão no contrato.

**Resumindo: não é necessário mudar nenhum endpoint para isso funcionar.** O que segue abaixo é uma lacuna que encontrei e que recomendo corrigir, não um requisito bloqueante.

---

## Achado: `endingType` existe no frontend mas não é persistido

O modelo `QuestNode` do frontend tem:

```typescript
endingType?: 'positive' | 'tragic' | 'neutral' | null;
```

Isso é usado para classificar o **tipo de final** de um nó `end` (ex: "final trágico de Ranni" vs "final positivo"). Com o novo editor, isso fica mais relevante porque agora é comum uma quest ter vários ramos, cada um com seu próprio final.

Só que ao olhar `QuestNodeSyncItem`, `QuestNodeDTO` e a entidade `QuestNode` no back-end, **não existe nenhum campo equivalente**. Ou seja: o usuário escolhe o tipo de final no editor, mas isso é descartado silenciosamente ao salvar — nunca foi persistido, nem antes dessa mudança.

### Sugestão de correção

```sql
ALTER TABLE quest_nodes ADD COLUMN ending_type VARCHAR(20) NULL;
-- valores esperados: 'POSITIVE', 'TRAGIC', 'NEUTRAL' (ou null para nós que não são 'end')
```

```java
// QuestNode.java (entity)
@Enumerated(EnumType.STRING)
@Column(name = "ending_type")
private EndingType endingType; // novo enum: POSITIVE, TRAGIC, NEUTRAL

// QuestNodeSyncItem.java (request)
public record QuestNodeSyncItem(
        String id,
        String type,
        String label,
        String sublabel,
        String description,
        String location,
        List<String> tags,
        Long linkedQuestId,
        String linkedQuestName,
        String endingType   // NOVO — "positive" | "tragic" | "neutral" | null
) {}

// QuestNodeDTO.java (response)
public record QuestNodeDTO(
        String id,
        String type,
        String label,
        String sublabel,
        String description,
        String location,
        List<String> tags,
        Long linkedQuestId,
        String linkedQuestName,
        String endingType   // NOVO
) {}
```

Sem mudança nenhuma necessária no frontend para consumir isso — o campo já existe lá, só estava sendo ignorado no round-trip.

---

## Nota (não é ação, é só pra não estranhar)

- O frontend não cria mais nós com `type: "gateway"` explicitamente (bifurcações agora são inferidas por fan-out de arestas). Nós `gateway` antigos que já existem no banco continuam sendo lidos e exibidos normalmente — não precisa migrar nada, é só FYI pra não assumir que o frontend vai continuar mandando esse tipo em quests novas.
- As colunas `position_x` / `position_y` em `quest_nodes` já estavam sem uso real (nunca recebiam valor do frontend). Dar `drop column` nelas é opcional e de baixo risco, mas não é urgente — só mencionando porque pode aparecer numa limpeza futura.
