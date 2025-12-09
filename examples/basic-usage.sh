#!/bin/bash

# Basic Image2LCD Converter Examples

echo "=== Image2LCD Converter Examples ==="
echo ""

# Example 1: Simple monochrome conversion
echo "1. Converting to monochrome C array..."
npm run cli -- test-image.svg example1-mono.c \
  --format mono \
  --width 64 \
  --height 64

# Example 2: Monochrome with dithering
echo ""
echo "2. Converting with dithering..."
npm run cli -- test-image.svg example2-dithered.c \
  --format mono \
  --width 64 \
  --height 64 \
  --dithering

# Example 3: RGB565 color format
echo ""
echo "3. Converting to RGB565..."
npm run cli -- test-image.svg example3-rgb565.c \
  --format rgb565 \
  --width 128 \
  --height 128 \
  --identifier color_logo

# Example 4: Grayscale with preprocessing
echo ""
echo "4. Converting with preprocessing..."
npm run cli -- test-image.svg example4-processed.c \
  --format grayscale \
  --width 100 \
  --height 100 \
  --brightness 20 \
  --contrast 15 \
  --rotation 90

# Example 5: Binary output
echo ""
echo "5. Converting to binary format..."
npm run cli -- test-image.svg example5-data.bin \
  --format rgb888 \
  --width 64 \
  --height 64 \
  --output-format bin

# Example 6: Hex text output
echo ""
echo "6. Converting to hex text..."
npm run cli -- test-image.svg example6-hex.txt \
  --format mono \
  --width 32 \
  --height 32 \
  --output-format hex

echo ""
echo "=== All examples completed! ==="
echo "Check the generated files in the examples directory."
