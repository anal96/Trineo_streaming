export const normalizeId = (value) => (value == null ? null : value.toString());

export const isSameInstitute = (left, right) => normalizeId(left) && normalizeId(right) && normalizeId(left) === normalizeId(right);

export const getResourceInstitute = (resource) => {
  if (!resource) return null;
  return resource.institute || resource.instituteId || null;
};

export const attachInstituteFilter = (query = {}, instituteId) => {
  if (!instituteId) return query;
  return { ...query, institute: instituteId };
};

export const assertInstituteAccess = (resource, instituteId) => isSameInstitute(getResourceInstitute(resource), instituteId);
