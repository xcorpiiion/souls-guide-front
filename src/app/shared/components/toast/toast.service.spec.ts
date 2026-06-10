import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    service = new ToastService();
    vi.useFakeTimers();
  });

  it('começa sem toasts', () => {
    expect(service.toasts()).toHaveLength(0);
  });

  it('adiciona toast ao chamar show()', () => {
    service.show('success', 'Ok', 'Salvo com sucesso');
    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0].type).toBe('success');
    expect(service.toasts()[0].title).toBe('Ok');
  });

  it('atalhos success/error/info/warning adicionam o tipo correto', () => {
    service.success('Título', 'Msg');
    service.error('Título', 'Msg');
    service.info('Título', 'Msg');
    service.warning('Título', 'Msg');

    const types = service.toasts().map((t) => t.type);
    expect(types).toEqual(['success', 'error', 'info', 'warning']);
  });

  it('remove toast ao chamar dismiss()', () => {
    service.show('info', 'Título', 'Msg');
    const id = service.toasts()[0].id;
    service.dismiss(id);
    expect(service.toasts()).toHaveLength(0);
  });

  it('remove toast automaticamente após o tempo configurado', () => {
    service.show('info', 'Título', 'Msg', 2000);
    expect(service.toasts()).toHaveLength(1);

    vi.advanceTimersByTime(2000);
    expect(service.toasts()).toHaveLength(0);
  });

  it('não remove antes do tempo', () => {
    service.show('info', 'Título', 'Msg', 2000);
    vi.advanceTimersByTime(1999);
    expect(service.toasts()).toHaveLength(1);
  });

  it('cada toast recebe id único e crescente', () => {
    service.show('info', 'A', 'Msg');
    service.show('info', 'B', 'Msg');
    const ids = service.toasts().map((t) => t.id);
    expect(ids[0]).toBeLessThan(ids[1]);
  });
});
