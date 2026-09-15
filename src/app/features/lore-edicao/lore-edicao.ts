import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { HasUnsavedChanges } from '@xcorpiiion/ng-core';
import type { StoryArchiveDTO } from '@xcorpiiion/canonico';
import { LoreService } from '../../core/services/lore.service';
import { StoryArchiveService } from '../../core/services/story-archive.service';
import { LoreApi } from '../../shared/models/lore-article.model';
import { statusHttp } from '../../shared/utils/http-error';
import { decorar } from '../meu-arquivo/arquivo.model';
import { MontarLore } from '../meu-arquivo/montar-lore/montar-lore';

type Estado = 'carregando' | 'pronto' | 'proibido' | 'falhou';

type SoAchados = Pick<StoryArchiveDTO, 'findings' | 'links' | 'characters'>;

const arquivoVazio = (): SoAchados => ({ findings: [], links: [], characters: [] });

/**
 * Editar uma lore: `/lore/:id/edit` e `/profile/lore/:id/edit`. Ver ADR 0008.
 *
 * <p>Não há editor à parte. A lore abre no mesmo "montar lore" em que foi escrita, já na
 * escrita, com o arquivo do jogo ao lado para citar mais achados.
 *
 * <p><b>O arquivo é acessório aqui.</b> Se ele não carregar — jogo fora do escopo, servidor
 * sem resposta —, a lore abre do mesmo jeito, sem achados para citar. Recusar a edição do
 * texto porque a lista de achados falhou seria trocar um problema pequeno por um grande.
 */
@Component({
  selector: 'app-lore-edicao',
  imports: [RouterLink, MontarLore],
  templateUrl: './lore-edicao.html',
  styleUrl: './lore-edicao.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoreEdicao implements HasUnsavedChanges {
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly lore = inject(LoreService);
  private readonly arquivo = inject(StoryArchiveService);

  private readonly loreId = this.route.snapshot.paramMap.get('id') ?? '';
  private readonly montar = viewChild(MontarLore);

  protected readonly estado = signal<Estado>('carregando');
  protected readonly artigo = signal<LoreApi | null>(null);
  private readonly doArquivo = signal<SoAchados>(arquivoVazio());

  protected readonly itens = computed(() =>
    decorar(this.doArquivo().findings, this.doArquivo().links, this.doArquivo().characters),
  );
  protected readonly ligacoes = computed(() => this.doArquivo().links);

  constructor() {
    this.carregar();
  }

  hasUnsavedChanges(): boolean {
    return this.montar()?.temAlteracoes() ?? false;
  }

  protected carregar(): void {
    this.estado.set('carregando');
    this.lore
      .get(this.loreId)
      .pipe(
        switchMap((artigo) =>
          forkJoin([
            of(artigo),
            this.arquivo.archive(artigo.gameId).pipe(catchError(() => of(arquivoVazio()))),
          ]),
        ),
      )
      .subscribe({
        next: ([artigo, arquivo]) => {
          this.artigo.set(artigo);
          this.doArquivo.set(arquivo);
          this.estado.set('pronto');
        },
        error: (e: unknown) => {
          const status = statusHttp(e);
          this.estado.set(status === 403 || status === 404 ? 'proibido' : 'falhou');
        },
      });
  }

  protected voltar(): void {
    this.location.back();
  }
}
