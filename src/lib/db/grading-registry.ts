export type GradingCompanyDefinition = Readonly<{
  key: string;
  name: string;
  aliases: readonly string[];
  active: boolean;
  scaleMax: number | null;
  supportsHalfGrades: boolean;
  certificationUrlPattern?: string;
  notes: string;
}>;

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '');
}

export class GradingRegistry {
  readonly #companies = new Map<string, GradingCompanyDefinition>();
  readonly #aliases = new Map<string, string>();

  constructor(initial: readonly GradingCompanyDefinition[] = []) {
    for (const company of initial) this.register(company);
  }

  register(input: GradingCompanyDefinition): GradingCompanyDefinition {
    if (this.#companies.has(input.key)) {
      throw new Error(`Grading company already exists: ${input.key}`);
    }

    const company = Object.freeze({ ...input, aliases: Object.freeze([...input.aliases]) });
    const searchableNames = [input.key, input.name, ...input.aliases];
    for (const alias of searchableNames) {
      const aliasKey = normalized(alias);
      const owner = this.#aliases.get(aliasKey);
      if (owner && owner !== input.key) {
        throw new Error(`Grading-company alias already exists: ${alias}`);
      }
    }

    this.#companies.set(input.key, company);
    for (const alias of searchableNames) this.#aliases.set(normalized(alias), input.key);
    return company;
  }

  resolve(value: string): GradingCompanyDefinition | undefined {
    const key = this.#aliases.get(normalized(value));
    return key ? this.#companies.get(key) : undefined;
  }

  list(): readonly GradingCompanyDefinition[] {
    return [...this.#companies.values()];
  }
}

export function createGradingRegistry(
  initial: readonly GradingCompanyDefinition[] = [],
): GradingRegistry {
  return new GradingRegistry(initial);
}

const grader = (
  key: string,
  name: string,
  aliases: readonly string[],
  active = true,
  notes = '',
): GradingCompanyDefinition => ({
  key,
  name,
  aliases,
  active,
  scaleMax: 10,
  supportsHalfGrades: true,
  notes,
});

export const seededGradingCompanies: readonly GradingCompanyDefinition[] = [
  grader('psa', 'Professional Sports Authenticator', ['PSA'], true),
  grader('bgs', 'Beckett Grading Services', ['BGS', 'Beckett'], true),
  grader('bvg', 'Beckett Vintage Grading', ['BVG'], true),
  grader('bccg', 'Beckett Collectors Club Grading', ['BCCG'], true),
  grader('sgc', 'Sportscard Guaranty Corporation', ['SGC'], true),
  grader('cgc', 'CGC Cards', ['CGC', 'CSG'], true, 'CSG retained as a legacy alias.'),
  grader('tag', 'TAG Grading', ['TAG'], true),
  grader('hga', 'Hybrid Grading Approach', ['HGA'], true),
  grader('isa', 'ISA Grading', ['ISA'], true),
  grader('gma', 'GMA Grading', ['GMA'], true),
  grader('ksa', 'KSA Certification', ['KSA'], true),
  grader('mnt', 'MNT Grading', ['MNT'], true),
  grader('arena-club', 'Arena Club', ['Arena'], true),
  grader('rare-edition', 'Rare Edition', ['Rare'], true),
  grader('fcg', 'Forensic Card Grading', ['FCG'], true),
  grader('gai', 'Global Authentication Inc.', ['GAI'], false, 'Legacy/inactive.'),
  grader('pro', 'PRO Grading', ['PRO'], false, 'Legacy/inactive.'),
  grader('unbranded', 'Unbranded Slab', ['Unbranded'], true),
  {
    key: 'other-custom',
    name: 'Other / Custom',
    aliases: ['Other', 'Custom'],
    active: true,
    scaleMax: null,
    supportsHalfGrades: false,
    notes: 'User-defined grading company or holder.',
  },
];