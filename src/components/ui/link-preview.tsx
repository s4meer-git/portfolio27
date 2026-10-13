/**
 * A link that shows a small picture of its page on hover.
 *
 * Aceternity UI's Link Preview (https://ui.aceternity.com/components/link-preview);
 * source credits are in docs/third-party/sources.md. Adaptations:
 * - the screenshot comes from this site's /api/link-preview, which keeps a copy on
 *   disk, rather than straight from api.microlink.io, so previews survive Microlink
 *   being down; an image uploaded in the CMS (`imageSrc`) replaces it entirely;
 * - opens in a new tab, like the other profile links;
 * - if the picture cannot load, the card stays closed instead of showing a broken image;
 * - imports from `framer-motion`, the same library as `motion/react`.
 */
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import React from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";

import { cn } from "@/lib/cn";

type LinkPreviewProps = {
  children: React.ReactNode;
  url: string;
  className?: string;
  width?: number;
  height?: number;
  /** An image to show instead of a screenshot of the page. */
  imageSrc?: string;
  /** Which part of the image stays in view: the top suits page screenshots, the middle photos. */
  imagePosition?: "top" | "center";
};

export const LinkPreview = ({
  children,
  url,
  className,
  width = 200,
  height = 125,
  imageSrc,
  imagePosition = "top",
}: LinkPreviewProps) => {
  const src = imageSrc || `/api/link-preview?url=${encodeURIComponent(url)}`;

  const [isOpen, setOpen] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const springConfig = { stiffness: 100, damping: 15 };
  const x = useMotionValue(0);

  const translateX = useSpring(x, springConfig);

  const handleMouseMove = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const targetRect = event.currentTarget.getBoundingClientRect();
    const eventOffsetX = event.clientX - targetRect.left;
    const offsetFromCenter = (eventOffsetX - targetRect.width / 2) / 2; // Reduce the effect to make it subtle
    x.set(offsetFromCenter);
  };

  return (
    <>
      {isMounted && !failed ? (
        <div className="hidden">
          {/* Loads the picture ahead of the first hover. */}
          <img src={src} width={width} height={height} alt="" onError={() => setFailed(true)} />
        </div>
      ) : null}

      <HoverCardPrimitive.Root
        openDelay={50}
        closeDelay={100}
        onOpenChange={open => {
          setOpen(open);
        }}
      >
        <HoverCardPrimitive.Trigger
          onMouseMove={handleMouseMove}
          className={cn(className)}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </HoverCardPrimitive.Trigger>

        {!failed && (
          <HoverCardPrimitive.Content
            className="z-50 [transform-origin:var(--radix-hover-card-content-transform-origin)]"
            side="top"
            align="center"
            sideOffset={10}
          >
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.6 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 260,
                      damping: 20,
                    },
                  }}
                  exit={{ opacity: 0, y: 20, scale: 0.6 }}
                  className="rounded-xl shadow-xl"
                  style={{
                    x: translateX,
                  }}
                >
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={-1}
                    className="link-preview-card block rounded-xl bg-white p-1 shadow"
                    style={{ fontSize: 0 }}
                  >
                    <img
                      src={src}
                      width={width}
                      height={height}
                      className={cn(
                        "rounded-lg object-cover",
                        imagePosition === "top" ? "object-top" : "object-center"
                      )}
                      style={{ width, height }}
                      alt=""
                    />
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </HoverCardPrimitive.Content>
        )}
      </HoverCardPrimitive.Root>
    </>
  );
};

export default LinkPreview;
