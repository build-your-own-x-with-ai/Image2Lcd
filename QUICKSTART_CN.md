# 快速入门指南

## 安装

```bash
# 安装依赖
npm install

# 构建项目
npm run build
```

## 基本用法

### 1. 将图像转换为单色C数组

```bash
npm run cli -- your-image.png output.c --format mono --width 128 --height 64
```

这将创建一个包含单色位图数组的C源文件。

### 2. 添加抖动以获得更好的质量

```bash
npm run cli -- your-image.png output.c --format mono --width 128 --height 64 --dithering
```

抖动可以改善单色格式下灰度图像的外观。

### 3. 转换为RGB565用于彩色显示器

```bash
npm run cli -- your-image.png output.c --format rgb565 --width 128 --height 128
```

RGB565是彩色LCD显示器的常见格式（每像素16位）。

### 4. 应用预处理

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

您可以在转换前调整亮度、对比度、旋转和反转图像。

### 5. 生成二进制输出

```bash
npm run cli -- your-image.png output.bin --format rgb888 --output-format bin
```

二进制格式适用于直接加载到内存或闪存存储。

## 使用生成的C代码

### 在您的嵌入式项目中：

```c
#include <stdint.h>

// 包含生成的数组
const unsigned char image_data[] = {
  0xFF, 0xFF, 0xFF, 0xFF, // ... (来自output.c)
};

// 在LCD驱动程序中使用
void display_image(void) {
  lcd_draw_bitmap(0, 0, 128, 64, image_data);
}
```

## 常见用例

### 用于OLED显示器（128x64，单色）
```bash
npm run cli -- logo.png logo.c --format mono --width 128 --height 64 --dithering
```

### 用于TFT显示器（RGB565）
```bash
npm run cli -- photo.jpg photo.c --format rgb565 --width 240 --height 320
```

### 用于电子纸显示器（灰度）
```bash
npm run cli -- image.png image.c --format grayscale --width 200 --height 200
```

### 用于小图标（16x16）
```bash
npm run cli -- icon.png icon.c --format mono --width 16 --height 16
```

## 测试

运行全面的测试套件：

```bash
npm test
```

这将运行26个基于属性的测试，包含100+个测试用例以确保正确性。

## 故障排除

### "找不到模块"
确保您已运行 `npm install` 和 `npm run build`。

### "不支持的图像格式"
该工具支持PNG、JPG、BMP、GIF和SVG。确保您的输入文件是这些格式之一。

### "输出文件太大"
尝试减小宽度和高度，或使用更紧凑的颜色格式（mono而不是rgb888）。

### 测试失败
再次运行 `npm install` 以确保所有依赖项都正确安装。

## 下一步

- 查看 `examples/basic-usage.sh` 获取更多示例
- 阅读 `README.md` 获取详细文档
- 查看 `IMPLEMENTATION_SUMMARY.md` 获取技术细节

## 支持

如有问题或疑问，请查看文档或在仓库中创建issue。
