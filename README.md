# Agile Velocity — Gestor de Tareas con Metodología Scrum
## Proyecto Formativo SENA — Entrega de Backend API REST y Base de Datos Relacional

Bienvenido al repositorio oficial de **Agile Velocity**, una plataforma integral para la gestión de proyectos y tareas bajo la **Metodología Scrum**, diseñada y desarrollada conforme a las directrices de formación técnica del **SENA** y los requerimientos del **SRS Versión 2.0**.

---

## 1. Arquitectura del Sistema

El proyecto cuenta con una arquitectura desacoplada y robusta:

```
PROYECTO SCRUM/
├── backend/                  <-- BACKEND EMPRESARIAL OFICIAL (Java 17 + Spring Boot 3 + PostgreSQL)
│   ├── src/main/java/        <-- Controladores REST, Servicios, Repositorios JPA y Entidades
│   ├── src/main/resources/   <-- application.yml y Changelogs Liquibase (22 migraciones)
│   ├── Dockerfile            <-- Imagen optimizada en 2 etapas (Eclipse Temurin 17 Alpine)
│   ├── pom.xml               <-- Configuración Maven y dependencias empresariales
│   └── README.md             <-- Documentación interna del microservicio
├── docs/
│   └── Agile_Velocity_API.postman_collection.json  <-- Colección oficial de Postman (v2.1)
├── docker-compose.yml        <-- Orquestación de PostgreSQL 15 y Backend
├── src/ & server.ts          <-- Cliente Web Interactivo (React 19 + TypeScript + Vite)
└── README.md                 <-- Guía principal de evaluación y despliegue
```

> **NOTA PARA EL EVALUADOR / INSTRUCTOR:**  
> El componente oficial evaluable para el entregable de **Backend API REST y Base de Datos Relacional** se encuentra implementado en el directorio **`backend/`**, desarrollado con **Java 17 LTS**, **Spring Boot 3.2.5**, **PostgreSQL 15**, **Liquibase 4.27.0 (Tercera Forma Normal - 3FN)**, **Spring Security 6 + JWT** y **OpenAPI / Swagger UI**.

---

## 2. Stack Tecnológico del Backend

| Componente | Tecnología | Versión | Propósito |
| :--- | :--- | :--- | :--- |
| **Lenguaje** | Java (LTS) | 17 | Lenguaje backend principal |
| **Framework Base** | Spring Boot | 3.2.5 | Microservicio REST empresarial |
| **Seguridad** | Spring Security + JJWT | 6.x / 0.11.5 | Autenticación Bearer JWT y RBAC |
| **Persistencia** | Spring Data JPA + Hibernate | 3.2.5 / 6.4 | Mapeo objeto-relacional (ORM) |
| **Base de Datos** | PostgreSQL (Alpine) | 15 | Motor relacional SQL en 3FN |
| **Control de Versiones BD** | Liquibase Core | 4.27.0 | Migraciones y trazabilidad de esquema |
| **Documentación API** | SpringDoc OpenAPI | 2.5.0 | Swagger UI interactivo y especificación v3 |
| **Contenedores** | Docker & Docker Compose | 24+ | Despliegue de servicios y persistencia |

---

## 3. Requisitos Previos

Antes de ejecutar el backend, asegúrate de contar con:

1. **Docker Desktop** (o Docker Engine en Linux) en ejecución.
2. **Java Development Kit (JDK) 17** instalado y configurado en el `PATH` (`java -version`).
3. *(Opcional)* **Postman** versión 10+ para pruebas automatizadas de la colección de endpoints.

---

## 4. Guía de Puesta en Marcha Paso a Paso

### Paso 1: Iniciar el Contenedor de Base de Datos PostgreSQL
Desde la raíz del proyecto, ejecuta el servicio de base de datos con Docker Compose:

```bash
docker compose up -d scrum_task_db
```

Verifica que el contenedor esté arriba y saludable:
```bash
docker ps
```
Deberás observar el contenedor `scrum_task_db` con la imagen `postgres:15-alpine` escuchando en el puerto `5432`:
- **Host:** `localhost`
- **Puerto:** `5432`
- **Base de Datos:** `scrum_manager_db`
- **Usuario:** `postgres`
- **Contraseña:** `password123`

### Paso 2: Compilar y Ejecutar el Backend Spring Boot
Navega a la carpeta `backend/` y arranca la aplicación utilizando el Maven Wrapper incluido:

**En Windows (PowerShell o CMD):**
```powershell
cd backend
.\mvnw.cmd clean package -DskipTests
java -jar target/scrum-backend-1.0.0.jar
```
*(O directamente con el plugin de Spring Boot: `.\mvnw.cmd spring-boot:run`)*

**En Linux / macOS:**
```bash
cd backend
./mvnw clean package -DskipTests
java -jar target/scrum-backend-1.0.0.jar
```

El servidor iniciará en el puerto **`8080`** y mostrará en consola:
`Started ScrumBackendApplication in X.X seconds ... ReadinessState changed to ACCEPTING_TRAFFIC`.

---

## 5. Credenciales de Prueba Disponibles (Contraseña: `Password123!`)

Todas las cuentas demo vienen precargadas en la base de datos con contraseñas encriptadas mediante **BCrypt** (costo 10):

| Correo Electrónico | Nombre del Usuario | Rol en Plataforma | Responsabilidades Metodológicas Scrum |
| :--- | :--- | :--- | :--- |
| **`admin@velocity.dev`** | Elena Vance | `ROLE_ADMINISTRADOR` | Gobernanza total, auditoría, gestión de usuarios y proyectos |
| **`po@velocity.dev`** | Mateo Ríos | `ROLE_PRODUCT_OWNER` | Product Backlog, Épicas, Historias y Asistente IA |
| **`sm@velocity.dev`** | Sofía Mendoza | `ROLE_SCRUM_MASTER` | Planificación, activación y cierre de Sprints, impedimentos |
| **`dev1@velocity.dev`** | Lucas Herrera | `ROLE_DEVELOPER` | Tablero Kanban, tareas técnicas y comentarios |
| **`dev2@velocity.dev`** | Valentina Cruz | `ROLE_DEVELOPER` | Desarrollo de tareas técnicas y resolución colaborativa |

---

## 6. Documentación Interactiva con Swagger UI

Una vez el servidor esté corriendo en el puerto 8080, abre en tu navegador:

👉 **[http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)**

### Cómo probar endpoints protegidos en Swagger:
1. Ve a la sección **`1. Autenticación y Autorización`** -> `POST /api/v1/auth/login`.
2. Haz clic en **Try it out** e ingresa las credenciales de prueba (ej. `admin@velocity.dev` y `Password123!`).
3. Ejecuta la petición y copia el valor del `token` generado en la respuesta.
4. Sube a la parte superior de la página y pulsa el botón verde **Authorize** (candado).
5. Pega el token y haz clic en **Authorize**. Todas las solicitudes posteriores enviarán automáticamente la cabecera `Authorization: Bearer <token>`.

Especificación OpenAPI v3 en JSON disponible en:
👉 **[http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)**

---

## 7. Pruebas Automatizadas con Postman

El repositorio incluye la colección completa en formato Postman Collection v2.1:
📁 **`docs/Agile_Velocity_API.postman_collection.json`**

### Instrucciones para importar y ejecutar:
1. Abre **Postman**.
2. Haz clic en **Import** (esquina superior izquierda).
3. Selecciona o arrastra el archivo `docs/Agile_Velocity_API.postman_collection.json`.
4. La colección cuenta con **12 carpetas y 46 peticiones** organizadas por módulo.
5. Ejecuta la primera petición **`1. Autenticación y Seguridad -> Login — Administrador`**.
   - El script de prueba automático capturará el token JWT y lo almacenará en la variable de colección `{{token}}`.
6. Ahora puedes ejecutar cualquier otra petición de la colección de forma inmediata con autenticación automática.
7. Puedes ejecutar la colección completa con **Runner** (`Run collection`) para verificar el 100% de endpoints en lote.

---

## 8. Cumplimiento de Entregables SENA

| N.º | Entregable SENA | Estado | Detalle de Implementación |
| :---: | :--- | :---: | :--- |
| **1** | **Crear base de datos** | **100% CUMPLIDO** | Motor PostgreSQL 15 en contenedor Docker (`scrum_task_db`). Esquema normalizado en Tercera Forma Normal (3FN) con 14 tablas, claves primarias, foráneas, restricciones de unicidad y volumen de persistencia continua (`postgres_data`). |
| **2** | **Implementar API REST** | **100% CUMPLIDO** | Microservicio Spring Boot 3 con 11 controladores REST, códigos de respuesta HTTP canónicos (200, 201, 204, 400, 401, 403, 404, 409), manejo global de excepciones (`GlobalExceptionHandler`) y validación de DTOs (`@Valid`). |
| **3** | **Autenticación y autorización** | **100% CUMPLIDO** | Spring Security 6 stateless con JWT (JJWT 0.11.5). Encriptación BCrypt para contraseñas. Control de acceso granular basado en roles (`@PreAuthorize`) para Administrador, Product Owner, Scrum Master y Developer. Respuestas 401 (sin token) y 403 (rol no autorizado). |
| **4** | **Operaciones CRUD** | **100% CUMPLIDO** | Ciclo completo de Creación, Lectura, Actualización y Eliminación verificado en tiempo de ejecución para Proyectos, Sprints, Historias de Usuario, Tareas, Épicas, Impedimentos, Comentarios y Membresías. |
| **5** | **Documentar endpoints** | **100% CUMPLIDO** | Swagger UI interactivo (`/swagger-ui/index.html`), especificación OpenAPI 3 (`/v3/api-docs`), colección exportada de Postman (`docs/Agile_Velocity_API.postman_collection.json`) y manual de usuario en este `README.md`. |
