import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, it, expect } from 'vitest';
import { of, throwError } from 'rxjs';
import type { ItemDTO } from '@xcorpiiion/canonico';
import { AuthService } from '@xcorpiiion/ng-core';
import { ItemDetail } from './item-detail';
import { ItemService } from '../../core/services/item.service';
import { StorageService } from '../../core/services/storage.service';

const ITEM: ItemDTO = {
  id: 12,
  name: 'Talismã do Lobo',
  description: 'Aumenta o dano de investida.',
  gameId: 1,
  gameName: 'Elden Ring',
  type: 'TALISMAN',
  imageFileKey: 'k1',
  location: 'Catacumbas de Limgrave, atrás da parede falsa',
  foundAtNodeId: 100,
  foundAtNodeTitle: 'Falar com Fia',
  foundAtQuestId: 10,
  foundAtQuestTitle: 'Fia, a Amante da Morte',
};

const STORAGE = { previewUrl: (k: string) => `/storage-api/files/${k}/preview` };

function montar(resposta: unknown): ComponentFixture<ItemDetail> {
  TestBed.configureTestingModule({
    imports: [ItemDetail],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ id: '12' }) } },
      },
      { provide: ItemService, useValue: { get: () => resposta } },
      { provide: StorageService, useValue: STORAGE },
      { provide: AuthService, useValue: { isLoggedIn: () => true } },
    ],
  });

  const fixture = TestBed.createComponent(ItemDetail);
  fixture.detectChanges();
  return fixture;
}

const texto = (f: ComponentFixture<ItemDetail>) =>
  (f.nativeElement as HTMLElement).textContent ?? '';

describe('ItemDetail', () => {
  it('mostra o item, o tipo e onde encontrar', () => {
    const fixture = montar(of(ITEM));

    expect(texto(fixture)).toContain('Talismã do Lobo');
    expect(texto(fixture)).toContain('talismã');
    expect(texto(fixture)).toContain('Catacumbas de Limgrave');
  });

  /**
   * O caminho de volta para o guia é o que o catálogo tem e uma lista de itens solta não
   * tem — é o motivo de a página existir.
   */
  it('liga o item ao passo do guia onde ele aparece', () => {
    const fixture = montar(of(ITEM));
    const link = (fixture.nativeElement as HTMLElement).querySelector('.item__guia');

    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('/games/1/quests/10');
    expect(texto(fixture)).toContain('Falar com Fia');
  });

  it('não mostra o bloco de guia quando ninguém ligou o item a um passo', () => {
    const fixture = montar(of({ ...ITEM, foundAtQuestId: null, foundAtNodeTitle: null }));

    expect((fixture.nativeElement as HTMLElement).querySelector('.item__guia')).toBeNull();
    expect(texto(fixture)).toContain('Catacumbas de Limgrave');
  });

  it('usa o endereço estável da imagem, e não uma URL assinada', () => {
    const fixture = montar(of(ITEM));
    const img = (fixture.nativeElement as HTMLElement).querySelector('img');

    expect(img!.getAttribute('src')).toBe('/storage-api/files/k1/preview');
  });

  it('mostra recado quando o item não existe', () => {
    const fixture = montar(throwError(() => ({ status: 404 })));

    expect(texto(fixture)).toContain('Item não encontrado');
  });
});
