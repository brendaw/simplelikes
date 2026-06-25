const SLUG_REGEX = /^[a-z0-9]([a-z0-9/-]{0,198}[a-z0-9])?$/;
const MAX_SLUG_LENGTH = 200;

function validateSlug(slug: string): string | null {
  if (!slug || slug.length > MAX_SLUG_LENGTH) {
    return "Invalid slug: too long or empty";
  }

  if (!SLUG_REGEX.test(slug)) {
    return "Invalid slug: must contain only lowercase letters, numbers, hyphens, and forward slashes";
  }

  return null;
}

export { validateSlug };
