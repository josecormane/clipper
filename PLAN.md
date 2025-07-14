# Plan de Desarrollo: Machete

Este documento describe el plan de desarrollo para transformar la herramienta de análisis de video en "Machete", una aplicación de edición de video persistente y con todas las funciones.

## ✅ Fase I: Refundación y Re-diseño de la Marca (Completada)

-   [x] **Establecer la Identidad "Machete":**
    -   [x] Actualizar el nombre del proyecto en `package.json`.
    -   [x] Crear un nuevo componente de logo para "Machete".
-   [x] **Implementar la Nueva Paleta de Colores:**
    -   [x] Definir los colores base (blanco y negro) y de acento (gradiente azul) en `tailwind.config.ts`.
    -   [x] Aplicar la nueva paleta de colores en `src/app/globals.css`.

## ⬜️ Fase II: Arquitectura de Persistencia de Datos

-   [ ] **Configurar la Base de Datos:**
    -   [ ] Instalar y configurar el SDK de Firebase para el acceso a Firestore y Google Cloud Storage.
-   [ ] **Definir el Modelo de Datos:**
    -   [ ] Crear una colección `projects` en Firestore.
    -   [ ] Definir la estructura del documento del proyecto (nombre, videoUrl, escenas, etc.).
-   [ ] **Implementar Acciones del Servidor (CRUD):**
    -   [ ] Crear `createProject` para subir el video a GCS y guardar los metadatos en Firestore.
    -   [ ] Crear `getProject` para recuperar los datos de un proyecto.
    -   [ ] Crear `updateProject` para el guardado automático de cambios en las escenas.
    -   [ ] Crear `deleteProject`.

## ⬜️ Fase III: Reestructuración de la Interfaz y Flujo de Usuario

-   [ ] **Crear el Dashboard de Proyectos:**
    -   [ ] La página principal (`/`) mostrará una lista de proyectos existentes desde Firestore.
    -   [ ] Añadir un formulario o botón para crear un nuevo proyecto (subida de video).
-   [ ] **Crear la Vista del Editor de Proyectos:**
    -   [ ] Crear una nueva página dinámica (`/project/[id]`).
    -   [ ] Cargar los datos del proyecto (video y escenas) desde la acción `getProject`.
    -   [ ] Integrar los componentes de edición (reproductor, timeline, lista de escenas) en esta nueva vista.

## ⬜️ Fase IV: Implementación de Funcionalidades de Edición Avanzada

-   [ ] **Implementar Edición "Ripple" y Auto-guardado:**
    -   [ ] La modificación de los límites de una escena ajustará automáticamente la escena adyacente.
    -   [ ] Cada cambio invocará a `updateProject` para guardar el estado en Firestore.
-   [ ] **Funcionalidad del Timeline:**
    -   [ ] Implementar la lógica para dividir una escena en dos desde el timeline.
    -   [ ] Implementar la lógica para fusionar dos escenas adyacentes.
-   [ ] **Descargas Flexibles:**
    -   [ ] Añadir checkboxes a la lista de escenas.
    -   [ ] Implementar la lógica para descargar las escenas seleccionadas (una, varias o todas).
