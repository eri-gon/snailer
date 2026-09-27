import { useEffect, useRef, useState } from "react";
export default function App() {
  const [pages, setPages] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [deliveryMode, setDeliveryMode] = useState("instant");

  async function uploadFirstPage() {
    const file = pages[0];
    if (!file) return;

    setUploading(true);
    setUploadedId(null);
    setStatus("Uploading…");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "image/jpeg", "X-Delivery-Mode": deliveryMode },
        body: file,
      });

      if (!response.ok) {
        throw new Error("Upload failed. Check the server and try again.");
      }

      const result = await response.json();
      const id = result.key
        .replace(/^test-uploads\//, "")
        .replace(/\.jpg$/, "");

      setUploadedId(id);
      setStatus(result.deliveryMode === "instant"
        ? "Uploaded. Your image is available now."
        : `Uploaded. Arrives ${new Date(result.unlockAt).toLocaleString()}.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  const imageId = new URLSearchParams(window.location.search).get("image");

  if (imageId !== null) {
    return <UploadedImage key={imageId} id={imageId} />;
  }

  return (
    <main>
      <h1>Snailer</h1>

      <label htmlFor="pages">Choose your letter pages</label>
      <input
        id="pages"
        type="file"
        accept="image/jpeg"
        multiple
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          setPages(files);
        }}
      />
      <p>
        <label htmlFor="delivery">Delivery </label>
        <select id="delivery" value={deliveryMode} disabled={uploading}
          onChange={(event) => setDeliveryMode(event.target.value)}>
          <option value="instant">Instant</option>
          <option value="normal">Normal delivery (3–7 days)</option>
          <option value="priority">Priority (2–3 days)</option>
        </select>
      </p>
      <p>Normal and Priority arrival times are chosen once when you upload.</p>
      {pages.length > 0 && (
        <button onClick={uploadFirstPage} disabled={uploading}>
          {uploading ? "Uploading..." : "Upload First Page"}
        </button>
      )}
      {status && <p>{status}</p>}
      {uploadedId && (
        <p>
          <a href={`/?image=${encodeURIComponent(uploadedId)}`}>
            Open delivery page
          </a>
        </p>
      )}
      <ul>
        {pages.map((page, index) => (
          <li key={`${page.name}-${page.lastModified}-${index}`}>
            <PagePreview file={page} number={index + 1} />
          </li>
        ))}
      </ul>
    </main>
  );
}

function PagePreview({ file, number }: { file: File; number: number }) {
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);

    if (imageRef.current) {
      imageRef.current.src = objectUrl;
    }

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return (
    <figure>
      <img
        ref={imageRef}
        alt={`Letter page ${number}`}
        style={{ display: "block", maxWidth: "100%", height: "auto" }}
      />
      <figcaption>
        Page {number} — {file.name}
      </figcaption>
    </figure>
  );
}

function UploadedImage({ id }: { id: string }) {
  const [phase, setPhase] = useState<"checking" | "waiting" | "ready" | "error">("checking");
  const [arrival, setArrival] = useState<number | null>(null);
  const [clock, setClock] = useState<{ remaining: number; observedAt: number } | null>(null);
  const [url, setUrl] = useState<string>();
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let objectUrl: string | undefined;
    const endpoint = `/api/images/${encodeURIComponent(id)}`;

    async function checkDelivery() {
      try {
        const response = await fetch(`${endpoint}/status`, {
          signal: controller.signal, cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(response.status === 404 ? "Image not found." : "Could not check delivery. Please try again.");
        }
        const delivery = await response.json();
        if (controller.signal.aborted) return;
        const remaining = Math.max(0, delivery.unlockAt - delivery.serverNow);
        setArrival(delivery.unlockAt || null);
        setClock({ remaining, observedAt: performance.now() });
        if (!delivery.available) {
          setPhase("waiting");
          // Poll at most once a minute, or when the current countdown ends.
          timer = setTimeout(checkDelivery, Math.min(60_000, Math.max(1_000, remaining)));
          return;
        }

        // The bytes endpoint independently enforces the release time.
        const image = await fetch(endpoint, { signal: controller.signal, cache: "no-store" });
        if (image.status === 423) {
          setPhase("waiting");
          timer = setTimeout(checkDelivery, 1_000);
          return;
        }
        if (!image.ok) throw new Error("Could not retrieve the image. Check your AWS session and retry.");
        const blob = await image.blob();
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
        setPhase("ready");
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Could not load delivery.");
        setPhase("error");
      }
    }
    void checkDelivery();
    return () => {
      controller.abort();
      clearTimeout(timer);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, attempt]);

  return (
    <main>
      <h1>{phase === "waiting" ? "Your letter is in transit" : "Your uploaded image"}</h1>
      <p><a href="/">Back to upload</a></p>
      {phase === "checking" && <p role="status">Checking delivery…</p>}
      {phase === "waiting" && (
        <section aria-label="Delivery countdown">
          {arrival !== null && <p>Arrives {new Date(arrival).toLocaleString()} (your local time).</p>}
          {clock && <Countdown clock={clock} />}
          <p>The image will appear here once delivery is confirmed.</p>
        </section>
      )}
      {phase === "error" && (
        <div>
          <p role="alert">{error}</p>
          <button onClick={() => { setPhase("checking"); setAttempt((value) => value + 1); }}>Try again</button>
        </div>
      )}
      {phase === "ready" && url && (
        <img src={url} alt="Uploaded letter page"
          onError={() => { setError("The stored image could not be displayed."); setPhase("error"); }}
          style={{ display: "block", maxWidth: "100%", height: "auto" }} />
      )}
    </main>
  );
}

function Countdown({ clock }: { clock: { remaining: number; observedAt: number } }) {
  const [tick, setTick] = useState(() => performance.now());
  useEffect(() => {
    const timer = setInterval(() => setTick(performance.now()), 1_000);
    return () => clearInterval(timer);
  }, []);
  // A monotonic clock avoids trusting the recipient's wall-clock setting.
  const seconds = Math.ceil(Math.max(0, clock.remaining - Math.max(0, tick - clock.observedAt)) / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return <p role="timer">{seconds > 0
    ? `${days}d ${hours}h ${minutes}m ${seconds % 60}s remaining`
    : "Confirming delivery…"}</p>;
}
