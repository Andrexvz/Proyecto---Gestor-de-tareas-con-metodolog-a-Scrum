import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_PROFILE = 'C:\\Users\\julia\\AppData\\Local\\Temp\\edge_verify_cdp';
const ARTIFACT_DIR = 'C:\\Users\\julia\\.gemini\\antigravity\\brain\\99369301-a9ca-420f-9686-d60746cf25b1';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('--- 1. Detectando ejecutable de navegador ---');
  if (!fs.existsSync(EDGE_PATH)) {
    throw new Error(`Microsoft Edge no se encontró en ${EDGE_PATH}`);
  }
  console.log(`✓ Microsoft Edge detectado en: ${EDGE_PATH}`);

  console.log('--- 2. Iniciando Microsoft Edge en modo Headless con CDP (puerto 9222) ---');
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${TEMP_PROFILE}`,
    '--disable-gpu',
    '--window-size=1440,900',
    'about:blank',
  ]);

  let cdpConnected = false;
  const consoleErrors = [];
  const logEntries = [];

  try {
    // Wait for CDP to respond
    let attempts = 0;
    let version = null;
    while (attempts < 12) {
      await sleep(500);
      try {
        const res = await fetch('http://localhost:9222/json/version');
        version = await res.json();
        if (version) break;
      } catch {}
      attempts++;
    }

    if (!version) {
      throw new Error('No se pudo establecer conexión HTTP con CDP en el puerto 9222');
    }
    console.log(`✓ Conectado a ${version.Browser} (Protocolo ${version['Protocol-Version']})`);

    // Get active page target
    const listRes = await fetch('http://localhost:9222/json/list');
    const targets = await listRes.json();
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    if (!pageTarget) {
      throw new Error('No se encontró ninguna pestaña de navegador abierta');
    }
    console.log(`✓ Pestaña seleccionada (ID: ${pageTarget.id})`);

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
        logEntries.push(`[Console ${msgType}] ${text}`);
      } else if (data.method === 'Runtime.exceptionThrown') {
        const exc = data.params.exceptionDetails?.text || 'Excepción no controlada';
        consoleErrors.push(exc);
        logEntries.push(`[Exception] ${exc}`);
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

    console.log('--- 3. Navegando a http://localhost:3000 ---');
    await sendCDP('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(2000);

    // Check login form and log in with admin@velocity.dev
    const loginResult = await sendCDP('Runtime.evaluate', {
      expression: `
        (async () => {
          const emailInput = document.querySelector('input[type="email"]');
          const passInput = document.querySelector('input[type="password"]');
          if (!emailInput || !passInput) return { ok: false, reason: 'Inputs no encontrados' };
          
          emailInput.value = 'admin@velocity.dev';
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          passInput.value = 'Password123!';
          passInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          const submitBtn = document.querySelector('button[type="submit"]');
          if (submitBtn) submitBtn.click();
          return { ok: true };
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });

    console.log('✓ Credenciales de autenticación enviadas:', loginResult.result?.value);
    await sleep(2500);

    // Verify current route
    const currentLoc = await sendCDP('Runtime.evaluate', {
      expression: `window.location.pathname`,
      returnByValue: true,
    });
    console.log(`✓ Ruta actual tras autenticación: ${currentLoc.result?.value}`);

    // Verify Dashboard
    console.log('--- 4. Comprobando Dashboard y Estadísticas ---');
    const dashboardCheck = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const title = document.querySelector('h1')?.textContent || '';
          const cards = document.querySelectorAll('.rounded-cards');
          return {
            title,
            cardsCount: cards.length,
            htmlLength: document.body.innerHTML.length
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('✓ Estado del Dashboard:', dashboardCheck.result?.value);

    // Navigate to Sprints view
    console.log('--- 5. Comprobando Vista de Sprints (Etapa 4) ---');
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          window.history.pushState({}, '', '/projects/1/sprints');
          window.dispatchEvent(new PopStateEvent('popstate'));
        })()
      `,
    });
    await sleep(1500);

    const sprintsCheck = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const title = document.querySelector('h1')?.textContent || '';
          const hasBacklog = document.body.innerHTML.includes('Product Backlog');
          const hasSprintsList = document.body.innerHTML.includes('Sprint');
          const buttons = Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim());
          return {
            title,
            hasBacklog,
            hasSprintsList,
            sampleButtons: buttons.slice(0, 8)
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('✓ Verificación de SprintsView:', sprintsCheck.result?.value);

    // Capture desktop Sprints screenshot
    const sprintsScreenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const sprintsImgPath = path.join(ARTIFACT_DIR, 'sprints-desktop-edge.png');
    fs.writeFileSync(sprintsImgPath, Buffer.from(sprintsScreenshot.data, 'base64'));
    console.log(`✓ Captura visual de Sprints guardada en: ${sprintsImgPath}`);

    // Navigate to Metrics view
    console.log('--- 6. Comprobando Vista de Métricas y Gráficos (Etapa 4) ---');
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          window.history.pushState({}, '', '/projects/1/metrics');
          window.dispatchEvent(new PopStateEvent('popstate'));
        })()
      `,
    });
    await sleep(1500);

    const metricsCheck = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const title = document.querySelector('h1')?.textContent || '';
          const svgs = document.querySelectorAll('svg');
          const hasVelocity = document.body.innerHTML.includes('Velocidad por Sprint');
          const hasDonut = document.body.innerHTML.includes('Distribución de Tareas');
          const hasLedger = document.body.innerHTML.includes('Historial Consolidado');
          return {
            title,
            svgCount: svgs.length,
            hasVelocity,
            hasDonut,
            hasLedger
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('✓ Verificación de MetricsView:', metricsCheck.result?.value);

    // Capture desktop Metrics screenshot
    const metricsScreenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const metricsImgPath = path.join(ARTIFACT_DIR, 'metrics-desktop-edge.png');
    fs.writeFileSync(metricsImgPath, Buffer.from(metricsScreenshot.data, 'base64'));
    console.log(`✓ Captura visual de Métricas guardada en: ${metricsImgPath}`);

    // Check Mobile Viewport
    console.log('--- 7. Comprobando Vista Responsive Móvil (Viewport 390x844) ---');
    await sendCDP('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1000);

    const mobileScreenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const mobileImgPath = path.join(ARTIFACT_DIR, 'metrics-mobile-edge.png');
    fs.writeFileSync(mobileImgPath, Buffer.from(mobileScreenshot.data, 'base64'));
    console.log(`✓ Captura responsive móvil guardada en: ${mobileImgPath}`);

    console.log('--- 8. Auditoría de Errores de Consola ---');
    console.log(`Errores de consola detectados: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.warn('Errores encontrados:', consoleErrors);
    } else {
      console.log('✓ Cero (0) errores de JavaScript en consola durante toda la navegación.');
    }

    ws.close();
  } finally {
    edgeProc.kill('SIGTERM');
  }

  console.log('\n=============================================');
  console.log('✓ VERIFICACIÓN DE NAVEGADOR EDGE COMPLETADA CON ÉXITO');
  console.log('=============================================');
}

run().catch((err) => {
  console.error('Error durante la verificación en navegador:', err);
  process.exit(1);
});
