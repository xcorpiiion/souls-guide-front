import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { QuestService } from './quest.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apis.soulsGuide}/quests`;

const PAGE_STUB = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  number: 0,
  size: 10,
  first: true,
  last: true,
};

describe('QuestService', () => {
  let service: QuestService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(QuestService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('list()', () => {
    it('chama GET /quests com page e size padrão', () => {
      service.list().subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('page')).toBe('0');
      expect(req.request.params.get('size')).toBe('20');
      req.flush(PAGE_STUB);
    });

    it('inclui param q quando fornecido', () => {
      service.list(0, 10, 'ranni').subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('q')).toBe('ranni');
      req.flush(PAGE_STUB);
    });

    it('inclui gameId quando fornecido', () => {
      service.list(0, 10, undefined, '1').subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('gameId')).toBe('1');
      req.flush(PAGE_STUB);
    });

    it('inclui status quando fornecido', () => {
      service.list(0, 10, undefined, undefined, 'CANONICO').subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('status')).toBe('CANONICO');
      req.flush(PAGE_STUB);
    });

    it('envia todos os filtros juntos', () => {
      service.list(2, 10, 'ranni', '1', 'TEORIA').subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('q')).toBe('ranni');
      expect(req.request.params.get('gameId')).toBe('1');
      expect(req.request.params.get('status')).toBe('TEORIA');
      req.flush(PAGE_STUB);
    });

    it('não inclui q, gameId ou status quando undefined', () => {
      service.list(0, 10).subscribe();
      const req = http.expectOne((r) => r.url === BASE);
      expect(req.request.params.has('q')).toBe(false);
      expect(req.request.params.has('gameId')).toBe(false);
      expect(req.request.params.has('status')).toBe(false);
      req.flush(PAGE_STUB);
    });

    it('mapeia content com questApiToSummary', () => {
      let result: any;
      service.list().subscribe((p) => (result = p));
      http
        .expectOne((r) => r.url === BASE)
        .flush({
          ...PAGE_STUB,
          content: [
            {
              id: 42,
              title: 'Ranni',
              description: 'desc',
              status: 'CANONICO',
              userId: 'u1',
              gameId: 1,
              gameName: 'Elden Ring',
              nodes: [],
              edges: [],
              relatedQuests: [],
              isPersonal: false,
              ownerId: null,
              isPublic: true,
              allowCopy: true,
              likeCount: 0,
            },
          ],
          totalElements: 1,
        });
      expect(result.content[0].id).toBe('42');
      expect(result.content[0].title).toBe('Ranni');
      expect(result.content[0].gameId).toBe('1');
    });
  });

  describe('like()', () => {
    it('chama POST /quests/{id}/like', () => {
      let result: any;
      service.like('42').subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/42/like`);
      expect(req.request.method).toBe('POST');
      req.flush({ likeCount: 5, userHasLiked: true });
      expect(result).toEqual({ likeCount: 5, userHasLiked: true });
    });
  });

  describe('unlike()', () => {
    it('chama DELETE /quests/{id}/like', () => {
      let result: any;
      service.unlike('42').subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/42/like`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ likeCount: 4, userHasLiked: false });
      expect(result).toEqual({ likeCount: 4, userHasLiked: false });
    });
  });

  describe('follow()', () => {
    it('chama POST /quests/{id}/follow', () => {
      let result: any;
      service.follow('42').subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/42/follow`);
      expect(req.request.method).toBe('POST');
      req.flush({ followerCount: 5, userIsFollowing: true });
      expect(result).toEqual({ followerCount: 5, userIsFollowing: true });
    });
  });

  describe('unfollow()', () => {
    it('chama DELETE /quests/{id}/follow', () => {
      let result: any;
      service.unfollow('42').subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/42/follow`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ followerCount: 4, userIsFollowing: false });
      expect(result).toEqual({ followerCount: 4, userIsFollowing: false });
    });
  });

  describe('listFollowed()', () => {
    it('chama GET /quests/following e mapeia para QuestSummary[]', () => {
      let result: any;
      service.listFollowed().subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/following`);
      expect(req.request.method).toBe('GET');
      req.flush([
        {
          id: 1,
          title: 'Quest A',
          description: '',
          status: 'CANONICO',
          userId: 'u1',
          gameId: 1,
          gameName: 'Elden Ring',
          nodes: [],
          edges: [],
          relatedQuests: [],
          isPersonal: false,
          ownerId: null,
          isPublic: true,
          allowCopy: false,
          likeCount: 0,
          userHasLiked: false,
          followerCount: 2,
          userIsFollowing: true,
        },
      ]);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('1');
      expect(result[0].title).toBe('Quest A');
    });
  });

  describe('listLiked()', () => {
    it('chama GET /quests/liked e mapeia para QuestSummary[]', () => {
      let result: any;
      service.listLiked().subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/liked`);
      expect(req.request.method).toBe('GET');
      req.flush([
        {
          id: 2,
          title: 'Quest B',
          description: '',
          status: 'TEORIA',
          userId: 'u2',
          gameId: 1,
          gameName: 'Elden Ring',
          nodes: [],
          edges: [],
          relatedQuests: [],
          isPersonal: false,
          ownerId: null,
          isPublic: true,
          allowCopy: false,
          likeCount: 3,
          userHasLiked: true,
          followerCount: 0,
          userIsFollowing: false,
        },
      ]);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('2');
      expect(result[0].likeCount).toBe(3);
    });
  });
});
