import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import type { ItemDTO } from '@xcorpiiion/canonico';
import { AuthService } from '@xcorpiiion/ng-core';
import { ToastService } from '@xcorpiiion/ui';
import { ItemEditor } from './item-editor';
import { ItemService } from '../../core/services/item.service';
import { GameService } from '../../core/services/game.service';
import { QuestService } from '../../core/services/quest.service';

const JOGO = { id: '1', name: 'Elden Ring', slug: 'elden-ring' };

const ITEM: ItemDTO = {
  id: 7,
  name: 'Talismã do Punho de Ferro',
  description: '',
  gameId: 1,
  gameName: 'Elden Ring',
  type: 'TALISMAN',
  imageFileKey: 'itens/7/capa.png',
  location: 'Castelo Tempestade',
  foundAtNodeId: 55,
  foundAtNodeTitle: 'A ponte quebrada',
  foundAtQuestId: 9,
  foundAtQuestTitle: 'Caminho para o Trono',
};

const pagina = <T>(content: T[]) => ({
  content,
  totalElements: content.length,
  totalPages: 1,
  pageNumber: 0,
  pageSize: 24,
  first: true,
  last: true,
});

/** O que o teste alcança do componente: só o que o template já chama. */
interface Tela {
  nome: () => string;
  tipo: () => string | null;
  jogoId: () => string;
  local: { set: (v: string) => void };
  podeSalvar: () => boolean;
  erroDeRede: () => boolean;
  onNome: (v: string) => void;
  onJogoPorNome: (v: string) => void;
  escolherGuia: (g: { id: string; title: string }) => void;
  escolherPasso: (p: { id: string; label: string }) => void;
  salvar: () => void;
  salvarEProximo: () => void;
}

function montar(
  opcoes: { itemId?: string; create?: ReturnType<typeof vi.fn>; admin?: boolean } = {},
) {
  const create = opcoes.create ?? vi.fn(() => of({ ...ITEM, id: 7 }));
  const update = vi.fn(() => of(ITEM));
  const get = vi.fn(() => of(ITEM));
  const roles = opcoes.admin ? ['ROLE_USER', 'ROLE_ADMIN'] : ['ROLE_USER'];

  const params = opcoes.itemId ? { id: opcoes.itemId } : { gameId: '1-elden-ring' };

  TestBed.configureTestingModule({
    imports: [ItemEditor],
    providers: [
      // Salvar termina em navegação: sem uma rota que case, o router rejeita e o vitest
      // acusa erro fora do teste.
      provideRouter([{ path: '**', children: [] }]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap(params) } },
      },
      {
        provide: ItemService,
        useValue: { list: () => of(pagina<ItemDTO>([])), get, create, update, delete: vi.fn() },
      },
      { provide: GameService, useValue: { list: () => of(pagina([JOGO])) } },
      {
        provide: QuestService,
        useValue: {
          list: () => of(pagina([{ id: '9', title: 'Caminho para o Trono' }])),
          listNodes: () => of([{ id: '55', label: 'A ponte quebrada' }]),
        },
      },
      { provide: AuthService, useValue: { isLoggedIn: () => true, getClaim: () => roles } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  });

  const fixture = TestBed.createComponent(ItemEditor);
  fixture.detectChanges();

  return {
    fixture,
    create,
    update,
    get,
    tela: fixture.componentInstance as unknown as Tela,
  };
}

const texto = (f: ComponentFixture<ItemEditor>) =>
  (f.nativeElement as HTMLElement).textContent ?? '';

describe('ItemEditor', () => {
  it('só libera o salvar com nome, jogo e tipo', async () => {
    const { fixture, tela } = montar();
    await fixture.whenStable();

    // O jogo já veio da rota; falta nome e tipo.
    expect(tela.jogoId()).toBe('1');
    expect(tela.podeSalvar()).toBe(false);

    tela.onNome('Talismã do Lobo');
    expect(tela.podeSalvar()).toBe(false);

    (fixture.componentInstance as unknown as { tipo: { set: (t: string) => void } }).tipo.set(
      'TALISMAN',
    );
    expect(tela.podeSalvar()).toBe(true);
  });

  it('manda o passo escolhido como foundAtNodeId', async () => {
    const { fixture, tela, create } = montar();
    await fixture.whenStable();

    tela.onNome('Talismã do Lobo');
    (fixture.componentInstance as unknown as { tipo: { set: (t: string) => void } }).tipo.set(
      'TALISMAN',
    );
    tela.escolherGuia({ id: '9', title: 'Caminho para o Trono' });
    await fixture.whenStable();
    tela.escolherPasso({ id: '55', label: 'A ponte quebrada' });

    tela.salvar();

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Talismã do Lobo', gameId: 1, foundAtNodeId: 55 }),
    );
  });

  it('o mutirão mantém o jogo e limpa o resto', async () => {
    const { fixture, tela } = montar();
    await fixture.whenStable();

    tela.onNome('Talismã do Lobo');
    (fixture.componentInstance as unknown as { tipo: { set: (t: string) => void } }).tipo.set(
      'TALISMAN',
    );
    tela.salvarEProximo();
    fixture.detectChanges();

    expect(tela.jogoId()).toBe('1');
    expect(tela.nome()).toBe('');
    expect(tela.tipo()).toBeNull();
    expect(texto(fixture)).toContain('salvo. Próximo.');
  });

  it('erro de rede não limpa o formulário', async () => {
    const { fixture, tela } = montar({
      create: vi.fn(() => throwError(() => new Error('offline'))),
    });
    await fixture.whenStable();

    tela.onNome('Talismã do Lobo');
    (fixture.componentInstance as unknown as { tipo: { set: (t: string) => void } }).tipo.set(
      'TALISMAN',
    );
    tela.salvar();
    fixture.detectChanges();

    expect(tela.erroDeRede()).toBe(true);
    expect(tela.nome()).toBe('Talismã do Lobo');
    expect(texto(fixture)).toContain('nada foi perdido');
  });

  /**
   * O `PUT` substitui o item inteiro: sem devolver a chave, corrigir um typo apagaria a
   * arte de quem já tem uma. É o defeito que o teste existe para não deixar voltar.
   */
  it('editar preserva a imagem que já estava lá', async () => {
    const { fixture, tela, update } = montar({ itemId: '7' });
    await fixture.whenStable();

    expect(tela.nome()).toBe('Talismã do Punho de Ferro');
    expect(texto(fixture)).toContain('A ponte quebrada');

    tela.salvar();

    expect(update).toHaveBeenCalledWith(
      '7',
      expect.objectContaining({ imageFileKey: 'itens/7/capa.png', foundAtNodeId: 55 }),
    );
  });

  /** `DELETE /items/{id}` é `hasRole('ADMIN')`: para os outros o botão só daria 403. */
  it('quem não é admin não vê o excluir', async () => {
    const { fixture } = montar({ itemId: '7' });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto(fixture)).not.toContain('excluir item');
  });

  it('admin vê o excluir, e ele não dispara sem confirmação', async () => {
    const { fixture } = montar({ itemId: '7', admin: true });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto(fixture)).toContain('excluir item');
    expect(texto(fixture)).not.toContain('confirmar exclusão');
  });
});
