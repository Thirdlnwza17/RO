'use client';

import { useEffect, useRef } from 'react';

interface Cloud {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  opacity: number;
}

export default function CloudBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const cloudsRef = useRef<Cloud[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();

    const createClouds = () => {
      const clouds: Cloud[] = [];
      const cloudCount = Math.floor(window.innerWidth / 300); // Adjust cloud density

      for (let i = 0; i < cloudCount; i++) {
        const size = Math.random() * 150 + 100; // Random size between 100 and 250
        clouds.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height * 0.7, // Keep clouds in the upper part of the screen
          width: size,
          height: size * 0.6,
          speed: Math.random() * 0.3 + 0.1, // Slow movement speed
          opacity: Math.random() * 0.4 + 0.3, // Slight transparency
        });
      }
      return clouds;
    };

    const drawCloud = (cloud: Cloud) => {
      if (!ctx) return;

      // Draw cloud with multiple circles for a fluffy appearance
      const { x, y, width, height, opacity } = cloud;
      
      ctx.save();
      ctx.globalAlpha = opacity;
      
      // Main cloud body
      ctx.beginPath();
      ctx.arc(x, y, height / 2, 0, Math.PI * 2);
      ctx.arc(x + width * 0.3, y - height * 0.2, height * 0.4, 0, Math.PI * 2);
      ctx.arc(x + width * 0.6, y - height * 0.1, height * 0.5, 0, Math.PI * 2);
      ctx.arc(x + width * 0.8, y, height * 0.4, 0, Math.PI * 2);
      ctx.arc(x + width * 0.5, y + height * 0.1, height * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
      
      // Cloud highlight
      ctx.beginPath();
      ctx.arc(x + width * 0.2, y - height * 0.2, height * 0.3, 0, Math.PI * 2);
      ctx.arc(x + width * 0.5, y - height * 0.15, height * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fill();
      
      ctx.restore();
    };

    const updateClouds = () => {
      const clouds = cloudsRef.current;
      
      clouds.forEach((cloud) => {
        // Move clouds to the right
        cloud.x += cloud.speed;
        
        // Reset cloud position when it goes off screen
        if (cloud.x > canvas.width + cloud.width) {
          cloud.x = -cloud.width;
          cloud.y = Math.random() * canvas.height * 0.7;
        }
      });
    };

    const animate = () => {
      if (!ctx) return;

      // Clear with a lighter blue sky color
      ctx.fillStyle = 'rgba(200, 230, 250, 0.2)'; // Lighter blue sky
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      updateClouds();
      cloudsRef.current.forEach(drawCloud);

      animationRef.current = requestAnimationFrame(animate);
    };

    cloudsRef.current = createClouds();
    animate();

    const handleResize = () => {
      resizeCanvas();
      cloudsRef.current = createClouds();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
      style={{ backgroundColor: 'rgba(245, 251, 255, 0.2)' }}
    />
  );
}
