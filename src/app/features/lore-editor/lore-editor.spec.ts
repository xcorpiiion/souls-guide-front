import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { LoreEditor } from './lore-editor';
import { LoreService } from '../../core/services/lore.service';
import { GameService } from '../../core/services/game.service';
import { LoreApi } from '../../shared/models/lore-article.model';

const MOCK_LORE_API: LoreApi = {
  id: 7,
  title: 'Ranni, a Bruxa das Estrelas',
  content: 'Conteúdo original do artigo.',
  status: 'CANONICO',
  type: 'CHARACTER',
  characterName: 'Ranni',
  tags: ['magia', 'lua'],
  userId: 'vincruz',
  gameId: 1,
  gameName: 'Elden Ring',
  items: [],
  isPersonal: false,
  ownerId: null,
  isPublic: true,
  allowCopy: true,
  likeCount: 5,
  userHasLiked: false,
  followerCount: 3,
  userIsFollowing: false,
};

function createFixture(id: string, loreMock?: Partial<LoreService>): ComponentFixture<LoreEditor> {
  const loreServiceMock = loreMock ?? {
    get: vi.fn(() => of(MOCK_LORE_API)),
    update: vi.fn(),
  };
  TestBed.configureTestingModule({
    imports: [LoreEditor],
    providers: [
      provideRouter([{ path: 'lore/:id', component: LoreEditor }]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id }) } },
      },
      { provide: LoreService, useValue: loreServiceMock },
      { provide: GameService, useValue: { search: vi.fn(() => of([])) } },
    ],
  });
  const fixture = TestBed.createComponent(LoreEditor);
  fixture.detectChanges();
  return fixture;
}

describe('LoreEditor', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    const fixture = createFixture('7');
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('pré-preenche o formulário com os dados do artigo', () => {
    const fixture = createFixture('7');
    const comp = fixture.componentInstance as any;
    expect(comp.form.value.title).toBe(MOCK_LORE_API.title);
    expect(comp.form.value.content).toBe(MOCK_LORE_API.content);
    expect(comp.form.value.characterName).toBe(MOCK_LORE_API.characterName);
  });

  it('define loreType como "character" quando type=CHARACTER', () => {
    const fixture = createFixture('7');
    const comp = fixture.componentInstance as any;
    expect(comp.loreType()).toBe('character');
  });

  it('define loreType como "world" quando type=WORLD', () => {
    const api = { ...MOCK_LORE_API, type: 'WORLD' as const, characterName: null };
    const svcMock = { get: vi.fn(() => of(api)), update: vi.fn() };
    const fixture = createFixture('7', svcMock);
    const comp = fixture.componentInstance as any;
    expect(comp.loreType()).toBe('world');
  });

  it('carrega as tags do artigo', () => {
    const fixture = createFixture('7');
    const comp = fixture.componentInstance as any;
    expect(comp.tags()).toEqual(['magia', 'lua']);
  });

  it('exibe o título do jogo pré-selecionado', () => {
    const fixture = createFixture('7');
    const comp = fixture.componentInstance as any;
    expect(comp.gameQuery()).toBe('Elden Ring');
    expect(comp.selectedGame()?.name).toBe('Elden Ring');
  });

  it('exibe erro quando o artigo não é encontrado', () => {
    const svcMock = { get: vi.fn(() => throwError(() => ({ status: 404 }))), update: vi.fn() };
    const fixture = createFixture('inexistente', svcMock);
    const comp = fixture.componentInstance as any;
    expect(comp.errorMsg()).toBeTruthy();
    expect(comp.loading()).toBe(false);
  });

  it('hasUnsavedChanges retorna false antes de editar', () => {
    const fixture = createFixture('7');
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('hasUnsavedChanges retorna true após dirty no formulário', () => {
    const fixture = createFixture('7');
    const comp = fixture.componentInstance as any;
    comp.form.markAsDirty();
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });

  it('chama update() com os dados corretos ao salvar', () => {
    const updateResp = { ...MOCK_LORE_API, title: 'Novo título' };
    const svcMock = {
      get: vi.fn(() => of(MOCK_LORE_API)),
      update: vi.fn(() => of(updateResp)),
    };
    const fixture = createFixture('7', svcMock);
    const comp = fixture.componentInstance as any;
    comp.form.patchValue({ title: 'Novo título' });
    comp.submit();
    expect(svcMock.update).toHaveBeenCalledWith(
      '7',
      expect.objectContaining({ title: 'Novo título', type: 'CHARACTER' }),
    );
  });

  it('exibe mensagem de erro quando update() falha', () => {
    const svcMock = {
      get: vi.fn(() => of(MOCK_LORE_API)),
      update: vi.fn(() => throwError(() => ({ status: 500 }))),
    };
    const fixture = createFixture('7', svcMock);
    const comp = fixture.componentInstance as any;
    comp.submit();
    expect(comp.errorMsg()).toBeTruthy();
    expect(comp.saving()).toBe(false);
  });

  it('não chama update() quando formulário é inválido', () => {
    const svcMock = {
      get: vi.fn(() => of(MOCK_LORE_API)),
      update: vi.fn(() => of(MOCK_LORE_API)),
    };
    const fixture = createFixture('7', svcMock);
    const comp = fixture.componentInstance as any;
    comp.form.patchValue({ title: '' });
    comp.submit();
    expect(svcMock.update).not.toHaveBeenCalled();
  });
});
