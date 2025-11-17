import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'sleepwise-audio';

/**
 * Upload file to S3
 */
export async function uploadToS3(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<AWS.S3.ManagedUpload.SendData> {
  const params: AWS.S3.PutObjectRequest = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ServerSideEncryption: 'AES256',
  };

  return s3.upload(params).promise();
}

/**
 * Download file from S3
 */
export async function downloadFromS3(key: string): Promise<Buffer> {
  const params: AWS.S3.GetObjectRequest = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  const data = await s3.getObject(params).promise();
  return data.Body as Buffer;
}

/**
 * Delete file from S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  const params: AWS.S3.DeleteObjectRequest = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  await s3.deleteObject(params).promise();
}

/**
 * Generate presigned URL for temporary access
 */
export function generatePresignedUrl(
  key: string,
  expiresIn: number = 3600
): string {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Expires: expiresIn,
  };

  return s3.getSignedUrl('getObject', params);
}

/**
 * Check if file exists in S3
 */
export async function fileExistsInS3(key: string): Promise<boolean> {
  try {
    await s3.headObject({
      Bucket: BUCKET_NAME,
      Key: key,
    }).promise();
    return true;
  } catch (error: any) {
    if (error.code === 'NotFound') {
      return false;
    }
    throw error;
  }
}

/**
 * List files with prefix
 */
export async function listFiles(prefix: string): Promise<string[]> {
  const params: AWS.S3.ListObjectsV2Request = {
    Bucket: BUCKET_NAME,
    Prefix: prefix,
  };

  const data = await s3.listObjectsV2(params).promise();
  return data.Contents?.map((obj) => obj.Key!) || [];
}

/**
 * Delete multiple files
 */
export async function deleteMultipleFiles(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  const params: AWS.S3.DeleteObjectsRequest = {
    Bucket: BUCKET_NAME,
    Delete: {
      Objects: keys.map((key) => ({ Key: key })),
    },
  };

  await s3.deleteObjects(params).promise();
}
