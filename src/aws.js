// S3 Utils
export const getS3Instance = (serverless, region) => {
  const provider = serverless.getProvider(serverless.service.provider.name);

  return new provider.sdk.S3({ region, apiVersion: "2006-03-01" });
};

export const emptyS3Directory = async (s3, bucket, dir) => {
  const listParams = {
    Bucket: bucket,
    Prefix: dir,
  };

  const listedObjects = await s3.listObjectsV2(listParams).promise();

  if (listedObjects.Contents.length === 0) return;

  const deleteParams = {
    Bucket: bucket,
    Delete: { Objects: [] },
  };

  listedObjects.Contents.forEach(({ Key }) => {
    deleteParams.Delete.Objects.push({ Key });
  });

  await s3.deleteObjects(deleteParams).promise();

  if (listedObjects.IsTruncated) await emptyS3Directory(bucket, dir);
};

// EB Utils
export const getElasticBeanstalkInstance = (serverless, region) => {
  const provider = serverless.getProvider(serverless.service.provider.name);

  return new provider.sdk.ElasticBeanstalk({
    region,
    apiVersion: "2010-12-01",
  });
};
