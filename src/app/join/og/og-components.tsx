// OpenGraph image components for join page

export function BorderAndOrnaments() {
  return (
    <>
      {/* Subtle border */}
      <div
        style={{
          position: "absolute",
          top: 8,
          left: 8,
          right: 8,
          bottom: 8,
          border: "2px solid #3d3020",
          borderRadius: 12,
          display: "flex",
        }}
      />

      {/* Corner ornaments */}
      <div style={{ position: "absolute", top: 16, left: 16, width: 20, height: 20, borderLeft: "2px solid #d4a853", borderTop: "2px solid #d4a853", display: "flex" }} />
      <div style={{ position: "absolute", top: 16, right: 16, width: 20, height: 20, borderRight: "2px solid #d4a853", borderTop: "2px solid #d4a853", display: "flex" }} />
      <div style={{ position: "absolute", bottom: 16, left: 16, width: 20, height: 20, borderLeft: "2px solid #8b6914", borderBottom: "2px solid #8b6914", display: "flex" }} />
      <div style={{ position: "absolute", bottom: 16, right: 16, width: 20, height: 20, borderRight: "2px solid #8b6914", borderBottom: "2px solid #8b6914", display: "flex" }} />
    </>
  );
}

const sparkles = [
  { id: 'sparkle-0', top: 0, left: 0 },
  { id: 'sparkle-1', top: 53, left: 71 },
  { id: 'sparkle-2', top: 6, left: 42 },
  { id: 'sparkle-3', top: 9, left: 13 },
  { id: 'sparkle-4', top: 62, left: 84 },
  { id: 'sparkle-5', top: 15, left: 55 },
  { id: 'sparkle-6', top: 68, left: 26 },
  { id: 'sparkle-7', top: 71, left: 97 },
  { id: 'sparkle-8', top: 24, left: 68 },
  { id: 'sparkle-9', top: 77, left: 39 },
  { id: 'sparkle-10', top: 27, left: 10 },
  { id: 'sparkle-11', top: 33, left: 81 },
  { id: 'sparkle-12', top: 80, left: 52 },
  { id: 'sparkle-13', top: 36, left: 23 },
  { id: 'sparkle-14', top: 86, left: 94 },
  { id: 'sparkle-15', top: 39, left: 65 },
];

export function BackgroundSparkles() {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex" }}>
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          style={{
            position: "absolute",
            top: `${sparkle.top}%`,
            left: `${sparkle.left}%`,
            width: 3,
            height: 3,
            background: "radial-gradient(circle, rgba(212, 168, 83, 0.4) 0%, transparent 70%)",
            borderRadius: "50%",
            display: "flex",
          }}
        />
      ))}
    </div>
  );
}
