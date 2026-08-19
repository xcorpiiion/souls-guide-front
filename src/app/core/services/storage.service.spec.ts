import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { StorageService } from './storage.service';
import { environment } from '../../../environments/environment';

const BASE = `${environment.apis.storage}/files`;

describe('StorageService', () => {
  let service: StorageService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(StorageService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /**
   * A URL que o `resolve` devolve é assinada e expira — serve para a página, não para o
   * `<head>`, que um crawler busca dias depois.
   */
  describe('previewUrl()', () => {
    it('monta um endereço estável, sem assinatura', () => {
      const url = service.previewUrl('abc123');

      expect(url).toBe(`${BASE}/abc123/preview`);
      expect(url).not.toContain('?');
    });
  });

  describe('validateImage()', () => {
    it('recusa formato que o servidor recusaria', () => {
      const arquivo = new File([''], 'a.gif', { type: 'image/gif' });
      expect(service.validateImage(arquivo)).toContain('Formato não aceito');
    });

    it('recusa arquivo acima do limite', () => {
      const grande = new File([new ArrayBuffer(6 * 1024 * 1024)], 'a.png', { type: 'image/png' });
      expect(service.validateImage(grande)).toContain('muito grande');
    });

    it('aceita PNG dentro do limite', () => {
      const ok = new File([''], 'a.png', { type: 'image/png' });
      expect(service.validateImage(ok)).toBeNull();
    });
  });

  describe('resolve()', () => {
    it('não chama a API quando não há chave nenhuma', () => {
      let chamou = false;
      service.resolve([], 'QUEST', '1').subscribe(() => (chamou = true));

      expect(chamou).toBe(true);
      http.expectNone(() => true);
    });

    it('resolve pela listagem do dono, numa chamada só', () => {
      let resolvido = new Map<string, string>();
      service.resolve(['k1'], 'QUEST', '7').subscribe((m) => (resolvido = m));

      const req = http.expectOne((r) => r.url === BASE && r.params.get('ownerId') === '7');
      req.flush([{ fileKey: 'k1', url: 'https://bucket/k1?assinatura' }]);

      expect(resolvido.get('k1')).toBe('https://bucket/k1?assinatura');
    });
  });
});
