import { useEffect, useRef, useState } from "react";
export default function App() {
  const [pages, setPages] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedId, setUploadedId] = useState<string | null>(null);

  async function uploadFirstPage() {
    const file = pages[0];
    if (!file) return;

    setUploading(true);
    setUploadedId(null);
    setStatus("Uploading…");

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
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
      setStatus(`Uploaded to S3: ${result.key}`);
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
      {pages.length > 0 && (
        <button onClick={uploadFirstPage} disabled={uploading}>
          {uploading ? "Uploading..." : "Upload First Page"}
        </button>
      )}
      {status && <p>{status}</p>}
      {uploadedId && (
        <p>
          <a href={`/?image=${encodeURIComponent(uploadedId)}`}>
            Open uploaded image
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
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  return (
    <main>
      <h1>Your uploaded image</h1>

      <p>
        <a href="/">Back to upload</a>
      </p>

      {loading && <p role="status">Loading from S3…</p>}

      {failed && (
        <p role="alert">
          Could not load this image. Check the link and make sure
          the backend is running and signed in to AWS.
        </p>
      )}

      <img
        src={`/api/images/${encodeURIComponent(id)}`}
        alt="Uploaded letter page"
        onLoad={() => {
          setLoading(false);
          setFailed(false);
        }}
        onError={() => {
          setLoading(false);
          setFailed(true);
        }}
        style={{
          display: loading || failed ? "none" : "block",
          maxWidth: "100%",
          height: "auto",
        }}
      />
    </main>
  );
}
