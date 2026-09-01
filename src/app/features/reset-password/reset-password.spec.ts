import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { AuthService } from '@xcorpiiion/ng-core';
import { ResetPassword } from './reset-password';

function montar(token: string | null, resetPassword = vi.fn(() => of(undefined))) {
  TestBed.configureTestingModule({
    imports: [ResetPassword],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(token ? { token } : {}),
          },
        },
      },
      { provide: AuthService, useValue: { resetPassword } },
    ],
  });

  const fixture = TestBed.createComponent(ResetPassword);
  fixture.detectChanges();
  return { fixture, resetPassword };
}

const texto = (f: ComponentFixture<ResetPassword>) =>
  (f.nativeElement as HTMLElement).textContent ?? '';

/** Escreve num input e avisa o Angular, como o navegador faria. */
function digitar(fixture: ComponentFixture<ResetPassword>, indice: number, valor: string): void {
  const inputs = (fixture.nativeElement as HTMLElement).querySelectorAll('input');
  const input = inputs[indice] as HTMLInputElement;
  input.value = valor;
  input.dispatchEvent(new Event('input'));
  input.dispatchEvent(new Event('blur'));
  fixture.detectChanges();
}

describe('ResetPassword', () => {
  it('sem token na URL, mostra que o link é inválido e não desenha o formulário', () => {
    const { fixture } = montar(null);

    expect(texto(fixture)).toContain('Link inválido ou expirado');
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeNull();
  });

  it('o botão nasce desabilitado, com os dois campos vazios', () => {
    const { fixture } = montar('tk');
    const botao = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    expect(botao.hasAttribute('disabled')).toBe(true);
  });

  /**
   * A validação cruzada — o motivo de esta tela ter sido a escolhida para o Signal Forms.
   *
   * No `FormBuilder` a regra morava no grupo e lia os filhos por nome em string; o erro
   * nascia no grupo, e a tela precisava perguntar ao grupo um erro que é de um campo.
   * Aqui a regra mora no campo que fica vermelho.
   */
  it('acusa senhas diferentes no campo da confirmação', () => {
    const { fixture } = montar('tk');

    digitar(fixture, 0, 'segredo123');
    digitar(fixture, 1, 'segredo124');

    expect(texto(fixture)).toContain('As senhas não coincidem');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('button')!.hasAttribute('disabled'),
    ).toBe(true);
  });

  it('para de acusar quando as senhas passam a bater', () => {
    const { fixture } = montar('tk');

    digitar(fixture, 0, 'segredo123');
    digitar(fixture, 1, 'segredo124');
    digitar(fixture, 1, 'segredo123');

    expect(texto(fixture)).not.toContain('As senhas não coincidem');
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('button')!.hasAttribute('disabled'),
    ).toBe(false);
  });

  it('senha curta demais não libera o envio', () => {
    const { fixture } = montar('tk');

    digitar(fixture, 0, 'abc');
    digitar(fixture, 1, 'abc');

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('button')!.hasAttribute('disabled'),
    ).toBe(true);
  });

  it('envia o token e a senha nova', async () => {
    const { fixture, resetPassword } = montar('tk-123');

    digitar(fixture, 0, 'segredo123');
    digitar(fixture, 1, 'segredo123');
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(resetPassword).toHaveBeenCalledWith('tk-123', 'segredo123');
    expect(texto(fixture)).toContain('Senha redefinida');
  });

  it('o link já usado tem recado próprio, e não o genérico', async () => {
    const recusa = vi.fn(() => throwError(() => ({ status: 400 })));
    const { fixture } = montar('tk-123', recusa as never);

    digitar(fixture, 0, 'segredo123');
    digitar(fixture, 1, 'segredo123');
    (fixture.nativeElement as HTMLElement)
      .querySelector('form')!
      .dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(texto(fixture)).toContain('O link expirou ou já foi utilizado');
  });
});
