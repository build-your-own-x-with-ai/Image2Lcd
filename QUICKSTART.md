# Quick Start Guide

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Basic Usage

### 1. Convert an image to monochrome C array

```bash
npm run cli -- your-image.png output.c --format mono --width 128 --height 64
```

This creates a C source file with a monochrome bitmap array.

### 2. Add dithering for better quality

```bash
npm run cli -- your-image.png output.c --format mono --width 128 --height 64 --dithering
```

Dithering improves the appearance of grayscale images in monochrome format.

### 3. Convert to RGB565 for color displays

```bash
npm run cli -- your-image.png output.c --format rgb565 --width 128 --height 128
```

RGB565 is a common format for color LCD displays (16 bits per pixel).

### 4. Apply preprocessing

```bash
npm run cli -- your-image.png output.c \
  --format mono \
  --width 128 \
  --height 64 \
  --brightness 20 \
  --contrast 10 \
  --rotation 90 \
  --invert
```

You can adjust brightness, contrast, rotate, and invert the image before conversion.

### 5. Generate binary output

```bash
npm run cli -- your-image.png output.bin --format rgb888 --output-format bin
```

Binary format is useful for direct loading into memory or flash storage.

## Using the Generated C Code

### In your embedded project:

```c
#include <stdint.h>

// Include the generated array
const unsigned char image_data[] = {
  0xFF, 0xFF, 0xFF, 0xFF, // ... (from output.c)
};

// Use in your LCD driver
void display_image(void) {
  lcd_draw_bitmap(0, 0, 128, 64, image_data);
}
```

## Common Use Cases

### For OLED displays (128x64, monochrome)
```bash
npm run cli -- logo.png logo.c --format mono --width 128 --height 64 --dithering
```

### For TFT displays (RGB565)
```bash
npm run cli -- photo.jpg photo.c --format rgb565 --width 240 --height 320
```

### For e-paper displays (grayscale)
```bash
npm run cli -- image.png image.c --format grayscale --width 200 --height 200
```

### For small icons (16x16)
```bash
npm run cli -- icon.png icon.c --format mono --width 16 --height 16
```

## Testing

Run the comprehensive test suite:

```bash
npm test
```

This runs 21 property-based tests with 1,750+ test cases to ensure correctness.

## Troubleshooting

### "Cannot find module"
Make sure you've run `npm install` and `npm run build`.

### "Image format not supported"
The tool supports PNG, JPG, BMP, GIF, and SVG. Make sure your input file is one of these formats.

### "Output file too large"
Try reducing the width and height, or use a more compact color format (mono instead of rgb888).

### Tests failing
Run `npm install` again to ensure all dependencies are installed correctly.

## Next Steps

- Check out `examples/basic-usage.sh` for more examples
- Read `README.md` for detailed documentation
- See `IMPLEMENTATION_SUMMARY.md` for technical details

## Support

For issues or questions, please check the documentation or create an issue in the repository.
