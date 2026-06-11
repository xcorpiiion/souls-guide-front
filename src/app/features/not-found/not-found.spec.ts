import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect } from 'vitest';
import { NotFound } from './not-found';

describe('NotFound', () => {
  let fixture: ComponentFixture<NotFound>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotFound],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NotFound);
    fixture.detectChanges();
  });

  it('deve criar o componente', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('exibe o código 404', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('404');
  });

  it('exibe a mensagem YOU DIED', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent?.toUpperCase()).toContain('YOU DIED');
  });

  it('contém link para a home', () => {
    const el: HTMLElement = fixture.nativeElement;
    const links = Array.from(el.querySelectorAll('a[href]'));
    expect(links.some((a) => (a as HTMLAnchorElement).href.includes('/home'))).toBe(true);
  });
});
