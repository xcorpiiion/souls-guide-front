import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { ToastService } from '@xcorpiiion/ui';
import { LoreEdicao } from './lore-edicao';
import { LoreService } from '../../core/services/lore.service';
import { PersonalLoreService } from '../../core/services/personal-lore.service';
import { StoryArchiveService } from '../../core/services/story-archive.service';
import { LoreApi } from '../../shared/models/lore-article.model';

const ARTIGO = {
  id: 3,
  title: 'Teste',
  content: '> teste\n— teste · nota, sem capítulo',
  type: 'WORLD',
  gameId: 53,
  gameName: 'Silent Hill f',
  isPersonal: true,
  isPublic: false,
} as LoreApi;

let lore: { get: ReturnType<typeof vi.fn> };
let arquivo: { archive: ReturnType<typeof vi.fn> };

function criar(): ComponentFixture<LoreEdicao> {
  TestBed.configureTestingModule({
    imports: [LoreEdicao],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: '3' }) } },
      },
      { provide: LoreService, useValue: lore },
      { provide: PersonalLoreService, useValue: {} },
      { provide: StoryArchiveService, useValue: arquivo },
      { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
    ],
  });
  const fixture = TestBed.createComponent(LoreEdicao);
  fixture.detectChanges();
  return fixture;
}

function texto(f: ComponentFixture<LoreEdicao>): string {
  return (f.nativeElement as HTMLElement).textContent ?? '';
}

describe('LoreEdicao', () => {
  beforeEach(() => {
    lore = { get: vi.fn(() => of(ARTIGO)) };
    arquivo = { archive: vi.fn(() => of({ gameId: 53, findings: [], links: [], characters: [] })) };
  });

  it('abre a lore no montar lore, e não num editor à parte', () => {
    const f = criar();
    expect(arquivo.archive).toHaveBeenCalledWith(53);
    expect(f.nativeElement.querySelector('app-montar-lore')).not.toBeNull();
    expect(texto(f)).toContain('citação · teste · nota, sem capítulo');
  });

  /** Rascunho é lore só da pessoa: guardar no perfil vem primeiro, publicar para todos depois. */
  it('rascunho oferece guardar no perfil e publicar para todos', () => {
    const f = criar();
    expect(texto(f)).toContain('guardar no meu perfil');
    expect(texto(f)).toContain('publicar para todos');
    expect(texto(f)).toContain('só você');
  });

  /** O arquivo é acessório: sem ele a lore abre igual, só sem achados para citar. */
  it('arquivo que não carrega não impede a edição', () => {
    arquivo.archive.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409 })));
    const f = criar();
    expect(f.nativeElement.querySelector('app-montar-lore')).not.toBeNull();
  });

  it('lore de outra pessoa, ou apagada, não abre', () => {
    lore.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 403 })));
    const f = criar();
    expect(texto(f)).toContain('esta lore não abriu para edição');
  });

  it('sem alteração, sair não pergunta nada', () => {
    const f = criar();
    expect(f.componentInstance.hasUnsavedChanges()).toBe(false);
  });
});
