import AWS from 'aws-sdk';
import { env } from '../config/env.js';

export const S3Service = {
  async uploadFile(data: Buffer, filename: string, mimeType: string): Promise<string> {
    if (!env.AWS_ACCESS_KEY_ID || !env.AWS_SECRET_ACCESS_KEY) {
      if (env.NODE_ENV === 'development') {
        console.warn('⚠️ AWS credentials missing. Mocking S3 upload in development mode.');
        return `https://mock-s3-bucket.localhost/${filename}`;
      }
      throw new Error("AWS credentials are not configured");
    }

    const s3 = new AWS.S3({
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      region: env.AWS_REGION,
    });

    const params = {
      Bucket: env.AWS_BUCKET_NAME || 'smartcare-bucket-dev',
      Key: filename,
      Body: data,
      ContentType: mimeType,
      ACL: 'public-read',
    };

    return new Promise((resolve, reject) => {
      s3.upload(params, (err: any, s3response: any) => {
        if (err) {
          console.error(err);
          reject(new Error("Failed to upload to S3"));
        } else {
          resolve(s3response.Location);
        }
      });
    });
  }
};
