# Guía de Despliegue en Vercel

## Preparación del Proyecto

Este proyecto ya está configurado para desplegarse en Vercel. Los archivos necesarios han sido creados:

- `vercel.json` - Configuración de Vercel
- `api/index.ts` - Punto de entrada para Vercel
- `.env.example` - Variables de entorno necesarias

## Pasos para Desplegar

### 1. Instalar Vercel CLI (opcional)
```bash
npm i -g vercel
```

### 2. Configurar Variables de Entorno

En el dashboard de Vercel, configura las siguientes variables de entorno:

- `DATABASE_URL`: URL de conexión a PostgreSQL
- `JWT_SECRET`: Clave secreta para JWT (genera una segura)
- `FRONTEND_URL`: URL de tu frontend desplegado
- `NODE_ENV`: `production`

### 3. Configurar Base de Datos

Opciones recomendadas para PostgreSQL en producción:

- **Neon** (https://neon.tech) - Gratis hasta cierto límite
- **Supabase** (https://supabase.com) - Incluye PostgreSQL
- **Railway** (https://railway.app) - Fácil configuración
- **PlanetScale** - Aunque es MySQL, también es una opción

### 4. Desplegar

#### Opción A: Desde GitHub
1. Conecta tu repositorio a Vercel
2. Configura las variables de entorno
3. Despliega automáticamente

#### Opción B: Desde CLI
```bash
vercel --prod
```

## Estructura de Archivos para Vercel

```
proyecto/
├── api/
│   └── index.ts          # Punto de entrada para Vercel
├── src/
│   ├── app.ts           # Aplicación Express
│   └── ...              # Resto del código
├── vercel.json          # Configuración de Vercel
├── package.json         # Dependencias y scripts
└── .env.example         # Variables de entorno de ejemplo
```

## Variables de Entorno Requeridas

```env
DATABASE_URL=postgresql://usuario:password@host:puerto/base_datos
JWT_SECRET=tu_jwt_secret_muy_seguro
FRONTEND_URL=https://tu-frontend.vercel.app
NODE_ENV=production
```

## Endpoints Disponibles

Una vez desplegado, tu API estará disponible en:

- `https://tu-proyecto.vercel.app/` - Página de inicio
- `https://tu-proyecto.vercel.app/health` - Health check
- `https://tu-proyecto.vercel.app/api-docs` - Documentación Swagger
- `https://tu-proyecto.vercel.app/usuarios` - Endpoints de usuarios
- `https://tu-proyecto.vercel.app/roles` - Endpoints de roles

## Notas Importantes

1. **Límites de Vercel**: Las funciones serverless tienen un límite de tiempo de ejecución
2. **Conexiones de BD**: Usa connection pooling para PostgreSQL
3. **CORS**: Ya está configurado para múltiples orígenes
4. **Rate Limiting**: Configurado para 100 requests por 15 minutos

## Troubleshooting

### Error de CORS
- Verifica que `FRONTEND_URL` esté configurado correctamente
- Asegúrate de que el dominio del frontend esté en la lista de orígenes permitidos

### Error de Base de Datos
- Verifica que `DATABASE_URL` esté configurado correctamente
- Asegúrate de que la base de datos esté accesible desde internet

### Error 500
- Revisa los logs en el dashboard de Vercel
- Verifica que todas las variables de entorno estén configuradas