# Prototipo de Plataforma ANGY

Este es un prototipo de una plataforma de lavandería para "Lavandería Angy", generado con Firebase Studio.

## Pasos Realizados

1.  **Definición de la Estructura de Datos:** Se crearon interfaces TypeScript en `src/lib/types.ts` para modelar las entidades del negocio (Usuarios, Pedidos, Servicios, etc.).

2.  **Configuración de Firebase:** Se inicializó un proyecto de Firebase y se configuró la aplicación para conectarse a Cloud Firestore. La configuración se encuentra en `src/firebase/config.ts`.

3.  **Reglas de Seguridad:** Se implementaron reglas de seguridad en `firestore.rules` para proteger el acceso a los datos, asegurando que los usuarios solo puedan acceder a la información que les corresponde según su rol.

4.  **Población de la Base de Datos (Seeding):** La base de datos de Cloud Firestore se ha poblado con datos de ejemplo (`dummy data`) desde el archivo `docs/seed.json`. Esto permite probar la aplicación con datos realistas desde el principio.

## Estructura de la Base de Datos

La base de datos NoSQL (Cloud Firestore) almacena los datos en colecciones de documentos. La estructura principal es la siguiente:

- **`/users/{userId}`**: Almacena los perfiles de todos los usuarios (administradores, personal y clientes).
- **`/orders/{orderId}`**: Contiene los detalles de cada pedido realizado.
  - **`/orders/{orderId}/orderItems/{itemId}`**: Sub-colección con los artículos específicos de cada pedido.
- **`/services/{serviceId}`**: El catálogo de todos los servicios que ofrece la lavandería.
- **`/inventory/{itemId}`**: Información sobre el stock de insumos.
- **`/purchaseRequests/{requestId}`**: Solicitudes de compra de insumos realizadas por el personal.

Puedes encontrar un diagrama y los detalles de cada campo en `docs/backend.json`.

## Cómo Probar la Aplicación

La aplicación tiene un flujo de inicio de sesión de demostración.

1.  Abre la página de inicio.
2.  Haz clic en el botón **"Iniciar Sesión"**. No es necesario introducir credenciales.
3.  Serás redirigido al **Dashboard del Cliente**, que ahora está conectado a la base de datos de Firestore.

Desde ahí, podrás ver cómo los componentes interactúan (o podrían interactuar) con los datos que acabamos de cargar.