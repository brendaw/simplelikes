export interface IStorage {
  getCount(slug: string): Promise<number>;
  hasVisitor(slug: string, visitorId: string): Promise<boolean>;
  increment(slug: string, visitorId: string): Promise<void>;
  batchGet(slugs: string[]): Promise<Record<string, number>>;
}
