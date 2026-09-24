import { useEffect, useRef, useState } from "react";
export default function App() {
  const [pages, setPages] = useState<File[]>([]);
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  async function uploadFirstPage() {
    const file = pages[0];
    if (!file) return;

    setUploading(true);
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
      setStatus(`Uploaded to S3: ${result.key}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
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
