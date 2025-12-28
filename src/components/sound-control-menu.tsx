/**
 * Sound Control Menu
 *
 * Controller-specific component for managing sound with granular options:
 * - Toggle this device (on/off)
 * - Explicit Host control (mute/unmute Host)
 * - Toggle both devices (on/off)
 *
 * ## UX Design:
 * - Tap sound button → opens menu
 * - Clear icons and descriptions for each option
 * - Current status indicator for both devices
 *
 * ## Accessibility:
 * - Focus trap within menu
 * - Keyboard navigation (Escape to close)
 * - Screen reader announcements
 *
 * @module components/sound-control-menu
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import {
  Volume2,
  VolumeX,
  Smartphone,
  Monitor,
  MonitorSmartphone,
  X,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface SoundControlMenuProps {
  /** Current local (Controller) sound enabled state */
  isLocalEnabled: boolean;

  /** Current Host sound enabled state (null if unknown) */
  isHostEnabled: boolean | null;

  /** Toggle sound on this device only */
  onToggleLocal: () => void;

  /** Set Host sound to enabled or disabled (explicit) */
  onSetHost: (enabled: boolean) => void;

  /** Toggle sound on both devices */
  onToggleBoth: () => void;

  /** Size of the trigger button */
  size?: "sm" | "md" | "lg";

  /** Optional class name */
  className?: string;
}

// ============================================================================
// ANIMATION VARIANTS
// ============================================================================

const menuVariants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 5,
    transition: {
      duration: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.04,
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
    },
  }),
};

// ============================================================================
// BUTTON SIZE STYLES
// ============================================================================

const sizeStyles = {
  sm: "p-2",
  md: "p-3",
  lg: "p-4",
} as const;

const iconSizes = {
  sm: 18,
  md: 22,
  lg: 26,
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

export function SoundControlMenu({
  isLocalEnabled,
  isHostEnabled,
  onToggleLocal,
  onSetHost,
  onToggleBoth,
  size = "md",
  className = "",
}: SoundControlMenuProps) {
  const t = useTranslations("soundControl");
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // ==========================================================================
  // CLICK OUTSIDE & ESCAPE HANDLERS
  // ==========================================================================

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleTriggerClick = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleLocalToggle = useCallback(() => {
    onToggleLocal();
    setIsOpen(false);
  }, [onToggleLocal]);

  const handleHostMute = useCallback(() => {
    onSetHost(false);
    setIsOpen(false);
  }, [onSetHost]);

  const handleHostUnmute = useCallback(() => {
    onSetHost(true);
    setIsOpen(false);
  }, [onSetHost]);

  const handleBothToggle = useCallback(() => {
    onToggleBoth();
    setIsOpen(false);
  }, [onToggleBoth]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  const Icon = isLocalEnabled ? Volume2 : VolumeX;
  const localActionWord = isLocalEnabled ? t("mute") : t("unmute");
  const bothActionWord = isLocalEnabled ? t("mute") : t("unmute");

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        onClick={handleTriggerClick}
        aria-label={t(isLocalEnabled ? "soundOn" : "soundOff")}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`
          ${sizeStyles[size]}
          rounded-full
          bg-white/10 backdrop-blur-sm
          border border-white/20
          text-white
          transition-all duration-200
          hover:bg-white/20 hover:border-white/30
          focus:outline-none focus:ring-2 focus:ring-white/50
          active:scale-95
        `}
      >
        <Icon
          size={iconSizes[size]}
          className={isLocalEnabled ? "text-green-400" : "text-gray-400"}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={menuRef}
            role="menu"
            aria-label={t("menuLabel")}
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="
              absolute bottom-full left-1/2 -translate-x-1/2 mb-3
              min-w-[280px]
              bg-gray-900/95 backdrop-blur-md
              border border-white/10
              rounded-xl
              shadow-2xl shadow-black/50
              overflow-hidden
              z-50
            "
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <span className="text-sm font-medium text-white/70">
                {t("title")}
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label={t("close")}
              >
                <X size={14} className="text-white/50" />
              </button>
            </div>

            {/* Options */}
            <div className="p-2 space-y-1">
              {/* Option 1: This Device Toggle */}
              <motion.button
                role="menuitem"
                custom={0}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                onClick={handleLocalToggle}
                className="
                  w-full px-3 py-3 rounded-lg
                  flex items-center gap-3
                  text-left text-white
                  hover:bg-white/10
                  focus:outline-none focus:bg-white/10
                  transition-colors
                "
              >
                <div className="p-2 rounded-full bg-blue-500/20 shrink-0">
                  <Smartphone size={18} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {localActionWord} {t("thisDevice")}
                  </div>
                  <div className="text-xs text-white/50 truncate">
                    {t("thisDeviceDesc")}
                  </div>
                </div>
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isLocalEnabled ? "bg-green-500" : "bg-gray-500"
                  }`}
                />
              </motion.button>

              {/* Divider */}
              <div className="px-3 py-1">
                <div className="text-xs text-white/30 uppercase tracking-wide">
                  {t("hostControl")}
                </div>
              </div>

              {/* Option 2a: Mute Host */}
              <motion.button
                role="menuitem"
                custom={1}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                onClick={handleHostMute}
                disabled={isHostEnabled === false}
                className={`
                  w-full px-3 py-2.5 rounded-lg
                  flex items-center gap-3
                  text-left text-white
                  focus:outline-none
                  transition-colors
                  ${
                    isHostEnabled === false
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-white/10 focus:bg-white/10"
                  }
                `}
              >
                <div className="p-2 rounded-full bg-red-500/20 shrink-0">
                  <VolumeX size={16} className="text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{t("muteHost")}</div>
                </div>
              </motion.button>

              {/* Option 2b: Unmute Host */}
              <motion.button
                role="menuitem"
                custom={2}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                onClick={handleHostUnmute}
                disabled={isHostEnabled === true}
                className={`
                  w-full px-3 py-2.5 rounded-lg
                  flex items-center gap-3
                  text-left text-white
                  focus:outline-none
                  transition-colors
                  ${
                    isHostEnabled === true
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-white/10 focus:bg-white/10"
                  }
                `}
              >
                <div className="p-2 rounded-full bg-green-500/20 shrink-0">
                  <Volume2 size={16} className="text-green-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{t("unmuteHost")}</div>
                </div>
              </motion.button>

              {/* Divider */}
              <div className="h-px bg-white/10 my-1" />

              {/* Option 3: Both Devices */}
              <motion.button
                role="menuitem"
                custom={3}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                onClick={handleBothToggle}
                className="
                  w-full px-3 py-3 rounded-lg
                  flex items-center gap-3
                  text-left text-white
                  hover:bg-white/10
                  focus:outline-none focus:bg-white/10
                  transition-colors
                "
              >
                <div className="p-2 rounded-full bg-purple-500/20 shrink-0">
                  <MonitorSmartphone size={18} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">
                    {bothActionWord} {t("bothDevices")}
                  </div>
                  <div className="text-xs text-white/50 truncate">
                    {t("bothDevicesDesc")}
                  </div>
                </div>
              </motion.button>
            </div>

            {/* Current Status Footer */}
            <div className="px-4 py-2 bg-white/5 border-t border-white/10">
              <div className="flex items-center justify-between text-xs text-white/40">
                <div className="flex items-center gap-2">
                  <Smartphone size={12} />
                  <span>{t("controller")}:</span>
                  <span
                    className={isLocalEnabled ? "text-green-400" : "text-gray-400"}
                  >
                    {isLocalEnabled ? t("on") : t("off")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Monitor size={12} />
                  <span>{t("host")}:</span>
                  <span
                    className={
                      isHostEnabled === null
                        ? "text-yellow-400"
                        : isHostEnabled
                          ? "text-green-400"
                          : "text-gray-400"
                    }
                  >
                    {isHostEnabled === null
                      ? "?"
                      : isHostEnabled
                        ? t("on")
                        : t("off")}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SoundControlMenu;
