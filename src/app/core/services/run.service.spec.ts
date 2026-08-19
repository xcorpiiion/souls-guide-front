import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { RunService } from './run.service';
import { environment } from '../../../environments/environment';

const BASE = environment.apis.soulsGuide;

describe('RunService', () => {
  let service: RunService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(RunService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('busca o painel do jogo numa chamada só', () => {
    service.overview('17').subscribe();

    const req = http.expectOne(`${BASE}/games/17/run`);
    expect(req.request.method).toBe('GET');
    req.flush({ gameId: 17, gameName: 'Lies of P', quests: [], endings: [], warnings: [] });
  });
});
