"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

interface TextTypeProps {
  text: string | string[];
  typingSpeed?: number;
  pauseDuration?: number;
  showCursor?: boolean;
  cursorCharacter?: string;
  deletingSpeed?: number;
  cursorBlinkDuration?: number;
  className?: string;
  style?: React.CSSProperties;
  loop?: boolean;
  initialDelay?: number;
  onComplete?: () => void;
}

export default function TextType({
  text,
  typingSpeed = 75,
  pauseDuration = 1500,
  showCursor = true,
  cursorCharacter = "_",
  deletingSpeed = 50,
  cursorBlinkDuration = 0.5,
  className = "",
  style,
  loop = true,
  initialDelay = 0,
  onComplete,
}: TextTypeProps) {
  const textRef = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const onCompleteRef = useRef(onComplete);
  const hasCompleted = useRef(false);

  onCompleteRef.current = onComplete;

  const textKey = Array.isArray(text) ? text.join("|||") : text;

  useEffect(() => {
    if (!textRef.current) return;
    hasCompleted.current = false;

    const texts = Array.isArray(text) ? text : [text];
    let currentIndex = 0;
    let isMounted = true;

    textRef.current.innerHTML = "";

    let cursorAnim: gsap.core.Tween | null = null;
    if (showCursor && cursorRef.current) {
      cursorAnim = gsap.to(cursorRef.current, {
        opacity: 0,
        repeat: -1,
        yoyo: true,
        duration: cursorBlinkDuration,
        ease: "steps(1)",
      });
    }

    const typeWriter = async () => {
      if (initialDelay > 0) await new Promise((r) => setTimeout(r, initialDelay));

      while (isMounted) {
        const currentText = texts[currentIndex];

        for (let i = 0; i <= currentText.length; i++) {
          if (!textRef.current || !isMounted) return;
          textRef.current.innerHTML = currentText.substring(0, i);
          await new Promise((r) => setTimeout(r, typingSpeed));
        }

        const isLastText = currentIndex === texts.length - 1;
        if (!loop && isLastText) {
          if (!hasCompleted.current) {
            hasCompleted.current = true;
            onCompleteRef.current?.();
          }
          break;
        }

        await new Promise((r) => setTimeout(r, pauseDuration));

        if (loop || !isLastText) {
          for (let i = currentText.length; i >= 0; i--) {
            if (!textRef.current || !isMounted) return;
            textRef.current.innerHTML = currentText.substring(0, i);
            await new Promise((r) => setTimeout(r, deletingSpeed));
          }
          currentIndex = (currentIndex + 1) % texts.length;
          await new Promise((r) => setTimeout(r, 500));
        } else {
          if (!hasCompleted.current) {
            hasCompleted.current = true;
            onCompleteRef.current?.();
          }
          break;
        }
      }
    };

    typeWriter();

    return () => {
      isMounted = false;
      if (cursorAnim) cursorAnim.kill();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textKey]);

  return (
    <div className={`inline-block ${className}`} style={style}>
      <span ref={textRef} />
      {showCursor && <span ref={cursorRef} className="ml-0.5">{cursorCharacter}</span>}
    </div>
  );
}
