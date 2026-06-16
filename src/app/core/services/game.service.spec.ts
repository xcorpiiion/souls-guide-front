import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { GameService } from './game.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apis.soulsGuide}/games`;

const PAGE_STUB = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 12,
  first: true,
  last: true,
};

describe('GameService', () => {
  let service: GameService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(GameService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('list()', () => {
    it('chama GET /games com page e size', () => {
      service.list(0, 12).subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('12');
      expect(req.request.params.has('name')).toBe(false);
      req.flush(PAGE_STUB);
    });

    it('inclui param name quando fornecido', () => {
      service.list(0, 12, 'elden').subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('name')).toBe('elden');
      req.flush(PAGE_STUB);
    });

    it('não inclui param name quando vazio', () => {
      service.list(1, 12, undefined).subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.has('name')).toBe(false);
      expect(req.request.params.get('page')).toBe('1');
      req.flush(PAGE_STUB);
    });

    it('mapeia content via gameToSummary', () => {
      let result: any;
      service.list().subscribe((p) => (result = p));
      http
        .expectOne((r) => r.url === BASE)
        .flush({
          ...PAGE_STUB,
          content: [{ id: 1, name: 'Elden Ring', imageUrl: '', description: '' }],
          totalElements: 1,
        });
      expect(result.content[0].id).toBe('1');
      expect(result.content[0].name).toBe('Elden Ring');
    });
  });

  describe('getFeatured()', () => {
    it('chama GET /games/featured', () => {
      service.getFeatured().subscribe();
      const req = http.expectOne(`${BASE}/featured`);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('retorna array de FeaturedGame', () => {
      const stub = [{ id: 1, name: 'Elden Ring', shortName: 'EL', questCount: 5, loreCount: 3 }];
      let result: any;
      service.getFeatured().subscribe((r) => (result = r));
      http.expectOne(`${BASE}/featured`).flush(stub);
      expect(result).toEqual(stub);
    });
  });
});
