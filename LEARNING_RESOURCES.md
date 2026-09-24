# Snailer learning resources

## Tracking system

Priority:

- ★ = referenced multiple times; prioritize reviewing it.
- — = normal priority.

Reading status:

- Not started = queued to read.
- Reading = currently studying.
- Finished = finished the relevant sections.

Priority and reading status are independent. Keep the star after finishing.
Statuses start as Not started until you update them; an open browser tab does
not automatically count as Reading or Finished.

## Uploading to S3

| Priority | Status | Resource | Focus |
|---|---|---|---|
| ★ | Not started | [Express: Basic routing](https://expressjs.com/en/starter/basic-routing/) | Routes, request handlers, and responses |
| — | Not started | [TypeScript: Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) | Runtime checks with `typeof` and `instanceof` |
| — | Not started | [AWS SDK: Presigned POST](https://github.com/aws/aws-sdk-js-v3/tree/main/packages/s3-presigned-post) | Temporary authorization for direct browser uploads |

Presigned POST is an alternative upload approach. Our current implementation
sends the image through Express using `PutObjectCommand`.

## Retrieving from S3

| Priority | Status | Resource | Focus |
|---|---|---|---|
| — | Not started | [AWS: S3 objects overview](https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingObjects.html) | Buckets, keys, contents, and metadata |
| — | Not started | [AWS: Create and call service objects](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/creating-and-calling-service-objects.html) | S3Client, commands, and `send()` |
| — | Not started | [AWS: JavaScript S3 examples](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_s3_code_examples.html) | GetObjectCommand and its returned Body |
| — | Not started | [Node.js: Buffer](https://nodejs.org/api/buffer.html) | Image bytes and `Buffer.from()` |
| — | Not started | [MDN: URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams) | Reading an image ID from the URL |
| — | Not started | [MDN: HTMLImageElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement) | Image loading and load/error events |

## Reading notes

Copy this template for each resource as you read:

### Resource name

- Link:
- Sections read:
- Takeaway:
- Remaining questions:

## Maintaining this collection

- Add useful sources under the relevant topic.
- Mark repeatedly referenced resources with ★.
- Update the status from Not started to Reading to Finished as you progress.
- Use reading notes to record where you stopped or what to revisit.
