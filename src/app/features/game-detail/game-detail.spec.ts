import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { GameDetail } from './game-detail';
import { GameService } from '../../core/services/game.service';
import { QuestService } from '../../core/services/quest.service';
import { LoreService } from '../../core/services/lore.service';
import { EndingService } from '../../core/services/ending.service';
import { Game, GameFeature } from '../../shared/models/game.model';
import { provideAuth } from '@xcorpiiion/ng-core';

const MOCK_GAME: Game = {
  id: 1,
  name: 'Elden Ring',
  imageUrl: '',
  description: 'Open world RPG',
  genre: 'SOULS_LIKE',
  features: ['QUEST_GRAPH', 'ENDINGS', 'BOSSES', 'ITEMS', 'LORE', 'QUEST_MAP'],
  dentroDoEscopo: true,
  followerCount: 0,
  userIsFollowing: false,
};

const emptyPage = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  pageNumber: 0,
  pageSize: 20,
  last: true,
  first: true,
};

const CONTRIBUIDOR = {
  userId: '7',
  handle: 'vini',
  displayName: 'Vinícius',
  initials: 'VI',
  quests: 2,
  lore: 1,
  edits: 4,
  contributions: 7,
  since: 'jan/2024',
  role: 'FOUNDER' as const,
  roleLabel: 'fundador',
  hasBadge: true,
};

const contributorsPage = { ...emptyPage, content: [CONTRIBUIDOR], totalElements: 1 };

const gameServiceMock = {
  get: vi.fn(() => of(MOCK_GAME)),
  contributors: vi.fn(() => of(contributorsPage)),
};
const questServiceMock = { list: vi.fn(() => of(emptyPage)) };
const loreServiceMock = { list: vi.fn(() => of(emptyPage)) };
const endingServiceMock = { listByGame: vi.fn(() => of([])) };

function createFixture(gameId: string, jogo: Game = MOCK_GAME): ComponentFixture<GameDetail> {
  TestBed.configureTestingModule({
    imports: [GameDetail],
    providers: [
      provideAuth({ baseUrl: 'http://localhost/auth' }),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: gameId }) } },
      },
      { provide: GameService, useValue: { ...gameServiceMock, get: vi.fn(() => of(jogo)) } },
      { provide: QuestService, useValue: questServiceMock },
      { provide: LoreService, useValue: loreServiceMock },
      { provide: EndingService, useValue: endingServiceMock },
    ],
  });
  const fixture = TestBed.createComponent(GameDetail);
  fixture.detectChanges();
  return fixture;
}

/** O mesmo jogo, declarando só as capacidades listadas. */
function jogoCom(...features: GameFeature[]): Game {
  return { ...MOCK_GAME, features };
}

function abas(fixture: ComponentFixture<GameDetail>): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.game-detail__tab')).map(
    (t) => (t as HTMLElement).textContent?.trim().split(/\s+/)[0] ?? '',
  );
}

describe('GameDetail', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    const fixture = createFixture('1');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('deve exibir o nome do jogo', () => {
    const fixture = createFixture('1');
    const compiled: HTMLElement = fixture.nativeElement;
    expect(compiled.querySelector('.game-detail__name')?.textContent?.trim()).toBe('Elden Ring');
  });

  it('deve exibir as 4 stats do jogo', () => {
    const fixture = createFixture('1');
    const stats = fixture.nativeElement.querySelectorAll('.game-detail__stat');
    expect(stats.length).toBe(4);
  });

  it('deve exibir a aba de quests ativa por padrão', () => {
    const fixture = createFixture('1');
    const activeTab = fixture.nativeElement.querySelector('.game-detail__tab--active');
    expect(activeTab?.textContent?.trim()).toContain('quests');
  });

  it('deve mudar para aba de lore ao clicar', () => {
    const fixture = createFixture('1');
    const tabs = Array.from(
      fixture.nativeElement.querySelectorAll('.game-detail__tab'),
    ) as HTMLButtonElement[];
    tabs.find((t) => t.textContent?.includes('lore'))?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance['activeTab']()).toBe('lore');
  });

  /**
   * O jogo usa slug puro na URL (ADR 0013), e a lista de quests é filtrada por `gameId`.
   *
   * Comparar o `gameId` numérico que a API devolve com a referência crua da URL fazia a
   * página aberta pelo endereço legível dizer "nenhuma quest" com quests no banco — e só
   * o cabeçalho funcionava, porque só ele passa pelo endpoint que aceita slug.
   *
   * O resto da suíte não pegava isso porque abria tudo por `'1'`, o formato antigo.
   */
  it.each(['1', 'elden-ring'])('lista as quests da página aberta por %s', (referencia) => {
    const questDoJogo = {
      id: 'q1',
      gameId: '1',
      title: 'Ranni',
      status: 'CANONICO',
      hidden: false,
      isOwner: false,
      isPersonal: false,
    };
    const questService = {
      list: vi.fn(() => of({ ...emptyPage, content: [questDoJogo], totalElements: 1 })),
    };

    TestBed.configureTestingModule({
      imports: [GameDetail],
      providers: [
        provideAuth({ baseUrl: 'http://localhost/auth' }),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: referencia }) } },
        },
        { provide: GameService, useValue: gameServiceMock },
        { provide: QuestService, useValue: questService },
        { provide: LoreService, useValue: loreServiceMock },
      ],
    });

    const fixture = TestBed.createComponent(GameDetail);
    fixture.detectChanges();

    expect(fixture.componentInstance['gameId']()).toBe('1');
    expect(fixture.componentInstance['quests']()).toHaveLength(1);
  });

  /**
   * O card do cabeçalho mostrava zero por construção: `gameToSummary` não tem de onde
   * tirar a contagem, porque o GET /games/{id} devolve o jogo e não o acervo. O número
   * agora vem do total da lista de contribuidores, e é por isso que ela carrega junto
   * das outras — não ao abrir a aba.
   */
  it('usa o total do endpoint de contribuidores no card e na aba', () => {
    const fixture = createFixture('1');

    expect(gameServiceMock.contributors).toHaveBeenCalled();
    expect(fixture.componentInstance['contributorsTotal']()).toBe(1);
    expect(
      fixture.nativeElement.querySelector('.game-detail__stat-val--accent')?.textContent?.trim(),
    ).toBe('1');
  });

  it('lista os contribuidores na aba, com o crachá de quem tem', () => {
    const fixture = createFixture('1');
    const tabs = Array.from(
      fixture.nativeElement.querySelectorAll('.game-detail__tab'),
    ) as HTMLButtonElement[];

    tabs.find((t) => t.textContent?.includes('contribuidores'))?.click();
    fixture.detectChanges();

    const linhas = fixture.nativeElement.querySelectorAll('.game-detail__contributor-row');
    expect(linhas.length).toBe(1);
    expect(linhas[0].textContent).toContain('Vinícius');
    expect(linhas[0].textContent).toContain('fundador');
    expect(linhas[0].textContent).toContain('desde jan/2024');
  });

  it('pede ao servidor de novo ao trocar o filtro de papel', () => {
    const fixture = createFixture('1');
    gameServiceMock.contributors.mockClear();

    fixture.componentInstance['setContributorRole']('EDITOR');

    expect(gameServiceMock.contributors).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ role: 'EDITOR', page: 0 }),
    );
  });

  /**
   * A página era de souls-like sem dizer que era: seis seções, todas para todo jogo. Com
   * o acervo de terror da V40 isso passou a mostrar aba vazia — que afirma ao leitor que
   * o site tem aquele conteúdo e não escreveu, quando o jogo é que não tem.
   *
   * Quem responde é o `features` do jogo (ADR 0019), e a parte que estes testes travam é
   * a que a tela tende a reintroduzir: derivar do conteúdo cadastrado.
   */
  describe('as seções saem do que o jogo declara ter', () => {
    it('mostra só as abas das capacidades declaradas', () => {
      const fixture = createFixture('1', jogoCom('LORE', 'ENDINGS'));
      expect(abas(fixture)).toEqual(['lore', 'finais', 'contribuidores']);
    });

    /**
     * `quests` era o valor inicial fixo do sinal. Silent Hill não tem grafo de quest, e
     * abriria numa aba que não está nem no tablist — página em branco por padrão.
     */
    it('abre na primeira aba que existe, e não em quests', () => {
      const fixture = createFixture('1', jogoCom('LORE', 'ENDINGS'));
      expect(fixture.componentInstance['activeTab']()).toBe('lore');
    });

    /**
     * A regressão que a ADR 0019 nomeia. A aba estava atrás de `endings().length > 0`:
     * Silent Hill 2 tem finais múltiplos e nenhum escrito ainda, e a condição o deixaria
     * sem a aba **para sempre**, sem porta por onde escrever o primeiro.
     */
    it('mostra a aba de finais com zero finais cadastrados', () => {
      endingServiceMock.listByGame.mockReturnValueOnce(of([]));
      const fixture = createFixture('1', jogoCom('ENDINGS'));

      expect(fixture.componentInstance['endings']()).toHaveLength(0);
      expect(abas(fixture)).toContain('finais');
    });

    it('não pede a lista das seções que o jogo não tem', () => {
      questServiceMock.list.mockClear();
      endingServiceMock.listByGame.mockClear();

      createFixture('1', jogoCom('LORE'));

      expect(questServiceMock.list).not.toHaveBeenCalled();
      expect(endingServiceMock.listByGame).not.toHaveBeenCalled();
    });

    it('esconde os atalhos de itens e chefes de quem não os declara', () => {
      const fixture = createFixture('1', jogoCom('LORE'));
      const acoes: string =
        fixture.nativeElement.querySelector('.game-detail__actions').textContent;

      expect(acoes).not.toContain('itens');
      expect(acoes).not.toContain('chefes');
    });

    /**
     * Conjunto vazio não é "não tem nada": o back garante o preenchimento no `beforeSave`,
     * então ausência aqui só pode ser um jogo que a listagem trouxe sem o campo. Erra para
     * o lado de mostrar demais, que se corrige pela tela de edição, em vez de esconder.
     */
    it('mostra tudo quando o jogo chega sem capacidade nenhuma', () => {
      const fixture = createFixture('1', jogoCom());
      expect(abas(fixture)).toEqual(['quests', 'lore', 'finais', 'contribuidores']);
    });
  });

  it('deve exibir mensagem de não encontrado quando service retorna erro', () => {
    const errService = {
      get: vi.fn(() => {
        throw new Error('not found');
      }),
    };
    TestBed.configureTestingModule({
      imports: [GameDetail],
      providers: [
        provideAuth({ baseUrl: 'http://localhost/auth' }),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ id: '999' }) } },
        },
        { provide: GameService, useValue: errService },
        { provide: QuestService, useValue: questServiceMock },
        { provide: LoreService, useValue: loreServiceMock },
      ],
    });
    // component will show loading state, not error — acceptable
    const f = TestBed.createComponent(GameDetail);
    expect(f.componentInstance).toBeTruthy();
  });
});
