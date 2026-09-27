import express from "express";
import { randomInt, randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY_SECONDS = 24 * 60 * 60;

export function chooseDelaySeconds(mode: string): number {
    if (mode === "instant") return 0;
    if (mode === "priority") return randomInt(2 * DAY_SECONDS, 3 * DAY_SECONDS + 1);
    if (mode === "normal") return randomInt(3 * DAY_SECONDS, 7 * DAY_SECONDS + 1);
    throw new Error("Unknown delivery option.");
}

// Missing metadata identifies older uploads. Malformed metadata fails closed.
function releaseTime(metadata: Record<string, string> | undefined): number {
    const value = metadata?.["unlock-at"];
    if (value === undefined) return 0;
    const time = Number(value);
    if (!/^\d+$/.test(value) || !Number.isSafeInteger(time) || time < 0 || time > 8640000000000000) {
        throw new Error("Invalid delivery metadata.");
    }
    return time;
}

export function createApp(s3: Pick<S3Client, "send">, bucket: string, now = Date.now) {
const app = express();
app.use("/api", (_request, response, next) => {
    response.setHeader("Cache-Control", "no-store");
    next();
});

app.post(
    "/api/upload",
    express.raw({ type: "image/jpeg", limit: "10mb" }),
    async (request, response) => {
        if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
            response.status(400).json({ error: "Choose a JPEG file." });
            return;
        }

        const mode = request.header("X-Delivery-Mode") ?? "instant";
        if (!["instant", "priority", "normal"].includes(mode)) {
            response.status(400).json({ error: "Choose Instant, Priority, or Normal delivery." });
            return;
        }
        // Choose once, from the server's clock; a reload never redraws the delay.
        const unlockAt = now() + chooseDelaySeconds(mode) * 1000;
        const key = `test-uploads/${randomUUID()}.jpg`;

        try {
            await s3.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: key,
                    Body: request.body,
                    ContentType: "image/jpeg",
                    Metadata: { "unlock-at": String(unlockAt), "delivery-mode": mode },
                }),
            );

            response.json({ key, unlockAt, deliveryMode: mode });
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

// Status contains no image bytes and is safe to request while delivery is pending.
app.get("/api/images/:id/status", async (request, response) => {
    const id = request.params.id;
    if (!UUID_PATTERN.test(id)) {
        response.status(400).json({ error: "Invalid image ID." });
        return;
    }
    try {
        const object = await s3.send(new HeadObjectCommand({
            Bucket: bucket, Key: `test-uploads/${id}.jpg`,
        }));
        const unlockAt = releaseTime(object.Metadata);
        const serverNow = now();
        response.json({ unlockAt, serverNow, available: serverNow >= unlockAt });
    } catch (error) {
        sendStorageError(error, response);
    }
});

app.get("/api/images/:id", async (request, response) => {
    const id = request.params.id;
    if (!UUID_PATTERN.test(id)) {
        response.status(400).json({ error: "Invalid image ID." });
        return;
    }
    try {
        const key = `test-uploads/${id}.jpg`;
        // Inspect metadata before requesting the body from S3.
        const metadata = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        const unlockAt = releaseTime(metadata.Metadata);
        const serverNow = now();
        if (serverNow < unlockAt) {
            response.setHeader("Retry-After", String(Math.ceil((unlockAt - serverNow) / 1000)));
            response.status(423).json({ error: "This image is still in transit.", unlockAt, serverNow });
            return;
        }
        const object = await s3.send(new GetObjectCommand({
            Bucket: bucket, Key: key,
            // Do not serve a replacement object if it changed after the metadata check.
            IfMatch: metadata.ETag,
        }));
        if (!object.Body) {
            response.status(404).json({ error: "Image not found." });
            return;
        }
        const bytes = await object.Body.transformToByteArray();
        response.setHeader("Content-Type", "image/jpeg");
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.send(Buffer.from(bytes));
    } catch (error) {
        sendStorageError(error, response);
    }
});
return app;
}

function sendStorageError(error: unknown, response: express.Response) {
    console.error("S3 retrieval failed:", error instanceof Error ? error.name : "UnknownError");
    const missing = error instanceof Error && ["NoSuchKey", "NotFound"].includes(error.name);
    response.status(missing ? 404 : 503).json({
        error: missing ? "Image not found." : "Could not load the image. Check your AWS session and try again.",
    });
}
