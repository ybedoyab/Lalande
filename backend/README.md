# Lalande Backend

Backend API para el proyecto Lalande construido con Node.js, Express y MongoDB.

## Estructura del Proyecto

```
backend/
├── src/
│   ├── config/
│   │   └── database.js         # Configuración de MongoDB
│   ├── models/                 # Modelos de Mongoose
│   │   ├── LandingSite.js
│   │   ├── REMSWeatherData.js
│   │   ├── ResourceMonitor.js
│   │   ├── Colonist.js
│   │   └── ...
│   ├── data-loaders/           # Clases para cargar datos
│   │   ├── BaseDataLoader.js
│   │   ├── LandingSiteLoader.js
│   │   └── ...
│   ├── routes/                 # Rutas de la API
│   │   ├── index.js
│   │   ├── mars.routes.js
│   │   ├── resources.routes.js
│   │   ├── materials.routes.js
│   │   └── ...
│   ├── scripts/                # Scripts de inicialización
│   │   ├── init-database.js
│   │   ├── init-colony-data.js
│   │   └── init-colonists.js
│   └── index.js                # Punto de entrada
├── .env                        # Variables de entorno
└── package.json
```

## Configuración

### Variables de Entorno

Crear archivo `.env` en la raíz de `backend/`:

```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/lalande
MATERIALS_SERVICE_URL=http://localhost:8001
OPENAI_API_KEY=tu_api_key_de_openai
```

**Variables importantes:**
- `MONGODB_URI` (requerida): URI de conexión a MongoDB
  - Local: `mongodb://localhost:27017/lalande`
  - MongoDB Atlas: `mongodb+srv://usuario:password@cluster.mongodb.net/lalande?retryWrites=true&w=majority`
- `MATERIALS_SERVICE_URL`: URL del microservicio Python (default: `http://localhost:8001`)
- `OPENAI_API_KEY`: API Key de OpenAI para análisis con IA (opcional)

## Instalación

```bash
npm install
```

**Importante:** Asegúrate de tener MongoDB instalado y corriendo, o configura una instancia de MongoDB Atlas antes de iniciar el servidor.

## Scripts Disponibles

- `npm start` - Inicia el servidor en modo producción
- `npm run dev` - Inicia el servidor en modo desarrollo con nodemon (auto-reload)
- `npm run init-db` - Inicializa la base de datos y carga todos los datos desde `/data` (con 4GB de memoria)
- `npm run init-db:small` - Versión con memoria por defecto (útil para sistemas con poca RAM)
- `npm run init-colony` - Inicializa datos de la colonia (monitor de recursos y materiales en cráteres)
- `npm run init-colonists` - Inicializa colonos iniciales

## Uso

```bash
# Desarrollo
npm run dev

# Producción
npm start
```

El servidor estará disponible en `http://localhost:3000`

## Inicialización de la Base de Datos

### Orden de Ejecución Recomendado

1. **Inicializar datos de la colonia:**
   ```bash
   npm run init-colony
   ```

2. **Inicializar colonos:**
   ```bash
   npm run init-colonists
   ```

3. **Inicializar datos de Marte (opcional):**
   ```bash
   npm run init-db
   ```

**Nota:** Los scripts son idempotentes - puedes ejecutarlos múltiples veces sin crear duplicados.

## Endpoints Principales

- `GET /` - Información del API
- `GET /health` - Health check
- `GET /api/resources` - Estado del monitor de recursos
- `POST /api/resources/request` - Solicitar recursos
- `GET /api/mars/landing-sites` - Sitios de aterrizaje en Marte
- `GET /api/materials/:materialId` - Información de materiales
- `POST /api/ai-analysis/colony` - Análisis con IA de la colonia

## Arquitectura y Principios

El código sigue principios **SOLID** y **DRY**:
- **Single Responsibility**: Cada loader tiene una única responsabilidad
- **Open/Closed**: Extensible sin modificar código existente
- **Dependency Inversion**: Dependencias sobre abstracciones
- **DRY**: Utilidades reutilizables para parsing CSV y manejo de archivos
