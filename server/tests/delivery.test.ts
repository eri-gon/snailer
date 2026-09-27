import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { createApp, chooseDelaySeconds } from "../src/app.js";

const id = "12345678-1234-1234-1234-123456789abc";
const key = `test-uploads/${id}.jpg`;
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);

test("delivery delays stay within their agreed ranges", () => {
  assert.equal(chooseDelaySeconds("instant"), 0);
  for (let i = 0; i < 100; i++) {
    const normal = chooseDelaySeconds("normal");
    const priority = chooseDelaySeconds("priority");
    assert.ok(normal >= 3 * 86400 && normal <= 7 * 86400);
    assert.ok(priority >= 2 * 86400 && priority <= 3 * 86400);
  }
  assert.throws(() => chooseDelaySeconds("invalid"));
});

test("HTTP delivery gate persists, blocks direct bytes, and releases at the boundary", async () => {
  let now = 1_800_000_000_000;
  let getCount = 0;
  const objects = new Map<string, Record<string, string> | undefined>();
  const fake = {
    async send(command: unknown) {
      if (command instanceof PutObjectCommand) {
        objects.set(command.input.Key!, command.input.Metadata);
        return {};
      }
      const input = (command as HeadObjectCommand).input;
      if (!objects.has(input.Key!)) {
        const error = new Error("Missing"); error.name = "NotFound"; throw error;
      }
      if (command instanceof HeadObjectCommand) {
        return { Metadata: objects.get(input.Key!), ETag: '"test"' };
      }
      if (command instanceof GetObjectCommand) {
        getCount++;
        return { Body: { transformToByteArray: async () => jpeg } };
      }
      throw new Error("Unexpected command");
    },
  } as unknown as Pick<S3Client, "send">;
  const server = createApp(fake, "test-bucket", () => now).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    for (const mode of ["instant", "priority", "normal"]) {
      const response = await fetch(`${origin}/api/upload`, {
        method: "POST", headers: { "Content-Type": "image/jpeg", "X-Delivery-Mode": mode }, body: jpeg,
      });
      assert.equal(response.status, 200);
      const data = await response.json();
      assert.equal(objects.get(data.key)?.["unlock-at"], String(data.unlockAt));
      assert.equal(data.deliveryMode, mode);
      const delay = data.unlockAt - now;
      if (mode === "instant") assert.equal(delay, 0);
      if (mode === "priority") assert.ok(delay >= 2 * 86400000 && delay <= 3 * 86400000);
      if (mode === "normal") assert.ok(delay >= 3 * 86400000 && delay <= 7 * 86400000);
    }
    const invalid = await fetch(`${origin}/api/upload`, {
      method: "POST", headers: { "Content-Type": "image/jpeg", "X-Delivery-Mode": "tomorrow" }, body: jpeg,
    });
    assert.equal(invalid.status, 400);
    const unlockAt = now + 10_000;
    objects.set(key, { "unlock-at": String(unlockAt) });
    for (let i = 0; i < 2; i++) {
      const status = await fetch(`${origin}/api/images/${id}/status`);
      assert.equal(status.headers.get("cache-control"), "no-store");
      assert.deepEqual(await status.json(), { unlockAt, serverNow: now, available: false });
      const blocked = await fetch(`${origin}/api/images/${id}?unlockAt=0`);
      assert.equal(blocked.status, 423);
      assert.equal(blocked.headers.get("retry-after"), "10");
      assert.equal(getCount, 0, "must not fetch image bytes while locked");
    }
    now = unlockAt;
    assert.equal((await (await fetch(`${origin}/api/images/${id}/status`)).json()).available, true);
    const released = await fetch(`${origin}/api/images/${id}`);
    assert.equal(released.status, 200);
    assert.equal(released.headers.get("content-type"), "image/jpeg");
    assert.deepEqual(Buffer.from(await released.arrayBuffer()), jpeg);
    objects.set(key, undefined); // Legacy objects stay readable.
    assert.equal((await fetch(`${origin}/api/images/${id}`)).status, 200);
    objects.set(key, { "unlock-at": "broken" });
    const before = getCount;
    assert.equal((await fetch(`${origin}/api/images/${id}`)).status, 503);
    assert.equal(getCount, before);
    objects.delete(key);
    assert.equal((await fetch(`${origin}/api/images/${id}/status`)).status, 404);
    assert.equal((await fetch(`${origin}/api/images/${id}`)).status, 404);
    assert.equal((await fetch(`${origin}/api/images/not-a-uuid`)).status, 400);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
