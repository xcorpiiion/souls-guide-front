import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { ItemService } from './item.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apis.soulsGuide}/items`;

const PAGINA = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  pageNumber: 0,
  pageSize: 24,
  first: true,
  last: true,
};

describe('ItemService', () => {
  let service: ItemService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(ItemService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista com paginação padrão', () => {
    service.list().subscribe();

    const req = http.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('24');
    req.flush(PAGINA);
  });

  it('manda jogo, tipo e busca quando existem', () => {
    service.list({ gameId: '7', type: 'WEAPON', q: 'lobo' }).subscribe();

    const req = http.expectOne((r) => r.url === BASE);
    expect(req.request.params.get('gameId')).toBe('7');
    expect(req.request.params.get('type')).toBe('WEAPON');
    expect(req.request.params.get('q')).toBe('lobo');
    req.flush(PAGINA);
  });

  // Parâmetro vazio na URL não é o mesmo que ausente: o back trataria "" como filtro.
  it('omite filtro que não foi escolhido', () => {
    service.list({ gameId: '7', type: null, q: '' }).subscribe();

    const req = http.expectOne((r) => r.url === BASE);
    expect(req.request.params.has('type')).toBe(false);
    expect(req.request.params.has('q')).toBe(false);
    req.flush(PAGINA);
  });

  it('busca um item pelo id', () => {
    service.get('12').subscribe();

    const req = http.expectOne(`${BASE}/12`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 12, name: 'Talismã', description: '' });
  });
});
