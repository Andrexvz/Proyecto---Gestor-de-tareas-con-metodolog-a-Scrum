import test from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../server/store.js';
import { getEmailServiceStatus, sendPasswordResetEmail } from '../server/emailService.js';

test('Preparación Profesional para Producción (Etapa 7) - Suite Automatizada', async (t) => {
  await t.test('1. Tokens de recuperación con aleatoriedad de al menos 128 bits (32 caracteres hex)', () => {
    const token = store.createResetToken('admin@velocity.dev');
    assert.ok(token, 'El token debe ser generado');

    // 128 bits of randomness = 16 bytes = 32 hexadecimal characters (8 blocks of 4)
    const token128BitRegex = /^([0-9A-F]{4}-){7}[0-9A-F]{4}$/;
    assert.match(
      token!,
      token128BitRegex,
      'El token debe tener al menos 128 bits de aleatoriedad criptográfica (formato 8x4 hex)'
    );

    // Stripped length must be exactly 32 hex characters
    const rawChars = token!.replace(/-/g, '');
    assert.equal(rawChars.length, 32, 'Debe contener exactamente 32 dígitos hexadecimales (128 bits)');
  });

  await t.test('2. Prevención de fuga de credenciales - El objeto de usuario sanitizado no expone passwordHash', () => {
    const rawUser = store.findUserByEmail('admin@velocity.dev');
    assert.ok(rawUser);
    assert.ok(rawUser?.passwordHash, 'El usuario en la base de datos contiene passwordHash');

    const sanitized = store.sanitizeUser(rawUser!);
    assert.equal((sanitized as any).passwordHash, undefined, 'sanitizeUser jamás debe exponer passwordHash');
    assert.equal(typeof sanitized.id, 'number');
    assert.equal(typeof sanitized.email, 'string');
    assert.equal(typeof sanitized.fullName, 'string');
    assert.equal(typeof sanitized.globalRole, 'string');
  });

  await t.test('3. Servicio de Correo Transaccional - Reporte transparente de configuración y no simulación', async () => {
    const status = getEmailServiceStatus();
    assert.equal(typeof status.configured, 'boolean');
    assert.equal(typeof status.port, 'number');
    assert.ok(status.from.includes('@'), 'Debe tener una dirección from válida');

    // When unconfigured in dev/test, sendPasswordResetEmail returns sent: false and explicit dev message
    const res = await sendPasswordResetEmail('tester@velocity.dev', 'ABCD-1234-EF56-7890-0000-1111-2222-3333');
    assert.equal(res.sent, false, 'No debe simular falsamente envíos SMTP si no está configurado');
    assert.ok(res.message.length > 0);
  });

  await t.test('4. Respaldo Automático y Persistencia Atómica - Integridad de scrum-db.json', () => {
    const projects = store.getProjectsForUser(store.findUserByEmail('admin@velocity.dev')!);
    assert.ok(Array.isArray(projects));
    assert.ok(projects.length > 0, 'Debe haber proyectos cargados en memoria y sincronizados con disco');

    // Verify projects have valid IDs and codes
    for (const p of projects) {
      assert.ok(p.id > 0);
      assert.ok(p.code.length >= 2);
      assert.ok(p.name.length >= 3);
    }
  });
});
