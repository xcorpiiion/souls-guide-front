import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { AuthService } from '@xcorpiiion/ng-core';
import { ConfirmService, ToastService } from '@xcorpiiion/ui';
import type { StoryArchiveDTO, StoryFindingDTO, StoryLinkDTO } from '@xcorpiiion/canonico';
import { MeuArquivo } from './meu-arquivo';
import { StoryArchiveService } from '../../core/services/story-archive.service';

// Conteúdo fictício — o mesmo do artboard, para não dar spoiler de jogo nenhum.
function achado(id: number, title: string, chapter: string | null, body?: string): StoryFindingDTO {
  return {
    id,
    gameId: 7,
    kind: 'NOTE',
    title,
    body: body ?? `${title}, primeira linha.\nsegunda linha.`,
    chapter,
    speaker: null,
    note: null,
    createdAt: '2026-09-13T20:00:00Z',
    characterIds: [],
    lines: [],
  };
}

const ACHADOS: StoryFindingDTO[] = [
  achado(
    1,
    'Bilhete dobrado no armário',
    'Cap. 1 — Escola',
    'Não volte pela ponte depois que o sino tocar.',
  ),
  achado(2, 'Diário da enfermaria', 'Cap. 2 — Hospital'),
  achado(3, 'Conversa com a mulher de branco', 'Cap. 2 — Hospital'),
  achado(4, 'O sino na praça', 'Cap. 3 — Vila', 'A corda do sino ainda balança.'),
  achado(5, 'Página solta sem cabeçalho', null, 'trinta e sete. trinta e oito.'),
];

const LIGACOES: StoryLinkDTO[] = [
  { id: 10, fromId: 1, toId: 4, kind: 'HAPPENS_BEFORE', why: 'o bilhete avisa sobre o sino' },
  { id: 11, fromId: 2, toId: 3, kind: 'SAME_SUBJECT', why: null },
  { id: 12, fromId: 3, toId: 1, kind: 'CONTRADICTS', why: null },
];

const ARQUIVO: StoryArchiveDTO = {
  gameId: 7,
  space: 'COMMUNITY',
  findings: ACHADOS,
  links: LIGACOES,
  characters: [],
};

let service: { archive: ReturnType<typeof vi.fn>; register: ReturnType<typeof vi.fn> };

function criar(
  logado = true,
  arquivo: StoryArchiveDTO = ARQUIVO,
  espaco: 'COMMUNITY' | 'PROFILE' = 'COMMUNITY',
): ComponentFixture<MeuArquivo> {
  service = {
    archive: vi.fn(() => of(arquivo)),
    register: vi.fn((_: string, r: { title: string; body: string }) =>
      of({ ...achado(99, r.title, null, r.body) }),
    ),
  };
  TestBed.configureTestingModule({
    imports: [MeuArquivo],
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { isLoggedIn: signal(logado), userId: signal('1') } },
      { provide: StoryArchiveService, useValue: service },
      { provide: ConfirmService, useValue: { ask: vi.fn(() => of(false)) } },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(MeuArquivo);
  fixture.componentRef.setInput('gameId', '7');
  fixture.componentRef.setInput('espaco', espaco);
  // A primeira passada roda o effect que pede o arquivo; a segunda desenha o que chegou.
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

describe('MeuArquivo', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('convida a entrar quem não está logado, sem pedir o arquivo', () => {
    const fixture = criar(false);

    expect(fixture.nativeElement.textContent).toContain('seu arquivo é só seu');
    expect(service.archive).not.toHaveBeenCalled();
  });

  /**
   * A espinha segura a escala: cada capítulo com a contagem e a marca de peça solta, e "sem
   * capítulo" separado no fim — é o estado de uma página sem cabeçalho, não um lugar da
   * história.
   */
  describe('o que já serve', () => {
    const tem = (f: ComponentFixture<MeuArquivo>, seletor: string) =>
      (f.nativeElement as HTMLElement).querySelector(seletor) !== null;

    /** Com um achado só, filtro, busca e capítulos seriam controle sem uso. */
    it('com um achado, a mesa mostra o guia e esconde o que ainda não serve', () => {
      const f = criar(true, {
        gameId: 7,
        space: 'COMMUNITY',
        findings: [ACHADOS[0]],
        links: [],
        characters: [],
      });
      expect(tem(f, 'app-guia-do-arquivo .guia')).toBe(true);
      expect(tem(f, '.busca')).toBe(false);
      expect(tem(f, '.filtrar')).toBe(false);
      expect(tem(f, '.capitulos')).toBe(false);
      expect(tem(f, '.ferramentas__montar')).toBe(true);
    });

    it('com cinco achados em capítulos diferentes, aparecem busca e capítulos', () => {
      const f = criar();
      expect(tem(f, '.busca')).toBe(true);
      expect(tem(f, '.capitulos')).toBe(true);
      expect(tem(f, '.filtrar')).toBe(false);
    });

    it('o passo "registre" do guia abre o registro', () => {
      const f = criar(true, {
        gameId: 7,
        space: 'COMMUNITY',
        findings: [],
        links: [],
        characters: [],
      });
      (f.nativeElement as HTMLElement)
        .querySelector<HTMLButtonElement>('app-guia-do-arquivo .passo__acao')!
        .click();
      f.detectChanges();
      expect(f.componentInstance['tela']()).toBe('registrar');
    });
  });

  it('a espinha conta por capítulo e marca onde há peça solta', () => {
    const espinha = criar().componentInstance['espinha']();

    expect(espinha.capitulos).toEqual([
      { nome: 'Cap. 1 — Escola', total: 1, solta: false },
      { nome: 'Cap. 2 — Hospital', total: 2, solta: false },
      { nome: 'Cap. 3 — Vila', total: 1, solta: false },
    ]);
    expect(espinha.semCapitulo).toBe(1);
    expect(espinha.semCapituloSolta).toBe(true);
  });

  it('o primeiro toque acende a ficha e mostra os fios; o segundo a abre', () => {
    const c = criar().componentInstance;

    c['tocarFicha'](1);
    expect(c['tela']()).toBe('visao-geral');
    expect(c['fiosDaSelecionada']().map((f) => f.short)).toEqual(['acontece antes', 'contradiz']);

    c['tocarFicha'](1);
    expect(c['tela']()).toBe('detalhe');
    expect(c['detalhe']()?.id).toBe(1);
  });

  /**
   * A ligação é gravada numa direção só. Sem a inversão, o sino diria que acontece ANTES do
   * bilhete, e o bilhete que acontece antes do sino — os dois vindo antes um do outro.
   */
  it('"acontece antes" lida a partir do destino vira "acontece depois"', () => {
    const c = criar().componentInstance;

    c['abrirAchado'](1);
    expect(c['ligacoesDoDetalhe']()[0].label).toBe('acontece antes');

    c['abrirAchado'](4);
    expect(c['ligacoesDoDetalhe']()[0].label).toBe('acontece depois');
  });

  it('a busca diz quantos bateram sobre quantos havia, e o capítulo recorta os dois', () => {
    const c = criar().componentInstance;

    c['buscar']('sino');
    expect(c['contagemDaBusca']()).toBe('2 de 5');

    c['escolherCapitulo']('Cap. 3 — Vila');
    expect(c['contagemDaBusca']()).toBe('1 de 1');
  });

  it('com busca num capítulo, as fichas que não bateram ficam recolhidas até pedir', () => {
    const c = criar().componentInstance;
    c['escolherCapitulo']('Cap. 2 — Hospital');
    c['buscar']('diário');

    expect(c['fichas']().map((a) => a.id)).toEqual([2]);
    expect(c['naoBateram']().map((a) => a.id)).toEqual([3]);

    c['mostrarOsOutros'].set(true);
    expect(c['fichas']().map((a) => a.id)).toEqual([2, 3]);
  });

  it('o registro cai no capítulo escolhido na espinha, e sem escolha no último usado', () => {
    const c = criar().componentInstance;

    c['irParaRegistrar']();
    // O último achado não tem capítulo; o último capítulo USADO é o da vila.
    expect(c['formCapitulo']()).toBe('Cap. 3 — Vila');

    c['escolherCapitulo']('Cap. 1 — Escola');
    c['irParaRegistrar']();
    expect(c['formCapitulo']()).toBe('Cap. 1 — Escola');
  });

  it('colar na faixa leva ao registro com o texto inteiro, quebras de linha incluídas', () => {
    const c = criar().componentInstance;
    const texto = 'MULHER: Você já esteve aqui.\n\nEU: Nunca estive.';
    const evento = {
      clipboardData: { getData: () => texto },
      preventDefault: vi.fn(),
    } as unknown as ClipboardEvent;

    c['colarNaFaixa'](evento);

    expect(c['tela']()).toBe('registrar');
    expect(c['formTexto']()).toBe(texto);
  });

  /** ADR 0035 da API: o perfil tem o próprio arquivo, e nada dele aparece na mesa da lore. */
  describe('no perfil', () => {
    it('lê e registra no arquivo do perfil', () => {
      const c = criar(true, ARQUIVO, 'PROFILE').componentInstance;
      expect(service.archive).toHaveBeenCalledWith('7', 'PROFILE');

      c['irParaRegistrar']('Bilhete só meu.');
      c['salvar'](false);

      expect(service.register).toHaveBeenCalledWith('7', expect.anything(), 'PROFILE');
    });

    it('o rascunho do perfil não abre na mesa da lore', () => {
      const perfil = criar(true, ARQUIVO, 'PROFILE').componentInstance;
      // Colar já guarda o rascunho.
      perfil['irParaRegistrar']('colado no perfil');

      TestBed.resetTestingModule();
      const lore = criar().componentInstance;
      lore['irParaRegistrar']();
      expect(lore['formTexto']()).not.toContain('colado no perfil');
    });
  });

  /** "Vazio, o título vira a primeira linha do texto" — e o servidor exige título. */
  it('salvar sem título manda a primeira linha do texto como título', () => {
    const c = criar().componentInstance;
    c['irParaRegistrar']('A névoa se abre e a praça está vazia.\nA corda ainda balança.');

    c['salvar'](false);

    expect(service.register).toHaveBeenCalledWith(
      '7',
      expect.objectContaining({ title: 'A névoa se abre e a praça está vazia.' }),
      'COMMUNITY',
    );
  });

  /** ADR 0033: o diálogo é fala a fala, e quem fala passa a estar presente sem escolher de novo. */
  it('diálogo sem texto salva as falas, e quem fala entra nos presentes', () => {
    const c = criar().componentInstance;
    c['elenco'].set([
      {
        id: 9,
        gameId: 7,
        kind: 'CHARACTER',
        name: 'Mulher de branco',
        description: null,
        bossId: null,
      },
    ]);
    c['irParaRegistrar']();
    c['escolherTipo']('DIALOGUE');
    const [vazia] = c['formFalas']();
    c['mudarFalas']([{ ...vazia, characterId: 9, text: 'Você já esteve aqui.' }]);

    c['salvar'](false);

    expect(service.register).toHaveBeenCalledWith(
      '7',
      expect.objectContaining({
        kind: 'DIALOGUE',
        title: 'Você já esteve aqui.',
        characterIds: [9],
        authorId: undefined,
        lines: [{ characterId: 9, speaker: undefined, text: 'Você já esteve aqui.' }],
      }),
      'COMMUNITY',
    );
  });

  it('"talvez ligue a" aponta quem repete uma palavra e ainda não está ligado', () => {
    const c = criar().componentInstance;

    // O sino (4) já está ligado ao bilhete (1), que também cita "sino": não há sugestão.
    c['abrirAchado'](4);
    expect(c['sugestoes']()).toBeNull();
  });
});
