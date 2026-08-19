/**
 * A interface em português — e a fonte da verdade das chaves.
 *
 * Chave que não existe aqui não existe em lugar nenhum: o `I18nService` cai neste
 * dicionário quando a tradução falta no outro, então uma chave nova nasce aqui primeiro.
 *
 * A convenção é `area.coisa`: o prefixo é a tela ou o componente, e o resto é o que a
 * frase diz. Chave descritiva demais (`home.textoDoBotaoAzulDeBaixo`) envelhece na
 * primeira mudança de layout.
 */
export const PT_BR: Record<string, string> = {
  // ─── Navegação ───────────────────────────────────────────────
  'nav.jogos': 'Jogos',
  'nav.quests': 'Quests',
  'nav.lore': 'Lore',
  'nav.rotas': 'Rotas',
  'nav.comunidade': 'Comunidade',
  'nav.buscar': 'Buscar',
  'nav.entrar': 'Entrar',
  'nav.sair': 'Sair',
  'nav.perfil': 'Perfil',
  'nav.moderacao': 'Moderação',
  'nav.idioma': 'Idioma',

  // ─── Ações comuns ────────────────────────────────────────────
  'acao.voltar': 'voltar',
  'acao.cancelar': 'cancelar',
  'acao.salvar': 'salvar',
  'acao.editar': 'editar',
  'acao.excluir': 'excluir',
  'acao.seguir': 'seguir',
  'acao.seguindo': 'seguindo',
  'acao.denunciar': 'denunciar',
  'acao.enviar': 'enviar',
  'acao.tentarDeNovo': 'tentar de novo',

  // ─── Estados ─────────────────────────────────────────────────
  'estado.carregando': 'Carregando…',
  'estado.vazio': 'nada por aqui ainda',
  'estado.erro': 'não foi possível carregar',
  'estado.semResultado': 'nada encontrado',

  // ─── Painel da run ───────────────────────────────────────────
  'run.titulo': 'minha run',
  'run.voltarParaJogo': 'voltar para o jogo',
  'run.manterARunInteira': 'manter a run inteira',
  'run.manterAjuda':
    'não é tarefa que se conclui — é comportamento, e vale enquanto o final estiver em curso.',
  'run.portas': 'portas que ainda dá para não fechar',
  'run.portasAjuda': 'cada uma some daqui assim que você a disparar. até lá, a escolha é sua.',
  'run.progresso': 'progresso',
  'run.questsEmCurso': 'quests em curso',
  'run.terminadas': 'terminadas',
  'run.dosPassos': 'dos passos',
  'run.finais': 'finais',
  'run.alcancado': 'alcançado',
  'run.aEvitar': '{n} a evitar',
  'run.spoilerMostrar': 'contém spoiler — mostrar',
  'run.vazioTitulo': 'sua run ainda não começou',
  'run.vazioTexto':
    'marque um passo em qualquer guia deste jogo e ele aparece aqui, com o que falta e o que você precisa evitar.',
  'run.verGuias': 'ver os guias',

  // ─── Catálogo de itens ───────────────────────────────────────
  'itens.titulo': 'itens',
  'itens.noCatalogo': '{n} no catálogo',
  'itens.procurar': 'procurar por nome…',
  'itens.todos': 'todos',
  'itens.ondeEncontrar': 'onde encontrar',
  'itens.descricao': 'descrição',
  'itens.vazioTexto':
    'nenhum item deste jogo bate com o filtro. o catálogo é escrito pela comunidade, então item que ninguém cadastrou ainda não está aqui.',

  // ─── Denúncia ────────────────────────────────────────────────
  'denuncia.titulo': 'o que há de errado?',
  'denuncia.detalhes': 'detalhes (opcional)',
  'denuncia.detalhesPlaceholder': 'o que a moderação precisa saber para decidir',
  'denuncia.aviso':
    'a denúncia vai para uma fila e é lida por uma pessoa — nada é removido automaticamente.',
  'denuncia.enviar': 'enviar denúncia',
  'denuncia.enviando': 'enviando…',
  'denuncia.okTitulo': 'Denúncia enviada',
  'denuncia.okTexto': 'Alguém da moderação vai olhar. Obrigado por avisar.',
  'denuncia.repetidaTitulo': 'Você já denunciou',
  'denuncia.repetidaTexto': 'Esta denúncia ainda está em análise.',

  // ─── Moderação ───────────────────────────────────────────────
  'moderacao.titulo': 'moderação',
  'moderacao.naFila': '{n} na fila',
  'moderacao.noHistorico': '{n} no histórico',
  'moderacao.abertas': 'abertas',
  'moderacao.resolvidas': 'resolvidas',
  'moderacao.arquivadas': 'arquivadas',
  'moderacao.decidir': 'decidir',
  'moderacao.procede': 'procede',
  'moderacao.naoProcede': 'não procede',
  'moderacao.nota': 'nota da decisão',
  'moderacao.notaPlaceholder': 'o que você concluiu, para o próximo moderador entender',
  'moderacao.aplicarStrike': 'aplicar strike ao autor',
  'moderacao.escada': 'três seguram por uma semana, cinco por um mês, sete não expiram',
  'moderacao.conteudoRemovido': 'conteúdo removido',
  'moderacao.filaVazia': 'nada na fila',
  'moderacao.filaVaziaTexto': 'nenhuma denúncia esperando decisão.',
};
