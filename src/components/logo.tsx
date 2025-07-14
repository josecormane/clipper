export function Logo() {
  return (
    <svg
      width="120"
      height="40"
      viewBox="0 0 120 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: "rgb(59, 130, 246)" }} />
          <stop offset="100%" style={{ stopColor: "rgb(0, 217, 255)" }} />
        </linearGradient>
      </defs>
      <text
        x="10"
        y="30"
        fontFamily="Arial, sans-serif"
        fontSize="24"
        fontWeight="bold"
        fill="url(#gradient)"
      >
        Machete
      </text>
    </svg>
  );
}
