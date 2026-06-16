import { LoreArticle } from '../../shared/models/lore-article.model';

export const LORE_ARTICLES: LoreArticle[] = [
  {
    id: 'ranni-plano-da-lua',
    title: 'Ranni, a Bruxa das Estrelas',
    gameId: 'elden-ring',
    gameName: 'Elden Ring',
    category: 'CHARACTER',
    status: 'CANONICO',
    excerpt:
      'Semideusa que abandonou seu destino divino para executar o Plano da Lua — uma grande fuga do ciclo dos Elden Lords.',
    author: 'vincruz',
    votes: 412,
    readMinutes: 8,
    tags: ['semideusa', 'magia lunar', 'fratura', 'Nokron'],
    sections: [
      {
        heading: 'quem é ranni',
        body: 'Ranni é uma das figuras mais enigmáticas das Terras Intermédias. Filha de Radagon e Rennala, ela abandonou voluntariamente seu destino como Deus Lunar antes mesmo da Fratura, transferindo sua alma para um boneco de porcelana de quatro braços.',
      },
      {
        heading: 'o plano da lua',
        body: 'Ao contrário dos outros semideuses que lutam pelo Anel Âncora, Ranni busca uma ordem completamente nova — uma era sem os Grandes Seres, onde mortais possam seguir seus próprios destinos no vazio entre as estrelas.',
        quote:
          '"Eu irei tornar-me Deus. Uma divindade da lúgubre lua escura. E guiarei todos além das estrelas."',
      },
      {
        heading: 'a noite da fratura',
        body: 'Na Noite das Luas Negras, Ranni orquestrou o assassinato de Godwyn o Dourado — usando o ritual do Nox para matar a alma de um semideus mantendo o corpo vivo, enquanto ela própria fazia o inverso: preservou sua alma destruindo seu corpo divino.',
      },
      {
        heading: 'conexão com nokron',
        body: 'A missão de Ranni passa pela cidade subterrânea de Nokron, que só se torna acessível após derrotar o Mímico. Lá está guardada a Agulha de Ranni — o artefato capaz de romper o destino inscrito pelo Anel Âncora.',
      },
    ],
    relatedQuests: [
      { questId: 'er-q1', gameId: 'elden-ring', title: 'Questline de Ranni, a Bruxa' },
      { questId: 'er-q2', gameId: 'elden-ring', title: 'Questline de Blaidd' },
    ],
  },
  {
    id: 'gehrman-sonho-cacador',
    title: 'Gehrman e o Sonho do Caçador',
    gameId: 'bloodborne',
    gameName: 'Bloodborne',
    category: 'CHARACTER',
    status: 'CANONICO',
    excerpt:
      'O primeiro caçador e sua prisão voluntária — a relação com a Boneca e a Grande Mente por trás do sonho.',
    author: 'lore_bb',
    votes: 287,
    readMinutes: 6,
    tags: ['primeiro caçador', 'grande mente', 'sonho', 'boneca'],
    sections: [
      {
        heading: 'o primeiro caçador',
        body: 'Gehrman foi o primeiro a fazer o pacto com a Grande Mente Moon Presence, tornando-se guardião do Sonho do Caçador. Ele treinou todos os caçadores subsequentes e ficou preso no sonho para sempre, envelhecendo sem poder morrer.',
      },
      {
        heading: 'a boneca e a obsessão',
        body: 'A Boneca do Sonho do Caçador foi criada por Gehrman à imagem de alguém que ele amava — possivelmente Maria, a Cazadora da Haos. Essa obsessão é parte do que o prende ao sonho mesmo desejando escapar.',
        quote:
          '"Oh, querido caçador. Deixe-me ajudá-lo a esquecer... o peso do seu sofrimento horrível."',
      },
      {
        heading: 'o ciclo eterno',
        body: 'Gehrman serve como o último obstáculo do caçador. Ao derrotá-lo, o jogador pode tomar seu lugar — ou ser liberado pelo Moon Presence. A escolha define o verdadeiro final do ciclo de Yharnam.',
      },
    ],
    relatedQuests: [{ questId: 'bb-q1', gameId: 'bloodborne', title: 'Investigação de Yharnam' }],
  },
  {
    id: 'farum-azula-cidade-tempo',
    title: 'Farum Azula e a Cidade do Tempo',
    gameId: 'elden-ring',
    gameName: 'Elden Ring',
    category: 'WORLD',
    status: 'CANONICO',
    excerpt:
      'Ruínas suspensas no ar que testemunham o fim da era dos Dragões — e a origem da Tempestade de Marika.',
    author: 'ds_wiki',
    votes: 156,
    readMinutes: 5,
    tags: ['dragões', 'tempestade', 'Malekith', 'ruínas'],
    sections: [
      {
        heading: 'a cidade fora do tempo',
        body: 'Farum Azula é uma cidade que foi literalmente arrancada do fluxo do tempo. Ela flutua em fragmentos acima de uma tempestade eterna, habitada por dragões ancestrais e bêstas antigas que sobreviveram à era do Anel Âncora.',
      },
      {
        heading: 'malekith e a chama da runa',
        body: 'É em Farum Azula que Malekith, o Rei Ancestral, aguarda com a Chama da Runa — o fogo capaz de destruir o Elden Ring e quebrar o ciclo das eras. Sua missão foi dada pela rainha Marika, que queria pôr fim ao poder dos Grandes Seres.',
        quote: '"Esta é a Chama da Runa. O fogo que destruirá o Anel Âncora e os Grandes Seres."',
      },
    ],
    relatedQuests: [],
  },
  {
    id: 'runes-elden-ring-origem',
    title: 'O Elden Ring e os Grandes Runes',
    gameId: 'elden-ring',
    gameName: 'Elden Ring',
    category: 'WORLD',
    status: 'TEORIA',
    excerpt:
      'Teoria sobre a natureza do Elden Ring original e o que cada Grande Rune representa da ordem do mundo.',
    author: 'theorycraft',
    votes: 203,
    readMinutes: 11,
    tags: ['elden ring', 'grandes runes', 'marika', 'fratura', 'teoria'],
    sections: [
      {
        heading: 'antes da fratura',
        body: 'O Elden Ring original era composto por todos os Grandes Runes intactos. A teoria mais aceita pela comunidade é que cada rune representa um aspecto fundamental da ordem — vida, morte, caos, ordem, etc. Quando Marika o quebrou, esses aspectos se tornaram armas nas mãos de seus filhos.',
      },
      {
        heading: 'o que cada rune representa',
        body: 'Godrick carrega uma rune mutilada — fragmento de todos os outros. Rykard tem a rune da serpente (traição e devoração). Morgott tem a rune da graça, invertida em maldição. Malenia tem a rune da morte não-morte.',
        quote:
          '"Que a graça de Ouro guie os passos perdidos." — mas para Morgott, a graça nunca veio.',
      },
    ],
    relatedQuests: [],
  },
  {
    id: 'eileen-the-crow',
    title: 'Eileen the Crow e o Código dos Caçadores',
    gameId: 'bloodborne',
    gameName: 'Bloodborne',
    category: 'CHARACTER',
    status: 'CONSOLIDADO',
    excerpt:
      'A única caçadora que caça outros caçadores — e o que isso diz sobre a tragédia de Yharnam.',
    author: 'vincruz',
    votes: 98,
    readMinutes: 4,
    tags: ['caçadora', 'corvos', 'código', 'tragédia'],
    sections: [
      {
        heading: 'o código dos corvos',
        body: 'Eileen pertence a uma ordem secreta de caçadores que tem como missão "dar descanso" a outros caçadores que enlouqueceram com a caça. É o reconhecimento de que a própria caça é uma maldição — não uma benção.',
      },
      {
        heading: 'a tragédia de henryk',
        body: 'O arco de Eileen culmina num confronto com Henryk, um antigo parceiro de caça que perdeu a sanidade. Matar alguém com quem já lutou lado a lado é o núcleo trágico do código dos corvos.',
        quote: '"Caçadores caçam bestas. E quando a besta sou eu, que me cacem também."',
      },
    ],
    relatedQuests: [{ questId: 'bb-q2', gameId: 'bloodborne', title: 'Questline de Eileen' }],
  },
  {
    id: 'catedral-do-abismo',
    title: 'A Catedral do Abismo — Oolacile',
    gameId: 'dark-souls-3',
    gameName: 'Dark Souls III',
    category: 'WORLD',
    status: 'CONSOLIDADO',
    excerpt:
      'A queda de Oolacile e a corrupção de Manus revelam como o Abismo surge da humanidade perturbada.',
    author: 'ds_wiki',
    votes: 175,
    readMinutes: 7,
    tags: ['abismo', 'oolacile', 'manus', 'humanidade'],
    sections: [
      {
        heading: 'oolacile e a magia da luz',
        body: 'Oolacile era uma cidade de feiticeiros especialistas em magia de luz — antes de perturbarem o fragmento de humanidade de Manus. Isso desencadeou a corrupção do Abismo que consumiu toda a cidade.',
      },
      {
        heading: 'manus e o fragmento de humanidade',
        body: 'Manus era um humano comum cujo fragmento de humanidade foi perturbado ao ponto de ele se tornar o Pai do Abismo. Isso sugere que o Abismo não é uma força externa maligna, mas o próprio potencial sombrio da humanidade transbordando.',
        quote: '"O Abismo se expande... assim como a escuridão em todo coração humano."',
      },
    ],
    relatedQuests: [],
  },
];
