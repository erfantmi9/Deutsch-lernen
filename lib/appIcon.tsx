import { ImageResponse } from "next/og";
import { THEME_COLOR } from "./site";

/** Square app icon: a white "D" on the brand blue with a yellow dot. Keeps the artwork inside the maskable safe zone. */
export function appIcon(size: number): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: THEME_COLOR,
          color: "#ffffff",
          fontSize: size * 0.52,
          fontWeight: 800,
          position: "relative",
        }}
      >
        D
        <div
          style={{
            position: "absolute",
            width: size * 0.12,
            height: size * 0.12,
            borderRadius: size,
            background: "#fbbc04",
            right: size * 0.24,
            top: size * 0.22,
          }}
        />
      </div>
    ),
    { width: size, height: size },
  );
}
