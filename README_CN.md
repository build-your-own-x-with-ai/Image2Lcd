# Image2LCD 转换器

一个强大的桌面应用程序和命令行工具，用于将图像转换为LCD显示数据格式，专为嵌入式系统和微控制器项目设计。完全兼容Image2Lcd格式规范。

关注微信公众号 AIDevLog 获取更多AI开发资讯和技术分享！

![AIDevLog](src/renderer/assets/AIDevLog.jpg)

## 截图

![1bit ](screenshots/1bit.png)

![32bit ](screenshots/32bit.png)

![Image2LCD ](screenshots/Image2LCD.png)

## 功能特性

- **10种颜色格式**：单色、4灰度、16灰度、256灰度、256色、4096色、16位、18位、24位、32位真彩色
- **图像预处理**：调整大小、旋转、镜像、亮度、对比度、反色
- **抖动算法**：Floyd-Steinberg和有序抖动算法用于单色转换
- **4种扫描模式**：水平扫描、垂直扫描、水平反向字节垂直、数据垂直字节水平
- **Image2Lcd头部**：HEADGRAY、HEADCOLOR和PALETTE结构
- **位/字节序控制**：MSB/LSB位序，PC/反向字节序（WORD格式）
- **多种输出格式**：C数组、二进制、十六进制文本
- **桌面GUI**：功能完整的Electron应用程序，支持实时预览
- **全面测试**：26个基于属性的测试，每个测试100+次迭代

## 安装

```bash
npm install
npm run build
```

## 使用方法

### 基本用法

```bash
npm run cli -- <输入图像> <输出文件> [选项]
```

### 示例

将图像转换为单色C数组：
```bash
npm run cli -- logo.png output.c --format mono --width 128 --height 64
```

使用抖动转换：
```bash
npm run cli -- photo.jpg output.c --format mono --dithering
```

转换为RGB565二进制：
```bash
npm run cli -- image.png output.bin --format rgb565 --output-format bin
```

应用预处理：
```bash
npm run cli -- input.png output.c --brightness 20 --contrast 10 --rotation 90
```

### 选项

| 选项 | 描述 | 默认值 |
|--------|-------------|---------|
| `--format <类型>` | 颜色格式：mono, rgb565, rgb888, grayscale | mono |
| `--width <像素>` | 最大宽度 | 128 |
| `--height <像素>` | 最大高度 | 128 |
| `--output-format <类型>` | 输出格式：c, bin, hex | c |
| `--identifier <名称>` | C数组标识符名称 | image_data |
| `--dithering` | 启用单色抖动 | false |
| `--invert` | 反转颜色 | false |
| `--brightness <值>` | 调整亮度（-100到100） | 0 |
| `--contrast <值>` | 调整对比度（-100到100） | 0 |
| `--rotation <角度>` | 旋转图像（0, 90, 180, 270） | 0 |

## 颜色格式

### 单色 (mono)
- 每像素1位，每字节8像素
- 适用于简单的LCD显示器
- 支持抖动以获得更好的灰度表示

### 4灰度 (gray4)
- 每像素2位，每字节4像素
- 4个灰度级别

### 16灰度 (gray16)
- 每像素4位，每字节2像素
- 16个灰度级别

### 256灰度 (grayscale)
- 每像素8位
- 256个灰度级别

### 256色 (color256)
- 每像素8位，带调色板
- 支持RGB332、灰度或自定义调色板
- 可选PALETTE结构输出

### 4096色 (color4096)
- 每像素12位（每分量4位）
- 两种格式：12位3字节或16位WORD

### 16位真彩色 (color16bit)
- RGB565：5R-6G-5B（16位）
- RGB555：5R-5G-5B（15位）

### 18位真彩色 (color18bit)
- 每分量6位
- 两种格式：6位低字节或6位高字节

### 24位真彩色 (color24bit)
- 每分量8位（RGB888）
- 可配置RGB分量顺序

### 32位真彩色 (color32bit)
- 每分量8位 + alpha通道
- 可配置RGB分量顺序

## 输出格式

### C数组 (c)
生成包含以下内容的C源文件：
- 元数据注释（尺寸、格式、大小）
- const unsigned char数组声明
- 格式化的十六进制值

示例输出：
```c
/*
 * Image: image_data
 * Width: 64px
 * Height: 64px
 * Format: mono
 * Scan Mode: horizontal
 * Size: 512 bytes
 */

const unsigned char image_data[] = {
  0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
  0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
  // ... 更多数据
};
```

### 二进制 (bin)
原始二进制数据，适合直接加载到内存或闪存存储。

### 十六进制文本 (hex)
带0x前缀的可读十六进制值，用于调试。

## 架构

项目遵循清晰的架构，包含三个主要服务层：

### ImageProcessor
处理图像预处理操作：
- 保持纵横比的调整大小
- 亮度和对比度调整
- 旋转（90°、180°、270°）
- 颜色反转
- 抖动（Floyd-Steinberg、有序）

### ImageConverter
核心转换引擎：
- 颜色格式转换
- 扫描模式转换
- 预处理管道集成

### DataFormatter
输出生成：
- C数组格式化
- 二进制输出
- 十六进制文本格式化
- 头文件生成
- 字节序处理

## GUI应用程序

启动桌面GUI：

```bash
npm start
```

GUI提供：
- 实时图像预览（原始和转换后）
- 所有颜色格式选项及格式特定控制
- 扫描模式可视化
- 亮度和对比度滑块
- 镜像控制（水平、垂直、双向）
- 位/字节序配置
- Image2Lcd头部生成
- 代码预览面板
- 保存为C数组或二进制文件
- 关于对话框及应用程序信息

## 测试

项目包含使用fast-check的全面基于属性的测试：

```bash
# 运行所有测试
npm test

# 以监视模式运行测试
npm run test:watch

# 使用UI运行测试
npm run test:ui
```

### 测试覆盖率
- **26个基于属性的测试**，每个测试100+次迭代
- 测试覆盖所有预处理操作（调整大小、亮度、对比度、旋转、反转、抖动、镜像）
- 测试验证所有10种颜色格式转换
- 测试确保输出格式正确性（C数组、二进制、十六进制）
- 测试验证往返操作
- 测试验证Image2Lcd头部结构（HEADGRAY、HEADCOLOR、PALETTE）

## 开发

### 项目结构
```
src/
├── cli.ts                      # 命令行界面
├── main/                       # Electron主进程（用于未来的GUI）
│   ├── main.ts
│   ├── ipc.ts
│   └── preload.ts
├── renderer/
│   ├── services/               # 核心业务逻辑
│   │   ├── imageProcessor.ts
│   │   ├── imageConverter.ts
│   │   └── dataFormatter.ts
│   └── types/
└── shared/
    └── types.ts                # 共享类型定义
```

### 构建

```bash
npm run build
```

### 运行测试

```bash
npm test
```

## 要求

- Node.js 18+
- npm或yarn

## 依赖项

- **sharp**：高性能图像处理
- **typescript**：类型安全开发
- **vitest**：快速单元测试
- **fast-check**：基于属性的测试
- **electron**：桌面应用程序框架（用于未来的GUI）

## Image2Lcd兼容性

此工具完全兼容Image2Lcd格式规范：

- **HEADGRAY结构**：用于mono/gray4/gray16/color256格式的6字节头部
- **HEADCOLOR结构**：用于color4096/16bit/18bit/24bit/32bit格式的8字节头部
- **PALETTE结构**：256色格式的可选调色板数据
- **扫描模式编码**：位0-1用于扫描模式，位4用于字节序，位5用于位序，位6-7用于扫描方向
- **所有扫描模式**：水平、垂直、水平反向字节垂直、数据垂直字节水平
- **位/字节序**：字节内MSB/LSB优先，WORD格式的PC顺序/反向顺序

## 未来增强

- 批处理支持
- 自定义调色板编辑器
- 动画支持（GIF帧）
- 拖放界面
- 偏好设置持久化
- 键盘快捷键

## 许可证

ISC

## 贡献

欢迎贡献！提交拉取请求前请确保所有测试通过。

## 源代码和下载

源码地址: https://github.com/build-your-own-x-with-ai/Image2Lcd

下载地址: 链接: https://pan.baidu.com/s/1hjvHDnAHsCuQhaC5K1LMeQ?pwd=3kxq 提取码: 3kxq

## 致谢

使用基于属性的测试方法构建，以确保所有输入组合的正确性。
