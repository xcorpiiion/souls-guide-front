import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { StoryCharacterDTO } from '@xcorpiiion/canonico';
import { lerConversa } from '../arquivo.model';

/** Uma fala enquanto é escrita. A chave só existe para a lista não se redesenhar inteira. */
export interface FalaDoForm {
  readonly chave: number;
  readonly characterId: number | null;
  /** Rótulo livre, quando quem fala não está no elenco ("voz no rádio"). */
  readonly speaker: string;
  readonly text: string;
}

let proximaChave = 1;

export function novaFala(parcial: Partial<Omit<FalaDoForm, 'chave'>> = {}): FalaDoForm {
  return { chave: proximaChave++, characterId: null, speaker: '', text: '', ...parcial };
}

/**
 * As falas de um diálogo ou cutscene, uma a uma. Ver ADR 0033 do souls-guide-api.
 *
 * <p>Quem joga transcreve a conversa inteira de uma vez, e escolher "quem fala" linha a linha
 * para vinte falas é o trabalho que faz desistir. Por isso o caminho principal é <b>colar a
 * conversa</b>: o "NOME:" de cada linha vira quem fala, casado com o elenco pelo nome. O que
 * não casa fica como rótulo, com o botão de cadastrar ao lado.
 */
@Component({
  selector: 'app-editor-de-falas',
  templateUrl: './editor-de-falas.html',
  styleUrl: './editor-de-falas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorDeFalas {
  readonly falas = input.required<readonly FalaDoForm[]>();
  readonly elenco = input.required<readonly StoryCharacterDTO[]>();
  /** Quem está presente vem primeiro na lista de quem fala. */
  readonly presentes = input<readonly number[]>([]);
  /** Na cutscene as falas são um extra; no diálogo, o conteúdo. */
  readonly opcional = input(false);

  readonly mudou = output<FalaDoForm[]>();
  /** Um rótulo que a pessoa quer transformar em alguém do elenco. */
  readonly cadastrarRotulo = output<string>();

  protected readonly colando = signal(false);
  protected readonly conversa = signal('');

  /** Presentes primeiro, depois o resto do elenco — é quase sempre um dos presentes. */
  protected readonly opcoes = computed(() => {
    const presentes = new Set(this.presentes());
    return [...this.elenco()].sort(
      (a, b) => Number(presentes.has(b.id)) - Number(presentes.has(a.id)),
    );
  });

  /** Os rótulos livres que ainda não são ninguém do elenco, sem repetir. */
  protected readonly rotulosSoltos = computed(() => {
    const nomes = new Set(this.elenco().map((c) => normalizar(c.name)));
    const vistos = new Map<string, string>();
    for (const f of this.falas()) {
      const r = f.speaker.trim();
      if (f.characterId === null && r && !nomes.has(normalizar(r))) vistos.set(normalizar(r), r);
    }
    return [...vistos.values()];
  });

  protected acrescentar(): void {
    this.mudou.emit([...this.falas(), novaFala()]);
  }

  protected alterar(chave: number, parcial: Partial<Omit<FalaDoForm, 'chave'>>): void {
    this.mudou.emit(this.falas().map((f) => (f.chave === chave ? { ...f, ...parcial } : f)));
  }

  protected escolherQuemFala(chave: number, valor: string): void {
    if (valor === '') this.alterar(chave, { characterId: null });
    else this.alterar(chave, { characterId: Number(valor), speaker: '' });
  }

  protected tirar(chave: number): void {
    this.mudou.emit(this.falas().filter((f) => f.chave !== chave));
  }

  protected mover(indice: number, delta: -1 | 1): void {
    const lista = [...this.falas()];
    const destino = indice + delta;
    if (destino < 0 || destino >= lista.length) return;
    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
    this.mudou.emit(lista);
  }

  /** A conversa colada vira falas, no fim das que já existem. */
  protected separar(): void {
    const porNome = new Map(this.elenco().map((c) => [normalizar(c.name), c.id]));
    const lidas = lerConversa(this.conversa()).map((l) => {
      const id = l.nome ? porNome.get(normalizar(l.nome)) : undefined;
      return novaFala({
        characterId: id ?? null,
        speaker: id ? '' : l.nome,
        text: l.texto,
      });
    });
    if (lidas.length === 0) return;
    // Uma fala vazia sozinha é o estado inicial do formulário, não algo a preservar.
    const atuais = this.falas().filter((f) => f.text.trim() || f.speaker.trim() || f.characterId);
    this.mudou.emit([...atuais, ...lidas]);
    this.conversa.set('');
    this.colando.set(false);
  }
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}
