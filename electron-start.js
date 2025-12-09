import { spawn } from 'child_process';
import { createServer } from 'vite';
import electron from 'electron';

async function startDev() {
  // Start Vite dev server
  const server = await createServer({
    configFile: './vite.config.ts',
  });
  
  await server.listen();
  
  const address = server.httpServer.address();
  const port = typeof address === 'object' ? address.port : 5173;
  
  process.env.VITE_DEV_SERVER_URL = `http://localhost:${port}`;
  
  console.log(`Vite dev server running at http://localhost:${port}`);
  
  // Start Electron
  const electronProcess = spawn(electron, ['.'], {
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  electronProcess.on('close', () => {
    server.close();
    process.exit();
  });
}

startDev().catch(console.error);
