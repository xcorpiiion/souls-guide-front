import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { LoreService } from './lore.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apis.soulsGuide}/lore`;

const PAGE_STUB = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 12,
  first: true,
  last: true,
};

describe('LoreService', () => {
  let service: LoreService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(LoreService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('list()', () => {
    it('chama GET /lore com page e size padrão', () => {
      service.list().subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('20');
      req.flush(PAGE_STUB);
    });

    it('inclui param q quando fornecido', () => {
      service.list(0, 12, 'ranni').subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('q')).toBe('ranni');
      req.flush(PAGE_STUB);
    });

    it('inclui gameId quando fornecido', () => {
      service.list(0, 12, undefined, '1').subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('gameId')).toBe('1');
      req.flush(PAGE_STUB);
    });

    it('inclui category quando fornecido', () => {
      service.list(0, 12, undefined, undefined, 'CHARACTER').subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('category')).toBe('CHARACTER');
      req.flush(PAGE_STUB);
    });

    it('envia todos os filtros juntos', () => {
      service.list(1, 12, 'ranni', '1', 'WORLD').subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('q')).toBe('ranni');
      expect(req.request.params.get('gameId')).toBe('1');
      expect(req.request.params.get('category')).toBe('WORLD');
      req.flush(PAGE_STUB);
    });

    it('não inclui q, gameId ou category quando undefined', () => {
      service.list(0, 12).subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.has('q')).toBe(false);
      expect(req.request.params.has('gameId')).toBe(false);
      expect(req.request.params.has('category')).toBe(false);
      req.flush(PAGE_STUB);
    });

    it('mapeia content com loreApiToSummary', () => {
      let result: any;
      service.list().subscribe((p) => (result = p));
      http
        .expectOne((r) => r.url === BASE)
        .flush({
          ...PAGE_STUB,
          content: [
            {
              id: 7,
              title: 'Ranni',
              content: 'conteudo lore',
              status: 'CANONICO',
              type: 'CHARACTER',
              characterName: 'Ranni',
              tags: ['lua'],
              userId: 'u1',
              gameId: 1,
              gameName: 'Elden Ring',
              items: [],
              isPersonal: false,
              ownerId: null,
              isPublic: true,
              allowCopy: true,
              likeCount: 0,
            },
          ],
          totalElements: 1,
        });
      expect(result.content[0].id).toBe('7');
      expect(result.content[0].title).toBe('Ranni');
      expect(result.content[0].category).toBe('CHARACTER');
    });
  });

  describe('like()', () => {
    it('chama POST /lore/{id}/like', () => {
      let result: any;
      service.like('7').subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/7/like`);
      expect(req.request.method).toBe('POST');
      req.flush({ likeCount: 3, userHasLiked: true });
      expect(result).toEqual({ likeCount: 3, userHasLiked: true });
    });
  });

  describe('unlike()', () => {
    it('chama DELETE /lore/{id}/like', () => {
      let result: any;
      service.unlike('7').subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/7/like`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ likeCount: 2, userHasLiked: false });
      expect(result).toEqual({ likeCount: 2, userHasLiked: false });
    });
  });

  describe('follow()', () => {
    it('chama POST /lore/{id}/follow', () => {
      let result: any;
      service.follow('7').subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/7/follow`);
      expect(req.request.method).toBe('POST');
      req.flush({ followerCount: 4, userIsFollowing: true });
      expect(result).toEqual({ followerCount: 4, userIsFollowing: true });
    });
  });

  describe('unfollow()', () => {
    it('chama DELETE /lore/{id}/follow', () => {
      let result: any;
      service.unfollow('7').subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/7/follow`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ followerCount: 3, userIsFollowing: false });
      expect(result).toEqual({ followerCount: 3, userIsFollowing: false });
    });
  });

  describe('update()', () => {
    it('chama PUT /lore/{id} com o payload correto', () => {
      const payload = {
        title: 'Novo título',
        type: 'WORLD' as const,
        gameId: '1',
        content: 'conteúdo atualizado',
      };
      let result: any;
      service.update('7', payload).subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/7`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(payload);
      req.flush({ id: 7, title: 'Novo título' });
      expect(result.title).toBe('Novo título');
    });
  });

  describe('listFollowed()', () => {
    it('chama GET /lore/following e mapeia para LoreSummary[]', () => {
      let result: any;
      service.listFollowed().subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/following`);
      expect(req.request.method).toBe('GET');
      req.flush([
        {
          id: 7,
          title: 'Ranni',
          content: 'conteudo',
          status: 'CANONICO',
          type: 'CHARACTER',
          characterName: 'Ranni',
          tags: [],
          userId: 'u1',
          gameId: 1,
          gameName: 'Elden Ring',
          items: [],
          isPersonal: false,
          ownerId: null,
          isPublic: true,
          allowCopy: false,
          likeCount: 0,
          userHasLiked: false,
          followerCount: 5,
          userIsFollowing: true,
        },
      ]);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('7');
      expect(result[0].title).toBe('Ranni');
    });
  });

  describe('listLiked()', () => {
    it('chama GET /lore/liked e mapeia para LoreSummary[]', () => {
      let result: any;
      service.listLiked().subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/liked`);
      expect(req.request.method).toBe('GET');
      req.flush([
        {
          id: 8,
          title: 'Marika',
          content: 'conteudo',
          status: 'TEORIA',
          type: 'CHARACTER',
          characterName: 'Marika',
          tags: [],
          userId: 'u2',
          gameId: 1,
          gameName: 'Elden Ring',
          items: [],
          isPersonal: false,
          ownerId: null,
          isPublic: true,
          allowCopy: false,
          likeCount: 10,
          userHasLiked: true,
          followerCount: 0,
          userIsFollowing: false,
        },
      ]);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('8');
      expect(result[0].likeCount).toBe(10);
    });
  });
});
