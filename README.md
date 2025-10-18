# API Sistema de Gestión de Congreso UMG

API REST para la gestión integral de congresos académicos de la Universidad Mariano Gálvez de Guatemala.

## 🚀 Características

- **Autenticación JWT** con refresh tokens
- **Control de acceso basado en roles** (Admin, Organizador, Staff, Participante)
- **Validación robusta** con Zod
- **Base de datos PostgreSQL** con pool de conexiones
- **Documentación automática** con Swagger/OpenAPI
- **Middleware de seguridad** completo
- **Manejo de errores** centralizado
- **Paginación** en endpoints de listado

## 📋 Módulos Implementados

### 🔐 Autenticación y Usuarios
- Registro y login de usuarios
- Gestión de perfiles
- Refresh tokens
- Recuperación de contraseñas

### 👥 Gestión de Roles
- Roles predefinidos con permisos específicos
- Control granular de acceso por módulo y acción

### 🎓 Participantes
- Registro de participantes
- Gestión de información personal
- Historial de participación

### 🏛️ Talleres
- Creación y gestión de talleres
- Control de cupos y horarios
- Filtros y búsqueda avanzada
- Paginación de resultados

### 🏆 Competencias
- Gestión de competencias académicas
- Control de participantes
- Programación de eventos
- Seguimiento de resultados

### 💬 Foros
- Foros de discusión
- Gestión de temas y respuestas
- Moderación de contenido

## 🛠️ Tecnologías

- **Node.js** con TypeScript
- **Express.js** - Framework web
- **PostgreSQL** - Base de datos
- **Zod** - Validación de esquemas
- **JWT** - Autenticación
- **Swagger** - Documentación API
- **Helmet** - Seguridad HTTP
- **CORS** - Control de acceso
- **Rate Limiting** - Limitación de peticiones

## 📦 Instalación

1. **Clonar el repositorio**
```bash
git clone <url-del-repositorio>
cd APISistemaGestionCongresoUMG
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

4. **Configurar base de datos**
- Crear base de datos PostgreSQL
- Ejecutar migraciones (si las hay)
- Configurar la cadena de conexión en `.env`

5. **Iniciar el servidor**
```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm start
```

## 🔧 Variables de Entorno

```env
# Base de datos
DATABASE_URL=postgresql://usuario:password@localhost:5432/congreso_umg

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro
JWT_REFRESH_SECRET=tu_refresh_secret_muy_seguro

# Servidor
PORT=3000
NODE_ENV=development
```

## 📚 Documentación API

Una vez iniciado el servidor, la documentación interactiva estará disponible en:
- **Swagger UI**: `http://localhost:3000/api-docs`

## 🔑 Roles y Permisos

### Admin
- Acceso completo a todos los módulos
- Gestión de usuarios y roles
- Auditoría del sistema

### Organizador
- Gestión de talleres y competencias
- Gestión de inscripciones
- Generación de diplomas y resultados
- Gestión de foros

### Staff
- Consulta de información
- Gestión de asistencia
- Generación de diplomas

### Participante
- Gestión de perfil propio
- Inscripción a eventos
- Consulta de información pública

## 🛡️ Seguridad

- **Helmet.js** para headers de seguridad
- **Rate limiting** para prevenir ataques
- **CORS** configurado apropiadamente
- **Validación** estricta de entrada
- **JWT** con expiración y refresh tokens
- **Sanitización** de datos

## 📁 Estructura del Proyecto

```
src/
├── app.ts              # Configuración principal de Express
├── server.ts           # Punto de entrada del servidor
├── config/             # Configuraciones
│   └── swagger.ts      # Configuración de Swagger
├── db/                 # Base de datos
│   ├── pool.ts         # Pool de conexiones
│   └── queries/        # Consultas SQL
├── middleware/         # Middlewares
│   ├── auth.middleware.ts
│   ├── authorization.middleware.ts
│   └── errorHandler.ts
├── routes/             # Rutas de la API
│   ├── usuarios.routes.ts
│   ├── roles.routes.ts
│   ├── participantes.routes.ts
│   ├── talleres.routes.ts
│   ├── competencias.routes.ts
│   └── foros.routes.ts
├── schemas/            # Esquemas de validación Zod
├── types/              # Tipos TypeScript
└── utils/              # Utilidades
```

## 🚀 Endpoints Principales

### Autenticación
- `POST /api/usuarios/register` - Registro de usuario
- `POST /api/usuarios/login` - Inicio de sesión
- `POST /api/usuarios/refresh` - Renovar token

### Talleres
- `GET /api/talleres` - Listar talleres
- `POST /api/talleres` - Crear taller
- `GET /api/talleres/:id` - Obtener taller
- `PUT /api/talleres/:id` - Actualizar taller
- `DELETE /api/talleres/:id` - Eliminar taller

### Competencias
- `GET /api/competencias` - Listar competencias
- `POST /api/competencias` - Crear competencia
- `GET /api/competencias/:id` - Obtener competencia
- `PUT /api/competencias/:id` - Actualizar competencia
- `DELETE /api/competencias/:id` - Eliminar competencia

### Otros módulos
- `/api/usuarios` - Gestión de usuarios
- `/api/roles` - Gestión de roles
- `/api/participantes` - Gestión de participantes
- `/api/foros` - Gestión de foros

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Tests con coverage
npm run test:coverage
```

## 📝 Contribución

1. Fork el proyecto
2. Crear una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Equipo de Desarrollo

- **Universidad Mariano Gálvez de Guatemala**
- Facultad de Ingeniería en Sistemas

## 📞 Soporte

Para soporte técnico o consultas sobre el proyecto, contactar a través de los canales oficiales de la universidad.

---

**Desarrollado con ❤️ para la Universidad Mariano Gálvez de Guatemala**