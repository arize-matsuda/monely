import { ImageResponse } from "next/og";

/**
 * iOS の「ホーム画面に追加」で使われるアイコン（M5-4）。
 *
 * **iOS は manifest の icons を見ず、apple-touch-icon を使う。**
 * SVG も受け付けないので、ここで PNG を生成する。
 * 絵柄は icon.svg と揃えてある（¥ をパスで描く）。
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        // apple-touch-icon は OS が角を丸めるので、角丸は付けない
        background: "#4f48e3",
      }}
    >
      {/* PNG に焼かれるので読み上げには出ないが、規約に合わせて名前を付ける */}
      <svg
        role="img"
        aria-label="Monely"
        width="120"
        height="120"
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g
          stroke="#fafafa"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          transform="translate(0, 2)"
        >
          <path d="M18 16 L32 34" />
          <path d="M46 16 L32 34" />
          <path d="M32 34 L32 50" />
          <path d="M20 38 L44 38" />
          <path d="M20 45 L44 45" />
        </g>
      </svg>
    </div>,
    size,
  );
}
