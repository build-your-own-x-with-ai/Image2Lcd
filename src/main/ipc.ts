import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// File dialog handlers
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('dialog:openFiles', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'gif'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return [];
  }

  return result.filePaths;
});

ipcMain.handle('dialog:saveFile', async (_event, defaultName: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [
      { name: 'C Source', extensions: ['c'] },
      { name: 'C Header', extensions: ['h'] },
      { name: 'Binary', extensions: ['bin'] },
      { name: 'Text', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  return result.filePath;
});

// File I/O handlers
ipcMain.handle('file:readImage', async (_event, filePath: string) => {
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return {
      data: Array.from(data),
      width: info.width,
      height: info.height,
      format: metadata.format || 'unknown'
    };
  } catch (error) {
    throw new Error(`Failed to read image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

ipcMain.handle('file:writeFile', async (_event, filePath: string, data: number[] | string) => {
  try {
    if (typeof data === 'string') {
      await fs.writeFile(filePath, data, 'utf-8');
    } else {
      await fs.writeFile(filePath, Buffer.from(data));
    }
    return true;
  } catch (error) {
    throw new Error(`Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Preferences storage
const PREFERENCES_FILE = 'preferences.json';

ipcMain.handle('preferences:load', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const prefsPath = path.join(userDataPath, PREFERENCES_FILE);
    const data = await fs.readFile(prefsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Return default preferences if file doesn't exist
    return null;
  }
});

ipcMain.handle('preferences:save', async (_event, preferences: any) => {
  try {
    const userDataPath = app.getPath('userData');
    const prefsPath = path.join(userDataPath, PREFERENCES_FILE);
    await fs.writeFile(prefsPath, JSON.stringify(preferences, null, 2), 'utf-8');
    return true;
  } catch (error) {
    throw new Error(`Failed to save preferences: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Import app for preferences
import { app } from 'electron';
