/**
 * Claude Design System (CDS) - ScrollFadeContainer
 *
 * 逆向设计源自 Claude Design System (CDS / open-claude-ui, MIT License by Caho1):
 * - 官方 7 档非线性透明度遮罩 (7-Stop Non-Linear Alpha Mask):
 *   采样阶梯：0%, 15%, 30%, 45%, 60%, 75%, 87%, 100%
 *   曲线紧密贴合 y ≈ x^1.5 幂律感知平滑模型，配合 mask-image 消除滚动边缘色阶断层
 * - 动态滚动位置传感器：触顶时顶部羽化归零，触底时底部羽化归零
 */

import React, { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface ScrollFadeContainerProps {
  children: React.ReactNode;
  orientation?: "vertical" | "horizontal" | "both";
  fadeSize?: number; // 默认 24px
  className?: string;
  style?: React.CSSProperties;
}

export const ScrollFadeContainer: React.FC<ScrollFadeContainerProps> = ({
  children,
  orientation = "vertical",
  fadeSize = 24,
  className = "",
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // 遮罩动态生效距离
  const [fadeTop, setFadeTop] = useState(0);
  const [fadeBottom, setFadeBottom] = useState(fadeSize);
  const [fadeLeft, setFadeLeft] = useState(0);
  const [fadeRight, setFadeRight] = useState(fadeSize);

  // 核心滚动边界检测
  const updateScrollFades = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (orientation === "vertical" || orientation === "both") {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const isAtTop = scrollTop <= 2;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 2;

      setFadeTop(isAtTop ? 0 : fadeSize);
      setFadeBottom(isAtBottom ? 0 : fadeSize);
    }

    if (orientation === "horizontal" || orientation === "both") {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      const isAtLeft = scrollLeft <= 2;
      const isAtRight = scrollLeft + clientWidth >= scrollWidth - 2;

      setFadeLeft(isAtLeft ? 0 : fadeSize);
      setFadeRight(isAtRight ? 0 : fadeSize);
    }
  }, [orientation, fadeSize]);

  useEffect(() => {
    updateScrollFades();
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(updateScrollFades);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollFades]);

  // 构建精密 7-Stop 非线性平滑遮罩
  const maskStyle = React.useMemo(() => {
    if (orientation === "vertical") {
      const mask = `linear-gradient(to bottom,
        transparent,
        rgba(0, 0, 0, 0.05) calc(var(--cds-scroll-fade-top) * 0.15),
        rgba(0, 0, 0, 0.15) calc(var(--cds-scroll-fade-top) * 0.3),
        rgba(0, 0, 0, 0.30) calc(var(--cds-scroll-fade-top) * 0.45),
        rgba(0, 0, 0, 0.50) calc(var(--cds-scroll-fade-top) * 0.6),
        rgba(0, 0, 0, 0.70) calc(var(--cds-scroll-fade-top) * 0.75),
        rgba(0, 0, 0, 0.85) calc(var(--cds-scroll-fade-top) * 0.87),
        #000 var(--cds-scroll-fade-top),
        #000 calc(100% - var(--cds-scroll-fade-bottom)),
        rgba(0, 0, 0, 0.85) calc(100% - var(--cds-scroll-fade-bottom) * 0.87),
        rgba(0, 0, 0, 0.70) calc(100% - var(--cds-scroll-fade-bottom) * 0.75),
        rgba(0, 0, 0, 0.50) calc(100% - var(--cds-scroll-fade-bottom) * 0.6),
        rgba(0, 0, 0, 0.30) calc(100% - var(--cds-scroll-fade-bottom) * 0.45),
        rgba(0, 0, 0, 0.15) calc(100% - var(--cds-scroll-fade-bottom) * 0.3),
        rgba(0, 0, 0, 0.05) calc(100% - var(--cds-scroll-fade-bottom) * 0.15),
        transparent)`;

      return {
        maskImage: mask,
        WebkitMaskImage: mask,
      };
    }

    if (orientation === "horizontal") {
      const mask = `linear-gradient(to right,
        transparent,
        #000 var(--cds-scroll-fade-left),
        #000 calc(100% - var(--cds-scroll-fade-right)),
        transparent)`;

      return {
        maskImage: mask,
        WebkitMaskImage: mask,
      };
    }

    return {};
  }, [orientation]);

  return (
    <div
      ref={containerRef}
      onScroll={updateScrollFades}
      className={cn("relative overflow-auto transition-[mask-image] duration-150", className)}
      style={
        {
          ...style,
          ...maskStyle,
          "--cds-scroll-fade-size": `${fadeSize}px`,
          "--cds-scroll-fade-top": `${fadeTop}px`,
          "--cds-scroll-fade-bottom": `${fadeBottom}px`,
          "--cds-scroll-fade-left": `${fadeLeft}px`,
          "--cds-scroll-fade-right": `${fadeRight}px`,
        } as unknown as React.CSSProperties
      }
    >
      {children}
    </div>
  );
};
