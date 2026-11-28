import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SafeMarkdown } from '../src/components/ai/SafeMarkdown';

const API_BASE = 'http://localhost:3000/api/v1';

async function loginAs(email: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Password123!' }),
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  return data.token as string;
}

describe('Agile Velocity AI - Seguridad, Integración y UI', () => {
  it('1. Seguridad - Endpoints AI rechazan peticiones anónimas con 401', async () => {
    const statusRes = await fetch(`${API_BASE}/ai/status`);
    assert.equal(statusRes.status, 401);

    const proRes = await fetch(`${API_BASE}/ai/proactive`);
    assert.equal(proRes.status, 401);

    const chatRes = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'hola' }),
    });
    assert.equal(chatRes.status, 401);
  });

  it('2. Estado y Cuota - GET /api/v1/ai/status devuelve estado real del proveedor', async () => {
    const token = await loginAs('admin@velocity.dev');
    const res = await fetch(`${API_BASE}/ai/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(typeof data.configured, 'boolean');
    assert.ok(data.usage && typeof data.usage.dailyTokenBudget === 'number');
    assert.ok(Array.isArray(data.tools));
  });

  it('3. Asistencia Proactiva - Analiza proyectos autorizados sin costo LLM', async () => {
    const token = await loginAs('sm@velocity.dev');
    const res = await fetch(`${API_BASE}/ai/proactive?projectId=1`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(typeof data.enabled, 'boolean');
    assert.ok(Array.isArray(data.alerts));
  });

  it('4. Aislamiento de Historial - Un usuario no puede renombrar ni borrar chats de otro', async () => {
    const adminToken = await loginAs('admin@velocity.dev');
    const devToken = await loginAs('dev1@velocity.dev');

    const createRes = await fetch(`${API_BASE}/ai/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ title: 'Conversación Privada Admin', projectId: 1 }),
    });
    assert.equal(createRes.status, 200);
    const convId = (await createRes.json()).conversation.id;

    const devDelete = await fetch(`${API_BASE}/ai/conversations/${convId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${devToken}` },
    });
    assert.equal(devDelete.status, 404);

    const adminDelete = await fetch(`${API_BASE}/ai/conversations/${convId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert.equal(adminDelete.status, 200);
  });

  it('5. Documentos y Confirmaciones - Rechaza .exe y acciones inexistentes con códigos seguros', async () => {
    const token = await loginAs('po@velocity.dev');

    const confirmRes = await fetch(`${API_BASE}/ai/actions/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ confirmationId: 'act_inexistente_123' }),
    });
    assert.equal(confirmRes.status, 404);

    const form = new FormData();
    form.append('file', new Blob(['binary'], { type: 'application/octet-stream' }), 'malware.exe');
    const uploadRes = await fetch(`${API_BASE}/ai/documents/parse`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    assert.equal(uploadRes.status, 400);
  });

  it('6. SafeMarkdown - Renderiza tablas, código y bloquea inyección HTML/XSS', () => {
    const html = renderToStaticMarkup(
      React.createElement(SafeMarkdown, {
        content: '## Resumen\n- Item **clave**\n\n| Col1 | Col2 |\n| --- | --- |\n| A | B |\n\n<img src=x onerror=alert(1)>',
      })
    );
    assert.ok(html.includes('<table'));
    assert.ok(!html.includes('<img'));
  });

  it('7. Proveedor Real (condicional) - Chat, Streaming SSE, Story Draft y Backlog Assist', async (t) => {
    const token = await loginAs('sm@velocity.dev');
    const statusRes = await fetch(`${API_BASE}/ai/status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(statusRes.status, 200);
    const status = await statusRes.json();
    if (!status.configured) {
      t.skip('Proveedor AI no configurado en este entorno; omitiendo prueba en vivo.');
      return;
    }

    // 1. Chat real
    const chatRes = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        prompt: 'Responde en 1 frase corta qué es un Sprint Backlog.',
        mode: 'FAST',
        temporary: true,
      }),
    });
    assert.equal(chatRes.status, 200);
    const chatData = await chatRes.json();
    assert.ok(chatData.message?.content && chatData.message.content.length > 5);

    // 2. Streaming SSE real
    const streamRes = await fetch(`${API_BASE}/ai/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        prompt: 'Di "OK Scrum" brevemente.',
        mode: 'FAST',
        temporary: true,
      }),
    });
    assert.equal(streamRes.status, 200);
    const sseText = await streamRes.text();
    assert.ok(sseText.includes('"type":"meta"') || sseText.includes('"type": "meta"'));
    assert.ok(sseText.includes('"type":"done"') || sseText.includes('"type": "done"'));

    // 3. Generación estructurada de Historia de Usuario
    const storyRes = await fetch(`${API_BASE}/ai/generate-story`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        projectId: 1,
        prompt: 'Permitir exportar el reporte de velocidad del sprint en CSV.',
      }),
    });
    assert.equal(storyRes.status, 200);
    const storyData = await storyRes.json();
    assert.ok(storyData.draft?.title);
    assert.ok(Array.isArray(storyData.draft?.acceptanceCriteria));
  });
});
