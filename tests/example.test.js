import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GenericContainer } from "testcontainers";
import { S3Client, ListBucketsCommand, CreateBucketCommand, PutObjectCommand, ListObjectsCommand, DeleteObjectCommand, DeleteBucketCommand } from "@aws-sdk/client-s3";
import { readFileSync } from 'fs';




describe('Test', {
    sequential: true
}, () => {
    let minioContainer;
    let s3Client;
    const bucketName = 'test-bucket';
    const objKey = 'test-file.pdf';

    beforeAll(async () => {
        minioContainer = await new GenericContainer("minio/minio")
            .withExposedPorts(9000)
            .withCommand(["server", "/data"])
            .start();

        const minioHost = minioContainer.getHost();
        const minioPort = minioContainer.getMappedPort(9000);

        s3Client = new S3Client({
            region: 'us-east-1',
            endpoint: `http://${minioHost}:${minioPort}`,
            forcePathStyle: true,
            credentials: {
                accessKeyId: 'minioadmin',
                secretAccessKey: 'minioadmin',
            },
        })
    });

    it('list buckets', async () => {
        const listBucketCommand = new ListBucketsCommand();
        const response = await s3Client.send(listBucketCommand);

        expect(response.Buckets).toEqual([]);
    });

    it('create a bucket', async () => {

        // use CreateBucketCommand
        const createBucket = new CreateBucketCommand({ Bucket: bucketName });
        //send the command using s3 client
        await s3Client.send(createBucket)

        //check if bucket was created succesfully
        const listBucketCommand = new ListBucketsCommand();
        const response = await s3Client.send(listBucketCommand);

        //use .map to get just the Name property of each bucket
        const bucketNames = response.Buckets?.map(bucket => bucket.Name);
        // Check that the name of the bucket you created is included in the list of bucket names
        expect(bucketNames).toContain(bucketName);


        //** this is a simplified version I tried, would this be suficient ? */
        // const createBucket = new CreateBucketCommand({ Bucket: bucketName });
        // const response = await s3Client.send(createBucket)
        // // check if bucket was created succesfully
        // expect(response).toBeDefined()


    });

    it('upload file', async () => {

        const filePath = '/Users/mariapauladossantos/Desktop/coding /Lab7.pdf';
        const fileContent = readFileSync(filePath);

        //use PutObjectCommand to upload the file
        const putObjCommad = new PutObjectCommand({
            Bucket: bucketName,
            Key: objKey,
            Body: fileContent,
        })

        await s3Client.send(putObjCommad);

        // List objects in the bucket to verify the file was uploaded
        const listObjectsCommand = new ListObjectsCommand({ Bucket: bucketName });
        const response = await s3Client.send(listObjectsCommand);

        const objectKeys = response.Contents?.map(obj => obj.Key);
        // Check that the uploaded file's key is in the list
        expect(objectKeys).toContain(objKey);



        //** is this an okay way to check in a test ? */
        // check if was created succesfully
        // expect(response.$metadata.httpStatusCode).toBe(200);
    });

    it('delete file', async () => {
        const deleteObjCommand = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: objKey,
        });
        await s3Client.send(deleteObjCommand);

        // Verify the file was deleted
        const listObjectsCommand = new ListObjectsCommand({ Bucket: bucketName });
        const listResponse = await s3Client.send(listObjectsCommand);

        const objectKeys = listResponse.Contents?.map(obj => obj.Key) || [];
        //check the file key is no longer in the bucket
        expect(objectKeys).not.toContain(objKey);
    });

    it('delete bucket', async () => {

        // use the DeleteBucketCommand
        const deleteBucketCommand = new DeleteBucketCommand({ Bucket: bucketName });
        const response = await s3Client.send(deleteBucketCommand);

        expect(response).toEqual(
            expect.objectContaining({
                $metadata: expect.any(Object),
            })
        );

    });

    afterAll(async () => {
        await minioContainer?.stop();
    });
});