// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  
  // 1. Initialize Lenis Smooth Scroll (Graceful fallback if CDN fails)
  let lenis;
  try {
    if (typeof Lenis !== 'undefined') {
      lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false,
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    } else {
      console.warn("Lenis smooth scroll is not defined. Falling back to native scrolling.");
    }
  } catch (e) {
    console.error("Failed to initialize Lenis:", e);
  }

  // 2. Preload Remaining Frames (73 to 286)
  const canvas = document.getElementById('watch-canvas');
  const context = canvas.getContext('2d');

  const startFrame = 73;
  const endFrame = 286;
  const frameCount = endFrame - startFrame + 1; // 214 frames
  const images = [];
  let loadedCount = 0;

  const currentFrame = index => {
    const frameNumber = startFrame + index;
    return `images/ezgif-frame-${frameNumber.toString().padStart(3, '0')}.jpg`;
  };

  function checkProgress() {
    loadedCount++;
    const progress = Math.round((loadedCount / frameCount) * 100);
    
    // Update loader UI
    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('loading-text').textContent = `${progress}%`;

    console.log(`Preloading: ${loadedCount}/${frameCount} loaded.`);

    if (loadedCount === frameCount) {
      hideLoader();
    }
  }

  // Preload all images and track progress
  function preloadImages() {
    return new Promise((resolve) => {
      for (let i = 0; i < frameCount; i++) {
        const img = new Image();
        img.onload = () => {
          checkProgress();
          if (loadedCount === frameCount) resolve();
        };
        img.onerror = () => {
          console.error(`Failed to load frame ${i} (Frame Number: ${startFrame + i})`);
          checkProgress();
          if (loadedCount === frameCount) resolve();
        };
        img.src = currentFrame(i);
        images.push(img);
      }
    });
  }

  // Hide loader with a premium fade-out animation
  function hideLoader() {
    console.log("Preloading finished! Hiding loader.");
    const loader = document.getElementById('loader');
    loader.style.opacity = '0';
    setTimeout(() => {
      loader.style.visibility = 'hidden';
      // Trigger initial canvas draw once loader is gone
      resizeCanvas();
      
      // Delay initial overlays call slightly to trigger the CSS entry transitions
      setTimeout(() => {
        handleScroll();
      }, 150);
    }, 800);
  }

  // 3. Canvas Resizing and Image Fitting (Cover mode)
  function resizeCanvas() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    const scale = window.devicePixelRatio || 1;
    canvas.width = width * scale;
    canvas.height = height * scale;
    
    context.scale(scale, scale);
    
    const scrollFraction = getScrollFraction();
    const frameIndex = Math.min(frameCount - 1, Math.floor(scrollFraction * (frameCount - 1)));
    drawFrame(frameIndex);
  }

  function drawFrame(index) {
    // Fallback to nearest loaded image if target index is not fully loaded or failed
    let img = images[index];
    if (!img || !img.complete || img.naturalWidth === 0) {
      let fallbackIndex = index;
      while (fallbackIndex >= 0) {
        if (images[fallbackIndex] && images[fallbackIndex].complete && images[fallbackIndex].naturalWidth > 0) {
          img = images[fallbackIndex];
          break;
        }
        fallbackIndex--;
      }
    }

    if (!img) return;
    
    const canvasWidth = window.innerWidth;
    const canvasHeight = window.innerHeight;

    const imgRatio = img.width / img.height;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth, drawHeight, x, y;

    // Cover mode - fill the entire screen, crop excess
    if (imgRatio > canvasRatio) {
      drawWidth = canvasHeight * imgRatio;
      drawHeight = canvasHeight;
      x = (canvasWidth - drawWidth) / 2;
      y = 0;
    } else {
      drawWidth = canvasWidth;
      drawHeight = canvasWidth / imgRatio;
      x = 0;
      y = (canvasHeight - drawHeight) / 2;
    }

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.drawImage(img, x, y, drawWidth, drawHeight);
  }

  // 4. Scroll Tracking
  const heroSection = document.getElementById('hero-scroll');
  
  function getScrollFraction() {
    const rect = heroSection.getBoundingClientRect();
    const totalScrollableHeight = rect.height - window.innerHeight;
    
    // Calculate progress within hero-scroll bounds
    const progress = -rect.top / totalScrollableHeight;
    const fraction = Math.max(0, Math.min(1, progress));
    return isNaN(fraction) ? 0 : fraction;
  }

  // Update canvas based on custom fraction (0 to 1)
  const animationEndPercent = 0.85; // Finish animation at 85% of scroll

  function updateCanvas(fraction) {
    // Map progress from 0-85% scroll to 0-100% animation frames
    const mappedFraction = Math.min(1, fraction / animationEndPercent);
    const frameIndex = Math.min(frameCount - 1, Math.floor(mappedFraction * (frameCount - 1)));
    requestAnimationFrame(() => drawFrame(frameIndex));
  }

  // 5. Text Overlay Opacity Controller
  const overlays = [
    { id: 'intro-overlay', start: 0.0, end: 0.08 },
    { id: 'overlay-1', start: 0.12, end: 0.28 },
    { id: 'overlay-2', start: 0.34, end: 0.50 },
    { id: 'overlay-3', start: 0.56, end: 0.72 },
    { id: 'overlay-4', start: 0.76, end: 0.85 }
  ];

  function updateOverlays(fraction) {
    overlays.forEach(overlay => {
      const el = document.getElementById(overlay.id);
      if (el) {
        if (fraction >= overlay.start && fraction <= overlay.end) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });
  }

  // Handle all scroll-triggered operations
  const stickyViewport = document.querySelector('.sticky-viewport');
  
  function handleScroll() {
    const fraction = getScrollFraction();
    console.log(`Scroll progress: ${fraction.toFixed(4)} | Mapped Frame: ${Math.floor(Math.min(1, fraction / animationEndPercent) * (frameCount - 1))}`);
    updateCanvas(fraction);
    updateOverlays(fraction);
    
    // Smoothly shrink and round the hero viewport as it approaches the end of scroll
    if (fraction >= 0.85) {
      stickyViewport.classList.add('finished');
    } else {
      stickyViewport.classList.remove('finished');
    }
  }

  // Listeners - bind to both standard scroll and Lenis scroll
  window.addEventListener('scroll', handleScroll);
  if (lenis) lenis.on('scroll', handleScroll);
  window.addEventListener('resize', resizeCanvas);

  // 6. Intersection Observer for Scroll Reveals
  const revealElements = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer.unobserve(entry.target); // Reveal only once
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => observer.observe(el));

  // Initialize
  preloadImages().then(() => {
    resizeCanvas();
  });
});
