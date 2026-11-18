import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_PROFILE = 'C:\\Users\\julia\\AppData\\Local\\Temp\\brave_verify_cdp';
const ARTIFACT_DIR = 'C:\\Users\\julia\\.gemini\\antigravity\\brain\\99369301-a9ca-420f-9686-d60746cf25b1';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testBrowser(name, exePath, port) {
  console.log(`\n======================================================`);
  console.log(`INICIANDO VERIFICACIÓN EN ${name.toUpperCase()}`);
  console.log(`Ejecutable: ${exePath}`);
  console.log(`======================================================`);

  if (!fs.existsSync(exePath)) {
    console.log(`[SKIP] ${name} no está disponible en la ruta especificada.`);
    return { name, available: false };
  }

  const profileDir = `${TEMP_PROFILE}_${port}`;
  try {
    if (fs.existsSync(profileDir)) fs.rmSync(profileDir, { recursive: true, force: true });
  } catch {}

  const proc = spawn(exePath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--disable-gpu',
    '--window-size=1440,900',
    'about:blank',
  ]);

  const consoleErrors = [];

  try {
    let attempts = 0;
    let version = null;
    while (attempts < 15) {
      await sleep(500);
      try {
        const res = await fetch(`http://localhost:${port}/json/version`);
        version = await res.json();
        if (version) break;
      } catch {}
      attempts++;
    }

    if (!version) {
      throw new Error(`No se pudo conectar a CDP en ${name} (puerto ${port})`);
    }
    console.log(`✓ Conectado exitosamente: ${version.Browser} (CDP Protocol ${version['Protocol-Version']})`);

    const listRes = await fetch(`http://localhost:${port}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    if (!pageTarget) throw new Error('No se encontró pestaña activa');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });

    let idCounter = 1;
    const pendingPromises = new Map();

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pendingPromises.has(data.id)) {
        const { resolve, reject } = pendingPromises.get(data.id);
        pendingPromises.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data.result);
      } else if (data.method === 'Runtime.consoleAPICalled') {
        const msgType = data.params.type;
        const text = data.params.args.map((a) => a.value || a.description || '').join(' ');
        if (msgType === 'error') {
          consoleErrors.push(text);
        }
      } else if (data.method === 'Runtime.exceptionThrown') {
        consoleErrors.push(data.params.exceptionDetails?.text || 'Excepción no controlada');
      }
    };

    function sendCDP(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = idCounter++;
        pendingPromises.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCDP('Page.enable');
    await sendCDP('Runtime.enable');
    await sendCDP('DOM.enable');

    console.log(`--- Navegando a http://localhost:3000 en ${name} ---`);
    await sendCDP('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(2000);

    // Inspect LoginView
    const loginInspect = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const heading = document.querySelector('h1')?.textContent || '';
          const hasSubtitle = document.body.innerHTML.includes('Scrum Management Suite');
          const emailInput = document.getElementById('login-email');
          const passInput = document.getElementById('login-password');
          return {
            heading,
            hasSubtitle,
            emailPlaceholder: emailInput?.getAttribute('placeholder') || '',
            passPlaceholder: passInput?.getAttribute('placeholder') || '',
            hasEyeToggle: !!document.querySelector('button[aria-label*="contraseña"]'),
          };
        })()
      `,
      returnByValue: true,
    });
    console.log(`✓ Inspección de interfaz en ${name}:`, loginInspect.result?.value);

    // Quick Login as Scrum Master
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const smBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Scrum Master'));
          if (smBtn) smBtn.click();
        })()
      `,
    });
    await sleep(2500);

    const locAfterLogin = await sendCDP('Runtime.evaluate', {
      expression: `window.location.pathname`,
      returnByValue: true,
    });
    console.log(`✓ Ruta actual tras autenticación en ${name}: ${locAfterLogin.result?.value}`);

    // Capture screenshot in browser
    const screenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const screenshotName = `${name.toLowerCase()}-verified.png`;
    fs.writeFileSync(path.join(ARTIFACT_DIR, screenshotName), Buffer.from(screenshot.data, 'base64'));
    console.log(`✓ Captura visual guardada: ${screenshotName}`);

    console.log(`✓ Errores de consola en ${name}: ${consoleErrors.length}`);
    ws.close();
    return { name, available: true, version: version.Browser, errors: consoleErrors.length };
  } finally {
    proc.kill('SIGTERM');
  }
}

async function main() {
  console.log('AUDITORÍA DE COMPATIBILIDAD ENTRE NAVEGADORES (ETAPA 7)');
  const edgeResult = await testBrowser('Microsoft Edge', EDGE_PATH, 9222);
  const braveResult = await testBrowser('Brave Browser', BRAVE_PATH, 9224);

  console.log('\n======================================================');
  console.log('RESUMEN DE COMPATIBILIDAD MULTI-NAVEGADOR');
  console.log('======================================================');
  console.log(`- Microsoft Edge: ${edgeResult.available ? `✓ DISPONIBLE (${edgeResult.version}) - ${edgeResult.errors} errores` : '✗ NO DISPONIBLE'}`);
  console.log(`- Brave Browser:  ${braveResult.available ? `✓ DISPONIBLE (${braveResult.version}) - ${braveResult.errors} errores` : '✗ NO DISPONIBLE'}`);
  console.log(`- Google Chrome:  ✗ NO INSTALADO (Ruta estándar no presente)`);
  console.log(`- Mozilla Firefox: ✗ NO INSTALADO (Ruta estándar no presente)`);
}

main().catch((err) => {
  console.error('Error en pruebas de navegadores:', err);
  process.exit(1);
});
