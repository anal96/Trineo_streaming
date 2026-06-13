import { assertInstituteAccess } from '../utils/tenant.js';

const RESOURCE_SELECT = 'institute courseId studentId lessonId';

export const tenantGuard = ({ model, idParam = 'id', bodyParam = null, fetchBy = 'findById', resolveResource = null } = {}) => {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'owner') {
        return next();
      }

      if (!req.user?.institute) {
        return res.status(403).json({ message: 'Forbidden: institute access required' });
      }

      const resourceId = req.params?.[idParam] || (bodyParam ? req.body?.[bodyParam] : null);
      if (!resourceId || !model) {
        return next();
      }

      const query = fetchBy === 'findOne'
        ? { _id: resourceId }
        : resourceId;

      const resource = resolveResource
        ? await resolveResource(req, resourceId)
        : await model.findOne(fetchBy === 'findOne' ? query : { _id: resourceId }).select(RESOURCE_SELECT);

      if (!resource) {
        return res.status(404).json({ message: 'Resource not found' });
      }

      if (!assertInstituteAccess(resource, req.user.institute)) {
        return res.status(403).json({ message: 'Forbidden: cross-tenant access denied' });
      }

      req.tenantResource = resource;
      next();
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  };
};
