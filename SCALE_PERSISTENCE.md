# Persistencia de Báscula - Documentación

## Cambios Implementados

Se ha actualizado el hook `use-scale.ts` para recordar la báscula seleccionada entre sesiones y cambios de pestaña.

### Características Nuevas

1. **Guardado Automático de Puerto**
   - Cuando conectas la báscula, el sistema guarda información del puerto en `localStorage`
   - Esta información se mantiene incluso si cierras el navegador

2. **Reconexión Automática**
   - Al cargar la página (o volver del background), el sistema intenta reconectar automáticamente a la última báscula usada
   - Si la báscula sigue conectada al USB, se restablecerá la conexión sin mostrar diálogos

3. **Persistencia en Cambios de Pestaña**
   - Si cambias de pestaña y vuelves, la conexión se mantiene activa
   - Se reinicia automáticamente la lectura de datos si fue interrumpida

### Funciones Agregadas

```typescript
// Guardar información del puerto en localStorage
savePortInfo(portInfo: string)

// Recuperar información guardada
getSavedPortInfo(): string | null
```

### Cambios en useEffect

Se agregaron dos `useEffect` nuevos:

1. **Auto-reconexión al cambiar de pestaña** - Detecta cuando vuelves a la pestaña y reinicia la lectura si es necesario

2. **Auto-conexión al montar el componente** - Usa `navigator.serial.getPorts()` para obtener puertos previamente autorizados e intenta conectarse automáticamente

### Ventajas

✅ No necesitas seleccionar la báscula cada vez  
✅ Mantiene la conexión aunque cambies de pestaña  
✅ Se reconecta automáticamente si fue desconectada  
✅ Usa la API estándar de WebSerial (Chrome/Edge)

### Compatibilidad

- **Chrome 90+**
- **Edge 90+**
- **Tablets y dispositivos Android** con soporte WebSerial

### Notas Técnicas

- La información del puerto se guarda en `localStorage` bajo la clave `scalePortInfo`
- No se guarda información sensible, solo datos técnicos del puerto USB
- Si el puerto se desconecta físicamente, el siguiente intento de conexión solicitará autorización
