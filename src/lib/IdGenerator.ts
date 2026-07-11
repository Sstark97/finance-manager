export class IdGenerator {
  generate(): string {
    return Math.random().toString(36).slice(2, 9);
  }
}

export const idGenerator = new IdGenerator();
