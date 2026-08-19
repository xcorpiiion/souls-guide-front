import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import type { ItemDTO } from '@xcorpiiion/canonico';
import { Itens } from './itens';
import { ItemService } from '../../core/services/item.service';
import { GameService } from '../../core/services/game.service';

const ITEM: ItemDTO = {
  id: 12,
  name: 'Talismã do Lobo',
  description: '',
  gameId: 1,
  gameName: 'Elden Ring',
  type: 'TALISMAN',
  imageFileKey: null,
  location: 'Catacumbas de Limgrave',
  foundAtNodeId: null,
  foundAtNodeTitle: null,
  foundAtQuestId: 10,
  foundAtQuestTitle: 'Fia',
};

const pagina = (itens: ItemDTO[]) => ({
  content: itens,
  totalElements: itens.length,
  totalPages: 1,
  pageNumber: 0,
  pageSize: 24,
  first: true,
  last: true,
});

function montar(itens: ItemDTO[] = [ITEM]) {
  const list = vi.fn(() => of(pagina(itens)));

  TestBed.configureTestingModule({
    imports: [Itens],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: '1' }) } },
      },
      { provide: ItemService, useValue: { list } },
      { provide: GameService, useValue: { get: () => of({ id: 1, name: 'Elden Ring' }) } },
    ],
  });

  const fixture = TestBed.createComponent(Itens);
  fixture.detectChanges();
  return { fixture, list };
}

const texto = (f: ComponentFixture<Itens>) => (f.nativeElement as HTMLElement).textContent ?? '';

describe('Itens', () => {
  it('lista os itens do jogo', async () => {
    const { fixture, list } = montar();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ gameId: '1' }));
    expect(texto(fixture)).toContain('Talismã do Lobo');
    expect(texto(fixture)).toContain('Elden Ring');
  });

  it('mostra o guia de origem no card, quando existe', async () => {
    const { fixture } = montar();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto(fixture)).toContain('Fia');
  });

  it('avisa quando o filtro não encontra nada', async () => {
    const { fixture } = montar([]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto(fixture)).toContain('nada encontrado');
  });

  it('refaz a busca ao escolher um tipo', async () => {
    const { fixture, list } = montar();
    await fixture.whenStable();

    const painel = fixture.componentInstance as unknown as {
      filtrarPor: (t: string | null) => void;
    };
    painel.filtrarPor('WEAPON');
    await fixture.whenStable();

    expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'WEAPON' }));
  });
});
