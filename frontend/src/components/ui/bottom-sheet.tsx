// @ts-nocheck
'use client';
import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  forwardRef,
} from 'react';
import { createPortal } from 'react-dom';
import {
  motion,
  useAnimation,
  PanInfo,
  useMotionValue,
  useTransform,
  useDragControls,
} from 'framer-motion';
import { cn } from '@/lib/utils';

interface BottomSheetContextValue {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  contentProps: {
    height: string;
    className: string;
    closeThreshold: number;
  };
}

const BottomSheetContext = createContext<BottomSheetContextValue | null>(null);

const useBottomSheetContext = () => {
  const context = useContext(BottomSheetContext);
  if (!context) {
    throw new Error(
      'BottomSheet compound components must be used within BottomSheet',
    );
  }
  return context;
};

interface BottomSheetRootProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  className?: string;
  height?: string;
}

const BottomSheetRoot = ({
  children,
  open,
  onOpenChange,
  defaultOpen,
  className,
  height = '60vh',
}: BottomSheetRootProps) => {
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (onOpenChange) {
        onOpenChange(newOpen);
      }
      if (!isControlled) {
        setInternalOpen(newOpen);
      }
    },
    [onOpenChange, isControlled],
  );

  const contentProps = {
    height,
    className: className || '',
    closeThreshold: 0.3,
  };

  return (
    <BottomSheetContext.Provider
      value={{ isOpen, onOpenChange: handleOpenChange, contentProps }}
    >
      {children}
    </BottomSheetContext.Provider>
  );
};

interface BottomSheetPortalProps {
  children: React.ReactNode;
  container?: HTMLElement;
  className?: string;
}

const BottomSheetPortal = ({
  children,
  container,
  className,
}: BottomSheetPortalProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || typeof document === 'undefined') {
    return null;
  }

  const portalContent = className ? (
    <div className={className}>{children}</div>
  ) : (
    children
  );

  return createPortal(portalContent, container || document.body);
};

interface BottomSheetOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

const BottomSheetOverlay = forwardRef<HTMLDivElement, BottomSheetOverlayProps>(
  ({ className, onClick, ...props }, ref) => {
    const { isOpen, onOpenChange } = useBottomSheetContext();

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
          onOpenChange(false);
        }
        onClick?.(e);
      },
      [onOpenChange, onClick],
    );

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={handleClick}
        className={cn(
          'absolute inset-0 bg-black/30',
          className,
        )}
        style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        {...props}
      />
    );
  },
);
BottomSheetOverlay.displayName = 'BottomSheetOverlay';

interface BottomSheetTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

const BottomSheetTrigger = ({
  asChild,
  children,
  className,
}: BottomSheetTriggerProps) => {
  const { onOpenChange } = useBottomSheetContext();

  const handleClick = () => {
    onOpenChange(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: cn(children.props.className, className),
      onClick: (e: React.MouseEvent) => {
        children.props.onClick?.(e);
        handleClick();
      },
    });
  }

  return (
    <button onClick={handleClick} type='button' className={cn('', className)}>
      {children}
    </button>
  );
};

interface BottomSheetContentProps {
  children?: React.ReactNode;
  className?: string;
}

const BottomSheetContent = ({
  children,
  className = '',
}: BottomSheetContentProps) => {
  const { isOpen, onOpenChange, contentProps } = useBottomSheetContext();
  const { height, closeThreshold } = contentProps;
  const controls = useAnimation();
  const dragControls = useDragControls();
  const y = useMotionValue(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(0);

  const onClose = useCallback(() => onOpenChange(false), [onOpenChange]);

  const calculateHeight = useCallback(() => {
    if (typeof window !== 'undefined') {
      const vh = window.innerHeight;
      if (height.includes('vh')) return (parseFloat(height) / 100) * vh;
      if (height.includes('px')) return parseFloat(height);
      return vh * 0.6;
    }
    return 500;
  }, [height]);

  useEffect(() => {
    const updateHeight = () => setSheetHeight(calculateHeight());
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, [calculateHeight]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      controls.start({
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 30 },
      });
    } else {
      document.body.style.overflow = '';
      controls.start({
        y: sheetHeight + 100,
        transition: { type: 'tween', duration: 0.3, ease: 'easeInOut' },
      });
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, controls, sheetHeight]);

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      const shouldClose = info.offset.y > sheetHeight * closeThreshold || info.velocity.y > 500;
      if (shouldClose) {
        onClose();
      } else {
        controls.start({ y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } });
      }
    },
    [onClose, sheetHeight, closeThreshold, controls],
  );

  if (sheetHeight === 0) return null;

  return (
    <BottomSheetPortal>
      <div className={cn('fixed inset-0 z-[1001]', !isOpen && 'pointer-events-none')}>
        <BottomSheetOverlay />
        <motion.div
          drag='y'
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: sheetHeight }}
          dragElastic={0.1}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          animate={controls}
          initial={{ y: sheetHeight + 100 }}
          className={cn(
            'absolute bottom-0 left-0 right-0 w-full flex flex-col bg-background border-t border-zinc-200 dark:border-white/10 shadow-2xl rounded-t-3xl overflow-hidden',
            className,
          )}
          style={{ height: sheetHeight, y }}
        >
          <div 
            className="flex justify-center pt-3 pb-3 shrink-0 cursor-grab active:cursor-grabbing w-full touch-none"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <div className="w-12 h-1.5 rounded-full bg-muted" />
          </div>
          <div 
            className="flex-1 overflow-y-auto px-6 pb-6 pt-0 w-full"
          >
            {children}
          </div>
        </motion.div>
      </div>
    </BottomSheetPortal>
  );
};

const BottomSheetHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('flex flex-col space-y-1.5 text-center pb-4', className)}>{children}</div>
);

const BottomSheetTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h3 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>{children}</h3>
);

const BottomSheetDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>
);

const BottomSheetFooter = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4', className)}>{children}</div>
);

const BottomSheetClose = ({ asChild, children, className }: { asChild?: boolean; children: React.ReactNode; className?: string }) => {
  const { onOpenChange } = useBottomSheetContext();
  const handleClick = () => onOpenChange(false);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: cn(children.props.className, className),
      onClick: (e: React.MouseEvent) => {
        children.props.onClick?.(e);
        handleClick();
      },
    });
  }
  return <button onClick={handleClick} type='button' className={cn('', className)}>{children}</button>;
};

const BottomSheet = BottomSheetRoot;

export {
  BottomSheet,
  BottomSheetPortal,
  BottomSheetOverlay,
  BottomSheetTrigger,
  BottomSheetClose,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetFooter,
  BottomSheetTitle,
  BottomSheetDescription,
};
