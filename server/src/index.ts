import express from "express";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const bucket = process.env.S3_BUCKET;

if (!bucket || !process.env.AWS_REGION) {
    throw new Error("Set S3_BUCKET and AWS_REGION in server/.env");
}

const s3 = new S3Client({ region: process.env.AWS_REGION });
const app = express();

app.post(
    "/api/upload",
    express.raw({ type: "image/jpeg", limit: "10mb" }),
    async (request, response) => {
        if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
            response.status(400).json({ error: "Choose a JPEG file." });
            return;
        }

        const key = `test-uploads/${randomUUID()}.jpg`;

        try {
            await s3.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: request.body,
                    ContentType: "image/jpeg",
                }),
            );

            response.json({ key });
        } catch (error) {
            console.error(
                "S3 upload failed:",
                error instanceof Error
                    ? `${error.name}: ${error.message}`
                    : "Unknown error",
            );
            response.status(500).json({
                error: "Upload failed. Check your AWS login, bucket, and region.",
            });
        }
    },
);

app.listen(3001, "127.0.0.1", () => {
    console.log("Upload server: http://127.0.0.1:3001");
});