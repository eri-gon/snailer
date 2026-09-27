import express from "express";
import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

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

app.get("/api/images/:id", async (request, response) => {
    const id = request.params.id;
    const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    response.setHeader("Cache-Control", "no-store");

    if (!uuidPattern.test(id)) {
        response.status(400).json({ error: "Invalid image ID." });
        return;
    }

    try {
        const object = await s3.send(
            new GetObjectCommand({
                Bucket: bucket,
                Key: `test-uploads/${id}.jpg`,
            }),
        );

        if (!object.Body) {
            response.status(404).json({ error: "Image not found." });
            return;
        }

        const bytes = await object.Body.transformToByteArray();
        response.setHeader("Content-Type", "image/jpeg");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.send(Buffer.from(bytes));
    } catch (error) {
        console.error(
            "S3 retrieval failed:",
            error instanceof Error
                ? `${error.name}: ${error.message}`
                : "Unknown error",
        );

        if (error instanceof Error && error.name === "NoSuchKey") {
            response.status(404).json({ error: "Image not found." });
            return;
        }

        response.status(503).json({
            error: "Could not load the image. Check your AWS session.",
        });
    }
});

app.listen(3001, "127.0.0.1", () => {
    console.log("Upload server: http://127.0.0.1:3001");
});
