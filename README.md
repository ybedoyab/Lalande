# 🚀 Lalande - Sistema de Monitoreo de Soporte Vital para Colonias Marcianas

**Autor:** Yulian Bedoya  
**Hackathon:** Perficient 2025

Sistema web de tiempo real para monitorear y gestionar recursos críticos de soporte vital (agua, oxígeno, presión atmosférica, temperatura) en una colonia marciana simulada.

---

## 📋 Cómo Desplegar

### Prerrequisitos

- **Node.js 18+** y npm
- **Python 3.8+** y pip
- **MongoDB** (local o MongoDB Atlas)
- API Keys:
  - NASA API Key: https://api.nasa.gov/
  - Materials Project API Key: https://next-gen.materialsproject.org/api
  - OpenAI API Key (opcional): https://platform.openai.com/

### Paso 1: Clonar el Repositorio

```bash
git clone <repository-url>
cd Lalande
```

### Paso 2: Configurar Materials Service (Python)

```bash
cd materials-service
pip install -r requirements.txt
```

Crear archivo `.env` en `materials-service/`:
```env
MP_API_KEY=tu_api_key_de_materials_project
PORT=8001
```

Iniciar el servicio:
```bash
python app.py
```

El servicio estará disponible en `http://localhost:8001`

### Paso 3: Configurar Backend (Node.js)

```bash
cd backend
npm install
```

Crear archivo `.env` en `backend/`:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/lalande
MATERIALS_SERVICE_URL=http://localhost:8001
OPENAI_API_KEY=tu_api_key_de_openai
```

**Nota sobre MONGODB_URI:**
- Local: `mongodb://localhost:27017/lalande`
- MongoDB Atlas: `mongodb+srv://usuario:password@cluster.mongodb.net/lalande?retryWrites=true&w=majority`

Inicializar datos de la colonia:
```bash
npm run init-colony
npm run init-colonists
```

Iniciar el servidor:
```bash
npm run dev
```

El servidor estará disponible en `http://localhost:3000`

### Paso 4: Configurar Frontend (React)

```bash
cd frontend
npm install
```

Crear archivo `.env` en `frontend/`:
```env
VITE_API_BASE_URL=http://localhost:3000
VITE_NASA_API_KEY=tu_api_key_de_nasa
VITE_OPENAI_API_KEY=tu_api_key_de_openai
VITE_MATERIALS_SERVICE_URL=http://localhost:8001
```

**Nota:** En Vite, todas las variables de entorno accesibles desde el frontend deben tener el prefijo `VITE_`.

Iniciar el servidor de desarrollo:
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### Paso 5: Verificar el Despliegue

1. **Materials Service:**
   ```bash
   curl http://localhost:8001/health
   ```

2. **Backend:**
   ```bash
   curl http://localhost:3000/health
   ```

3. **Frontend:**
   Abrir `http://localhost:5173` en el navegador

---

## 🔐 Variables de Entorno

### Backend (`backend/.env`)

| Variable | Descripción | Requerida | Ejemplo |
|----------|-------------|-----------|---------|
| `PORT` | Puerto del servidor | No | `3000` |
| `NODE_ENV` | Entorno de ejecución | No | `development` |
| `MONGODB_URI` | URI de conexión a MongoDB | **Sí** | `mongodb://localhost:27017/lalande` |
| `MATERIALS_SERVICE_URL` | URL del microservicio Python | No | `http://localhost:8001` |
| `OPENAI_API_KEY` | API Key de OpenAI para análisis IA | No | `sk-...` |

### Frontend (`frontend/.env`)

| Variable | Descripción | Requerida | Ejemplo |
|----------|-------------|-----------|---------|
| `VITE_API_BASE_URL` | URL base del backend | No | `http://localhost:3000` |
| `VITE_NASA_API_KEY` | API Key de NASA | No | `DEMO_KEY` |
| `VITE_OPENAI_API_KEY` | API Key de OpenAI | No | `sk-...` |
| `VITE_MATERIALS_SERVICE_URL` | URL del microservicio Python | No | `http://localhost:8001` |

### Materials Service (`materials-service/.env`)

| Variable | Descripción | Requerida | Ejemplo |
|----------|-------------|-----------|---------|
| `MP_API_KEY` | API Key de Materials Project | **Sí** | `tu_api_key` |
| `MATERIALS_API_KEY` | Alternativa a MP_API_KEY | No | `tu_api_key` |
| `PORT` | Puerto del servicio | No | `8001` |

---

## 🏗️ Arquitectura

```
Frontend (React + TypeScript)
    ↓
Backend (Node.js + Express)
    ↓
Materials Service (Python + FastAPI)
    ↓
Materials Project API
```

---

## 📦 Estructura del Proyecto

```
Lalande/
├── backend/              # API Node.js
│   ├── src/
│   ├── .env
│   └── package.json
├── frontend/             # Aplicación React
│   ├── src/
│   ├── .env
│   └── package.json
├── materials-service/     # Microservicio Python
│   ├── app.py
│   ├── .env
│   └── requirements.txt
└── README.md
```

---

## 🚀 Iniciar Todo el Sistema

### Terminal 1: Materials Service
```bash
cd materials-service
python app.py
```

### Terminal 2: Backend
```bash
cd backend
npm run dev
```

### Terminal 3: Frontend
```bash
cd frontend
npm run dev
```

---

## 📝 Notas Importantes

- Asegúrate de que MongoDB esté corriendo antes de iniciar el backend
- El backend requiere que el materials-service esté corriendo para funcionalidades de materiales
- Las variables de entorno del frontend deben tener el prefijo `VITE_` para ser accesibles
- Los scripts de inicialización (`init-colony`, `init-colonists`) son idempotentes y pueden ejecutarse múltiples veces

---

**Desarrollado con ❤️ por Yulian Bedoya para el Hackathon Perficient 2025**
