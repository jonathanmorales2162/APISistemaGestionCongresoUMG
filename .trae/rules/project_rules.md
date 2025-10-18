1. No abras ventanas de Preview al realizar las pruebas.
2. Las peticiones al api realizadas con Invoke-WebRequest desde la terminal.
3. Las credenciales para peticiones con rol admin son:
   - Usuario: jonathanm@gmail.com
   - Contraseña: Umg2026!
4. Las credenciales para peticiones con rol Staff son:
   - Usuario: lorellanae2@miumg.edu.gt
   - Contraseña: Umg2025!
5. Las credenciales para peticiones con rol Participante son:
   - Usuario: david@gmail.com
   - Contraseña: Umg2025!
6. Las credenciales para peticiones con rol Organizador son:
   - Usuario: dortiza@gmail.com
   - Contraseña: Umg2025!
7. Este proyecto implementa control de acceso basado en roles definidos en la base de datos. Cada rol tiene permisos específicos sobre los módulos del sistema. Estos permisos deben ser utilizados por el middleware de autorización para restringir acciones según el JWT del usuario autenticado.

> Formato: `modulo:accion`  
> Acciones posibles: `create`, `read`, `update`, `delete`, `read_self`, `update_self`  
> `"*"` representa acceso total sobre el módulo.

```json
{
  "admin": [
    "usuarios:create", "usuarios:read", "usuarios:update", "usuarios:delete",
    "roles:read", "roles:create", "roles:update", "roles:delete",
    "talleres:*", "competencias:*",
    "inscripciones:*",
    "asistencia:read", "asistencia:create", "asistencia:update", "asistencia:delete",
    "diplomas:generate", "diplomas:read",
    "resultados:*",
    "auditoria:read",
    "foros:*"
  ],
  "organizador": [
    "usuarios:read", "usuarios:update",
    "roles:read",
    "talleres:create", "talleres:update", "talleres:read",
    "competencias:create", "competencias:update", "competencias:read",
    "inscripciones:create", "inscripciones:read", "inscripciones:update", "inscripciones:delete",
    "asistencia:read",
    "diplomas:generate", "diplomas:read",
    "resultados:create", "resultados:update", "resultados:read",
    "foros:create", "foros:update", "foros:read", "foros:delete"
  ],
  "staff": [
    "usuarios:read",
    "talleres:read", "competencias:read",
    "asistencia:create", "asistencia:update", "asistencia:read",
    "diplomas:generate", "diplomas:read",
    "resultados:read",
    "foros:read"
  ],
  "participante": [
    "usuarios:read_self", "usuarios:update_self",
    "talleres:read", "competencias:read",
    "inscripciones:create_self", "inscripciones:delete_self", "inscripciones:read_self",
    "asistencia:read_self",
    "diplomas:read_self",
    "resultados:read",
    "foros:read"
  ]
}
8. El middleware de autorización debe verificar el JWT en el encabezado de autorización de cada solicitud. Si el token es válido y el usuario tiene los permisos necesarios para acceder a la ruta solicitada, la solicitud debe continuar. De lo contrario, debe devolver un error 403 Forbidden.