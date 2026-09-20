import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { LoreApi } from '../../../shared/models/lore-article.model';
import { LoreService } from '../../../core/services/lore.service';
import { PersonalLoreService } from '../../../core/services/personal-lore.service';
import { StorageService } from '../../../core/services/storage.service';
import { resumo, SeoService } from '../../../core/services/seo.service';
import { refDe } from '../../../shared/utils/ref';
import { AuthService } from '@xcorpiiion/ng-core';
import {
  InlineSegment,
  LoreBlock,
  extractImageFileKeys,
  parseInline,
  parseLoreContent,
} from '../../../shared/utils/lore-content';
import {
  CitacaoLida,
  ICONE_DO_TIPO,
  citaPessoa,
  lerCitacao,
} from '../../../shared/utils/citacao-da-lore';
import {
  CopyToProfileModal,
  CopyConfirmEvent,
} from '../../../shared/components/copy-to-profile-modal/copy-to-profile-modal';
import { CommentSection } from '../../../shared/components/comment-section/comment-section';
import { ReportButton } from '../../../shared/components/report-button/report-button';
import { ToastService } from '@xcorpiiion/ui';
import { PfPageLoader } from '@xcorpiiion/ui';

type BlocoDeLeitura =
  | Exclude<LoreBlock, { kind: 'quote' } | { kind: 'paragraph' }>
  | { kind: 'citacao'; citacao: CitacaoLida }
  // O paragrafo ja chega quebrado em segmentos: chamar o parser do template o faria rodar
  // a cada ciclo de deteccao de mudanca.
  | { kind: 'paragraph'; text: string; segmentos: InlineSegment[] };

@Component({
  selector: 'app-lore-detail',
  imports: [RouterLink, CopyToProfileModal, CommentSection, ReportButton, PfPageLoader],
  templateUrl: './lore-detail.html',
  styleUrl: './lore-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoreDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly loreService = inject(LoreService);
  private readonly personalLoreService = inject(PersonalLoreService);
  private readonly storage = inject(StorageService);
  private readonly seo = inject(SeoService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly article = signal<LoreApi | null>(null);

  protected readonly showCopyModal = signal(false);
  protected readonly copyConflictId = signal<number | undefined>(undefined);
  protected readonly copying = signal(false);

  protected readonly likeCount = signal(0);
  protected readonly userHasLiked = signal(false);
  protected readonly liking = signal(false);

  protected readonly followerCount = signal(0);
  protected readonly userIsFollowing = signal(false);
  protected readonly following = signal(false);

  protected readonly coverUrl = signal<string | null>(null);
  /** chave → URL de leitura, resolvidas de uma vez quando o artigo carrega. */
  private readonly imageUrls = signal<ReadonlyMap<string, string>>(new Map());
  private loreId = '';
  protected readonly handle: string = this.route.snapshot.paramMap.get('handle') ?? '';
  protected readonly context: 'community' | 'profile' | 'usuario' =
    this.route.snapshot.url[0]?.path === 'profile'
      ? 'profile'
      : this.route.snapshot.paramMap.has('handle')
        ? 'usuario'
        : 'community';

  protected readonly isOwner = computed(() => {
    const a = this.article();
    if (!a || !this.auth.isLoggedIn()) return false;
    return String(a.ownerId) === String(this.auth.userId());
  });

  /** Quem escreveu a lore da comunidade, ou o dono da lore de perfil. */
  protected readonly ehMinha = computed(() => {
    const a = this.article();
    if (!a || !this.auth.isLoggedIn()) return false;
    return a.isPersonal ? this.isOwner() : String(a.userId) === String(this.auth.userId());
  });

  /**
   * Só quem escreveu. O botão aparecia para qualquer pessoa logada, e o servidor recusa a
   * edição de quem não é autor (`LoreArticleViewServiceImpl.update`): era um botão que levava a
   * um 403 depois de a pessoa já ter reescrito o texto.
   */
  protected readonly canEdit = computed(() => this.ehMinha());

  /** O texto em blocos, com cada citação já lida: tipo, falas e quem aparece. */
  protected readonly blocos = computed((): BlocoDeLeitura[] => {
    const a = this.article();
    if (!a) return [];
    return parseLoreContent(a.content).map((b): BlocoDeLeitura => {
      if (b.kind === 'quote')
        return { kind: 'citacao', citacao: lerCitacao(b.text, b.origem ?? '') };
      if (b.kind === 'paragraph') return { ...b, segmentos: parseInline(b.text) };
      return b;
    });
  });

  protected readonly citacoes = computed(
    () => this.blocos().filter((b) => b.kind === 'citacao').length,
  );

  /** "Quem aparece": cada pessoa citada, com em quantas citações. */
  protected readonly pessoas = computed(() => {
    const vezes = new Map<string, { nome: string; vezes: number }>();
    for (const b of this.blocos()) {
      if (b.kind !== 'citacao') continue;
      for (const nome of b.citacao.pessoas) {
        const chave = nome.toLocaleLowerCase('pt-BR');
        const atual = vezes.get(chave);
        vezes.set(chave, { nome: atual?.nome ?? nome, vezes: (atual?.vezes ?? 0) + 1 });
      }
    }
    return [...vezes.values()];
  });

  /**
   * O personagem que a lore antiga declarou à mão, quando nenhuma citação o cita — senão a
   * informação sumiria da página junto com o "lore de personagem".
   */
  protected readonly sobreQuem = computed(() => {
    const nome = this.article()?.characterName?.trim();
    if (!nome) return null;
    const alvo = nome.toLocaleLowerCase('pt-BR');
    return this.pessoas().some((p) => p.nome.toLocaleLowerCase('pt-BR') === alvo) ? null : nome;
  });

  /** Tocar num nome acende só as citações dele; o resto do texto fica atrás. */
  protected readonly destaque = signal<string | null>(null);

  protected destacar(nome: string): void {
    this.destaque.update((atual) =>
      atual?.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR') ? null : nome,
    );
  }

  protected apagada(c: CitacaoLida): boolean {
    const nome = this.destaque();
    return nome !== null && !citaPessoa(c, nome);
  }

  protected ehDestaque(nome: string): boolean {
    return this.destaque()?.toLocaleLowerCase('pt-BR') === nome.toLocaleLowerCase('pt-BR');
  }

  protected readonly iconeDoTipo = ICONE_DO_TIPO;

  protected readonly minutos = computed(() => {
    const a = this.article();
    return a ? Math.max(1, Math.ceil(a.content.split(/\s+/).length / 200)) : 1;
  });

  protected readonly canCopy = computed(() => {
    const a = this.article();
    if (!a || !this.auth.isLoggedIn() || this.isOwner()) return false;
    if (a.isPersonal) return a.allowCopy ?? false;
    return true; // lore da comunidade: todos podem copiar
  });

  /**
   * O texto do artigo é markdown; `resumo` tira imagem, link e ênfase antes de virar
   * descrição, senão o resultado do Google mostra `![alt](file:abc123)`.
   */
  private aplicarSeo(): void {
    const a = this.article();
    if (!a) return;

    const publico = !a.isPersonal || a.isPublic;

    this.seo.aplicar({
      titulo: `${a.title} · ${a.gameName}`,
      descricao: resumo(a.content),
      // Endereço estável, e não a URL assinada de `coverUrl`, que expira antes de o
      // buscador rebuscar a imagem.
      imagem: a.coverImageFileKey ? this.storage.previewUrl(a.coverImageFileKey) : null,
      tipo: 'article',
      indexavel: publico,
      // Ver o comentario irmao no QuestDetail.
      canonical: publico ? `/lore/${refDe(a.id, a.slug)}` : null,
    });

    this.seo.estruturado(
      publico
        ? {
            '@type': 'Article',
            headline: a.title,
            description: resumo(a.content),
            about: { '@type': 'VideoGame', name: a.gameName },
            keywords: a.tags?.join(', ') ?? '',
          }
        : null,
    );
  }

  ngOnInit(): void {
    this.loreId = this.route.snapshot.paramMap.get('id') ?? '';
    this.loreService.get(this.loreId).subscribe({
      next: (data) => {
        this.article.set(data);
        this.likeCount.set(data.likeCount ?? 0);
        this.userHasLiked.set(data.userHasLiked ?? false);
        this.followerCount.set(data.followerCount ?? 0);
        this.userIsFollowing.set(data.userIsFollowing ?? false);
        this.loadImages(data);
        this.aplicarSeo();
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.status === 403 ? 'Este conteúdo é privado.' : 'Artigo não encontrado.');
        this.seo.aplicar({
          titulo: 'Artigo não encontrado',
          descricao: 'Este artigo não existe, foi removido ou é privado.',
          indexavel: false,
        });
        this.loading.set(false);
      },
    });
  }

  protected statusLabel(s: string): string {
    const map: Record<string, string> = {
      TEORIA: 'teoria',
      CONSOLIDADO: 'consolidado',
      CANONICO: 'canônico',
    };
    return map[s];
  }

  protected loreIdStr(id: number): string {
    return String(id);
  }

  protected imageUrl(fileKey: string): string | null {
    return this.imageUrls().get(fileKey) ?? null;
  }

  /**
   * Uma chamada resolve a capa e todas as imagens do texto: elas pertencem ao mesmo
   * artigo, então a storage-api devolve o conjunto inteiro de uma vez.
   */
  private loadImages(article: LoreApi): void {
    const keys = [article.coverImageFileKey, ...extractImageFileKeys(article.content)].filter(
      (k): k is string => !!k,
    );
    if (!keys.length) return;

    this.storage.resolve(keys, 'LORE', String(article.id)).subscribe((resolved) => {
      this.imageUrls.set(resolved);
      if (article.coverImageFileKey) {
        this.coverUrl.set(resolved.get(article.coverImageFileKey) ?? null);
      }
    });
  }

  protected openCopyModal(): void {
    this.copyConflictId.set(undefined);
    this.showCopyModal.set(true);
  }

  protected toggleFollow(): void {
    if (this.following()) return;
    this.following.set(true);
    const following = this.userIsFollowing();
    const action = following
      ? this.loreService.unfollow(this.loreId)
      : this.loreService.follow(this.loreId);
    action.subscribe({
      next: (res) => {
        this.followerCount.set(res.followerCount);
        this.userIsFollowing.set(res.userIsFollowing);
        this.following.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) this.userIsFollowing.set(true);
        this.following.set(false);
      },
    });
  }

  protected toggleLike(): void {
    if (this.liking()) return;
    this.liking.set(true);
    const liked = this.userHasLiked();
    const action = liked
      ? this.loreService.unlike(this.loreId)
      : this.loreService.like(this.loreId);
    action.subscribe({
      next: (res) => {
        this.likeCount.set(res.likeCount);
        this.userHasLiked.set(res.userHasLiked);
        this.liking.set(false);
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) this.userHasLiked.set(true);
        this.liking.set(false);
      },
    });
  }

  protected onCopyConfirm(event: CopyConfirmEvent): void {
    this.copying.set(true);
    this.personalLoreService.copyToProfile(this.loreId, event.replaceExistingId).subscribe({
      next: (created) => {
        this.copying.set(false);
        this.showCopyModal.set(false);
        this.toast.success('Lore copiado!', 'O artigo foi adicionado ao seu perfil.');
        this.router.navigate(['/profile', 'lore', created.id], {
          queryParams: { personal: 'true' },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.copying.set(false);
        if (err.status === 409) {
          this.copyConflictId.set(err.error?.conflictingId);
        } else if (err.status === 403) {
          this.showCopyModal.set(false);
          this.toast.error('Sem permissão', 'Este conteúdo não permite cópias.');
        } else {
          this.showCopyModal.set(false);
          this.toast.error('Erro', 'Erro ao copiar lore. Tente novamente.');
        }
      },
    });
  }
}
