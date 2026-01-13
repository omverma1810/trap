/**
 * Motion Tokens
 * Centralized animation configuration for consistent UI motion.
 */

export const motion = {
  // Duration tokens (in seconds for Framer Motion)
  duration: {
    fast: 0.15,
    medium: 0.25,
    slow: 0.4,
  },
  
  // Easing curves
  easing: {
    smooth: [0.4, 0, 0.2, 1] as const,
    bounce: [0.68, -0.55, 0.265, 1.55] as const,
    spring: { type: "spring", stiffness: 300, damping: 30 } as const,
  },
  
  // Common animation variants
  variants: {
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
    
    fadeInUp: {
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0 },
    },
    
    fadeInDown: {
      hidden: { opacity: 0, y: -10 },
      visible: { opacity: 1, y: 0 },
    },
    
    scaleIn: {
      hidden: { opacity: 0, scale: 0.95 },
      visible: { opacity: 1, scale: 1 },
    },
    
    slideInRight: {
      hidden: { opacity: 0, x: 20 },
      visible: { opacity: 1, x: 0 },
    },
    
    slideInLeft: {
      hidden: { opacity: 0, x: -20 },
      visible: { opacity: 1, x: 0 },
    },
  },
  
  // Transition presets
  transition: {
    fast: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1],
    },
    medium: {
      duration: 0.25,
      ease: [0.4, 0, 0.2, 1],
    },
    slow: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
    spring: {
      type: "spring",
      stiffness: 300,
      damping: 30,
    },
  },
};

// Animation presets for common use cases
export const animations = {
  modal: {
    overlay: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: motion.transition.medium,
    },
    content: {
      initial: { opacity: 0, scale: 0.95, y: 10 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 10 },
      transition: motion.transition.medium,
    },
  },
  
  dropdown: {
    initial: { opacity: 0, y: -5, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -5, scale: 0.98 },
    transition: motion.transition.fast,
  },
  
  tooltip: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.1 },
  },
  
  list: {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.05,
        },
      },
    },
    item: {
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0 },
    },
  },
};
