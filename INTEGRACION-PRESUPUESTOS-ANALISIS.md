# 🚀 INSTRUCCIONES DE INTEGRACIÓN - Presupuestos + Análisis

## 📋 ARCHIVOS NECESARIOS

Has descargado 2 archivos:
1. **budgets-analysis.js** - Todas las funciones de presupuestos y análisis
2. **Este archivo** - Instrucciones de integración

---

## ✅ PASO 1: Ejecutar SQL en Supabase (YA HECHO)

Si aún no lo has hecho:
1. Ve a Supabase → SQL Editor
2. Copia el SQL del principio (tabla budgets)
3. Ejecuta

---

## ✅ PASO 2: Integrar JavaScript

### Opción A: Código en línea (Recomendado)

Abre tu `index.html` y:

**1. Busca el FINAL del `<script>` (justo antes de `</script>`)**

**2. Pega TODO el contenido de `budgets-analysis.js`**

### Opción B: Archivo externo

**1. Sube `budgets-analysis.js` a tu repositorio GitHub**

**2. En index.html, ANTES de `</body>`, añade:**
```html
<script src="budgets-analysis.js"></script>
```

---

## ✅ PASO 3: Actualizar initNavigation

**BUSCA la función `initNavigation()` (aprox línea 1380)**

**REEMPLAZA** el código dentro del event listener por:

```javascript
function initNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = item.getAttribute('data-view');
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Hide all views
            document.querySelectorAll('.view').forEach(v => v.style.display = 'none');
            
            // Show selected view
            const viewElement = document.getElementById(`view-${view}`);
            if (viewElement) {
                viewElement.style.display = 'block';
                currentView = view;
                
                // Initialize view-specific content
                if (view === 'dashboard') {
                    applyDashboardFilters();
                } else if (view === 'movements') {
                    renderMovementsTable();
                } else if (view === 'categories') {
                    renderCategoriesList();
                } else if (view === 'budgets') {
                    initBudgetsView();  // ← NUEVO
                } else if (view === 'analysis') {
                    initAnalysisView();  // ← NUEVO
                } else if (view === 'settings') {
                    updateSettingsInfo();
                }
            }
        });
    });
}
```

---

## ✅ PASO 4: Actualizar loadState para cargar budgets

**BUSCA la función `async function loadState()` (aprox línea 1297)**

**Dentro del bloque `if (USE_SUPABASE)`, AÑADE después de cargar rules:**

```javascript
// Cargar budgets
const { data: budgets, error: budErr } = await supabase.from('budgets').select('*');
if (budErr) throw budErr;
```

**Y en el return, añade:**

```javascript
return {
    ...localState,
    budgets: (budgets || []).map(b => ({
        id: b.id,
        categoryId: b.category_id,
        month: b.month,
        year: b.year,
        amount: parseFloat(b.amount),
        alertThreshold: b.alert_threshold || 80
    }))
};
```

---

## ✅ PASO 5: Verificar que funciona

1. **Sube todos los cambios a GitHub**
2. **Espera 1-2 minutos**
3. **Recarga la app** (Ctrl+Shift+R)
4. **Verás 2 nuevas secciones en el menú:**
   - 💰 Presupuestos
   - 📈 Análisis

---

## 🎯 CÓMO USAR - PRESUPUESTOS

### Crear un presupuesto:

1. Ve a **"💰 Presupuestos"**
2. Selecciona **Mes y Año**
3. Click **"+ Añadir Presupuesto"**
4. Introduce:
   - ID de categoría (ej: `cat-alimentacion`)
   - Presupuesto mensual (ej: `600`)
   - Umbral de alerta % (ej: `80`)
5. **Guardar**

### Ver progreso:

- **Tarjetas de colores** muestran el progreso
- **Verde** 🟢: Dentro del presupuesto (< 80%)
- **Amarillo** 🟡: Cerca del límite (80-100%)
- **Rojo** 🔴: ¡Te has pasado! (> 100%)

---

## 🎯 CÓMO USAR - ANÁLISIS

### 4 Pestañas:

**1. 📊 Tendencias**
- Gráfico de evolución últimos 12 meses
- Tabla detallada mes a mes
- Ver patrones de gasto

**2. 🔮 Predicciones**
- Estimación próximo mes
- Basado en promedio últimos 3 meses
- Ingresos, gastos y ahorro estimados

**3. 📉 Comparativas**
- Este mes vs mes anterior
- % de cambio
- Identificar variaciones

**4. 💡 Insights**
- Gasto medio diario
- Categoría con más gasto
- Tasa de ahorro
- Recomendaciones automáticas

---

## 🔧 PERSONALIZACIÓN

### Cambiar el método de predicción:

En `budgets-analysis.js`, línea ~350, puedes cambiar de 3 a 6 meses:

```javascript
const last3Months = last12Months.slice(-3);  // ← Cambiar -3 por -6
```

### Añadir más insights:

En la función `generateInsights()`, añade:

```javascript
insights.push({
    icon: '🎯',
    title: 'Tu título',
    description: 'Tu descripción',
    color: '#3498DB'
});
```

---

## 📊 EJEMPLO DE USO REAL

### Escenario: Control de Alimentación

**Paso 1: Crear presupuesto**
```
Categoría: Alimentación
Presupuesto: 600€/mes
Umbral: 80%
```

**Paso 2: Añadir movimientos**
```
Día 5: Mercadona 45€
Día 10: Restaurante 35€
Día 15: Supermercado 50€
...
```

**Paso 3: Ver progreso**
- Tarjeta verde: **130€ / 600€** (22%)
- Restante: **470€**
- Estado: 🟢 Dentro del presupuesto

**Paso 4: Alerta automática**
- Al llegar a **480€** (80%):
- Tarjeta amarilla: 🟡 Cerca del límite

**Paso 5: Si te pasas**
- Al llegar a **650€** (108%):
- Tarjeta roja: 🔴 ¡Te has pasado!
- Te pasaste: **50€**

---

## 🆘 SOLUCIÓN DE PROBLEMAS

### "No veo las nuevas secciones en el menú"
✅ Verifica que añadiste los nav-items en el HTML
✅ Recarga con Ctrl+Shift+R

### "Error al cargar presupuestos"
✅ Verifica que ejecutaste el SQL en Supabase
✅ Chequea que la tabla 'budgets' existe

### "El análisis no muestra datos"
✅ Necesitas al menos 3 meses de movimientos
✅ Verifica que tienes movimientos registrados

### "Las predicciones son 0€"
✅ Normal si no tienes historial suficiente
✅ Añade más movimientos de meses anteriores

---

## 📈 PRÓXIMAS MEJORAS (Opcionales)

Puedo añadir:

1. **Modal profesional** para crear presupuestos (en vez de prompt)
2. **Notificaciones** cuando te acerques al límite
3. **Exportar reportes** de análisis a PDF
4. **Gráficos más avanzados** con predicciones visuales
5. **Comparar con presupuestos** del año pasado
6. **Metas de ahorro** a largo plazo

---

## ✅ CHECKLIST FINAL

```
□ SQL ejecutado en Supabase (tabla budgets creada)
□ budgets-analysis.js integrado en index.html
□ initNavigation actualizado
□ loadState actualizado para cargar budgets
□ Archivos subidos a GitHub
□ App recargada (Ctrl+Shift+R)
□ Menú muestra "Presupuestos" y "Análisis"
□ Probado crear un presupuesto
□ Probado análisis con datos existentes
```

---

## 🎉 ¡TODO LISTO!

Ahora tienes una app de finanzas con:
- ✅ Dashboard interactivo
- ✅ Gestión de movimientos
- ✅ Sincronización tiempo real
- ✅ Presupuestos con alertas
- ✅ Análisis avanzado con predicciones
- ✅ Insights automáticos

**¡Disfruta tu app profesional de finanzas!** 💰📊📈
