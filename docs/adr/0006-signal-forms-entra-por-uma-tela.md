# ADR 0006 — Signal Forms entra por uma tela, e não pelas sete

- **Status:** Aceita
- **Data:** 01/09/2026
- **Trava:** src/app/features/reset-password/reset-password.spec.ts

## Problema

O app é todo signal — `signal()`, `computed()`, `input()`, zoneless — menos os formulários,
que são sete telas em `ReactiveFormsModule`. A costura aparece de duas formas concretas:

- **o estado do formulário é um objeto paralelo ao modelo.** `form.value.newPassword!` tinha
  a não-nulidade afirmada na mão, porque o `FormBuilder` tipa todo campo como opcional
  mesmo com `Validators.required` declarado;
- **a validação entre campos não tem tipo.** O `passwordsMatch` do `reset-password` era um
  validator no *grupo*, lendo os filhos por nome em string (`group.get('newPassword')`) —
  ninguém confere esse nome, nem o compilador nem o teste. E o erro nascia no grupo, então a
  tela precisava de um `passwordMismatch()` só para perguntar ao grupo um erro que é de um
  campo.

O Angular 22 traz `@angular/forms/signals`, que resolve os dois. E é **experimental**.

## Decisão

Signal Forms entra em **uma** tela: `reset-password`.

É a menor que exercita o que a API existe para resolver — dois campos, validação de campo,
validação entre campos e envio — e a que menos dói se precisar voltar: dois campos e um
botão. As outras seis (`login`, `forgot-password`, `game-create`, `lore-create`,
`lore-editor`, `profile`) ficam em `ReactiveFormsModule` até a API sair de experimental.

A regra cruzada passou a morar no campo que fica vermelho, lendo o outro pelo caminho
tipado:

```ts
validate(senha.confirmPassword, (ctx) => {
  const repetida = ctx.value();
  if (!repetida || repetida === ctx.valueOf(senha.newPassword)) return null;
  return { kind: 'senhasDiferentes', message: 'As senhas não coincidem.' };
});
```

## Consequências

Ficou mais fácil ler: `form()` embrulha um signal e escreve **nele**, então `model()` é a
fonte da verdade e some o `!` de não-nulidade. E a validação cruzada deixou de depender de
uma string que ninguém confere.

Ficou mais caro em risco: é API experimental, e uma mudança de assinatura numa versão menor
do Angular quebra esta tela. O custo está contido de propósito — uma tela, sete casos de
teste, e nenhum editor apostado.

Passou a valer que **tela nova de formulário simples pode nascer em Signal Forms**, e que
migração das seis restantes só acontece quando a API estabilizar. Migrar agora apostaria a
criação de jogo e os dois editores numa assinatura que ainda pode mudar.

Uma consequência que não é vantagem, e que o teste encontrou: **Signal Forms não traz o
`ReactiveFormsModule`**, e `(ngSubmit)` é output de `NgForm`/`FormGroupDirective`. Sem esse
módulo, `(ngSubmit)` não se liga a nada — sem erro de compilação, sem aviso, e o botão
"Salvar nova senha" simplesmente não fazia nada. O evento agora é o `submit` nativo, com
`preventDefault`. Quem migrar outra tela vai cair nisso.

## Alternativas descartadas

| Alternativa | Por que não |
|---|---|
| Migrar as sete telas de uma vez | Aposta a criação de jogo e os dois editores numa API experimental. O ganho é de legibilidade, e não vale o risco de reescrever tudo duas vezes |
| Não usar até sair de experimental | Deixa a costura onde está e adia a descoberta dos problemas reais — como o `(ngSubmit)` acima, que só aparece usando |
| Criar uma tela nova só para experimentar | Inventa escopo. `reset-password` já existia, já era pequena e já tinha exatamente a validação cruzada que interessa provar |
| `login`, que é ainda menor | Não tem validação entre campos, que é a metade que mais muda com a API nova |

## Referências

- `src/app/features/reset-password/reset-password.ts`
- `src/app/features/reset-password/reset-password.spec.ts`
- [Signal Forms](https://angular.dev/guide/forms/signals)
