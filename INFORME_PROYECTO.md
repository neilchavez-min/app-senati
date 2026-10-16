# Informe del proyecto: SENATI TaskHub PWA

**Fecha:** 16 de octubre de 2026  
**Tipo de proyecto:** aplicación web progresiva académica  
**Estado:** funcionalidades locales implementadas; autenticación y sincronización con servidor pendientes de integración.

## 1. Resumen ejecutivo

SENATI TaskHub PWA es una aplicación académica desarrollada con Angular para consultar tareas y guardar comentarios de entrega en el dispositivo. Su catálogo proviene de un archivo JSON y las entregas se persisten mediante IndexedDB, por lo que pueden consultarse después de recargar la aplicación.

La interfaz incluye acceso de demostración, registro local, panel académico, catálogo con filtros, bandeja de entregas y perfil. Es adaptable a escritorio y móvil. La aplicación comunica explícitamente que no hay conexión con una API de entregas: estar en línea no significa que una entrega se haya enviado ni permite marcarla como sincronizada.

## 2. Objetivos

- Presentar tareas académicas con curso, título, instructor, fecha límite y estado.
- Permitir encontrar tareas por título y filtrar por curso, individualmente o en combinación.
- Registrar comentarios asociados a una tarea con validación de campos obligatorios.
- Guardar las entregas localmente en IndexedDB, incluso cuando el dispositivo no tiene conexión.
- Recuperar, consultar y eliminar entregas con confirmación.
- Mostrar de manera honesta la conectividad y el estado de sincronización.
- Ofrecer una interfaz clara y utilizable tanto en computadoras como en teléfonos.

## 3. Funcionalidades implementadas

### Acceso y navegación

- Pantallas de inicio de sesión y registro con validación básica de correo, nombre y longitud mínima de contraseña.
- Panel principal con contadores de tareas pendientes, en curso, completadas y entregas locales.
- Navegación entre Inicio, Tareas, Entregas y Perfil.
- Cierre de sesión local.
- Menú superior para escritorio y barra inferior para pantallas móviles.

**Alcance del acceso:** el login y el registro son demostrativos. No consultan usuarios ni contraseñas en un servidor. La sesión guarda únicamente el nombre visible en `localStorage`; la contraseña no se almacena. Este flujo no debe considerarse autenticación ni control de acceso para datos reales.

### Tareas

- Carga de tres registros de ejemplo desde `public/assets/data/tareas.json`.
- Presentación del curso, título, instructor, fecha límite y estado académico.
- Búsqueda por título y filtro por curso combinables.
- Acceso desde la lista de tareas al formulario de entrega con la tarea seleccionada.

### Entregas locales

- Validación de tarea seleccionada y comentario no vacío, eliminando espacios sobrantes.
- Persistencia del comentario con la tarea relacionada, curso, fecha de registro, estado inicial `PENDIENTE` e intentos de sincronización.
- Bandeja de entregas guardadas, con detalle del comentario, fecha y estado.
- Contador de entregas pendientes.
- Eliminación con pasos explícitos para confirmar o cancelar.
- Manejo visible de errores de almacenamiento y recuperación de registros.
- Migración de la base local desde la versión anterior, conservando como pendientes los registros que no cuentan con confirmación del servidor.

### Conectividad y sincronización

- Indicador visual que refleja los eventos de conexión y desconexión del navegador.
- Posibilidad de seguir guardando entregas en IndexedDB sin conexión.
- Al recuperar conexión, las entregas permanecen pendientes.
- El botón «Reintentar» informa que la API no está integrada; no realiza una llamada remota ficticia.
- El estado `SINCRONIZADO` solo se podrá asignar después de integrar una API y recibir su confirmación.

## 4. Arquitectura y tecnologías

| Componente | Responsabilidad |
|---|---|
| Angular 21 | Interfaz, componente raíz, formularios y configuración de la aplicación. |
| TypeScript | Tipos estrictos para tareas, payloads y registros locales. |
| RxJS y `HttpClient` | Lectura del catálogo JSON y propagación de errores de carga. |
| IndexedDB | Persistencia local transaccional y migración de entregas. |
| Angular Service Worker | Soporte PWA en producción y caché de recursos configurados. |
| Vitest | Pruebas unitarias del componente principal y sus flujos. |

### Archivos principales

- [`src/app/app.ts`](./src/app/app.ts): estado del acceso demostrativo, navegación, filtros, carga de datos, validaciones y operaciones de entrega.
- [`src/app/app.html`](./src/app/app.html): plantillas de acceso, registro y vistas del panel.
- [`src/app/app.scss`](./src/app/app.scss): identidad visual, componentes, estados y adaptación por tamaños de pantalla.
- [`src/app/models/tarea.model.ts`](./src/app/models/tarea.model.ts): interfaces del catálogo y las entregas, y estados de sincronización permitidos.
- [`src/app/services/tarea.service.ts`](./src/app/services/tarea.service.ts): consulta el catálogo estático.
- [`src/app/services/storage.service.ts`](./src/app/services/storage.service.ts): operaciones de IndexedDB y migración de registros.
- [`src/app/app.config.ts`](./src/app/app.config.ts): proveedores Angular, localización española y service worker.
- [`public/assets/data/tareas.json`](./public/assets/data/tareas.json): datos de muestra del catálogo.
- [`ngsw-config.json`](./ngsw-config.json): configuración de recursos y caché del service worker.
- [`src/app/app.spec.ts`](./src/app/app.spec.ts): pruebas unitarias.

## 5. Modelo de datos

### Tarea del catálogo

Una tarea contiene identificador, curso, título, instructor, fecha de entrega y estado académico. La fecha se expresa como `AAAA-MM-DD`.

### Entrega local

Cada registro persistido contiene:

- `id`: clave local generada por IndexedDB.
- `tareaId`: identificador de la tarea asociada.
- `curso` y `tituloTarea`: referencia legible a la tarea.
- `comentario`: contenido escrito por el estudiante.
- `fechaRegistro`: fecha y hora de creación.
- `estadoSincronizacion`: `PENDIENTE`, `SINCRONIZADO` o `ERROR`.
- `intentosSincronizacion`: contador de intentos.
- `ultimoError`: detalle opcional del último error.

Actualmente las operaciones de la aplicación crean entregas como `PENDIENTE`. Los demás estados están tipados para una integración futura.

## 6. Verificación y pruebas

La validación más reciente registrada para el proyecto fue:

- **Compilación de producción:** correcta con `npm run build`.
- **Pruebas unitarias:** 11 pruebas aprobadas con `npm test -- --watch=false`.
- **Revisión en navegador:** acceso, panel y navegación comprobados en escritorio y móvil; sin desbordamiento horizontal en los tamaños revisados.

Las pruebas cubren validación del acceso demostrativo, registro y cierre local, filtros combinados, campos obligatorios, guardado pendiente, reconexión sin falsa sincronización, reintento informativo y borrado confirmado.

## 7. Alcance pendiente y limitaciones

1. **Autenticación real:** no existe backend de usuarios, verificación de credenciales, recuperación de contraseña ni autorización por cuenta.
2. **Envío y sincronización:** no existe API para enviar entregas. Las entregas guardadas no abandonan el dispositivo ni se sincronizan automáticamente.
3. **Catálogo:** los datos actuales son ejemplos estáticos; no hay administración remota de cursos o tareas.
4. **Adjuntos:** el formulario actual registra comentarios; no carga archivos, aunque la referencia visual del proyecto contempla adjuntos.
5. **Almacenamiento:** IndexedDB puede ser borrada por el usuario o limitada por el navegador. La persistencia local no equivale a respaldo en servidor.
6. **Rutas:** `app.routes.ts` no define rutas; la navegación se implementa dentro del componente principal.
7. **Identidad visual:** el acceso usa una ilustración de campus creada con CSS; no es una fotografía institucional.

## 8. Recomendaciones para una siguiente etapa

1. Definir e implementar una API autenticada para cuentas, catálogo y entregas.
2. Proteger las vistas y asociar cada entrega a la identidad verificada del estudiante.
3. Añadir una cola de sincronización con reintentos controlados, manejo de conflictos y transición de estado solo tras confirmación del servidor.
4. Añadir selección de archivos, límites de tamaño y validación de tipo si los adjuntos son requisito.
5. Incorporar pruebas de integración para IndexedDB, migraciones, funcionamiento offline y comunicación con la API.
6. Completar el catálogo con datos académicos reales y mantener una política de caché coherente con la frecuencia de actualización.

## 9. Ejecución local

Requiere Node.js y npm compatibles con las dependencias del proyecto.

```bash
npm install
npm start
```

Abrir `http://localhost:4200/`. Para compilar y probar:

```bash
npm run build
npm test -- --watch=false
```

## 10. Conclusión

El proyecto implementa una base funcional para una PWA de tareas académicas orientada al trabajo local: catálogo, filtros, formularios, bandeja persistente y estados de conectividad claros. Está listo para demostración y desarrollo frontend. Para operar con cuentas y entregas reales requiere un backend; hasta integrarlo, el login no autentica y las entregas permanecen únicamente en IndexedDB como pendientes.
