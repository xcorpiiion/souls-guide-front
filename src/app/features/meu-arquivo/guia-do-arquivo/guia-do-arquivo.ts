import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type PassoDoGuia = 'registrar' | 'ligar' | 'montar';

interface Passo {
  readonly chave: PassoDoGuia;
  readonly numero: number;
  readonly titulo: string;
  readonly texto: string;
  readonly acao: string;
  readonly estado: 'feito' | 'agora' | 'depois';
  /** Ligar pede dois achados: com um só, o botão não teria o que fazer. */
  readonly disponivel: boolean;
}

const CHAVE_FECHADO = 'sg_guia_arquivo_fechado';

/**
 * "Como funciona" — o caminho do arquivo em três passos, no topo da mesa.
 *
 * <p>A mesa mostra muita coisa de uma vez (faixa, capítulos, filtros, mural, montar lore), e
 * quem chega nela ainda não sabe o que é um achado, uma ligação ou uma peça solta. O guia diz
 * a ordem, acende o passo em que a pessoa está — pelo que ela já fez, não por um tutorial com
 * etapas a clicar — e leva direto à ação.
 *
 * <p>Fechar é lembrado neste navegador (é preferência de tela, não dado), e "como funciona?"
 * o reabre.
 */
@Component({
  selector: 'app-guia-do-arquivo',
  templateUrl: './guia-do-arquivo.html',
  styleUrl: './guia-do-arquivo.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuiaDoArquivo {
  private readonly noNavegador = isPlatformBrowser(inject(PLATFORM_ID));

  readonly achados = input.required<number>();
  readonly ligacoes = input.required<number>();

  readonly agir = output<PassoDoGuia>();

  protected readonly fechado = signal(this.lerFechado());

  protected readonly passos = computed<Passo[]>(() => {
    const achados = this.achados();
    const ligacoes = this.ligacoes();
    const feito = [achados > 0, ligacoes > 0, false];
    const agora = feito.indexOf(false);
    const estado = (i: number) => (feito[i] ? 'feito' : i === agora ? 'agora' : 'depois');

    return [
      {
        chave: 'registrar',
        numero: 1,
        titulo: 'registre o que achou',
        texto: 'cole o texto de uma nota, documento, diálogo ou cutscene. cada um vira um achado.',
        acao: 'registrar achado',
        estado: estado(0),
        disponivel: true,
      },
      {
        chave: 'ligar',
        numero: 2,
        titulo: 'ligue as peças',
        texto:
          'diga como um achado conversa com outro: fala da mesma pessoa, explica, contradiz. achado sem ligação é uma peça solta.',
        acao: achados < 2 ? 'precisa de 2 achados' : 'ligar um achado',
        estado: estado(1),
        disponivel: achados >= 2,
      },
      {
        chave: 'montar',
        numero: 3,
        titulo: 'monte a lore',
        texto:
          'escolha os achados, ponha na ordem da história e escreva entre as citações. publicar é opcional: o arquivo continua só seu.',
        acao: achados < 1 ? 'precisa de 1 achado' : 'montar lore',
        estado: estado(2),
        disponivel: achados >= 1,
      },
    ];
  });

  protected fechar(): void {
    this.fechado.set(true);
    this.gravarFechado(true);
  }

  /** Chamado pelo "como funciona?" da mesa. */
  abrir(): void {
    this.fechado.set(false);
    this.gravarFechado(false);
  }

  estaFechado(): boolean {
    return this.fechado();
  }

  private lerFechado(): boolean {
    if (!this.noNavegador) return false;
    try {
      return localStorage.getItem(CHAVE_FECHADO) === '1';
    } catch {
      return false;
    }
  }

  private gravarFechado(valor: boolean): void {
    if (!this.noNavegador) return;
    try {
      if (valor) localStorage.setItem(CHAVE_FECHADO, '1');
      else localStorage.removeItem(CHAVE_FECHADO);
    } catch {
      // Sem armazenamento o guia só volta a aparecer na próxima visita.
    }
  }
}
