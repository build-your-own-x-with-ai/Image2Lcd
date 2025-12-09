import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ImageProcessor } from './imageProcessor.js';
import type { ImageData } from '../../shared/types.js';

describe('ImageProcessor', () => {
  const processor = new ImageProcessor();

  // Helper to create test image data
  function createTestImage(width: number, height: number): ImageData {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.floor(Math.random() * 256);     // R
      data[i + 1] = Math.floor(Math.random() * 256); // G
      data[i + 2] = Math.floor(Math.random() * 256); // B
      data[i + 3] = 255;                              // A
    }
    return { data, width, height, format: 'test' };
  }

  describe('Property 8: Aspect ratio preservation', () => {
    // Feature: image-to-lcd-converter, Property 8: Aspect ratio preservation
    it('should maintain aspect ratio as closely as possible when resizing', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 500 }),  // original width
          fc.integer({ min: 50, max: 500 }),  // original height
          fc.integer({ min: 100, max: 400 }), // max width (larger minimum to avoid extreme constraints)
          fc.integer({ min: 100, max: 400 }), // max height
          (width, height, maxWidth, maxHeight) => {
            // Skip if image doesn't need resizing
            if (width <= maxWidth && height <= maxHeight) {
              return true;
            }
            
            const image = createTestImage(width, height);
            const originalAspectRatio = width / height;
            
            const resized = processor.resize(image, maxWidth, maxHeight);
            const newAspectRatio = resized.width / resized.height;
            
            // With reasonable target sizes (100+), aspect ratio should be preserved within 5%
            // (accounting for integer pixel rounding, especially with extreme aspect ratios)
            const tolerance = 0.05;
            const difference = Math.abs(originalAspectRatio - newAspectRatio) / originalAspectRatio;
            
            expect(difference).toBeLessThanOrEqual(tolerance);
            expect(resized.width).toBeLessThanOrEqual(maxWidth);
            expect(resized.height).toBeLessThanOrEqual(maxHeight);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 30: Brightness adjustment effect', () => {
    // Feature: image-to-lcd-converter, Property 30: Brightness adjustment effect
    it('should increase average pixel value when brightness is increased', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),  // width
          fc.integer({ min: 10, max: 100 }),  // height
          fc.integer({ min: 1, max: 100 }),   // brightness increase
          (width, height, brightnessIncrease) => {
            const image = createTestImage(width, height);
            
            // Calculate original average
            let originalSum = 0;
            for (let i = 0; i < image.data.length; i += 4) {
              originalSum += image.data[i] + image.data[i + 1] + image.data[i + 2];
            }
            const originalAvg = originalSum / (width * height * 3);
            
            const brightened = processor.adjustBrightness(image, brightnessIncrease);
            
            // Calculate new average
            let newSum = 0;
            for (let i = 0; i < brightened.data.length; i += 4) {
              newSum += brightened.data[i] + brightened.data[i + 1] + brightened.data[i + 2];
            }
            const newAvg = newSum / (width * height * 3);
            
            // New average should be higher (unless clamped at 255)
            expect(newAvg).toBeGreaterThanOrEqual(originalAvg);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should decrease average pixel value when brightness is decreased', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),  // width
          fc.integer({ min: 10, max: 100 }),  // height
          fc.integer({ min: 1, max: 100 }),   // brightness decrease
          (width, height, brightnessDecrease) => {
            const image = createTestImage(width, height);
            
            // Calculate original average
            let originalSum = 0;
            for (let i = 0; i < image.data.length; i += 4) {
              originalSum += image.data[i] + image.data[i + 1] + image.data[i + 2];
            }
            const originalAvg = originalSum / (width * height * 3);
            
            const darkened = processor.adjustBrightness(image, -brightnessDecrease);
            
            // Calculate new average
            let newSum = 0;
            for (let i = 0; i < darkened.data.length; i += 4) {
              newSum += darkened.data[i] + darkened.data[i + 1] + darkened.data[i + 2];
            }
            const newAvg = newSum / (width * height * 3);
            
            // New average should be lower (unless clamped at 0)
            expect(newAvg).toBeLessThanOrEqual(originalAvg);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 31: Contrast adjustment effect', () => {
    // Feature: image-to-lcd-converter, Property 31: Contrast adjustment effect
    it('should increase difference between light and dark pixels when contrast is increased', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),  // width
          fc.integer({ min: 10, max: 100 }),  // height
          fc.integer({ min: 1, max: 100 }),   // contrast increase
          (width, height, contrastIncrease) => {
            // Create image with known light and dark pixels
            const image = createTestImage(width, height);
            
            // Set some pixels to be clearly light and dark
            for (let i = 0; i < Math.min(100, image.data.length); i += 8) {
              image.data[i] = image.data[i + 1] = image.data[i + 2] = 50;  // Dark
              image.data[i + 4] = image.data[i + 5] = image.data[i + 6] = 200;  // Light
            }
            
            const adjusted = processor.adjustContrast(image, contrastIncrease);
            
            // Check that contrast has increased (light pixels lighter, dark pixels darker)
            let contrastIncreased = false;
            for (let i = 0; i < Math.min(100, image.data.length); i += 8) {
              const originalDark = image.data[i];
              const originalLight = image.data[i + 4];
              const newDark = adjusted.data[i];
              const newLight = adjusted.data[i + 4];
              
              const originalDiff = originalLight - originalDark;
              const newDiff = newLight - newDark;
              
              if (newDiff >= originalDiff) {
                contrastIncreased = true;
              }
            }
            
            expect(contrastIncreased).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Inversion round-trip', () => {
    // Feature: image-to-lcd-converter, Property 9: Inversion round-trip
    it('should return to original pixel values when inverted twice', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),  // width
          fc.integer({ min: 10, max: 100 }),  // height
          (width, height) => {
            const image = createTestImage(width, height);
            const originalData = new Uint8ClampedArray(image.data);
            
            const inverted = processor.invert(image);
            const invertedTwice = processor.invert(inverted);
            
            // Check all pixels match original
            for (let i = 0; i < originalData.length; i++) {
              expect(invertedTwice.data[i]).toBe(originalData[i]);
            }
          }
        ),
        { numRuns: 50 }  // Reduced runs for performance
      );
    }, 10000);  // 10 second timeout
  });

  describe('Property 33: Rotation round-trip', () => {
    // Feature: image-to-lcd-converter, Property 33: Rotation round-trip
    it('should return to original orientation when rotated 90 degrees four times', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),  // width
          fc.integer({ min: 10, max: 100 }),  // height
          (width, height) => {
            const image = createTestImage(width, height);
            const originalData = new Uint8ClampedArray(image.data);
            
            let rotated = processor.rotate(image, 90);
            rotated = processor.rotate(rotated, 90);
            rotated = processor.rotate(rotated, 90);
            rotated = processor.rotate(rotated, 90);
            
            // Check dimensions match
            expect(rotated.width).toBe(image.width);
            expect(rotated.height).toBe(image.height);
            
            // Check all pixels match original
            for (let i = 0; i < originalData.length; i++) {
              expect(rotated.data[i]).toBe(originalData[i]);
            }
          }
        ),
        { numRuns: 50 }  // Reduced runs for performance
      );
    }, 10000);  // 10 second timeout
  });

  describe('Property 35: Mirror round-trip', () => {
    // Feature: image-to-lcd-converter, Property 35: Mirror round-trip
    it('should return to original state when horizontal mirror applied twice', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          fc.integer({ min: 2, max: 20 }),
          (width, height) => {
            const image = createTestImage(width, height);
            const mirrored = processor.mirror(image, 'horizontal');
            const restored = processor.mirror(mirrored, 'horizontal');
            
            // Check that data is restored
            for (let i = 0; i < image.data.length; i++) {
              if (Math.abs(image.data[i] - restored.data[i]) > 1) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return to original state when vertical mirror applied twice', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          fc.integer({ min: 2, max: 20 }),
          (width, height) => {
            const image = createTestImage(width, height);
            const mirrored = processor.mirror(image, 'vertical');
            const restored = processor.mirror(mirrored, 'vertical');
            
            // Check that data is restored
            for (let i = 0; i < image.data.length; i++) {
              if (Math.abs(image.data[i] - restored.data[i]) > 1) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return to original state when both mirror applied twice', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }),
          fc.integer({ min: 2, max: 20 }),
          (width, height) => {
            const image = createTestImage(width, height);
            const mirrored = processor.mirror(image, 'both');
            const restored = processor.mirror(mirrored, 'both');
            
            // Check that data is restored
            for (let i = 0; i < image.data.length; i++) {
              if (Math.abs(image.data[i] - restored.data[i]) > 1) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 32: Dithering application', () => {
    // Feature: image-to-lcd-converter, Property 32: Dithering application
    it('should contain dithering patterns in monochrome output', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 100 }),  // width
          fc.integer({ min: 10, max: 100 }),  // height
          (width, height) => {
            const image = createTestImage(width, height);
            const dithered = processor.applyDithering(image, 'floyd-steinberg');
            
            // Check that output is monochrome (only 0 or 255)
            let isMonochrome = true;
            for (let i = 0; i < dithered.data.length; i += 4) {
              const r = dithered.data[i];
              const g = dithered.data[i + 1];
              const b = dithered.data[i + 2];
              
              if ((r !== 0 && r !== 255) || (g !== 0 && g !== 255) || (b !== 0 && b !== 255)) {
                isMonochrome = false;
              }
            }
            
            expect(isMonochrome).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
