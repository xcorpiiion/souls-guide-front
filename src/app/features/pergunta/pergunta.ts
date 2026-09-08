import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@xcorpiiion/ng-core';
import { PfPageLoader, ToastService } from '@xcorpiiion/ui';
import type { GameAnswerDTO, GameQuestionDTO, GameQuestionSummaryDTO } from '@xcorpiiion/canonico';
import { QuestionService } from '../../core/services/question.service';
import { resumo, SeoService } from '../../core/services/seo.service';

/**
 * A página de uma pergunta.
 *
 * <p><b>Ela é uma página de aterrissagem, não de navegação.</b> Quem chega vem do Google,
 * no celular, com o jogo pausado do lado, e quer uma resposta — nunca ouviu falar do site e
 * não está logado. Por isso a resposta aceita vem <b>antes</b> do corpo da pergunta: quem
 * digitou a pergunta no buscador já sabe qual ela é; o que falta é a resposta.
 *
 * <p>O convite para explorar o resto do site vem no fim, depois de a pessoa ter o que veio
 * buscar. Ver ADR 0031 do souls-guide-api.
 */
@Component({
  selector: 'app-pergunta',
  imports: [RouterLink, FormsModule, PfPageLoader],
  templateUrl: './pergunta.html',
  styleUrl: './pergunta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pergunta implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(QuestionService);
  private readonly seo = inject(SeoService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  protected readonly referencia = this.route.snapshot.paramMap.get('referencia') ?? '';

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly question = signal<GameQuestionDTO | null>(null);
  protected readonly related = signal<GameQuestionSummaryDTO[]>([]);

  /**
   * O que já foi revelado nesta visita.
   *
   * <p>Não persiste de propósito: spoiler revelado é decisão daquele momento, e guardá-la
   * faria a próxima visita entregar o texto sem perguntar — que é o oposto do que a marca
   * existe para fazer.
   */
  private readonly revelados = signal<ReadonlySet<string>>(new Set());

  protected readonly composerBody = signal('');
  protected readonly composerSpoiler = signal(false);
  protected readonly enviando = signal(false);

  /** A aceita sai da lista de "outras": ela já está em destaque no topo. */
  protected readonly aceita = computed(
    () => this.question()?.answers.find((a) => a.accepted) ?? null,
  );

  protected readonly outras = computed(
    () => this.question()?.answers.filter((a) => !a.accepted) ?? [],
  );

  protected readonly semRespostas = computed(() => (this.question()?.answers.length ?? 0) === 0);

  protected readonly rotuloOutras = computed(() => {
    const total = this.question()?.answers.length ?? 0;
    if (this.aceita()) return 'outras respostas';
    return total === 1 ? '1 resposta' : `${total} respostas`;
  });

  protected readonly rotuloContagem = computed(() => {
    const total = this.question()?.answerCount ?? 0;
    if (total === 0) return 'sem respostas';
    return total === 1 ? '1 resposta' : `${total} respostas`;
  });

  protected readonly placeholderComposer = computed(() =>
    this.semRespostas()
      ? `conte como você resolveu isso em ${this.question()?.gameName ?? 'no jogo'}…`
      : 'acrescente algo que ainda não foi dito…',
  );

  ngOnInit(): void {
    this.service.get(this.referencia).subscribe({
      next: (q) => {
        this.question.set(q);
        this.loading.set(false);
        this.aplicarSeo(q);
        this.carregarRelacionadas(q);
      },
      error: () => {
        this.error.set('Pergunta não encontrada.');
        this.loading.set(false);
      },
    });
  }

  /**
   * O SEO desta página.
   *
   * <p>O `<title>` é a pergunta, sem enfeite: é exatamente o que a pessoa digitou no
   * buscador, e reescrevê-lo com o nome do site na frente afasta a correspondência.
   *
   * <p>A descrição sai da <b>resposta aceita</b> quando há uma — é o que o resultado de
   * busca deve mostrar. Sem resposta, sai do corpo da pergunta.
   *
   * <p><b>Spoiler não entra na descrição nem no JSON-LD.</b> O que a marca esconde na tela
   * não pode vazar pelo resultado do Google, que é exatamente onde ninguém pediu para ver.
   */
  private aplicarSeo(q: GameQuestionDTO): void {
    const aceita = q.answers.find((a) => a.accepted);
    const trecho = aceita && !aceita.isSpoiler ? aceita.body : q.isSpoiler ? null : q.body;

    this.seo.aplicar({
      titulo: q.title,
      descricao:
        resumo(trecho ?? '') ||
        `Uma pergunta sobre ${q.gameName ?? 'o jogo'}, respondida pela comunidade.`,
      canonical: q.slug ? `/perguntas/${q.slug}` : null,
    });

    // QAPage é o tipo que o Google usa para o resultado rico de pergunta e resposta — é o
    // que faz a resposta aparecer já na busca, e é metade do motivo do formato existir.
    this.seo.estruturado({
      '@type': 'QAPage',
      mainEntity: {
        '@type': 'Question',
        name: q.title,
        text: q.isSpoiler ? q.title : (q.body ?? q.title),
        answerCount: q.answerCount,
        ...(aceita && !aceita.isSpoiler
          ? { acceptedAnswer: { '@type': 'Answer', text: aceita.body } }
          : {}),
      },
    });
  }

  /** As outras perguntas do mesmo jogo, sem esta. */
  private carregarRelacionadas(q: GameQuestionDTO): void {
    this.service.listByGame(q.gameId, 0, 4).subscribe({
      next: (page) => this.related.set(page.content.filter((r) => r.id !== q.id).slice(0, 3)),
      error: () => this.related.set([]),
    });
  }

  protected escondido(chave: string, isSpoiler: boolean): boolean {
    return isSpoiler && !this.revelados().has(chave);
  }

  protected revelar(chave: string): void {
    this.revelados.update((s) => new Set(s).add(chave));
  }

  protected iniciais(nome: string | null | undefined): string {
    return (nome ?? '')
      .replace(/[^a-zA-ZÀ-ÿ]/g, '')
      .slice(0, 2)
      .toUpperCase();
  }

  protected haQuanto(dias: number): string {
    if (dias <= 0) return 'hoje';
    if (dias === 1) return 'ontem';
    return `há ${dias} dias`;
  }

  protected responder(): void {
    const body = this.composerBody().trim();
    const q = this.question();
    if (!body || !q || this.enviando()) return;

    this.enviando.set(true);
    this.service.answer(q.id, { body, isSpoiler: this.composerSpoiler() }).subscribe({
      next: (nova: GameAnswerDTO) => {
        // Acrescenta em memória em vez de recarregar: quem acabou de escrever vê o próprio
        // texto na hora, e a página já tem tudo o mais que precisa.
        this.question.set({ ...q, answers: [...q.answers, nova], answerCount: q.answerCount + 1 });
        this.composerBody.set('');
        this.composerSpoiler.set(false);
        this.enviando.set(false);
      },
      error: () => {
        this.toast.error('Erro', 'Não foi possível publicar sua resposta.');
        this.enviando.set(false);
      },
    });
  }

  protected aceitar(resposta: GameAnswerDTO): void {
    const q = this.question();
    if (!q) return;

    this.service.accept(q.id, resposta.id).subscribe({
      next: () => {
        this.question.set({
          ...q,
          resolved: true,
          answers: q.answers.map((a) => ({
            ...a,
            accepted: a.id === resposta.id,
            viewerCanAccept: false,
          })),
        });
      },
      error: () => this.toast.error('Erro', 'Não foi possível marcar a resposta.'),
    });
  }
}
