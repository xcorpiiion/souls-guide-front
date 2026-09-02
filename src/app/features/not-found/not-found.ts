import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AtualizacaoDoApp } from '../../core/services/atualizacao-do-app';

/**
 * A tela de rota inexistente — e a última chance de descobrir que ela não deveria aparecer.
 *
 * <p>Chegar aqui tem duas causas bem diferentes, e elas não se distinguem pela URL: ou a
 * rota realmente não existe, ou existe e o app que está rodando é de antes dela. A segunda
 * acontece quando o service worker serve uma versão cacheada: o servidor responde 200 com
 * a casca, o app sobe inteiro, e o router não acha nada — "YOU DIED" com navbar e tudo,
 * numa página que existe.
 *
 * <p>Foi o que aconteceu com a volta do login com Discord, e a forma dela é o que torna
 * este o lugar certo: `/login/discord?code=...` é um documento novo, vindo de fora do
 * site, então o app sobe do zero na versão que o service worker tem — e a troca de versão
 * do {@link AtualizacaoDoApp#iniciar} não alcança isso, porque ela acontece na próxima
 * navegação de router, e aqui não houve navegação nenhuma.
 *
 * <p>Por isso a tela pergunta ao service worker se há versão nova antes de se assumir como
 * resposta. Havendo, ela troca e recarrega; não havendo, aparece na hora. Uma tentativa por
 * aba, para um 404 legítimo não virar laço de recarga.
 */
@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound implements OnInit {
  private readonly atualizacao = inject(AtualizacaoDoApp);

  ngOnInit(): void {
    // Sem await de proposito: a tela nao espera pela resposta. Ou ela recarrega, e o que
    // estava desenhado deixa de importar, ou nao havia versao nova e o 404 ja esta la.
    void this.atualizacao.recuperarRotaDesconhecida();
  }
}
