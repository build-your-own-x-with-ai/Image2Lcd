import type { ImageData } from '../../shared/types.js';

export class ImageProcessor {
  /**
   * Resize image while maintaining aspect ratio
   */
  resize(image: ImageData, maxWidth: number, maxHeight: number): ImageData {
    const { width, height } = image;
    
    // If image is already within bounds, return as-is
    if (width <= maxWidth && height <= maxHeight) {
      return image;
    }
    
    // Calculate new dimensions maintaining aspect ratio
    const originalAspect = width / height;
    let newWidth: number;
    let newHeight: number;
    
    // Determine which dimension is the limiting factor
    if (width / maxWidth > height / maxHeight) {
      // Width is the constraint
      newWidth = maxWidth;
      newHeight = Math.round(maxWidth / originalAspect);
    } else {
      // Height is the constraint
      newHeight = maxHeight;
      newWidth = Math.round(maxHeight * originalAspect);
    }
    
    // Create new image data
    const newData = new Uint8ClampedArray(newWidth * newHeight * 4);
    
    // Simple nearest-neighbor resampling
    const scaleX = width / newWidth;
    const scaleY = height / newHeight;
    
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = Math.floor(x * scaleX);
        const srcY = Math.floor(y * scaleY);
        const srcIdx = (srcY * width + srcX) * 4;
        const dstIdx = (y * newWidth + x) * 4;
        
        newData[dstIdx] = image.data[srcIdx];
        newData[dstIdx + 1] = image.data[srcIdx + 1];
        newData[dstIdx + 2] = image.data[srcIdx + 2];
        newData[dstIdx + 3] = image.data[srcIdx + 3];
      }
    }
    
    return {
      data: newData,
      width: newWidth,
      height: newHeight,
      format: image.format
    };
  }

  /**
   * Adjust brightness of image
   */
  adjustBrightness(image: ImageData, value: number): ImageData {
    const newData = new Uint8ClampedArray(image.data.length);
    
    for (let i = 0; i < image.data.length; i += 4) {
      newData[i] = Math.max(0, Math.min(255, image.data[i] + value));
      newData[i + 1] = Math.max(0, Math.min(255, image.data[i + 1] + value));
      newData[i + 2] = Math.max(0, Math.min(255, image.data[i + 2] + value));
      newData[i + 3] = image.data[i + 3]; // Keep alpha unchanged
    }
    
    return {
      ...image,
      data: newData
    };
  }

  /**
   * Adjust contrast of image
   */
  adjustContrast(image: ImageData, value: number): ImageData {
    const newData = new Uint8ClampedArray(image.data.length);
    const factor = (259 * (value + 255)) / (255 * (259 - value));
    
    for (let i = 0; i < image.data.length; i += 4) {
      newData[i] = Math.max(0, Math.min(255, factor * (image.data[i] - 128) + 128));
      newData[i + 1] = Math.max(0, Math.min(255, factor * (image.data[i + 1] - 128) + 128));
      newData[i + 2] = Math.max(0, Math.min(255, factor * (image.data[i + 2] - 128) + 128));
      newData[i + 3] = image.data[i + 3]; // Keep alpha unchanged
    }
    
    return {
      ...image,
      data: newData
    };
  }

  /**
   * Rotate image by specified degrees
   */
  rotate(image: ImageData, degrees: 0 | 90 | 180 | 270): ImageData {
    if (degrees === 0) {
      return image;
    }
    
    const { width, height, data } = image;
    let newWidth: number, newHeight: number;
    
    if (degrees === 90 || degrees === 270) {
      newWidth = height;
      newHeight = width;
    } else {
      newWidth = width;
      newHeight = height;
    }
    
    const newData = new Uint8ClampedArray(newWidth * newHeight * 4);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        let dstX: number, dstY: number;
        
        switch (degrees) {
          case 90:
            dstX = height - 1 - y;
            dstY = x;
            break;
          case 180:
            dstX = width - 1 - x;
            dstY = height - 1 - y;
            break;
          case 270:
            dstX = y;
            dstY = width - 1 - x;
            break;
          default:
            dstX = x;
            dstY = y;
        }
        
        const dstIdx = (dstY * newWidth + dstX) * 4;
        newData[dstIdx] = data[srcIdx];
        newData[dstIdx + 1] = data[srcIdx + 1];
        newData[dstIdx + 2] = data[srcIdx + 2];
        newData[dstIdx + 3] = data[srcIdx + 3];
      }
    }
    
    return {
      data: newData,
      width: newWidth,
      height: newHeight,
      format: image.format
    };
  }

  /**
   * Invert colors of image
   */
  invert(image: ImageData): ImageData {
    const newData = new Uint8ClampedArray(image.data.length);
    
    for (let i = 0; i < image.data.length; i += 4) {
      newData[i] = 255 - image.data[i];
      newData[i + 1] = 255 - image.data[i + 1];
      newData[i + 2] = 255 - image.data[i + 2];
      newData[i + 3] = image.data[i + 3]; // Keep alpha unchanged
    }
    
    return {
      ...image,
      data: newData
    };
  }

  /**
   * Mirror image horizontally, vertically, or both
   */
  mirror(image: ImageData, mode: 'horizontal' | 'vertical' | 'both' | 'none'): ImageData {
    if (mode === 'none') {
      return image;
    }
    
    const { width, height, data } = image;
    const newData = new Uint8ClampedArray(data.length);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        let dstX: number, dstY: number;
        
        switch (mode) {
          case 'horizontal':
            dstX = width - 1 - x;
            dstY = y;
            break;
          case 'vertical':
            dstX = x;
            dstY = height - 1 - y;
            break;
          case 'both':
            dstX = width - 1 - x;
            dstY = height - 1 - y;
            break;
          default:
            dstX = x;
            dstY = y;
        }
        
        const dstIdx = (dstY * width + dstX) * 4;
        newData[dstIdx] = data[srcIdx];
        newData[dstIdx + 1] = data[srcIdx + 1];
        newData[dstIdx + 2] = data[srcIdx + 2];
        newData[dstIdx + 3] = data[srcIdx + 3];
      }
    }
    
    return {
      ...image,
      data: newData
    };
  }

  /**
   * Apply dithering to image (Floyd-Steinberg algorithm)
   */
  applyDithering(image: ImageData, algorithm: 'floyd-steinberg' | 'ordered' = 'floyd-steinberg'): ImageData {
    if (algorithm === 'floyd-steinberg') {
      return this.floydSteinbergDithering(image);
    } else {
      return this.orderedDithering(image);
    }
  }

  private floydSteinbergDithering(image: ImageData): ImageData {
    const { width, height } = image;
    const newData = new Uint8ClampedArray(image.data);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        // Convert to grayscale
        const oldPixel = (newData[idx] + newData[idx + 1] + newData[idx + 2]) / 3;
        const newPixel = oldPixel < 128 ? 0 : 255;
        const error = oldPixel - newPixel;
        
        // Set new pixel value
        newData[idx] = newData[idx + 1] = newData[idx + 2] = newPixel;
        
        // Distribute error to neighboring pixels
        if (x + 1 < width) {
          const rightIdx = (y * width + (x + 1)) * 4;
          this.addError(newData, rightIdx, error * 7 / 16);
        }
        if (y + 1 < height) {
          if (x > 0) {
            const bottomLeftIdx = ((y + 1) * width + (x - 1)) * 4;
            this.addError(newData, bottomLeftIdx, error * 3 / 16);
          }
          const bottomIdx = ((y + 1) * width + x) * 4;
          this.addError(newData, bottomIdx, error * 5 / 16);
          if (x + 1 < width) {
            const bottomRightIdx = ((y + 1) * width + (x + 1)) * 4;
            this.addError(newData, bottomRightIdx, error * 1 / 16);
          }
        }
      }
    }
    
    return {
      ...image,
      data: newData
    };
  }

  private orderedDithering(image: ImageData): ImageData {
    const { width, height } = image;
    const newData = new Uint8ClampedArray(image.data);
    
    // 4x4 Bayer matrix
    const bayerMatrix = [
      [0, 8, 2, 10],
      [12, 4, 14, 6],
      [3, 11, 1, 9],
      [15, 7, 13, 5]
    ];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const grayscale = (newData[idx] + newData[idx + 1] + newData[idx + 2]) / 3;
        const threshold = (bayerMatrix[y % 4][x % 4] / 16) * 255;
        const newPixel = grayscale > threshold ? 255 : 0;
        
        newData[idx] = newData[idx + 1] = newData[idx + 2] = newPixel;
      }
    }
    
    return {
      ...image,
      data: newData
    };
  }

  private addError(data: Uint8ClampedArray, idx: number, error: number): void {
    data[idx] = Math.max(0, Math.min(255, data[idx] + error));
    data[idx + 1] = Math.max(0, Math.min(255, data[idx + 1] + error));
    data[idx + 2] = Math.max(0, Math.min(255, data[idx + 2] + error));
  }
}
