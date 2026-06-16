import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { QuestProgressService } from './quest-progress.service';
import { UserProgress } from '../../shared/models/user-progress.model';

const BASE = 'http://localhost:8765/souls-guide-api/quests';

const MOCK_PROGRESS: UserProgress = {
  questId: 'q-1',
  completedNodeIds: ['node-1', 'node-2'],
  totalNodes: 5,
  completedNodes: 2,
};

describe('QuestProgressService', () => {
  let svc: QuestProgressService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    svc = TestBed.inject(QuestProgressService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('deve criar o serviço', () => {
    expect(svc).toBeTruthy();
  });

  describe('getProgress()', () => {
    it('faz GET /quests/:id/my-progress', () => {
      let result: UserProgress | undefined;
      svc.getProgress('q-1').subscribe((r) => (result = r));
      http.expectOne(`${BASE}/q-1/my-progress`).flush(MOCK_PROGRESS);
      expect(result).toEqual(MOCK_PROGRESS);
    });
  });

  describe('markNodeDone()', () => {
    it('faz POST /quests/:id/my-progress/nodes/:nodeId', () => {
      let result: UserProgress | undefined;
      svc.markNodeDone('q-1', 'node-3').subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/q-1/my-progress/nodes/node-3`);
      expect(req.request.method).toBe('POST');
      req.flush({
        ...MOCK_PROGRESS,
        completedNodeIds: ['node-1', 'node-2', 'node-3'],
        completedNodes: 3,
      });
      expect(result!.completedNodes).toBe(3);
    });
  });

  describe('unmarkNodeDone()', () => {
    it('faz DELETE /quests/:id/my-progress/nodes/:nodeId', () => {
      let result: UserProgress | undefined;
      svc.unmarkNodeDone('q-1', 'node-2').subscribe((r) => (result = r));
      const req = http.expectOne(`${BASE}/q-1/my-progress/nodes/node-2`);
      expect(req.request.method).toBe('DELETE');
      req.flush({ ...MOCK_PROGRESS, completedNodeIds: ['node-1'], completedNodes: 1 });
      expect(result!.completedNodes).toBe(1);
    });
  });

  describe('resetProgress()', () => {
    it('faz DELETE /quests/:id/my-progress', () => {
      svc.resetProgress('q-1').subscribe();
      const req = http.expectOne(`${BASE}/q-1/my-progress`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null, { status: 204, statusText: 'No Content' });
    });
  });
});
