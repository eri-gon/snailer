import { useEffect, useRef, useState } from "react";
export default function App() {
  const [pages, setPages] = useState<File[]>([]);
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
