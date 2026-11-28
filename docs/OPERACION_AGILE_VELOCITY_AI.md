# Guía de Operación: Agile Velocity + Ollama (Agile Velocity AI)

## 1. Requisitos previos y persistencia de configuración
Las siguientes variables de entorno de usuario en Windows permiten que Ollama permanezca activo tras reiniciar el equipo:

- `AI_PROVIDER=ollama`
- `OLLAMA_ENABLED=true`
- `OLLAMA_MODEL_FAST=qwen2.5:3b`
- `OLLAMA_MODEL_DEEP=qwen3:4b`

Modelos locales requeridos en Ollama (ya descargados):
- `qwen2.5:3b` (predeterminado para `AUTO`, `FAST`, `TUTOR`, `AGENT`, `DOCUMENTS`)
- `qwen3:4b` (reservado para análisis complejos en modo `DEEP` explícito)

---

## 2. Cómo iniciar todo el sistema

### Paso 1: Verificar / Iniciar Ollama
Ollama se inicia automáticamente en Windows (`ollama.exe` en segundo plano escuchando en `http://localhost:11434`). Si no estuviera activo, ejecútalo desde el menú Inicio o con:
```powershell
Start-Process "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
```

### Paso 2: Iniciar el Backend (Spring Boot - Puerto `8080`)
```powershell
cd backend
.\mvnw.cmd clean package -DskipTests   # Solo si hubo cambios en Java
java -jar target/scrum-backend-1.0.0.jar
```
> Si necesitas forzar las variables en una sesión puntual sin reiniciar Windows:
> ```powershell
> $env:AI_PROVIDER="ollama"; $env:OLLAMA_ENABLED="true"; $env:OLLAMA_MODEL_FAST="qwen2.5:3b"; $env:OLLAMA_MODEL_DEEP="qwen3:4b"
> java -jar target/scrum-backend-1.0.0.jar
> ```

### Paso 3: Iniciar el Frontend / Puente Express (Puerto `3000`)
En otra terminal desde la raíz del proyecto:
```powershell
npm.cmd run build       # Solo si hubo cambios en React/TS
npm.cmd run start:prod
```
Abrir en el navegador (Brave): `http://localhost:3000`.

---

## 3. Cómo apagar el sistema de forma segura

1. **Detener Frontend (puerto `3000`) y Backend (puerto `8080`):**
   - Presiona `Ctrl + C` en cada terminal, o desde PowerShell:
   ```powershell
   foreach ($port in @(3000, 8080)) {
     $pidVal = (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue).OwningProcess
     if ($pidVal) { Stop-Process -Id $pidVal -Force }
   }
   ```
2. **Descargar modelos de RAM en Ollama (opcional):**
   ```powershell
   Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method POST -ContentType "application/json" -Body '{"model":"qwen2.5:3b","keep_alive":0}'
   Invoke-RestMethod -Uri "http://localhost:11434/api/generate" -Method POST -ContentType "application/json" -Body '{"model":"qwen3:4b","keep_alive":0}'
   ```

---

## 4. Cómo ejecutar pruebas con base de datos aislada
Para evitar crear registros de prueba en `scrum_manager_db`, las pruebas de integración deben ejecutarse contra `scrum_manager_test_db` pasando `--spring.datasource.url=jdbc:postgresql://localhost:5432/scrum_manager_test_db` al iniciar el backend de pruebas.
