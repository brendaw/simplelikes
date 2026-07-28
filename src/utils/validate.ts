const SLUG_REGEX = /^[a-z0-9]([a-z0-9/-]{0,198}[a-z0-9])?$/;
const MAX_SLUG_LENGTH = 200;

const TYPE_REGEX = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/;
const MAX_TYPE_LENGTH = 50;

const RESERVED_TYPES = ["untyped"];

function validateSlug(slug: string): string | null {
  if (!slug || slug.length > MAX_SLUG_LENGTH) {
    return "Invalid slug: too long or empty";
  }

  if (!SLUG_REGEX.test(slug)) {
    return "Invalid slug: must contain only lowercase letters, numbers, hyphens, and forward slashes";
  }

  return null;
}

function validateType(type: string): string | null {
  if (type.length === 0) {
    return "Invalid type: must be non-empty";
  }

  if (type.length > MAX_TYPE_LENGTH) {
    return "Invalid type: too long (max 50 characters)";
  }

  if (RESERVED_TYPES.includes(type)) {
    return `Invalid type: '${type}' is a reserved type name`;
  }

  if (!TYPE_REGEX.test(type)) {
    return "Invalid type: must contain only lowercase letters, numbers, and hyphens";
  }

  return null;
}

export { validateSlug, validateType };
