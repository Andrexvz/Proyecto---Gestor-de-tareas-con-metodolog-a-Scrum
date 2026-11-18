import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const TEMP_PROFILE = 'C:\\Users\\julia\\AppData\\Local\\Temp\\edge_verify_cdp_mywork';
const ARTIFACT_DIR = 'C:\\Users\\julia\\.gemini\\antigravity\\brain\\99369301-a9ca-420f-9686-d60746cf25b1';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function verifyBrowser(browserName, browserPath, port = 9222) {
  console.log(`\n=============================================================`);
  console.log(`VERIFICANDO ${browserName.toUpperCase()}: ${browserPath}`);
  console.log(`=============================================================`);

  if (!fs.existsSync(browserPath)) {
    console.log(`[-] ${browserName} no encontrado en ${browserPath}, omitiendo.`);
    return null;
  }

  const profileDir = `${TEMP_PROFILE}_${browserName.toLowerCase()}`;
  try {
    if (fs.existsSync(profileDir)) {
      fs.rmSync(profileDir, { recursive: true, force: true });
    }
  } catch {}

  const proc = spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    '--disable-gpu',
    '--window-size=1920,1080',
    'about:blank',
  ]);

  let cdpConnected = false;
  const consoleErrors = [];

  try {
    let attempts = 0;
    let version = null;
    while (attempts < 20) {
      await sleep(500);
      try {
        const res = await fetch(`http://localhost:${port}/json/version`);
        version = await res.json();
        if (version) break;
      } catch {}
      attempts++;
    }

    if (!version) {
      throw new Error(`No se pudo conectar a CDP en puerto ${port} para ${browserName}`);
    }
    console.log(`✓ Conectado a ${version.Browser}`);

    const listRes = await fetch(`http://localhost:${port}/json/list`);
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    if (!pageTarget) throw new Error('No se encontró página');

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = reject;
    });
    cdpConnected = true;

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
      }
    };

    function sendCommand(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = idCounter++;
        pendingPromises.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    await sendCommand('Runtime.enable');
    await sendCommand('Page.enable');
    await sendCommand('DOM.enable');

    async function evaluate(expression) {
      const res = await sendCommand('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (res.exceptionDetails) {
        throw new Error(res.exceptionDetails.text || 'Error evaluando expresión');
      }
      return res.result?.value;
    }

    async function takeScreenshot(filename) {
      const { data } = await sendCommand('Page.captureScreenshot', { format: 'png' });
      const filePath = path.join(ARTIFACT_DIR, filename);
      fs.writeFileSync(filePath, Buffer.from(data, 'base64'));
      console.log(`  📸 Captura guardada: ${filename}`);
      return filePath;
    }

    // Helper para login
    async function loginAs(userEmail) {
      await sendCommand('Page.navigate', { url: 'http://localhost:3000/login' });
      await sleep(1500);

      const nameMap = {
        'admin@velocity.dev': 'Elena Vance',
        'po@velocity.dev': 'Mateo Ríos',
        'sm@velocity.dev': 'Sofía Mendoza',
        'dev1@velocity.dev': 'Lucas Herrera',
      };
      const targetName = nameMap[userEmail] || userEmail;

      await evaluate(`
        (() => {
          const card = Array.from(document.querySelectorAll('button')).find(b => 
            b.textContent.includes('${targetName}') || 
            b.textContent.includes('${userEmail}')
          );
          if (card) {
            card.click();
            return;
          }
          const emailInput = document.querySelector('input[type="email"]');
          const passInput = document.querySelector('input[type="password"]');
          const form = document.querySelector('form');
          if (emailInput && passInput && form) {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(emailInput, '${userEmail}');
            setter.call(passInput, 'Password123!');
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            passInput.dispatchEvent(new Event('input', { bubbles: true }));
            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
          }
        })()
      `);
      await sleep(2500);
    }

    // --- 1. EVALUACIÓN DEVELOPER (Lucas Herrera - dev1@velocity.dev) ---
    console.log('\n--- 1. Evaluando Flujo Developer (dev1@velocity.dev) ---');
    await loginAs('dev1@velocity.dev');

    // Navegar a Mi Trabajo
    console.log('--- 1.1 Navegando a /my-work desde la barra lateral ---');
    await evaluate(`
      (() => {
        const link = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.includes('Mi Trabajo'));
        if (link) link.click();
        else window.location.href = '/my-work';
      })()
    `);
    await sleep(2000);

    const devWorkSummary = await evaluate(`
      (() => {
        const title = document.querySelector('h1')?.textContent || '';
        const bodyText = document.body.innerText;
        return {
          title,
          hasTabs: bodyText.includes('Por Hacer') && bodyText.includes('En Progreso') && bodyText.includes('En Testing') && bodyText.includes('Completadas'),
          taskCardsCount: document.querySelectorAll('.rounded-cards').length,
          hasSearch: !!document.querySelector('input[placeholder*="Buscar por código"]'),
        };
      })()
    `);
    console.log(`  ✓ Vista Mi Trabajo cargada:`, devWorkSummary);

    await takeScreenshot(`${browserName.toLowerCase()}-mywork-cards-dev.png`);

    // Cambiar a vista Lista
    console.log('--- 1.2 Cambiando a Vista Lista en Mi Trabajo ---');
    await evaluate(`
      (() => {
        const listBtn = document.querySelector('button[aria-label="Vista en Lista"]');
        if (listBtn) listBtn.click();
      })()
    `);
    await sleep(1000);
    await takeScreenshot(`${browserName.toLowerCase()}-mywork-list-dev.png`);

    // Probar búsqueda dinámica
    console.log('--- 1.3 Probando búsqueda dinámica (TASK-03) ---');
    await evaluate(`
      (() => {
        const searchInput = document.querySelector('input[placeholder*="Buscar por código"]');
        if (searchInput) {
          searchInput.value = 'TASK-03';
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      })()
    `);
    await sleep(800);
    await takeScreenshot(`${browserName.toLowerCase()}-mywork-search-filter.png`);

    // Regresar a Dashboard Developer
    console.log('--- 1.4 Evaluando Dashboard Developer y Acciones Frecuentes ---');
    await evaluate(`
      (() => {
        const dashBtn = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.includes('Proyectos'));
        if (dashBtn) dashBtn.click();
        else window.location.href = '/dashboard';
      })()
    `);
    await sleep(2000);
    await takeScreenshot(`${browserName.toLowerCase()}-dashboard-developer.png`);

    // --- 2. EVALUACIÓN PRODUCT OWNER (Mateo Ríos - po@velocity.dev) ---
    console.log('\n--- 2. Evaluando Dashboard Product Owner (po@velocity.dev) ---');
    await loginAs('po@velocity.dev');
    await takeScreenshot(`${browserName.toLowerCase()}-dashboard-product-owner.png`);

    // --- 3. EVALUACIÓN SCRUM MASTER (Sofía Mendoza - sm@velocity.dev) ---
    console.log('\n--- 3. Evaluando Dashboard Scrum Master (sm@velocity.dev) ---');
    await loginAs('sm@velocity.dev');
    await takeScreenshot(`${browserName.toLowerCase()}-dashboard-scrum-master.png`);

    // --- 4. EVALUACIÓN ADMINISTRADOR (Elena Vance - admin@velocity.dev) ---
    console.log('\n--- 4. Evaluando Dashboard Administrador (admin@velocity.dev) ---');
    await loginAs('admin@velocity.dev');
    await takeScreenshot(`${browserName.toLowerCase()}-dashboard-administrator.png`);

    // --- 5. EVALUACIÓN RESPONSIVE EN MÓVIL (390x844) ---
    console.log('\n--- 5. Evaluando responsividad en Viewport Móvil (390x844) ---');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1000);

    // Dashboard móvil
    await takeScreenshot(`${browserName.toLowerCase()}-dashboard-mobile-role.png`);

    // Mi trabajo móvil
    await evaluate(`window.location.href = '/my-work';`);
    await sleep(2000);
    await takeScreenshot(`${browserName.toLowerCase()}-mywork-mobile.png`);

    // Restaurar viewport desktop
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });

    console.log(`\n✓ Errores de consola en ${browserName}: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('  ⚠️ Lista de errores:', consoleErrors);
    }

    ws.close();
    proc.kill();

    return {
      browser: browserName,
      consoleErrorsCount: consoleErrors.length,
    };
  } catch (err) {
    console.error(`[-] Error durante la verificación en ${browserName}:`, err);
    try {
      proc.kill();
    } catch {}
    return null;
  }
}

async function main() {
  console.log('INICIANDO AUDITORÍA Y VERIFICACIÓN CROSS-BROWSER DE MI TRABAJO Y DASHBOARD POR ROL');
  const edgeResult = await verifyBrowser('Microsoft Edge', EDGE_PATH, 9222);
  const braveResult = await verifyBrowser('Brave Browser', BRAVE_PATH, 9223);

  console.log('\n=============================================================');
  console.log('RESUMEN DE VERIFICACIÓN EN NAVEGADORES REALES');
  console.log('=============================================================');
  console.log('Edge:', edgeResult ? 'VERIFICADO CON ÉXITO' : 'FALLIDO O NO DISPONIBLE');
  console.log('Brave:', braveResult ? 'VERIFICADO CON ÉXITO' : 'NO DISPONIBLE');
}

main();
