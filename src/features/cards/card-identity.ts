export type AutographType = 'NONE' | 'ON_CARD' | 'STICKER' | 'UNKNOWN';
export type MemorabiliaType = 'NONE' | 'GAME_USED' | 'PLAYER_WORN' | 'MANUFACTURED' | 'UNKNOWN';

export type CardIdentity = Readonly<{
  sport: string;
  playerName: string;
  canonicalPlayerId: string | null;
  teamShown: string | null;
  year: number | null;
  manufacturer: string | null;
  brand: string | null;
  setName: string | null;
  subset: string | null;
  cardNumber: string | null;
  rookie: boolean | null;
  parallel: string | null;
  color: string | null;
  serialNumber: number | null;
  serialDenominator: number | null;
  autographType: AutographType;
  memorabiliaType: MemorabiliaType;
  raw: boolean | null;
  gradingCompanyKey: string | null;
  grade: number | null;
  qualifiers: readonly string[];
}>;

export type CardIdentityInput = Omit<CardIdentity, 'qualifiers' | 'subset' | 'color' | 'serialNumber'> & {
  qualifiers?: readonly string[];
  subset?: string | null;
  color?: string | null;
  serialNumber?: number | null;
};

function clean(value: string | null | undefined): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

export function createCardIdentity(input: CardIdentityInput): CardIdentity {
  const playerName = clean(input.playerName);
  if (!playerName) throw new Error('playerName is required');
  if (input.year !== null && (!Number.isInteger(input.year) || input.year < 1800 || input.year > 2200)) {
    throw new Error(`Invalid card year: ${input.year}`);
  }
  if (input.grade !== null && (!Number.isFinite(input.grade) || input.grade < 0 || input.grade > 100)) {
    throw new Error(`Invalid card grade: ${input.grade}`);
  }

  return Object.freeze({
    sport: input.sport.trim().toLocaleLowerCase('en-US'),
    playerName,
    canonicalPlayerId: clean(input.canonicalPlayerId),
    teamShown: clean(input.teamShown),
    year: input.year,
    manufacturer: clean(input.manufacturer),
    brand: clean(input.brand),
    setName: clean(input.setName),
    subset: clean(input.subset),
    cardNumber: clean(input.cardNumber),
    rookie: input.rookie,
    parallel: clean(input.parallel),
    color: clean(input.color),
    serialNumber: input.serialNumber ?? null,
    serialDenominator: input.serialDenominator,
    autographType: input.autographType,
    memorabiliaType: input.memorabiliaType,
    raw: input.raw,
    gradingCompanyKey: clean(input.gradingCompanyKey)?.toLocaleLowerCase('en-US') ?? null,
    grade: input.grade,
    qualifiers: Object.freeze([...(input.qualifiers ?? [])].map((qualifier) => qualifier.trim()).filter(Boolean)),
  });
}