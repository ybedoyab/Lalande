# Materials Project Microservice

Microservicio Python que utiliza MPRester para acceder a los datos de Materials Project API.

## Estructura

```
materials-service/
├── app.py              # Aplicación FastAPI
├── requirements.txt    # Dependencias Python
├── .env                # Variables de entorno
├── start.sh            # Script de inicio (Linux/Mac)
├── start.ps1           # Script de inicio (Windows PowerShell)
├── start.bat            # Script de inicio (Windows CMD)
└── venv/               # Entorno virtual (no incluir en git)
```

## Configuración

### Variables de Entorno

Crear archivo `.env` en la raíz de `materials-service/`:

```env
MP_API_KEY=tu_api_key_de_materials_project
PORT=8001
```

**Variables:**
- `MP_API_KEY` o `MATERIALS_API_KEY` (requerida): API Key de Materials Project
  - Obtener en: https://next-gen.materialsproject.org/api
- `PORT` (opcional): Puerto del servicio (default: 8001)

## Instalación

1. **Instalar Python 3.8+** (si no lo tienes)

2. **Instalar dependencias:**
```bash
pip install -r requirements.txt
```

O si usas `pip3`:
```bash
pip3 install -r requirements.txt
```

## Uso

### Windows (PowerShell)
```powershell
.\start.ps1
```

### Windows (CMD)
```cmd
start.bat
```

### Linux/Mac
```bash
chmod +x start.sh
./start.sh
```

### Manual
```bash
# Activar entorno virtual
# Windows:
venv\Scripts\Activate.ps1
# Linux/Mac:
source venv/bin/activate

# Ejecutar aplicación
python app.py
```

### Con uvicorn directamente
```bash
uvicorn app:app --reload --port 8001
```

### Producción
```bash
uvicorn app:app --host 0.0.0.0 --port 8001
```

El servicio estará disponible en `http://localhost:8001`

## Endpoints

- `GET /` - Health check básico
- `GET /health` - Verifica el estado del servicio y si la API key está configurada
- `GET /materials/{material_id}` - Obtiene información detallada de un material
- `GET /materials/search/formula/{formula}` - Busca materiales por fórmula química

## Integración con Backend

El backend Node.js llama a este microservicio en lugar de intentar acceder directamente a Materials Project API.

## Solución de Problemas

### Error: "mp-api not installed"
1. Asegúrate de estar en el entorno virtual
2. Instala las dependencias: `pip install -r requirements.txt`
3. Verifica la instalación: `python -c "import mp_api; print('OK')"`

### Error: "API key not configured"
- Verifica que el archivo `.env` existe
- Verifica que `MP_API_KEY` está configurado correctamente
- Reinicia el servicio después de cambiar el `.env`

### Error: "Python not found"
- Asegúrate de tener Python 3.8+ instalado
- Verifica que Python esté en tu PATH
- En Windows, puedes necesitar usar `py` en lugar de `python`
