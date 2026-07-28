export interface BatchEntry {
  slug: string;
  count: number;
  type: string;
}

export interface TypeInfo {
  type: string;
  slug_count: number;
  total_likes: number;
}

export interface TypeSlugEntry {
  slug: string;
  count: number;
}

export interface TypeSlugsResult {
  slugs: TypeSlugEntry[];
  total: number;
}

export interface IStorage {
  getCount(slug: string, type: string): Promise<number>;
  getTypeCounts(slug: string): Promise<Record<string, number>>;
  hasVisitor(slug: string, visitorId: string, type: string): Promise<boolean>;
  increment(slug: string, visitorId: string, type: string): Promise<void>;
  decrement(slug: string, visitorId: string, type: string): Promise<void>;
  batchGet(slugs: string[], type?: string): Promise<BatchEntry[]>;
  getTypes(): Promise<TypeInfo[]>;
  getTypeSlugs(type: string, limit?: number, offset?: number): Promise<TypeSlugsResult>;
}
