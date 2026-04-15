export type PutObjectInput = {
  key: string;
  body: ReadableStream | ArrayBuffer | Uint8Array | string;
  contentType?: string;
  cacheControl?: string;
};

export async function r2Put(bucket: R2Bucket, input: PutObjectInput) {
  return await bucket.put(input.key, input.body, {
    httpMetadata: {
      contentType: input.contentType,
      cacheControl: input.cacheControl,
    },
  });
}

export async function r2Get(bucket: R2Bucket, key: string) {
  return await bucket.get(key);
}

