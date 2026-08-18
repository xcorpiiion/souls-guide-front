import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * A documentação deste repositório, conferida no build.
 *
 * Roda em milissegundos, sem TestBed e sem rede: é só leitura de arquivo. Faz o que dá
 * para fazer sozinho — índice em dia, ADR completo, link que resolve, e o diagrama de
 * componentes contra os services que existem de verdade.
 *
 * O que teste nenhum consegue decidir é se uma decisão **mereceu** um ADR. Isso está nos
 * gatilhos do `.claude/rules.md`.
 *
 * Espelha o `DocumentacaoTest` do back-end. As duas travas que têm dentes são a última de
 * cada um: lá, serviço do compose que não está no diagrama de containers; aqui, service
 * novo que não está no diagrama de componentes.
 */

const RAIZ = resolve(process.cwd());
const DOCS = join(RAIZ, 'docs');
const ADR = join(DOCS, 'adr');
const RUNBOOKS = join(DOCS, 'runbooks');
const SERVICES = join(RAIZ, 'src', 'app', 'core', 'services');

const ler = (caminho: string) => readFileSync(caminho, 'utf8');

const arquivosMd = (pasta: string, excluir: string[] = []) =>
  readdirSync(pasta)
    .filter((f) => f.endsWith('.md') && !excluir.includes(f))
    .sort();

const adrs = () => arquivosMd(ADR, ['README.md', 'TEMPLATE.md']);
const runbooks = () => arquivosMd(RUNBOOKS, ['README.md']);

describe('documentação', () => {
  describe('ADRs', () => {
    it('todo ADR está no índice, e todo item do índice existe', () => {
      const indice = ler(join(ADR, 'README.md'));

      for (const arquivo of adrs()) {
        expect(indice, `${arquivo} não está no índice do docs/adr/README.md`).toContain(arquivo);
      }

      const citados = [...indice.matchAll(/\((\d{4}-[a-z0-9-]+\.md)\)/g)].map((m) => m[1]);
      expect(citados.length, 'o índice não cita nenhum ADR').toBeGreaterThan(0);

      for (const citado of citados) {
        expect(
          existsSync(join(ADR, citado)),
          `o índice aponta para ${citado}, que não existe`,
        ).toBe(true);
      }
    });

    it('todo ADR tem Status, Data e as quatro seções', () => {
      for (const arquivo of adrs()) {
        const texto = ler(join(ADR, arquivo));

        expect(texto, `${arquivo} sem Status`).toMatch(/- \*\*Status:\*\*/);
        expect(texto, `${arquivo} sem Data`).toMatch(/- \*\*Data:\*\*/);

        for (const secao of [
          '## Problema',
          '## Decisão',
          '## Consequências',
          '## Alternativas descartadas',
        ]) {
          expect(texto, `${arquivo} sem a seção "${secao}"`).toContain(secao);
        }
      }
    });

    it('o número do ADR bate com o nome do arquivo e não se repete', () => {
      const vistos = new Set<string>();

      for (const arquivo of adrs()) {
        const numero = arquivo.slice(0, 4);

        expect(vistos.has(numero), `número ${numero} repetido`).toBe(false);
        vistos.add(numero);

        const titulo = ler(join(ADR, arquivo)).split('\n')[0];
        expect(titulo, `o título de ${arquivo} não começa com "# ADR ${numero}"`).toContain(
          `# ADR ${numero}`,
        );
      }
    });

    /**
     * ADR que cita uma trava e o teste não existe mais é pior que ADR sem trava: ele
     * afirma que a regra está verificada quando ela não está.
     */
    it('a trava citada por um ADR existe', () => {
      for (const arquivo of adrs()) {
        const linha = ler(join(ADR, arquivo)).match(/- \*\*Trava:\*\* (.+)/)?.[1] ?? '';

        for (const [, spec] of linha.matchAll(/`([\w./-]+\.spec\.ts)`/g)) {
          const achou = existsSync(join(RAIZ, 'src', spec)) || buscar(join(RAIZ, 'src'), spec);
          expect(achou, `${arquivo} cita ${spec}, que não existe`).toBe(true);
        }
      }
    });
  });

  describe('runbooks', () => {
    it('todo runbook está no índice, e todo item do índice existe', () => {
      const indice = ler(join(RUNBOOKS, 'README.md'));

      for (const arquivo of runbooks()) {
        expect(indice, `${arquivo} não está no índice do docs/runbooks/README.md`).toContain(
          arquivo,
        );
      }

      for (const [, citado] of indice.matchAll(/\(([a-z0-9-]+\.md)\)/g)) {
        expect(
          existsSync(join(RUNBOOKS, citado)),
          `o índice aponta para ${citado}, que não existe`,
        ).toBe(true);
      }
    });

    it('todo runbook segue a forma de quatro partes', () => {
      for (const arquivo of runbooks()) {
        const texto = ler(join(RUNBOOKS, arquivo));

        for (const secao of [
          '## Sintoma',
          '## Em 30 segundos',
          '## Diagnóstico',
          '## O que não é',
        ]) {
          expect(texto, `${arquivo} sem a seção "${secao}"`).toContain(secao);
        }
      }
    });
  });

  it('todo link relativo dentro de docs/ resolve', () => {
    for (const arquivo of todosOsMd(DOCS)) {
      // O TEMPLATE tem link de exemplo (`NNNN-....md`), que por definição não resolve.
      if (arquivo.endsWith('TEMPLATE.md')) continue;

      const texto = ler(arquivo);

      for (const [, destino] of texto.matchAll(/\]\((?!https?:)([^)#]+)(?:#[^)]*)?\)/g)) {
        const alvo = resolve(dirname(arquivo), destino);
        expect(existsSync(alvo), `${arquivo}: link quebrado para ${destino}`).toBe(true);
      }
    }
  });

  /**
   * A trava com dentes: service novo em `core/services/` quebra o build até aparecer no
   * diagrama de componentes.
   *
   * É a mesma troca do resto do projeto — derivar da origem em vez de confiar na memória
   * de alguém. O equivalente no back-end é o serviço do `docker-compose.yml` contra o
   * diagrama de containers.
   */
  it('todo service de core/services está no diagrama de componentes', () => {
    const diagrama = ler(join(DOCS, 'arquitetura', 'c4-3-componentes-front.md'));

    const services = readdirSync(SERVICES)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
      .map((f) => f.replace(/\.ts$/, ''));

    expect(services.length, 'nenhum service encontrado').toBeGreaterThan(0);

    for (const service of services) {
      expect(
        diagrama,
        `${service} não aparece em docs/arquitetura/c4-3-componentes-front.md`,
      ).toContain(service);
    }
  });
});

/** Todos os .md de uma pasta, recursivamente. */
function todosOsMd(pasta: string): string[] {
  return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) return todosOsMd(caminho);
    return entrada.name.endsWith('.md') ? [caminho] : [];
  });
}

/** Procura um arquivo pelo nome, recursivamente. */
function buscar(pasta: string, nome: string): boolean {
  const alvo = nome.split('/').pop();

  return readdirSync(pasta, { withFileTypes: true }).some((entrada) => {
    if (entrada.isDirectory()) return buscar(join(pasta, entrada.name), nome);
    return entrada.name === alvo;
  });
}
