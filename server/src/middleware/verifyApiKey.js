import { Institute } from '../models/Institute.js';
import { AuditLog } from '../models/AuditLog.js';
import bcrypt from 'bcryptjs';

export const verifyApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ message: 'Unauthorized: Missing API Key' });
  }

  try {
    const institutes = await Institute.find({ status: 'active' });
    let matchedInstitute = null;

    for (const inst of institutes) {
      const isMatchedLegacy = inst.apiKeyHash && await bcrypt.compare(apiKey, inst.apiKeyHash);
      const isMatchedIntegration = inst.integration?.apiKeyHash && await bcrypt.compare(apiKey, inst.integration.apiKeyHash);
      if (isMatchedLegacy || isMatchedIntegration) {
        matchedInstitute = inst;
        break;
      }
    }

    if (!matchedInstitute) {
      return res.status(401).json({ message: 'Unauthorized: Invalid API Key' });
    }

    req.institute = matchedInstitute;
    // Set req.user context for general authorization logic downstream
    req.user = {
      role: 'admin',
      institute: matchedInstitute._id,
      instituteId: matchedInstitute.instituteId
    };

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown CRM';

    await AuditLog.create({
      institute: matchedInstitute._id,
      instituteId: matchedInstitute.instituteId,
      eventType: 'API_ACCESS',
      details: `CRM API access authorized for route: ${req.method} ${req.originalUrl}`,
      ipAddress: ipAddress === '::1' ? '127.0.0.1' : ipAddress,
      userAgent
    });

    next();
  } catch (error) {
    console.error('API Key Middleware error:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
};
