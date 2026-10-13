/**
 * Text that starts as scrambled characters and decrypts one letter at a time.
 *
 * Aceternity UI's Encrypted Text (https://ui.aceternity.com/components/encrypted-text);
 * source credits are in docs/third-party/sources.md. Adaptations:
 * - the first scramble is seeded from the text, so the server-rendered HTML and the
 *   first client render match (the original's Math.random() differed between the two,
 *   which React reports as a hydration mismatch); it re-randomizes once running;
 * - visitors who prefer reduced motion get the plain text straight away;
 * - imports from `framer-motion`, the same library as `motion/react`.
 */
import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { cn } from "@/lib/cn";

type EncryptedTextProps = {
  text: string;
  className?: string;
  /** Time in milliseconds between revealing each subsequent real character. */
  revealDelayMs?: number;
  /** Optional custom character set to use for the gibberish effect. */
  charset?: string;
  /** Time in milliseconds between gibberish flips for unrevealed characters. */
  flipDelayMs?: number;
  /** CSS class for styling the encrypted/scrambled characters */
  encryptedClassName?: string;
  /** CSS class for styling the revealed characters */
  revealedClassName?: string;
};

const DEFAULT_CHARSET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-={}[];:,.<>/?";

function generateRandomCharacter(charset: string, random = Math.random): string {
  const index = Math.floor(random() * charset.length);
  return charset.charAt(index);
}

/** A small deterministic generator (mulberry32) seeded from the text. */
function seeded(text: string) {
  let seed = 0;
  for (let i = 0; i < text.length; i += 1) seed = (Math.imul(seed, 31) + text.charCodeAt(i)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateGibberishPreservingSpaces(
  original: string,
  charset: string,
  random = Math.random
): string {
  if (!original) return "";
  let result = "";
  for (let i = 0; i < original.length; i += 1) {
    const ch = original[i];
    result += ch === " " ? " " : generateRandomCharacter(charset, random);
  }
  return result;
}

export const EncryptedText: React.FC<EncryptedTextProps> = ({
  text,
  className,
  revealDelayMs = 50,
  charset = DEFAULT_CHARSET,
  flipDelayMs = 50,
  encryptedClassName,
  revealedClassName,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [pageReady, setPageReady] = useState(false);

  useEffect(() => {
    const ready = () => setPageReady(true);
    if (!document.documentElement.hasAttribute("data-page-loading")) ready();
    document.addEventListener("site:ready", ready, { once: true });
    return () => document.removeEventListener("site:ready", ready);
  }, []);

  const [revealCount, setRevealCount] = useState<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastFlipTimeRef = useRef<number>(0);
  const scrambleCharsRef = useRef<string[]>(
    text ? generateGibberishPreservingSpaces(text, charset, seeded(text)).split("") : []
  );

  useEffect(() => {
    if (!isInView || !pageReady) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealCount(text.length);
      return;
    }

    // Reset state for a fresh animation whenever dependencies change
    const initial = text ? generateGibberishPreservingSpaces(text, charset) : "";
    scrambleCharsRef.current = initial.split("");
    startTimeRef.current = performance.now();
    lastFlipTimeRef.current = startTimeRef.current;
    setRevealCount(0);

    let isCancelled = false;

    const update = (now: number) => {
      if (isCancelled) return;

      const elapsedMs = now - startTimeRef.current;
      const totalLength = text.length;
      const currentRevealCount = Math.min(
        totalLength,
        Math.floor(elapsedMs / Math.max(1, revealDelayMs))
      );

      setRevealCount(currentRevealCount);

      if (currentRevealCount >= totalLength) {
        return;
      }

      // Re-randomize unrevealed scramble characters on an interval
      const timeSinceLastFlip = now - lastFlipTimeRef.current;
      if (timeSinceLastFlip >= Math.max(0, flipDelayMs)) {
        for (let index = 0; index < totalLength; index += 1) {
          if (index >= currentRevealCount) {
            if (text[index] !== " ") {
              scrambleCharsRef.current[index] = generateRandomCharacter(charset);
            } else {
              scrambleCharsRef.current[index] = " ";
            }
          }
        }
        lastFlipTimeRef.current = now;
      }

      animationFrameRef.current = requestAnimationFrame(update);
    };

    animationFrameRef.current = requestAnimationFrame(update);

    return () => {
      isCancelled = true;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInView, pageReady, text, revealDelayMs, charset, flipDelayMs]);

  if (!text) return null;

  return (
    <motion.span ref={ref} className={cn(className)} aria-label={text} role="text">
      {text.split("").map((char, index) => {
        const isRevealed = index < revealCount;
        const displayChar = isRevealed
          ? char
          : char === " "
            ? " "
            : (scrambleCharsRef.current[index] ?? generateRandomCharacter(charset));

        return (
          <span
            key={index}
            aria-hidden="true"
            className={cn(isRevealed ? revealedClassName : encryptedClassName)}
          >
            {displayChar}
          </span>
        );
      })}
    </motion.span>
  );
};

export default EncryptedText;
