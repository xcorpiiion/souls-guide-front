import { describe, expect, it, beforeEach } from 'vitest';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    service = new LoadingService();
  });

  it('começa sem loading', () => {
    expect(service.isLoading()).toBe(false);
  });

  it('ativa loading ao chamar show()', () => {
    service.show();
    expect(service.isLoading()).toBe(true);
  });

  it('desativa loading ao chamar hide() após um show()', () => {
    service.show();
    service.hide();
    expect(service.isLoading()).toBe(false);
  });

  it('mantém loading ativo com múltiplos show() pendentes', () => {
    service.show();
    service.show();
    service.hide();
    expect(service.isLoading()).toBe(true);
  });

  it('desativa loading apenas quando todos os show() foram resolvidos', () => {
    service.show();
    service.show();
    service.hide();
    service.hide();
    expect(service.isLoading()).toBe(false);
  });

  it('hide() extra não causa erro nem ativa loading', () => {
    service.hide();
    expect(service.isLoading()).toBe(false);
  });

  it('forceHide() desativa loading independente de show() pendentes', () => {
    service.show();
    service.show();
    service.show();
    service.forceHide();
    expect(service.isLoading()).toBe(false);
  });

  it('forceHide() reseta o contador — hide() posterior não causa problema', () => {
    service.show();
    service.forceHide();
    service.hide();
    expect(service.isLoading()).toBe(false);
  });
});
