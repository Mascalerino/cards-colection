# Cards Collection - Aplicación Angular 19

Aplicación independiente para gestionar colecciones de cartas (Magic: The Gathering, Pokémon y Naruto).

## 🚀 Características

- **Magic: The Gathering**: Gestión completa de colecciones de cartas Magic con integración a Scryfall API
- **Pokémon**: Sistema de gestión de colecciones Pokémon
- **Naruto**: Gestión de colecciones de cartas Naruto con exportación a PDF
- **Almacenamiento local**: Todas las colecciones se guardan en localStorage del navegador
- **Importar/Exportar**: Funcionalidad para hacer backup y restaurar colecciones
- **Búsqueda avanzada**: Sistema de búsqueda de cartas con filtros
- **Estadísticas**: Visualización de progreso y estadísticas de colección
- **Gestión de ventas**: Sistema para registrar ventas de cartas

## 📋 Requisitos

- Node.js 18 o superior
- npm 9 o superior

## 🔧 Instalación

Las dependencias ya están instaladas. Si necesitas reinstalarlas:

```bash
npm install
```

## 🎮 Uso

### Iniciar servidor de desarrollo

```bash
npm start
```

La aplicación estará disponible en `http://localhost:4200/`

### Compilar para producción

```bash
npm run build
```

Los archivos compilados estarán en el directorio `dist/`

### Ejecutar tests

```bash
npm test
```

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── components/          # Componentes reutilizables
│   │   ├── add-card-dialog/
│   │   ├── card-checkbox-item/
│   │   ├── card-collection-counter/
│   │   ├── card-detail-panel/
│   │   ├── card-search/
│   │   ├── progress-stats/
│   │   ├── select-collections-dialog/
│   │   ├── sell-cards-dialog/
│   │   └── set-list/
│   ├── models/              # Modelos de datos
│   │   ├── card.model.ts
│   │   ├── card-entry.model.ts
│   │   ├── card-sale.model.ts
│   │   └── card-set.model.ts
│   ├── services/            # Servicios
│   │   └── card-collection.service.ts
│   ├── pages/               # Páginas principales
│   │   ├── card-collection.component.*
│   │   ├── magic-collections/
│   │   ├── pokemon-collections/
│   │   └── naruto-collections/
│   └── app.routes.ts        # Configuración de rutas
└── assets/
    └── card-collection/     # Archivos JSON de configuración
        ├── magic-sets.json
        ├── pokemon-sets.json
        └── naruto-sets.json
```

## 🎯 Rutas Disponibles

- `/` - Página principal con selector de tipo de colección
- `/magic` - Colecciones de Magic: The Gathering
- `/magic/:setId` - Detalle de una colección específica de Magic
- `/pokemon` - Colecciones de Pokémon
- `/naruto` - Colecciones de Naruto
- `/naruto/:seriesId` - Detalle de una colección específica de Naruto

## 🛠️ Tecnologías Utilizadas

- **Angular 19**: Framework principal
- **Angular Material 19**: Componentes UI
- **RxJS 7**: Programación reactiva
- **TypeScript 5.7**: Tipado estático
- **SCSS**: Estilos
- **jsPDF**: Generación de PDFs
- **file-saver**: Descarga de archivos
- **jszip**: Manejo de archivos ZIP

## 💾 Almacenamiento de Datos

La aplicación utiliza localStorage del navegador para almacenar:

- **Colecciones de cartas**: Con prefijos `collection_`, `naruto_collection_`, `pokemon_collection_`
- **Metadatos**: Contadores de cartas (`ownedCards_`) e historial de ventas (`sales_`)

### Exportar Colecciones

Desde la página principal, usa el botón "Exportar Colecciones" para descargar un archivo JSON con todas tus colecciones.

### Importar Colecciones

Desde la página principal, usa el botón "Importar Colecciones" para restaurar colecciones desde un archivo JSON previamente exportado.

## 🎨 Sistema de Diseño

La aplicación utiliza un sistema de diseño moderno con:

- Variables CSS personalizadas para colores, espaciado y tipografía
- Gradientes y sombras para efectos visuales
- Transiciones suaves para mejor UX
- Diseño responsive con Angular Material

## 🔍 Integración con APIs

### Scryfall API (Magic: The Gathering)

La aplicación se integra con la API de Scryfall para obtener:
- Listados completos de cartas por expansión
- Imágenes de cartas en alta calidad
- Precios actualizados
- Información de rareza y coleccionabilidad

## 📝 Notas Importantes

- **Primer uso**: La primera vez que accedas a una colección, la aplicación descargará los datos desde las APIs externas
- **Sin backend**: Esta aplicación funciona completamente en el navegador sin necesidad de servidor
- **Backups recomendados**: Exporta tus colecciones regularmente para evitar pérdida de datos

## 🤝 Contribuir

Esta aplicación fue migrada desde el proyecto original `mascalerino`. Para contribuir:

1. Crea una rama para tu feature
2. Realiza tus cambios
3. Asegúrate de que compila sin errores: `npm run build`
4. Crea un commit con tus cambios

## 📄 Licencia

Este proyecto es de código privado.

## 🐛 Troubleshooting

### La aplicación no carga
- Verifica que el puerto 4200 no esté siendo usado
- Limpia caché del navegador
- Reinstala dependencias: `rm -rf node_modules && npm install`

### Las colecciones no se guardan
- Verifica que el navegador permita localStorage
- Asegúrate de no estar en modo incógnito
- Revisa la consola del navegador para errores

### Errores al compilar
- Verifica la versión de Node.js: `node --version` (debe ser 18+)
- Actualiza Angular CLI: `npm install -g @angular/cli@latest`
- Limpia caché: `npm cache clean --force`

## 📞 Soporte

Para problemas o preguntas sobre la aplicación, revisa los logs de la consola del navegador para más detalles sobre posibles errores.
