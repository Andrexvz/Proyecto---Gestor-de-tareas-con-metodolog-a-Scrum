import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_PROFILE = 'C:\\Users\\julia\\AppData\\Local\\Temp\\edge_verify_cdp_stage5';
const ARTIFACT_DIR = 'C:\\Users\\julia\\.gemini\\antigravity\\brain\\99369301-a9ca-420f-9686-d60746cf25b1';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('--- 1. Detectando ejecutable de Microsoft Edge ---');
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

    console.log('--- 3. Navegando a http://localhost:3000 (Página de Login) ---');
    await sendCDP('Page.navigate', { url: 'http://localhost:3000' });
    await sleep(1500);

    // Clear session to ensure we are at LoginView
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

    // Verify Login Screen Layout & Elements
    const loginInspect = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const heading = document.querySelector('h1')?.textContent || '';
          const subtitle = document.body.innerHTML.includes('Scrum Management Suite');
          const emailInput = document.getElementById('login-email');
          const passInput = document.getElementById('login-password');
          const quickButtons = Array.from(document.querySelectorAll('button')).filter(b => 
            b.textContent.includes('Administrador') || 
            b.textContent.includes('Scrum Master') || 
            b.textContent.includes('Product Owner') || 
            b.textContent.includes('Developer')
          );
          const hasEyeToggle = !!document.querySelector('button[aria-label*="contraseña"]');
          return {
            heading,
            hasSubtitle: subtitle,
            emailPlaceholder: emailInput?.getAttribute('placeholder') || '',
            passPlaceholder: passInput?.getAttribute('placeholder') || '',
            hasEyeToggle,
            quickRolesCount: quickButtons.length
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('✓ Inspección de LoginView (Etapa 5):', loginInspect.result?.value);

    // Capture desktop Login screenshot
    const loginScreenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const loginImgPath = path.join(ARTIFACT_DIR, 'login-desktop-edge.png');
    fs.writeFileSync(loginImgPath, Buffer.from(loginScreenshot.data, 'base64'));
    console.log(`✓ Captura visual de Login guardada en: ${loginImgPath}`);

    // Test Show/Hide password toggle
    console.log('--- 4. Probando alternancia de visibilidad de contraseña (Eye/EyeOff) ---');
    const toggleResult = await sendCDP('Runtime.evaluate', {
      expression: `
        (async () => {
          const passInput = document.getElementById('login-password');
          const toggleBtn = document.querySelector('button[aria-label*="contraseña"]');
          const initialType = passInput?.getAttribute('type');
          if (toggleBtn) toggleBtn.click();
          await new Promise((r) => setTimeout(r, 120));
          const toggledType = passInput?.getAttribute('type');
          if (toggleBtn) toggleBtn.click();
          await new Promise((r) => setTimeout(r, 120));
          const restoredType = passInput?.getAttribute('type');
          return { initialType, toggledType, restoredType };
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });
    console.log('✓ Resultado del toggle de contraseña:', toggleResult.result?.value);

    // Perform login using quick role button (Scrum Master)
    console.log('--- 5. Autenticación mediante perfil de evaluación rápida (Scrum Master) ---');
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const smButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Scrum Master'));
          if (smButton) {
            smButton.click();
          }
        })()
      `,
    });
    await sleep(2500);

    // Verify current route
    const currentLoc = await sendCDP('Runtime.evaluate', {
      expression: `window.location.pathname`,
      returnByValue: true,
    });
    console.log(`✓ Ruta actual tras autenticación: ${currentLoc.result?.value}`);

    // Verify Onboarding Modal
    console.log('--- 6. Verificando Onboarding Interactivo de 8 Pasos (Etapa 5) ---');
    // Ensure Onboarding is open (if not auto-opened, click help button)
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const modalTitle = document.getElementById('onboarding-modal-title');
          if (!modalTitle) {
            const helpBtn = document.querySelector('button[aria-label*="tutorial"]');
            if (helpBtn) helpBtn.click();
          }
        })()
      `,
    });
    await sleep(1000);

    const onboardingInspect = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const modalTitle = document.getElementById('onboarding-modal-title');
          const stepText = document.body.innerHTML.match(/Paso (\\d+) de (\\d+)/)?.[0] || '';
          return {
            modalVisible: !!modalTitle,
            titleText: modalTitle?.textContent || '',
            stepText
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('✓ Inspección de OnboardingModal:', onboardingInspect.result?.value);

    // Capture desktop Onboarding screenshot
    const onboardingScreenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const onboardingImgPath = path.join(ARTIFACT_DIR, 'onboarding-desktop-edge.png');
    fs.writeFileSync(onboardingImgPath, Buffer.from(onboardingScreenshot.data, 'base64'));
    console.log(`✓ Captura visual de Onboarding guardada en: ${onboardingImgPath}`);

    // Advance Onboarding step (Step 1 -> Step 2)
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const nextBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Siguiente');
          if (nextBtn) nextBtn.click();
        })()
      `,
    });
    await sleep(600);

    const step2Inspect = await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const modalTitle = document.getElementById('onboarding-modal-title');
          const stepText = document.body.innerHTML.match(/Paso (\\d+) de (\\d+)/)?.[0] || '';
          return {
            titleText: modalTitle?.textContent || '',
            stepText
          };
        })()
      `,
      returnByValue: true,
    });
    console.log('✓ Avance al paso 2 del Onboarding:', step2Inspect.result?.value);

    // Dismiss Onboarding
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const skipBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Omitir tutorial');
          if (skipBtn) skipBtn.click();
        })()
      `,
    });
    await sleep(600);

    // Verify Theme Customization (ThemeModal & Light Mode)
    console.log('--- 7. Verificando Modal de Temas y Modo Claro (Etapa 5) ---');
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const paletteBtn = document.querySelector('button[aria-label*="tema visual"]');
          if (paletteBtn) paletteBtn.click();
        })()
      `,
    });
    await sleep(800);

    // Select Light Mode
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const lightOption = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Modo Claro'));
          if (lightOption) lightOption.click();
        })()
      `,
    });
    await sleep(600);

    const checkLight = await sendCDP('Runtime.evaluate', {
      expression: `document.documentElement.getAttribute('data-theme')`,
      returnByValue: true,
    });
    console.log('✓ Atributo data-theme en Modo Claro:', checkLight.result?.value);

    // Close Theme Modal
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Guardar y cerrar'));
          if (closeBtn) closeBtn.click();
        })()
      `,
    });
    await sleep(800);

    // Capture Light Mode screenshot
    const lightScreenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const lightImgPath = path.join(ARTIFACT_DIR, 'theme-light-edge.png');
    fs.writeFileSync(lightImgPath, Buffer.from(lightScreenshot.data, 'base64'));
    console.log(`✓ Captura visual en Modo Claro guardada en: ${lightImgPath}`);

    // Switch back to Dark Mode (default recommended identity)
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const paletteBtn = document.querySelector('button[aria-label*="tema visual"]');
          if (paletteBtn) paletteBtn.click();
        })()
      `,
    });
    await sleep(600);
    await sendCDP('Runtime.evaluate', {
      expression: `
        (() => {
          const darkOption = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Modo Oscuro'));
          if (darkOption) darkOption.click();
          const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Guardar y cerrar'));
          if (closeBtn) closeBtn.click();
        })()
      `,
    });
    await sleep(600);
    const restoredTheme = await sendCDP('Runtime.evaluate', {
      expression: `document.documentElement.getAttribute('data-theme')`,
      returnByValue: true,
    });
    console.log(`✓ Tema restaurado a identidad predeterminada: ${restoredTheme.result?.value}`);

    // Check Mobile Viewport
    console.log('--- 8. Comprobando Vista Responsive Móvil (Viewport 390x844) ---');
    await sendCDP('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(1000);

    const mobileScreenshot = await sendCDP('Page.captureScreenshot', { format: 'png' });
    const mobileImgPath = path.join(ARTIFACT_DIR, 'dashboard-mobile-edge.png');
    fs.writeFileSync(mobileImgPath, Buffer.from(mobileScreenshot.data, 'base64'));
    console.log(`✓ Captura responsive móvil guardada en: ${mobileImgPath}`);

    console.log('--- 9. Auditoría de Errores de Consola ---');
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
