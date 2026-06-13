export const slugify = (value = '') => {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
};

export const uniqueSlug = async (Model, baseSlug, filter = {}, excludeId = null) => {
  const cleanBase = baseSlug || 'untitled';
  let candidate = cleanBase;
  let suffix = 1;

  while (await Model.exists({ slug: candidate, ...filter, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    candidate = `${cleanBase}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};
