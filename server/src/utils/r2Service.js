import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const isR2Configured = () => {
  return !!(
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    (process.env.R2_ACCOUNT_ID || process.env.R2_ENDPOINT) &&
    process.env.R2_BUCKET_NAME
  );
};

const getEndpoint = () => {
  if (process.env.R2_ACCOUNT_ID) {
    return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  }
  return process.env.R2_ENDPOINT;
};

let s3Client = null;
const getS3Client = () => {
  if (!isR2Configured()) return null;
  if (!s3Client) {
    s3Client = new S3Client({
      region: 'auto',
      endpoint: getEndpoint(),
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
      }
    });
  }
  return s3Client;
};

/**
 * Upload a file buffer to Cloudflare R2
 * @param {Buffer} fileBuffer 
 * @param {string} key 
 * @param {string} contentType 
 * @returns {Promise<string>} Public URL path
 */
export const uploadFile = async (fileBuffer, key, contentType) => {
  const client = getS3Client();
  if (!client) {
    throw new Error('Cloudflare R2 is not configured on the server. Please check environment variables.');
  }

  const bucket = process.env.R2_BUCKET_NAME;
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType
  });

  await client.send(command);

  const publicUrlBase = process.env.R2_PUBLIC_URL || `${getEndpoint()}/${bucket}`;
  return `${publicUrlBase.replace(/\/$/, '')}/${key}`;
};

/**
 * Delete a file from Cloudflare R2
 * @param {string} key 
 */
export const deleteFile = async (key) => {
  const client = getS3Client();
  if (!client) {
    throw new Error('Cloudflare R2 is not configured on the server.');
  }

  const bucket = process.env.R2_BUCKET_NAME;
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });

  await client.send(command);
};

/**
 * Generate a signed URL for a file in R2 (valid for 5 minutes)
 * @param {string} key 
 * @param {number} expiresInSeconds 
 * @returns {Promise<string>} Presigned URL
 */
export const generateSignedUrl = async (key, expiresInSeconds = 300) => {
  const client = getS3Client();
  if (!client) {
    throw new Error('Cloudflare R2 is not configured on the server.');
  }

  const bucket = process.env.R2_BUCKET_NAME;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });

  return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
};

/**
 * Check if a file exists in Cloudflare R2
 * @param {string} key 
 * @returns {Promise<boolean>}
 */
export const fileExists = async (key) => {
  const client = getS3Client();
  if (!client) {
    throw new Error('Cloudflare R2 is not configured on the server.');
  }

  const bucket = process.env.R2_BUCKET_NAME;
  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: key
  });

  try {
    await client.send(command);
    return true;
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw err;
  }
};

// --- Backward Compatibility / Aliases ---
export const uploadToR2 = uploadFile;
export const getSignedR2Url = generateSignedUrl;

/**
 * Download a file from R2 as a Buffer (used internally for attachment emails)
 * @param {string} key 
 * @returns {Promise<Buffer>}
 */
export const downloadFromR2 = async (key) => {
  const client = getS3Client();
  if (!client) {
    throw new Error('Cloudflare R2 is not configured on the server.');
  }

  const bucket = process.env.R2_BUCKET_NAME;
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });

  const response = await client.send(command);
  
  return new Promise((resolve, reject) => {
    const chunks = [];
    response.Body.on('data', chunk => chunks.push(chunk));
    response.Body.on('error', reject);
    response.Body.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

/**
 * Helper to parse R2 key from a URL
 * @param {string} url 
 * @returns {string} S3 Key
 */
export const parseR2Key = (url) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    let pathname = parsed.pathname;
    
    if (process.env.R2_PUBLIC_URL) {
      return pathname.replace(/^\//, '');
    } else {
      const bucket = process.env.R2_BUCKET_NAME;
      const parts = pathname.split('/').filter(Boolean);
      if (parts[0] === bucket) {
        return parts.slice(1).join('/');
      }
      return parts.join('/');
    }
  } catch (e) {
    return url.replace(/^\//, '');
  }
};
