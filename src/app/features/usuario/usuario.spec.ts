import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { Usuario } from './usuario';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { PersonalQuestService } from '../../core/services/personal-quest.service';
import { PersonalLoreService } from '../../core/services/personal-lore.service';
import { UserPublicProfile } from '../../shared/models/user.model';

const MOCK_PROFILE: UserPublicProfile = {
  id: 1,
  name: 'Raidou',
  handle: 'raidou',
  bio: 'Dark Souls 3 loremaster',
  joinedLabel: 'mar 2024',
  questCount: 41,
  loreCount: 19,
  followerCount: 380,
  followingCount: 52,
  isFollowing: false,
};

function makeUserSvc(profile: UserPublicProfile | null = MOCK_PROFILE) {
  return {
    getByHandle: vi.fn(() => (profile ? of(profile) : throwError(() => new Error('not found')))),
    follow: vi.fn(() => of(undefined)),
    unfollow: vi.fn(() => of(undefined)),
  };
}

function createFixture(
  handle = 'raidou',
  userSvc?: ReturnType<typeof makeUserSvc>,
): ComponentFixture<Usuario> {
  TestBed.configureTestingModule({
    imports: [Usuario],
    providers: [
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: convertToParamMap({ handle }) } },
      },
      { provide: UserService, useValue: userSvc ?? makeUserSvc() },
      { provide: AuthService, useValue: { isLoggedIn: signal(true) } },
      { provide: PersonalQuestService, useValue: { listByUser: vi.fn(() => of([])) } },
      { provide: PersonalLoreService, useValue: { listByUser: vi.fn(() => of([])) } },
    ],
  });
  const fixture = TestBed.createComponent(Usuario);
  fixture.detectChanges();
  return fixture;
}

describe('Usuario', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('deve criar o componente', () => {
    expect(createFixture().componentInstance).toBeTruthy();
  });

  it('carrega perfil pelo handle', () => {
    const svc = makeUserSvc();
    createFixture('raidou', svc);
    expect(svc.getByHandle).toHaveBeenCalledWith('raidou');
  });

  it('popula profile() após carregamento', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.profile()).not.toBeNull();
    expect(comp.profile().name).toBe('Raidou');
    expect(comp.loading()).toBe(false);
  });

  it('define notFound=true quando handle não existe', () => {
    const fixture = createFixture('nao-existe', makeUserSvc(null));
    const comp = fixture.componentInstance as any;
    expect(comp.notFound()).toBe(true);
    expect(comp.loading()).toBe(false);
  });

  it('activeTab() começa em quests', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.activeTab()).toBe('quests');
  });

  it('setTab() muda a aba ativa', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    comp.setTab('lore');
    expect(comp.activeTab()).toBe('lore');
  });

  it('following() começa false quando isFollowing=false no perfil', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.following()).toBe(false);
  });

  it('toggleFollow() chama follow() e incrementa followerCount', () => {
    const svc = makeUserSvc();
    const fixture = createFixture('raidou', svc);
    const comp = fixture.componentInstance as any;
    comp.toggleFollow();
    expect(svc.follow).toHaveBeenCalledWith(MOCK_PROFILE.id);
    expect(comp.following()).toBe(true);
    expect(comp.profile().followerCount).toBe(381);
  });

  it('toggleFollow() chama unfollow() quando já segue', () => {
    const svc = makeUserSvc({ ...MOCK_PROFILE, isFollowing: true });
    const fixture = createFixture('raidou', svc);
    const comp = fixture.componentInstance as any;
    comp.toggleFollow();
    expect(svc.unfollow).toHaveBeenCalledWith(MOCK_PROFILE.id);
    expect(comp.following()).toBe(false);
    expect(comp.profile().followerCount).toBe(379);
  });

  it('statusLabel() retorna rótulo correto', () => {
    const fixture = createFixture();
    const comp = fixture.componentInstance as any;
    expect(comp.statusLabel('TEORIA')).toBe('teoria');
    expect(comp.statusLabel('CONSOLIDADO')).toBe('consolidado');
    expect(comp.statusLabel('CANONICO')).toBe('canônico');
  });
});
