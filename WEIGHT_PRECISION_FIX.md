# Corrección de Precisión de Peso - Documentación

## Problema Identificado

El peso de la báscula se estaba redondeando automáticamente a 2 decimales (.toFixed(2)), perdiendo precisión exacta.

## Solución Implementada

Se actualizó el componente `scale-input.tsx` para mantener la precisión exacta del peso:

### Cambios Realizados

#### 1. **Lectura de peso desde la báscula** (línea ~168)
**Antes:**
```typescript
onChange(weight.toFixed(2));
```

**Después:**
```typescript
// Mantener decimales exactos sin redondear (máximo 3 decimales)
const decimalPlaces = (weight.toString().split('.')[1] || '').length;
const maxDecimals = Math.min(decimalPlaces, 3);
onChange(weight.toFixed(maxDecimals));
```

✅ Preserva los decimales exactos recibidos de la báscula (hasta 3)

#### 2. **Botones +/- de cantidad** (línea ~304)
**Antes:**
```typescript
onChange(val.toFixed(2));
```

**Después:**
```typescript
// Mantener precisión sin redondear innecesariamente
const decimalPlaces = (value.split('.')[1] || '').length;
const maxDecimals = Math.max(decimalPlaces, 1);
onChange(val.toFixed(maxDecimals));
```

✅ Mantiene la precisión del valor actual al sumar/restar

#### 3. **Botones de valores rápidos** (línea ~344)
**Antes:**
```typescript
onClick={() => onChange(v.toFixed(2))}
```

**Después:**
```typescript
onClick={() => onChange(v.toString())}
```

✅ Usa números enteros sin redondeo innecesario

### Comportamiento Resultante

| Escenario | Antes | Después |
|-----------|-------|---------|
| Báscula envía 1.234 kg | 1.23 kg ❌ | 1.234 kg ✅ |
| Báscula envía 2.5 kg | 2.50 kg | 2.5 kg ✅ |
| +0.5 a valor 1.234 | 1.73 kg ❌ | 1.734 kg ✅ |
| Clic en botón "5 kg" | 5.00 kg | 5 kg ✅ |

### Impacto en Operaciones

- **Carrito**: Los subtotales se calculan con precisión exacta
- **Recibos**: Se muestran redondeados a 2 decimales para legibilidad (`.toFixed(2)`)
- **Almacenamiento**: Firestore guarda los valores exactos con precisión completa
- **Cálculos internos**: Se usan números sin redondeo para máxima exactitud

### Archivos Modificados

- [src/components/scale-input.tsx](src/components/scale-input.tsx)

### Notas Técnicas

- El límite de 3 decimales es estándar para básculas de laboratorio/comerciales
- La visualización en UI sigue redondeando a 2 decimales para claridad
- Los valores se almacenan exactos en la base de datos
- Cambios numéricos menores (±0.5) mantienen ahora la precisión original
