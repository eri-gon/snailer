import "./Header.css";

export function Header(_props?: { isUploadPage?: boolean }) {
  return (
    <header className="snailer-header">
      <a className="snailer-header__brand" href="/" aria-label="Snailer home">
        <span className="snailer-header__wordmark">SNAILER</span>
        <svg className="snailer-header__snail" viewBox="0 0 96 60" fill="none" aria-hidden="true" focusable="false">
          <g transform="translate(96, 0) scale(-1, 1)">
            {/* Solid slanted rhombus / parallelogram base */}
            <polygon points="16 2, 94 2, 78 58, 0 58" fill="currentColor" />
            
            {/* Inside white snail graphic (USPS hawk-style negative space) */}
            <g fill="none" stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round">
              {/* Outer shell ring */}
              <circle cx="36" cy="30" r="13" strokeWidth="3.5" />
              {/* Inner shell spiral */}
              <path d="M36 22c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-7-3-6-6-6-5 2.5-5 5" strokeWidth="3" />
              {/* Snail body sweeping forward to head */}
              <path d="M20 44c12 1 30 0 42-10 6-5 8-11 9-18" strokeWidth="3.5" />
              {/* Two antenna sticks near the top facing towards the shell */}
              <path d="M65 18L56 8M72 18L62 6" strokeWidth="3.5" strokeLinecap="round" />
            </g>
          </g>
        </svg>
      </a>
    </header>
  );
}
