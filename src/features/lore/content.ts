/* Texto editorial da fonte de verdade "S1: Elementais vs Arcanos" (secções gerais).
   As facções, Arcanos e Elementais vêm da base de dados. */

export const loreContent = {
  intro: {
    title: 'Duas visões do mundo. Dois caminhos para o poder.',
    text: 'Os Arcanos acreditam que compreender a realidade é a melhor forma de transformá-la. Os Elementais acreditam que a força das fundações sustenta tudo aquilo que merece existir.',
    note: 'Nenhuma das facções está certa por definição. A escolha revela aquilo em que cada jogador acredita.',
  },
  premise: [
    'No universo de Table Tale, Arcanos e Elementais representam duas filosofias fundamentais sobre como o mundo deve ser compreendido, protegido e transformado.',
    'A divergência não é simplesmente entre magia e natureza, antigo e moderno, inteligência e força. É uma diferença de prioridades.',
    'Ambas as facções procuram poder, mas discordam sobre onde ele nasce e como deve ser utilizado.',
    'O conflito é filosófico e cultural antes de ser uma disputa entre heróis e vilões. Nenhuma facção é moralmente superior, e nenhuma possui o monopólio da verdade.',
  ],
  tension: {
    intro: [
      'As duas facções dependem de algo que a outra considera essencial.',
      'Os Arcanos sabem que o conhecimento precisa de uma base sobre a qual possa crescer. Os Elementais sabem que até as fundações mais sólidas precisam de resistir ao tempo e às mudanças.',
    ],
    rows: [
      ['O que permite evoluir?', 'Conhecimento e descoberta', 'Fundamentos e experiência'],
      ['O que deve ser protegido?', 'A liberdade de explorar possibilidades', 'Aquilo que sustenta a existência'],
      ['Como lidar com o passado?', 'Questioná-lo e aprender com ele', 'Preservar o que provou o seu valor'],
      ['Como lidar com a mudança?', 'Abraçá-la como oportunidade', 'Avaliar o seu impacto antes de a aceitar'],
      ['Qual é o maior perigo?', 'Ignorância e estagnação', 'Perda de identidade e de equilíbrio'],
      ['Onde nasce o poder?', 'Na compreensão', 'Na força e na resiliência'],
    ] as [string, string, string][],
    outro: 'A discordância não precisa de terminar em guerra. Pode gerar debate, rivalidade, cooperação, respeito e alianças circunstanciais.',
  },
  balance: {
    lead: 'Os Arcanos transformam e questionam. Os Elementais sustentam e protegem.',
    without: {
      arcanos: 'Sem os Arcanos, o mundo corre o risco de permanecer preso às próprias limitações.',
      elementais: 'Sem os Elementais, o mundo corre o risco de perder as bases que tornam qualquer futuro possível.',
    } as Record<string, string>,
    warning: 'O conhecimento sem fundamento pode tornar-se arrogância. A força sem questionamento pode tornar-se estagnação.',
    closing: 'O equilíbrio nasce dessa interdependência, não de tornar as facções idênticas.',
  },
  choice: {
    intro: 'A decisão é individual. Ninguém escolhe uma facção por obrigação de grupo, por alinhamento moral ou por uma diferença de força — escolhe-se a filosofia que mais representa a maneira como se vê o mundo.',
    question: 'Quando o mundo precisa de mudar, preferes descobrir aquilo que ele ainda pode ser ou proteger aquilo que o mantém de pé?',
    answer: 'Não existe resposta correta. A escolha é uma declaração de identidade dentro do universo Table Tale.',
  },
  neutral: 'O verso partilhado representa o universo Table Tale como um todo, e não uma facção. Pertence igualmente a Arcanos e Elementais.',
  outro: {
    title: 'Two paths. Two truths. One world.',
    text: 'O mundo precisa de quem questione as suas fronteiras e de quem proteja as suas fundações.',
  },
  chapters: [
    { id: 'escolha', label: 'A tua escolha' },
    { id: 'premissa', label: 'Premissa' },
    { id: 'arcanos', label: 'Os Arcanos' },
    { id: 'elementais', label: 'Os Elementais' },
    { id: 'tensao', label: 'Ponto de tensão' },
  ],
} as const;
