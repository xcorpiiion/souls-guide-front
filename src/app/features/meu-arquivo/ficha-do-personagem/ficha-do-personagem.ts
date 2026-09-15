import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type {
  BossSummaryDTO,
  StoryCharacterDTO,
  StoryCharacterKind,
  StoryCharacterRequest,
} from '@xcorpiiion/canonico';
import { BossService } from '../../../core/services/boss.service';
import { AchadoDaTela, ELENCO_POR_CHAVE, SEM_CAPITULO, TIPOS_DE_ELENCO } from '../arquivo.model';

/** Um achado em que o personagem aparece, e de que jeito. */
interface Aparicao {
  readonly achado: AchadoDaTela;
  readonly papel: string;
  /** As falas dele neste achado, quando fala. */
  readonly falas: readonly string[];
}

/**
 * A ficha de alguém do elenco, e a história dele. Ver ADR 0033 do souls-guide-api.
 *
 * <p><b>A história não é um campo.</b> São os achados em que ele aparece — presente, autor ou
 * falando —, na ordem em que a pessoa os registrou, com as falas dele à mostra. É o que
 * responde "o que eu já sei sobre a mulher de branco" sem ninguém ter de escrever um resumo.
 *
 * <p>Sem {@link #personagem}, é o formulário de cadastrar.
 */
@Component({
  selector: 'app-ficha-do-personagem',
  imports: [RouterLink],
  templateUrl: './ficha-do-personagem.html',
  styleUrl: './ficha-do-personagem.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FichaDoPersonagem implements OnInit {
  private readonly bosses = inject(BossService);

  readonly personagem = input<StoryCharacterDTO | null>(null);
  readonly itens = input.required<readonly AchadoDaTela[]>();
  readonly gameId = input.required<string>();
  readonly salvando = input(false);

  readonly voltar = output<void>();
  readonly abrir = output<number>();
  readonly salvar = output<StoryCharacterRequest>();
  readonly excluir = output<void>();

  protected readonly tipos = TIPOS_DE_ELENCO;

  protected readonly editando = signal(false);
  protected readonly formNome = signal('');
  protected readonly formTipo = signal<StoryCharacterKind>('CHARACTER');
  protected readonly formDescricao = signal('');
  protected readonly formChefe = signal<number | null>(null);
  protected readonly chefesDoJogo = signal<BossSummaryDTO[]>([]);
  private chefesPedidos = false;

  ngOnInit(): void {
    if (!this.personagem()) this.comecarEdicao();
  }

  protected readonly tipo = computed(() => {
    const p = this.personagem();
    return p ? ELENCO_POR_CHAVE.get(p.kind) : undefined;
  });

  protected readonly aparicoes = computed<Aparicao[]>(() => {
    const p = this.personagem();
    if (!p) return [];
    return this.itens()
      .map((a): Aparicao | null => {
        const falas = (a.lines ?? []).filter((l) => l.characterId === p.id).map((l) => l.text);
        const papeis: string[] = [];
        if (a.authorId === p.id) papeis.push('escreveu');
        if (falas.length) papeis.push(falas.length === 1 ? 'fala' : `${falas.length} falas`);
        else if ((a.characterIds ?? []).includes(p.id))
          papeis.push(a.kind === 'CREATURE' ? 'é descrito aqui' : 'aparece');
        return papeis.length ? { achado: a, papel: papeis.join(' · '), falas } : null;
      })
      .filter((x): x is Aparicao => x !== null);
  });

  protected readonly capitulos = computed(() => {
    const vistos = new Set<string>();
    for (const ap of this.aparicoes()) vistos.add(ap.achado.chapter || SEM_CAPITULO);
    return vistos.size;
  });

  protected readonly podeSalvar = computed(
    () => this.formNome().trim().length > 0 && !this.salvando(),
  );

  protected comecarEdicao(): void {
    const p = this.personagem();
    this.formNome.set(p?.name ?? '');
    this.formTipo.set(p?.kind ?? 'CHARACTER');
    this.formDescricao.set(p?.description ?? '');
    this.formChefe.set(p?.bossId ?? null);
    this.editando.set(true);
    if (this.formTipo() === 'BOSS') this.pedirChefes();
  }

  protected escolherTipo(tipo: StoryCharacterKind): void {
    this.formTipo.set(tipo);
    if (tipo === 'BOSS') this.pedirChefes();
  }

  protected cancelar(): void {
    if (this.personagem()) this.editando.set(false);
    else this.voltar.emit();
  }

  protected enviar(): void {
    if (!this.podeSalvar()) return;
    this.salvar.emit({
      kind: this.formTipo(),
      name: this.formNome().trim(),
      description: this.formDescricao().trim() || null,
      bossId: this.formTipo() === 'BOSS' ? this.formChefe() : null,
    });
  }

  /** Chamado pelo pai quando o servidor confirma. */
  terminarEdicao(): void {
    this.editando.set(false);
  }

  protected iconeDoTipo(tipo: StoryCharacterKind): string {
    return ELENCO_POR_CHAVE.get(tipo)?.icon ?? 'ti ti-user';
  }

  /** Só quando alguém é chefe: a lista do catálogo não interessa a personagem nem criatura. */
  private pedirChefes(): void {
    if (this.chefesPedidos) return;
    this.chefesPedidos = true;
    this.bosses.list({ gameId: this.gameId() }).subscribe({
      next: (lista) => this.chefesDoJogo.set(lista),
      error: () => {
        // Sem catálogo, o chefe fica sem vínculo; o resto da ficha continua.
      },
    });
  }
}
