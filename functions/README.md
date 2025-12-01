# Cloud Function: createUserOnAuth

Esta función se ejecuta cuando se crea un usuario en Firebase Authentication y asegura que exista un documento en `users/{uid}` en Firestore. Si el documento ya existe se actualizan los campos relevantes; si no existe se crea con `status: 'pendiente'` y `role: null`. Además escribe un registro en `audit_logs`.

Archivos creados en `functions/`:

- `package.json` — dependencias y scripts (build, deploy)
- `tsconfig.json` — configuración de TypeScript
- `src/index.ts` — fuente de la función

Cómo compilar y desplegar (PowerShell):

1. Moverse al directorio de funciones:

```powershell
Set-Location -Path .\functions
```

2. Instalar dependencias:

```powershell
npm install
```

3. Compilar TypeScript:

```powershell
npm run build
```

4. Iniciar sesión en Firebase (si no estás autenticado):

```powershell
firebase login
```

5. Seleccionar proyecto Firebase (si es necesario):

```powershell
firebase use <PROJECT_ID>
```

6. Desplegar la(s) función(es):

```powershell
firebase deploy --only functions:createUserOnAuth
```

Notas:

- La cuenta que uses para desplegar debe tener permisos suficientes sobre el proyecto.
- La función está configurada para `region('us-central1')`. Cambia la región en `src/index.ts` si lo prefieres.
- Si prefieres, puedes desplegar todas las funciones con `firebase deploy --only functions`.
- Si quieres que yo lance el deploy desde aquí necesitaré que me pases exactamente los comandos y confirmar que me das permiso para ejecutar `firebase` en tu entorno; actualmente solo puedo crear los archivos y darte los pasos para que los ejecutes en tu máquina.
