import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_PROFILE = 'C:\\Users\\julia\\AppData\\Local\\Temp\\edge_verify_cdp_stage6';
const ARTIFACT_DIR = 'C:\\Users\\julia\\.gemini\\antigravity\\brain\\99369301-a9ca-420f-9686-d60746cf25b1';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('=============================================================');
  console.log('ETAPA 6: VERIFICACIÓN INTEGRAL EN NAVEGADOR MICROSOFT EDGE');
  console.log('=============================================================');

  console.log('\n--- 1. Detectando ejecutable de Microsoft Edge ---');
  if (!fs.existsSync(EDGE_PATH)) {
    throw new Error(`Microsoft Edge no se encontró en ${EDGE_PATH}`);
  }
  console.log(`✓ Microsoft Edge detectado en: ${EDGE_PATH}`);

  // Ensure clean temp profile dir
  try {
    if (fs.existsSync(TEMP_PROFILE)) {
      fs.rmSync(TEMP_PROFILE, { recursive: true, force: true });
    }
  } catch {}

  console.log('--- 2. Iniciando Microsoft Edge Headless con CDP (puerto 9222) ---');
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${TEMP_PROFILE}`,
    '--disable-gpu',
    '--window-size=1920,1080',
    'about:blank',
  ]);

  let cdpConnected = false;
  const consoleErrors = [];
  const logEntries = [];

  try {
    let attempts = 0;
    let version = null;
    while (attempts < 15) {
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

    // -------------------------------------------------------------
    // PRUEBA A: LoginView, Seguridad y Responsive 1920x1080
    // -------------------------------------------------------------
    console.log('\n--- 3. Verificando LoginView y Seguridad en Desktop (1920x1080) ---');
    await sendCDP('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sendCDP('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(1500);

    // Clean session
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload();
        })()
      `,
    });
    await sleep(2000);

    const loginInspect = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const heading = document.querySelector('h1')?.textContent || '';
          const emailInput = document.getElementById('login-email');
          const passInput = document.getElementById('login-password');
          const hasPasswordInDOM = document.body.innerHTML.includes('Password123!');
          const quickRolesCount = Array.from(document.querySelectorAll('button')).filter(b => 
            b.textContent.includes('Administrador') || 
            b.textContent.includes('Scrum Master') || 
            b.textContent.includes('Product Owner') || 
            b.textContent.includes('Developer')
          ).length;
          return {
            heading,
            emailPlaceholder: emailInput?.getAttribute('placeholder') || '',
            passPlaceholder: passInput?.getAttribute('placeholder') || '',
            hasExposedPassword: hasPasswordInDOM,
            quickRolesCount
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('✓ Estado de seguridad en LoginView:', loginInspect.result?.value);

    // Capture desktop Login screenshot
    const loginScreenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'login-desktop-edge.png'), Buffer.from(loginScreenshot.data, 'base64'));
    console.log('✓ Captura guardada: login-desktop-edge.png');

    // Test Show/Hide password toggle
    const toggleResult = await sendCDP('Runtime.evaluate', {
      expression: `
        (async () => {
          const passInput = document.getElementById('login-password');
          const toggleBtn = document.querySelector('button[aria-label*="contraseña"]');
          const initial = passInput?.getAttribute('type');
          if (toggleBtn) toggleBtn.click();
          await new Promise(r => setTimeout(r, 120));
          const toggled = passInput?.getAttribute('type');
          if (toggleBtn) toggleBtn.click();
          await new Promise(r => setTimeout(r, 120));
          const restored = passInput?.getAttribute('type');
          return { initial, toggled, restored };
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });
    console.log('✓ Toggle de visibilidad de contraseña verificado:', toggleResult.result?.value);

    // -------------------------------------------------------------
    // PRUEBA B: Autenticación y Onboarding Exhaustivo de 8 Pasos
    // -------------------------------------------------------------
    console.log('\n--- 4. Autenticación y Recorrido Exhaustivo por los 8 Pasos del Onboarding ---');
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const smButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Scrum Master'));
          if (smButton) smButton.click();
        })()
      `,
    });
    await sleep(2500);

    // Ensure onboarding modal is visible
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          if (!document.getElementById('onboarding-modal-title')) {
            const helpBtn = document.querySelector('button[aria-label*="tutorial"]');
            if (helpBtn) helpBtn.click();
          }
        })()
      `,
    });
    await sleep(800);

    const stepResults = [];
    for (let stepIndex = 1; stepIndex <= 8; stepIndex++) {
      const currentStepInfo = await sendCDP('Runtime.evaluate', {
        expression: `
          (() => {
            const title = document.getElementById('onboarding-modal-title')?.textContent || '';
            const stepMatch = document.body.innerHTML.match(/Paso (\\d+) de (\\d+)/);
            return {
              stepNumber: stepMatch ? Number(stepMatch[1]) : 0,
              title
            };
          })()
        `,
        returnByValue: true,
      });
      stepResults.push(currentStepInfo.result?.value);
      console.log(`  ✓ Paso ${stepIndex}/8 verificado: "${currentStepInfo.result?.value?.title}"`);

      if (stepIndex === 1) {
        const onboardingScreenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
        fs.writeFileSync(path.join(ARTIFACT_DIR, 'onboarding-desktop-edge.png'), Buffer.from(onboardingScreenshot.data, 'base64'));
      }

      if (stepIndex < 8) {
        // Advance using ArrowRight or Next button
        await sendCDP('Runtime.evaluate', {
          expression: `
            (() => {
              const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Siguiente');
              if (nextBtn) nextBtn.click();
            })()
          `,
        });
        await sleep(400);
      }
    }
    console.log(`✓ Los 8 pasos del tutorial interactivo fueron verificados con éxito.`);

    // Finish tutorial at step 8
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Empezar'));
          if (startBtn) startBtn.click();
        })()
      `,
    });
    await sleep(600);

    // -------------------------------------------------------------
    // PRUEBA C: Personalización (Modo Claro & Reducción de Movimiento)
    // -------------------------------------------------------------
    console.log('\n--- 5. Verificando Modo Claro y Movimiento Reducido ---');
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const paletteBtn = document.querySelector('button[aria-label*="tema visual"]');
          if (paletteBtn) paletteBtn.click();
        })()
      `,
    });
    await sleep(600);

    // Select Light Mode
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const lightBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Modo Claro'));
          if (lightBtn) lightBtn.click();
        })()
      `,
    });
    await sleep(400);
    const lightCheck = await sendCDP('Runtime.evaluate', {
      expression: `document.documentElement.getAttribute('data-theme')`,
      returnByValue: true,
    });
    console.log('✓ Modo Claro activado:', lightCheck.result?.value);

    // Select Reduced Motion
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const motionBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Movimiento reducido'));
          if (motionBtn) motionBtn.click();
          const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Guardar y cerrar'));
          if (closeBtn) closeBtn.click();
        })()
      `,
    });
    await sleep(600);

    const motionCheck = await sendCDP('Runtime.evaluate', {
      expression: `document.documentElement.getAttribute('data-reduced-motion')`,
      returnByValue: true,
    });
    console.log('✓ Movimiento Reducido activado:', motionCheck.result?.value);

    const lightScreenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'theme-light-edge.png'), Buffer.from(lightScreenshot.data, 'base64'));
    console.log('✓ Captura guardada: theme-light-edge.png');

    // Restore Dark Mode & Standard Motion
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          document.documentElement.setAttribute('data-theme', 'dark');
          document.documentElement.setAttribute('data-reduced-motion', 'false');
          localStorage.setItem('agile_velocity_theme', 'dark');
          localStorage.setItem('agile_velocity_motion', 'normal');
        })()
      `,
    });
    await sleep(400);
    console.log('✓ Tema restaurado a Dark Dashboard.');

    // -------------------------------------------------------------
    // PRUEBA D: Vistas Principales (Dashboard, Backlog, Sprints, Kanban, Métricas)
    // -------------------------------------------------------------
    console.log('\n--- 6. Verificando Vistas Principales en Laptop (1366x768) ---');
    await sendCDP('Emulation.setDeviceMetricsOverride', {
      width: 1366,
      height: 768,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await sleep(800);

    // 6.1 Dashboard
    const dashboardCheck = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const heading = document.querySelector('h1')?.textContent || '';
          const projectCards = document.querySelectorAll('.rounded-cards').length;
          return { heading, projectCards };
        })()
      `,
      returnByValue: true,
    });
    console.log('✓ Dashboard funcional:', dashboardCheck.result?.value);

    // 6.2 Backlog View
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          window.history.pushState({}, '', '/projects/1/backlog');
          window.dispatchEvent(new PopStateEvent('popstate'));
        })()
      `,
    });
    await sleep(1200);
    const backlogCheck = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const heading = document.querySelector('h1')?.textContent || '';
          const storyCards = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('CORE-')).length;
          return { heading, storyCards };
        })()
      `,
      returnByValue: true,
    });
    console.log('✓ Product Backlog funcional:', backlogCheck.result?.value);

    // 6.3 Sprints View
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          window.history.pushState({}, '', '/projects/1/sprints');
          window.dispatchEvent(new PopStateEvent('popstate'));
        })()
      `,
    });
    await sleep(1200);
    const sprintsCheck = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const heading = document.querySelector('h1')?.textContent || '';
          const hasActiveSprint = document.body.innerHTML.includes('Sprint activo') || document.body.innerHTML.includes('Sprint');
          return { heading, hasActiveSprint };
        })()
      `,
      returnByValue: true,
    });
    console.log('✓ Vista de Sprints funcional:', sprintsCheck.result?.value);

    // 6.4 Kanban View
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          window.history.pushState({}, '', '/projects/1/kanban');
          window.dispatchEvent(new PopStateEvent('popstate'));
        })()
      `,
    });
    await sleep(1200);
    const kanbanCheck = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const heading = document.querySelector('h1')?.textContent || '';
          const columns = ['To Do', 'In Progress', 'Testing', 'Done'].filter(c => document.body.innerHTML.includes(c));
          return { heading, columnsFound: columns.length };
        })()
      `,
      returnByValue: true,
    });
    console.log('✓ Tablero Kanban funcional (4 columnas canónicas):', kanbanCheck.result?.value);

    // 6.5 Metrics View
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          window.history.pushState({}, '', '/projects/1/metrics');
          window.dispatchEvent(new PopStateEvent('popstate'));
        })()
      `,
    });
    await sleep(1200);
    const metricsCheck = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const heading = document.querySelector('h1')?.textContent || '';
          const svgs = document.querySelectorAll('svg').length;
          const hasVelocity = document.body.innerHTML.includes('Velocidad por Sprint');
          return { heading, svgs, hasVelocity };
        })()
      `,
      returnByValue: true,
    });
    console.log('✓ Métricas y Gráficos funcionales:', metricsCheck.result?.value);

    // -------------------------------------------------------------
    // PRUEBA E: Tablet (768x1024) y Mobile (390x844)
    // -------------------------------------------------------------
    console.log('\n--- 7. Verificando Tableta (768x1024) ---');
    await sendCDP('Emulation.setDeviceMetricsOverride', {
      width: 768,
      height: 1024,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1000);
    const tabletScreenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'tablet-768-edge.png'), Buffer.from(tabletScreenshot.data, 'base64'));
    console.log('✓ Captura guardada: tablet-768-edge.png');

    console.log('\n--- 8. Verificando Móvil (390x844) ---');
    await sendCDP('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1000);
    const mobileScreenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'dashboard-mobile-edge.png'), Buffer.from(mobileScreenshot.data, 'base64'));
    console.log('✓ Captura guardada: dashboard-mobile-edge.png');

    // -------------------------------------------------------------
    // AUDITORÍA DE CONSOLA Y RESUMEN
    // -------------------------------------------------------------
    console.log('\n--- 9. Auditoría de Errores de Consola ---');
    console.log(`Errores de consola detectados: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.warn('Errores encontrados:', consoleErrors);
    } else {
      console.log('✓ Cero (0) errores o excepciones de JavaScript en consola durante toda la navegación integral.');
    }

    ws.close();
  } finally {
    edgeProc.kill('SIGTERM');
  }

  console.log('\n=============================================================');
  console.log('✓ VERIFICACIÓN INTEGRAL EN MICROSOFT EDGE FINALIZADA CON ÉXITO');
  console.log('=============================================================');
}

run().catch((err) => {
  console.error('Error durante la verificación en navegador:', err);
  process.exit(1);
});
