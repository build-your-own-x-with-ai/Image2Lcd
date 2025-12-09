export interface ElectronAPI {
  openFile: () => Promise<string | null>;
  openFiles: () => Promise<string[]>;
  saveFile: (defaultName: string) => Promise<string | null>;
  readImage: (filePath: string) => Promise<{
    data: number[];
    width: number;
    height: number;
    format: string;
  }>;
  writeFile: (filePath: string, data: number[] | string) => Promise<boolean>;
  loadPreferences: () => Promise<any>;
  savePreferences: (preferences: any) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
