import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { StoryCharacterDTO, StoryCharacterKind } from '@xcorpiiion/canonico';
import { ELENCO_POR_CHAVE } from '../arquivo.model';

/** O pedido de cadastrar alguém que ainda não está no elenco, pelo nome digitado. */
export interface NovoNoElenco {
  readonly nome: string;
  readonly tipo: StoryCharacterKind;
}

/**
 * Escolher gente do elenco: quem escreveu, quem está presente, qual criatura.
 *
 * <p>Digitar um nome que não existe oferece <b>cadastrar ali mesmo</b>. Mandar a pessoa para
 * outra tela no meio de um registro — com o texto colado esperando — é o jeito de ela desistir
 * do elenco e voltar a escrever o nome solto.
 *
 * <p>Não cadastra sozinho: pede ao pai, que fala com o servidor e devolve o elenco com o novo
 * nome. O componente só sabe escolher.
 */
@Component({
  selector: 'app-escolher-elenco',
  templateUrl: './escolher-elenco.html',
  styleUrl: './escolher-elenco.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EscolherElenco {
  readonly elenco = input.required<readonly StoryCharacterDTO[]>();
  readonly escolhidos = input.required<readonly number[]>();
  /** Um só (quem escreveu, a criatura) ou vários (quem está presente). */
  readonly varios = input(true);
  /** Os tipos oferecidos; o primeiro é o tipo de quem nasce pelo nome digitado. */
  readonly tipos = input<readonly StoryCharacterKind[]>(['CHARACTER', 'CREATURE', 'BOSS']);
  readonly rotulo = input.required<string>();
  readonly placeholder = input('buscar ou cadastrar pelo nome');
  readonly campoId = input.required<string>();

  readonly mudou = output<number[]>();
  readonly cadastrar = output<NovoNoElenco>();

  protected readonly busca = signal('');
  protected readonly aberto = signal(false);

  protected readonly porId = computed(() => new Map(this.elenco().map((c) => [c.id, c])));

  protected readonly selecionados = computed(() =>
    this.escolhidos()
      .map((id) => this.porId().get(id))
      .filter((c): c is StoryCharacterDTO => !!c),
  );

  protected readonly opcoes = computed(() => {
    const q = normalizar(this.busca());
    const escolhidos = new Set(this.escolhidos());
    const tipos = new Set(this.tipos());
    return this.elenco()
      .filter((c) => tipos.has(c.kind) && !escolhidos.has(c.id))
      .filter((c) => !q || normalizar(c.name).includes(q))
      .slice(0, 8);
  });

  /** O nome digitado ainda não está no elenco — nem com outra maiúscula. */
  protected readonly podeCadastrar = computed(() => {
    const nome = this.busca().trim();
    if (!nome) return false;
    const alvo = normalizar(nome);
    return !this.elenco().some((c) => normalizar(c.name) === alvo);
  });

  protected icone(tipo: StoryCharacterKind): string {
    return ELENCO_POR_CHAVE.get(tipo)?.icon ?? 'ti ti-user';
  }

  protected escolher(id: number): void {
    this.mudou.emit(this.varios() ? [...this.escolhidos(), id] : [id]);
    this.busca.set('');
    this.aberto.set(this.varios());
  }

  protected tirar(id: number): void {
    this.mudou.emit(this.escolhidos().filter((x) => x !== id));
  }

  protected pedirCadastro(): void {
    const nome = this.busca().trim();
    if (!nome) return;
    this.cadastrar.emit({ nome, tipo: this.tipos()[0] });
    this.busca.set('');
  }

  protected teclar(evento: KeyboardEvent): void {
    if (evento.key !== 'Enter') return;
    evento.preventDefault();
    const primeira = this.opcoes()[0];
    if (primeira && this.busca().trim()) this.escolher(primeira.id);
    else if (this.podeCadastrar()) this.pedirCadastro();
  }

  /** O clique na opção acontece antes de o campo perder o foco; sem o atraso, a lista sumia antes. */
  protected fecharDepois(): void {
    setTimeout(() => this.aberto.set(false), 150);
  }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}
