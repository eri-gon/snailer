import { S3Client } from "@aws-sdk/client-s3";
import { createApp } from "./app.js";

const bucket = process.env.S3_BUCKET;
if (!bucket || !process.env.AWS_REGION) {
    throw new Error("Set S3_BUCKET and AWS_REGION in server/.env");
}
const s3 = new S3Client({ region: process.env.AWS_REGION });
createApp(s3, bucket).listen(3001, "127.0.0.1", () => {
    console.log("Upload server: http://127.0.0.1:3001");
});
