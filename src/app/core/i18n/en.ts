/**
 * The interface in English.
 *
 * Only the interface. Guides, lore and comments stay in the language their author wrote
 * them in — see the header of `I18nService` for why hiding them would be worse.
 *
 * A missing key here falls back to Portuguese, on purpose: a sentence in the wrong
 * language is readable, a raw key on screen looks broken.
 */
export const EN: Record<string, string> = {
  // ─── Navigation ──────────────────────────────────────────────
  'nav.jogos': 'Games',
  'nav.quests': 'Quests',
  'nav.lore': 'Lore',
  'nav.rotas': 'Routes',
  'nav.comunidade': 'Community',
  'nav.buscar': 'Search',
  'nav.entrar': 'Sign in',
  'nav.sair': 'Sign out',
  'nav.perfil': 'Profile',
  'nav.moderacao': 'Moderation',
  'nav.idioma': 'Language',

  // ─── Common actions ──────────────────────────────────────────
  'acao.voltar': 'back',
  'acao.cancelar': 'cancel',
  'acao.salvar': 'save',
  'acao.editar': 'edit',
  'acao.excluir': 'delete',
  'acao.seguir': 'follow',
  'acao.seguindo': 'following',
  'acao.denunciar': 'report',
  'acao.enviar': 'send',
  'acao.tentarDeNovo': 'try again',

  // ─── States ──────────────────────────────────────────────────
  'estado.carregando': 'Loading…',
  'estado.vazio': 'nothing here yet',
  'estado.erro': 'could not load',
  'estado.semResultado': 'nothing found',

  // ─── Run panel ───────────────────────────────────────────────
  'run.titulo': 'my run',
  'run.voltarParaJogo': 'back to the game',
  'run.manterARunInteira': 'keep for the whole run',
  'run.manterAjuda':
    'not a task you complete — it is behaviour, and it holds while the ending is in play.',
  'run.portas': 'doors you can still leave open',
  'run.portasAjuda':
    'each one leaves this list the moment you trigger it. until then, it is your call.',
  'run.progresso': 'progress',
  'run.questsEmCurso': 'quests in progress',
  'run.terminadas': 'finished',
  'run.dosPassos': 'of the steps',
  'run.finais': 'endings',
  'run.alcancado': 'reached',
  'run.aEvitar': '{n} to avoid',
  'run.spoilerMostrar': 'contains a spoiler — show',
  'run.vazioTitulo': 'your run has not started yet',
  'run.vazioTexto':
    'tick a step in any guide for this game and it shows up here, with what is left and what you need to avoid.',
  'run.verGuias': 'see the guides',

  // ─── Item catalogue ──────────────────────────────────────────
  'itens.titulo': 'items',
  'itens.noCatalogo': '{n} in the catalogue',
  'itens.procurar': 'search by name…',
  'itens.todos': 'all',
  'itens.ondeEncontrar': 'where to find it',
  'itens.descricao': 'description',
  'itens.vazioTexto':
    'no item in this game matches the filter. the catalogue is written by the community, so an item nobody has added is not here yet.',

  // ─── Reporting ───────────────────────────────────────────────
  'denuncia.titulo': 'what is wrong with it?',
  'denuncia.detalhes': 'details (optional)',
  'denuncia.detalhesPlaceholder': 'what moderation needs to know to decide',
  'denuncia.aviso':
    'the report goes to a queue and a person reads it — nothing is removed automatically.',
  'denuncia.enviar': 'send report',
  'denuncia.enviando': 'sending…',
  'denuncia.okTitulo': 'Report sent',
  'denuncia.okTexto': 'Someone from moderation will look at it. Thanks for the heads-up.',
  'denuncia.repetidaTitulo': 'You already reported this',
  'denuncia.repetidaTexto': 'That report is still under review.',

  // ─── Moderation ──────────────────────────────────────────────
  'moderacao.titulo': 'moderation',
  'moderacao.naFila': '{n} in the queue',
  'moderacao.noHistorico': '{n} in the history',
  'moderacao.abertas': 'open',
  'moderacao.resolvidas': 'upheld',
  'moderacao.arquivadas': 'dismissed',
  'moderacao.decidir': 'decide',
  'moderacao.procede': 'upheld',
  'moderacao.naoProcede': 'dismissed',
  'moderacao.nota': 'decision note',
  'moderacao.notaPlaceholder': 'what you concluded, so the next moderator understands',
  'moderacao.aplicarStrike': 'give the author a strike',
  'moderacao.escada': 'three hold for a week, five for a month, seven do not expire',
  'moderacao.conteudoRemovido': 'content removed',
  'moderacao.filaVazia': 'nothing in the queue',
  'moderacao.filaVaziaTexto': 'no report waiting for a decision.',
};
