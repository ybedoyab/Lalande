# Lalande Frontend

Frontend del proyecto Lalande construido con React, TypeScript, Vite, Tailwind CSS y daisyUI.

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── components/      # Componentes reutilizables
│   │   ├── Layout.tsx
│   │   ├── Header.tsx
│   │   ├── MarsGlobe.tsx
│   │   └── ...
│   ├── pages/          # Páginas de la aplicación
│   │   ├── HomePage.tsx
│   │   ├── ColonyPage.tsx
│   │   ├── MaterialsPage.tsx
│   │   └── EspacioPage.tsx
│   ├── services/       # Servicios API
│   │   ├── api.service.ts
│   │   ├── colony.service.ts
│   │   ├── mars.service.ts
│   │   └── ...
│   ├── hooks/          # Custom hooks
│   │   ├── useMarsWeather.ts
│   │   ├── useLandingSites.ts
│   │   └── ...
│   ├── types/          # Tipos TypeScript
│   │   ├── nasa.types.ts
│   │   ├── materials.types.ts
│   │   └── ...
│   ├── utils/          # Utilidades
│   │   └── env.ts
│   ├── App.tsx         # Componente principal
│   ├── main.tsx        # Punto de entrada
│   └── index.css       # Estilos globales
├── .env                # Variables de entorno
└── package.json
```

## Configuración

### Variables de Entorno

Crear archivo `.env` en la raíz de `frontend/`:

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_NASA_API_KEY=tu_api_key_de_nasa
VITE_OPENAI_API_KEY=tu_api_key_de_openai
VITE_MATERIALS_SERVICE_URL=http://localhost:8001
```

**Nota:** En Vite, todas las variables de entorno accesibles desde el frontend deben tener el prefijo `VITE_`.

## Instalación

```bash
npm install
```

## Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la build de producción
- `npm run lint` - Ejecuta el linter

## Uso

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm run preview
```

La aplicación estará disponible en `http://localhost:5173`

## Tecnologías

- **React 19** - Biblioteca UI
- **TypeScript** - Tipado estático
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework CSS utility-first
- **daisyUI** - Componentes para Tailwind CSS
- **Three.js** - Visualización 3D (globo de Marte)

## Principios Aplicados

- **SOLID**: Separación de responsabilidades, componentes y servicios modulares
- **DRY**: Utilidades reutilizables, servicios centralizados
- **TypeScript**: Tipado fuerte para mayor seguridad
- **Componentes modulares**: Fácil mantenimiento y escalabilidad
