import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";
import { parseClamdScanReply, scanBufferWithClamav } from "./clamdClient.js";

test("interpreta resposta limpa do clamd", () => {
  assert.deepEqual(parseClamdScanReply("stream: OK"), { status: "clean" });
});

test("interpreta ameaça retornada pelo clamd", () => {
  assert.deepEqual(parseClamdScanReply("stream: Test-Signature FOUND"), {
    status: "infected",
    signature: "Test-Signature"
  });
});

test("recusa resposta inesperada do clamd", () => {
  assert.throws(() => parseClamdScanReply("stream: scan failed ERROR"));
});

test("envia o arquivo usando o framing INSTREAM do clamd", async () => {
  const expected = Buffer.from("pdf-de-teste");
  const server = net.createServer((socket) => {
    const received: Buffer[] = [];

    socket.on("data", (chunk) => {
      received.push(chunk);
      const payload = Buffer.concat(received);
      const commandEnd = payload.indexOf(0);
      if (commandEnd < 0) return;

      assert.equal(payload.subarray(0, commandEnd).toString("utf8"), "zINSTREAM");
      let offset = commandEnd + 1;
      const fileChunks: Buffer[] = [];

      while (offset + 4 <= payload.length) {
        const length = payload.readUInt32BE(offset);
        offset += 4;
        if (length === 0) {
          assert.deepEqual(Buffer.concat(fileChunks), expected);
          socket.end(Buffer.from("stream: OK\0", "utf8"));
          return;
        }
        if (offset + length > payload.length) return;
        fileChunks.push(payload.subarray(offset, offset + length));
        offset += length;
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    const result = await scanBufferWithClamav(expected, {
      host: "127.0.0.1",
      port: address.port,
      timeoutMs: 2_000
    });
    assert.deepEqual(result, { status: "clean" });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
