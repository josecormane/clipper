# Instrucciones para el Desarrollo y Reconstrucción de la App

Este documento contiene las reglas arquitectónicas, metodologías y decisiones de tech stack de alto nivel que guían el desarrollo de esta aplicación. El propósito es que un agente de IA pueda usarlo como una hoja de ruta para entender el proyecto y, si fuera necesario, reconstruirlo desde cero.

## 1. Arquitectura General y Filosofía de Diseño

*   **Server-Side Heavy-Lifting:** Toda la lógica de negocio intensiva, especialmente la que involucra procesamiento de archivos (como el clipping de video con `ffmpeg`), debe residir exclusivamente en el backend (Server Actions de Next.js en este caso). El frontend solo es responsable de la UI y de recolectar la entrada del usuario.
*   **Abstracción Mínima para Dependencias Críticas:** Para herramientas de sistema críticas (ej. `ffmpeg`), se debe evitar el uso de "wrappers" o paquetes de npm que abstraen el acceso al binario. La dependencia debe ser aprovisionada directamente en el entorno de ejecución (a través de Nix, Docker, etc.) para garantizar la fiabilidad y evitar problemas con bundlers.
*   **Patrón "Divide y Vencerás" para Tareas de IA Largas:** Para cualquier tarea que pueda exceder los límites de tokens de un modelo de IA (como el análisis de videos largos), se debe implementar un patrón de "chunking". Un orquestador en el servidor debe dividir la tarea en trozos manejables (chunks), llamar a la IA para cada chunk de forma individual y, finalmente, agregar los resultados. Esto previene errores de agotamiento de tokens y hace la aplicación más escalable.
*   **Subida Directa a Almacenamiento en la Nube:** Para la subida de archivos grandes (como videos), se debe evitar el "doble salto" (cliente -> servidor -> nube). El flujo correcto es:
    1.  El cliente solicita una URL de subida firmada (signed URL) al servidor.
    2.  El servidor genera esta URL usando el SDK del proveedor de la nube.
    3.  El cliente usa la URL firmada para subir el archivo directamente al servicio de almacenamiento (ej. Google Cloud Storage).
    4.  El cliente notifica al servidor del éxito de la subida para que este pueda registrar el archivo en la base de datos.
*   **Comunicación Explícita Cliente-Servidor:** Los errores deben ser manejados explícitamente y propagados desde el servidor al cliente con mensajes claros. El cliente debe mostrar notificaciones (toasts) que informen al usuario del resultado de la operación.

## 2. Tech Stack y Razones

*   **Framework:** Next.js (con App Router).
    *   **Razón:** Permite un modelo híbrido donde la UI es renderizada en el servidor y/o cliente, mientras que las operaciones de backend (Server Actions) pueden ser llamadas directamente desde el frontend, simplificando la arquitectura (no se necesita una API REST separada).
*   **IA y Orquestación:** Genkit.
    *   **Razón:** Simplifica la creación y gestión de flujos de IA, permitiendo definir prompts, esquemas de salida estructurados y configuraciones de modelos de forma declarativa. Incluye funcionalidades clave como el cacheo para optimizar costes y latencia.
*   **Procesamiento de Video:** `fluent-ffmpeg` (Node.js library).
    *   **Razón:** Es una librería robusta y madura para interactuar con `ffmpeg`. Se integra bien en el entorno de Node.js de las Server Actions.
*   **Base de Datos y Almacenamiento:** Firestore y Google Cloud Storage.
    *   **Razón:** Se integran de forma nativa en el ecosistema de Google Cloud y Firebase, ofreciendo una solución escalable para la persistencia de datos y el almacenamiento de archivos grandes.
*   **Entorno de Desarrollo:** Nix (a través de `dev.nix` en Project IDX).
    *   **Razón:** Garantiza un entorno de desarrollo declarativo y reproducible. Permite instalar dependencias de sistema como `ffmpeg` de manera fiable, asegurando que todos los desarrolladores (humanos o IA) trabajen con las mismas versiones de herramientas.
*   **UI Components:** `shadcn/ui`.
    *   **Razón:** Ofrece un conjunto de componentes de UI accesibles y personalizables que aceleran el desarrollo del frontend.

## 3. Metodología de Desarrollo y Debugging

*   **Logging Sistemático:** Ante un bug, el primer paso es agregar logs para trazar el flujo de datos y la ejecución:
    1.  **Frontend (`console.log`):** Verificar que los datos que se envían desde el cliente son correctos justo antes de la llamada al servidor.
    2.  **Backend (Server Action):** Añadir `console.log` al inicio de la acción para confirmar que recibe los datos. Esto debe incluir el logging de los prompts enviados a la IA.
    3.  **Procesos Externos:** Capturar y registrar `stdout` y `stderr` de cualquier proceso externo que se invoque (como `ffmpeg`). Este fue el paso clave que reveló el error `ENOENT` en nuestra primera sesión.
*   **Commits Atómicos:** Cada commit debe representar una unidad de trabajo lógica y completa. El mensaje del commit debe ser descriptivo y seguir la convención de "Conventional Commits" (ej. `fix:`, `feat:`, `docs:`).

## 4. Reglas de Comportamiento para Desarrollo con IA

*   **Verificar, No Confiar Ciegamente:** Aunque el agente de IA puede generar código, es responsabilidad del desarrollador (o de otro agente) verificar la lógica y, sobre todo, probar la solución.
*   **Contexto Completo es Clave:** Al solicitar ayuda o delegar una tarea, se debe proporcionar todo el contexto relevante, incluyendo logs de error completos, archivos de código relevantes y el objetivo final.
*   **Documentar las Lecciones:** Cada sesión de debugging o desarrollo que revele un patrón o lección importante debe ser documentada en `sessions-X.md`. Esto construye la base de conocimiento del proyecto.
*   **Actualizar las Instrucciones:** Si una lección aprendida cambia una regla fundamental sobre cómo se construye la app, el archivo `instructions.md` debe ser actualizado. Este es un documento vivo.
