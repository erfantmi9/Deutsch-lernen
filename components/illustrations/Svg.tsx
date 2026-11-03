import { useId } from "react";
import type { CSSProperties, ReactNode } from "react";
import { INK } from "./palette";

export type IllustrationProps = {
  /** Width in px (or any CSS length). Height follows the viewBox unless `height` is given. */
  size?: number | string;
  className?: string;
  /** When set the illustration is exposed to assistive tech; otherwise it is aria-hidden. */
  title?: string;
};

type SvgProps = IllustrationProps & {
  viewBox: string;
  width?: number | string;
  height?: number | string;
  preserveAspectRatio?: string;
  style?: CSSProperties;
  children: ReactNode;
};

/** Common wrapper: shared stroke style, a11y handling and sizing. */
export function Svg({
  viewBox,
  size,
  width,
  height,
  preserveAspectRatio,
  className,
  title,
  style,
  children,
}: SvgProps) {
  const titleId = useId();
  return (
    <svg
      viewBox={viewBox}
      width={width ?? size}
      height={height}
      preserveAspectRatio={preserveAspectRatio}
      className={className}
      style={style}
      fill="none"
      stroke={INK}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-labelledby={title ? titleId : undefined}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {children}
    </svg>
  );
}
