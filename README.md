# SENATI TaskHub PWA

PWA académica para consultar tareas y guardar comentarios de entrega en el dispositivo. El catálogo se carga desde `public/assets/data/tareas.json`; las entregas se guardan en IndexedDB y permanecen disponibles después de recargar la aplicación.

## Funcionalidades

- Pantalla de acceso y registro demostrativos, con diseño adaptable a móvil y escritorio.
- El acceso de demostración acepta cualquier correo válido y contraseña de al menos 6 caracteres; no autentica cuentas ni guarda contraseñas. La autenticación real requiere un servicio backend.
- Panel de inicio con resumen de tareas, navegación a tareas/entregas/perfil y cierre de sesión local.
- Lista tareas con curso, título, instructor, fecha límite y estado académico.
- Búsqueda por título y filtro por curso, combinables.
- Valida que se seleccione una tarea y que el comentario no esté vacío.
- Guarda cada entrega con su tarea relacionada, curso, título, comentario, fecha, estado `PENDIENTE` e intentos de sincronización.
- Muestra la bandeja local, detalle del comentario, contador de pendientes y confirmación antes de eliminar.
- Ofrece un reintento explícito al volver a estar en línea e informa que no puede enviar mientras no exista una API.
- Informa el estado de conexión y reporta errores de IndexedDB sin descartar el formulario.
- Migra los registros de la versión anterior de la base local y no considera sincronizados registros sin confirmación del servidor.

## Sincronización y limitaciones

El proyecto no tiene una API de entregas configurada. Por ese motivo, tanto con conexión como sin ella, guardar una entrega solo la persiste localmente como `PENDIENTE`. La conexión por sí sola no cambia el estado a `SINCRONIZADO`; la bandeja y el contador tampoco simulan una sincronización. Para habilitar el envío real se debe integrar una API y actualizar el estado únicamente después de recibir su confirmación.

El catálogo JSON se puede servir desde la caché de la PWA. El almacenamiento IndexedDB depende de que el navegador lo permita y no se haya borrado su almacenamiento del sitio.

## Desarrollo

```bash
npm install
npm start
```

La aplicación queda disponible en `http://localhost:4200/`.

## Pruebas y compilación

```bash
npm test -- --watch=false
npm run build
```

## Mapa del código y responsabilidades

### Aplicación (`src/`)

- `main.ts`: punto de entrada; inicia Angular con `App` y `appConfig`, y registra errores de arranque.
- `index.html`: documento anfitrión, idioma español, metadatos móviles, favicon, manifiesto y elemento raíz Angular.
- `styles.scss`: normalización global, tipografía base, ancho mínimo y colores de selección; importa la hoja de estilos de la aplicación.
- `app/app.ts`: estado de acceso demostrativo, navegación entre secciones, filtros, carga del catálogo, validación y operaciones de la bandeja. Mantiene la autenticación separada de la API, ya que no existe servidor.
- `app/app.html`: plantillas de acceso/registro y de las vistas Inicio, Tareas, Entregas y Perfil; muestra avisos de estado accesibles.
- `app/app.scss`: tokens visuales, estilos del acceso, tablero, formularios, indicadores de estado y puntos de adaptación a escritorio, tableta y móvil.
- `app/app.config.ts`: proveedores de rutas y HTTP, localización española y registro del service worker solo fuera del modo de desarrollo.
- `app/app.routes.ts`: configuración de rutas de Angular. Actualmente está vacía porque las secciones se conmutan dentro del componente raíz.
- `app/models/tarea.model.ts`: tipos de catálogo, payload de entrega, registro persistente y estados de sincronización permitidos.
- `app/services/tarea.service.ts`: obtiene el catálogo JSON y deja que Angular/RxJS propague los errores de red.
- `app/services/storage.service.ts`: apertura/versionado de IndexedDB, migración de registros antiguos y operaciones transaccionales para crear, consultar, contar, actualizar y eliminar entregas.
- `app/app.spec.ts`: pruebas unitarias de sesión demostrativa, filtros, validación, persistencia pendiente, conexión y eliminación confirmada.

### Archivos de datos y configuración

Estos archivos son JSON o manifiestos declarativos, por lo que no se les agregan comentarios dentro del propio archivo: JSON no admite comentarios estándar. Su intención se documenta aquí.

- `public/assets/data/tareas.json`: catálogo de tareas. Cada objeto contiene `id`, `curso`, `titulo`, `instructor`, `fechaEntrega` en formato `AAAA-MM-DD` y estado académico.
- `public/manifest.webmanifest`: nombre de instalación, colores de la PWA, modo de visualización y rutas a iconos.
- `ngsw-config.json`: recursos que precarga Angular Service Worker y política de caché temporal del catálogo.
- `angular.json`: entrada de la aplicación, recursos públicos, hoja global, comandos de build/serve/test, límites de tamaño y service worker de producción.
- `tsconfig.json`: opciones TypeScript estrictas y compilación Angular con plantillas tipadas.
- `tsconfig.app.json` y `tsconfig.spec.json`: separación de compilación de la aplicación y de las pruebas Vitest.
- `package.json`: scripts del proyecto y dependencias Angular, RxJS, TypeScript y Vitest.
- `package-lock.json`: versiones resueltas por npm para instalaciones reproducibles; es un archivo generado y no se edita manualmente.

## Evidencias sugeridas

1. Catálogo de tareas y búsqueda/filtro combinados.
2. Mensajes de validación al intentar enviar el formulario vacío.
3. Bandeja local con varias entregas y estado pendiente.
4. IndexedDB con tarea, comentario, fecha de registro y estado.
5. Cambio entre conexión y modo offline mostrando que no se simula sincronización.
