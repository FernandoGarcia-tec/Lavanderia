# Prototipo de Plataforma ANGY

Este es un prototipo de una plataforma de lavandería para "Lavandería Angy", generado con Firebase Studio y Next.js.

---

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [Instalación y Configuración](#instalación-y-configuración)
- [Estructura de Carpetas](#estructura-de-carpetas)
- [Scripts Útiles](#scripts-útiles)
- [Flujo de Usuario](#flujo-de-usuario)
- [Seguridad](#seguridad)
- [Población de la Base de Datos](#población-de-la-base-de-datos)
- [Desarrollo y Contribución](#desarrollo-y-contribución)
- [Recursos y Documentación](#recursos-y-documentación)
- [Ejemplo de Uso](#ejemplo-de-uso)
- [Capturas de Pantalla](#capturas-de-pantalla)
- [Contacto y Créditos](#contacto-y-créditos)

---

## Descripción General

La plataforma permite gestionar usuarios, pedidos, servicios, inventario y solicitudes de compra para una lavandería. Incluye interfaces para clientes, personal y administradores, con autenticación y reglas de acceso basadas en roles.

## Tecnologías Utilizadas

- **Next.js** (React)
- **TypeScript**
- **Tailwind CSS**
- **Firebase (Auth, Firestore, Functions)**
- **Lucide React Icons**

## Instalación y Configuración

1. **Clona el repositorio:**
   ```bash
   git clone <URL-del-repositorio>
   cd Lavanderia
   ```
2. **Instala las dependencias:**
   ```bash
   npm install
   ```
3. **Configura Firebase:**
   - Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
   - Descarga el archivo de credenciales y colócalo como `serviceAccountKey.json` en la raíz.
   - Actualiza `src/firebase/config.ts` con tu configuración.
4. **Configura variables de entorno:**
   - Crea un archivo `.env.local` y agrega tus claves de Firebase y otras variables necesarias.

## Estructura de Carpetas

```
Lavanderia/
├── src/
│   ├── app/           # Páginas y layouts principales
│   ├── components/    # Componentes reutilizables de UI
│   ├── firebase/      # Configuración y proveedores de Firebase
│   ├── lib/           # Tipos, utilidades y datos de ejemplo
│   └── hooks/         # Hooks personalizados
├── functions/         # Cloud Functions y scripts de migración
├── docs/              # Documentación y diagramas de backend
├── public/            # Archivos públicos y assets
├── scripts/           # Scripts de utilidad y seeding
├── package.json       # Configuración de dependencias
└── README.md          # Documentación principal
```

## Scripts Útiles

- `npm run dev` — Inicia el servidor de desarrollo.
- `npm run build` — Compila la aplicación para producción.
- `npm run lint` — Ejecuta el linter.
- `npm run seed` — (Si está disponible) Pobla la base de datos con datos de ejemplo.
- `npm run start` — Inicia la app en modo producción.

## Flujo de Usuario

1. El usuario accede a la página principal.
2. Puede iniciar sesión (flujo de demo, sin credenciales reales).
3. Accede al dashboard según su rol (cliente, personal, admin).
4. Interactúa con pedidos, servicios, inventario y notificaciones.

## Seguridad

- Las reglas de Firestore en `firestore.rules` aseguran que cada usuario solo acceda a sus propios datos.
- Los roles se gestionan en la colección `/users` y se aplican en la lógica de frontend y backend.

## Población de la Base de Datos

- Usa el archivo `docs/seed.json` para cargar datos de ejemplo.
- Puedes ejecutar scripts en `scripts/` para crear usuarios y poblar la base.

## Desarrollo y Contribución

- Sigue la estructura de componentes y hooks para agregar nuevas funcionalidades.
- Usa TypeScript para mantener la tipificación.
- Los estilos se gestionan con Tailwind CSS y clases personalizadas.
- Para contribuir, haz un fork, crea una rama y abre un pull request.

## Recursos y Documentación

- Diagrama de entidades: `docs/backend.json`
- Detalles de campos y relaciones: `docs/blueprint.md`
- Ejemplo de datos: `docs/seed.json`

## Ejemplo de Uso

```js
// Ejemplo: Consulta de pedidos de un usuario
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

const db = getFirestore();
const q = query(collection(db, "orders"), where("userId", "==", "USER_ID"));
const querySnapshot = await getDocs(q);
querySnapshot.forEach((doc) => {
  console.log(doc.id, " => ", doc.data());
});
```

## Capturas de Pantalla

> Puedes agregar aquí imágenes del dashboard, login y vistas principales para mostrar la interfaz.

Ejemplo:

![Dashboard Cliente](docs/dashboard-cliente.png)
![Vista de Pedidos](docs/vista-pedidos.png)

## Contacto y Créditos

Desarrollado por José Fernando Garcia Quintero.


---
