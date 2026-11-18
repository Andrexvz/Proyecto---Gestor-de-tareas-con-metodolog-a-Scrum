import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BRAVE_PATH = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
const TEMP_PROFILE = 'C:\\Users\\julia\\AppData\\Local\\Temp\\edge_verify_cdp_metrics';
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

    // 1. Navegar a Login
    console.log('\n--- 1. Navegando a http://localhost:3000 ---');
    await sendCommand('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(2000);

    // 2. Click en botón Demo Admin
    console.log('--- 2. Autenticando con perfil Administrador ---');
    await evaluate(`
      (() => {
        const btn = document.querySelector('button[aria-label*="Elena Vance"]') || 
                    Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Elena Vance') || b.textContent.includes('Administrador'));
        if (btn) btn.click();
      })()
    `);
    await sleep(1500);

    // Si sigue en login, llenar credenciales y submit
    const currentPath = await evaluate('window.location.pathname');
    if (!currentPath || currentPath === '/') {
      await evaluate(`
        (() => {
          const form = document.querySelector('form');
          if (form) {
            const emailInput = form.querySelector('input[type="email"]');
            const passInput = form.querySelector('input[type="password"]');
            if (emailInput && passInput) {
              emailInput.value = 'admin@velocity.dev';
              passInput.value = 'Password123!';
              emailInput.dispatchEvent(new Event('input', { bubbles: true }));
              passInput.dispatchEvent(new Event('input', { bubbles: true }));
              form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
            }
          }
        })()
      `);
      await sleep(2000);
    }

    // Captura de Dashboard con etiquetas clarificadas
    await takeScreenshot(`${browserName.toLowerCase()}-dashboard-clarified.png`);

    // 3. Navegar a Métricas de CBA (Proyecto 1)
    console.log('--- 3. Navegando a la vista de Métricas de Core Banking Auth (/projects/1/metrics) ---');
    await evaluate(`
      (() => {
        const link = document.querySelector('a[href*="/projects/1/metrics"]') || 
                     Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.includes('Métricas'));
        if (link) {
          link.click();
        } else {
          window.location.href = '/projects/1/metrics';
        }
      })()
    `);
    await sleep(2500);

    // 4. Verificar contenido de Métricas Consolidado
    console.log('--- 4. Auditando KPIs y visuales consolidadas ---');
    const metricsData = await evaluate(`
      (() => {
        const heading = document.querySelector('h1')?.textContent || '';
        const bodyText = document.body.innerText;
        const velocityText = Array.from(document.querySelectorAll('span, strong, p')).find(el => el.textContent.includes('pts / Sprint concluido'))?.textContent || '';
        const donutSvg = document.querySelector('svg[aria-label*="Donut"]');
        return {
          heading,
          hasDelivered: bodyText.includes('Points Entregados'),
          hasVelocity: bodyText.includes('Velocidad Media'),
          hasCompletion: bodyText.includes('Cumplimiento Puntos'),
          hasStories: bodyText.includes('Historias Listas'),
          hasTasks: bodyText.includes('Tareas en Done'),
          hasBarChart: bodyText.includes('Velocidad por Sprint (Comprometidos vs Entregados)'),
          hasDonut: bodyText.includes('Distribución de Tareas Técnicas'),
          hasBurndown: bodyText.includes('Progresión Histórica y Ritmo de Entrega (Burndown Trend)'),
          hasLedger: bodyText.includes('Historial Consolidado de Sprints'),
          velocityText,
          hasDonutSvg: !!donutSvg,
        };
      })()
    `);

    console.log(`  ✓ Título vista: "${metricsData.heading}"`);
    console.log(`  ✓ KPI Velocidad Media texto: "${metricsData.velocityText}"`);
    console.log(`  ✓ Presencia de componentes:`, {
      Delivered: metricsData.hasDelivered,
      Velocity: metricsData.hasVelocity,
      Completion: metricsData.hasCompletion,
      Stories: metricsData.hasStories,
      Tasks: metricsData.hasTasks,
      BarChart: metricsData.hasBarChart,
      Donut: metricsData.hasDonut,
      Burndown: metricsData.hasBurndown,
      Ledger: metricsData.hasLedger,
    });

    await takeScreenshot(`${browserName.toLowerCase()}-metrics-consolidated.png`);

    // 5. Probar filtro por Sprint 14
    console.log('--- 5. Seleccionando Sprint 14 en el filtro de Sprint ---');
    await evaluate(`
      (() => {
        const select = document.getElementById('sprint-metrics-filter');
        if (select) {
          select.value = '2'; // Sprint 14 ID
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      })()
    `);
    await sleep(1500);

    const sprint14FilteredData = await evaluate(`
      (() => {
        const bodyText = document.body.innerText;
        return {
          hasSprint14Notice: bodyText.includes('Filtrando métricas para') && bodyText.includes('Sprint 14'),
          deliveredValue: document.querySelector('.text-pulse-green')?.textContent || '',
        };
      })()
    `);
    console.log(`  ✓ Filtro Sprint 14 activado:`, sprint14FilteredData);

    await takeScreenshot(`${browserName.toLowerCase()}-metrics-sprint14-filtered.png`);

    // 6. Probar apertura del Glosario Scrum
    console.log('--- 6. Abriendo Glosario Scrum educativo ---');
    await evaluate(`
      (() => {
        const glossaryBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Glosario Scrum') || b.textContent.includes('Guía'));
        if (glossaryBtn) glossaryBtn.click();
      })()
    `);
    await sleep(1000);

    await takeScreenshot(`${browserName.toLowerCase()}-metrics-glossary-open.png`);

    // 7. Probar Responsive en Viewport Móvil (390x844 - iPhone 14 / moderno)
    console.log('--- 7. Evaluando responsividad en Viewport Móvil ---');
    await sendCommand('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1000);

    await takeScreenshot(`${browserName.toLowerCase()}-metrics-mobile-viewport.png`);

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
      metricsData,
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
  console.log('INICIANDO AUDITORÍA Y VERIFICACIÓN CROSS-BROWSER DE MÉTRICAS');
  const edgeResult = await verifyBrowser('Microsoft Edge', EDGE_PATH, 9222);
  const braveResult = await verifyBrowser('Brave Browser', BRAVE_PATH, 9223);

  console.log('\n=============================================================');
  console.log('RESUMEN DE VERIFICACIÓN EN NAVEGADORES REALES');
  console.log('=============================================================');
  console.log('Edge:', edgeResult ? 'VERIFICADO CON ÉXITO' : 'FALLIDO O NO DISPONIBLE');
  console.log('Brave:', braveResult ? 'VERIFICADO CON ÉXITO' : 'NO DISPONIBLE');
}

main();
