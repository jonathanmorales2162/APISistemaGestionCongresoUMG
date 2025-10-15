import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API Sistema de Gestión de Congreso UMG',
    version: '1.0.0',
    description: 'API REST para la gestión de usuarios, roles, talleres, competencias y diplomas del sistema de congreso de la Universidad Mariano Gálvez',
    contact: {
      name: 'Equipo de Desarrollo',
      email: 'desarrollo@umg.edu.gt'
    }
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Servidor de desarrollo'
    },
    {
      url: 'http://localhost:3000',
      description: 'Servidor de desarrollo alternativo'
    },
    {
      url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://tu-proyecto.vercel.app',
      description: 'Servidor de producción (Vercel)'
    }
  ],
  components: {
    schemas: {
      Usuario: {
        type: 'object',
        properties: {
          id_usuario: {
            type: 'integer',
            description: 'ID único del usuario'
          },
          nombre: {
            type: 'string',
            description: 'Nombre del usuario',
            maxLength: 100
          },
          apellido: {
            type: 'string',
            description: 'Apellido del usuario',
            maxLength: 100
          },
          correo: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico del usuario',
            maxLength: 150
          },
          telefono: {
            type: 'string',
            description: 'Número de teléfono del usuario',
            maxLength: 20,
            nullable: true
          },
          colegio: {
            type: 'string',
            description: 'Colegio o institución del usuario',
            maxLength: 150,
            nullable: true
          },
          tipo: {
            type: 'string',
            enum: ['I', 'E'],
            description: 'Tipo de usuario: I (Interno), E (Externo)'
          },
          rol: {
            $ref: '#/components/schemas/Rol',
            description: 'Información del rol del usuario'
          },
          creado_en: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha y hora de creación del usuario'
          }
        }
      },
      CrearUsuario: {
        type: 'object',
        required: ['nombre', 'apellido', 'correo', 'tipo', 'password', 'id_rol'],
        properties: {
          nombre: {
            type: 'string',
            description: 'Nombre del usuario',
            minLength: 1,
            maxLength: 100
          },
          apellido: {
            type: 'string',
            description: 'Apellido del usuario',
            minLength: 1,
            maxLength: 100
          },
          correo: {
            type: 'string',
            format: 'email',
            description: 'Correo electrónico del usuario',
            maxLength: 150
          },
          telefono: {
            type: 'string',
            description: 'Número de teléfono del usuario',
            maxLength: 20
          },
          colegio: {
            type: 'string',
            description: 'Colegio o institución del usuario',
            maxLength: 150
          },
          tipo: {
            type: 'string',
            enum: ['I', 'E'],
            description: 'Tipo de usuario: I (Interno), E (Externo)'
          },
          password: {
            type: 'string',
            description: 'Contraseña del usuario',
            minLength: 8,
            maxLength: 255
          },
          id_rol: {
            type: 'integer',
            description: 'ID del rol a asignar al usuario',
            minimum: 1
          }
        }
      },
      ActualizarUsuario: {
        type: 'object',
        properties: {
          nombre: {
            type: 'string',
            description: 'Nombre del usuario',
            minLength: 1,
            maxLength: 100
          },
          apellido: {
            type: 'string',
            description: 'Apellido del usuario',
            minLength: 1,
            maxLength: 100
          },
          telefono: {
            type: 'string',
            description: 'Número de teléfono del usuario',
            maxLength: 20
          },
          colegio: {
            type: 'string',
            description: 'Colegio o institución del usuario',
            maxLength: 150
          },
          tipo: {
            type: 'string',
            enum: ['I', 'E'],
            description: 'Tipo de usuario: I (Interno), E (Externo)'
          },
          id_rol: {
            type: 'integer',
            description: 'ID del rol a asignar al usuario',
            minimum: 1
          }
        }
      },
      Rol: {
        type: 'object',
        properties: {
          id_rol: {
            type: 'integer',
            description: 'ID único del rol'
          },
          nombre: {
            type: 'string',
            description: 'Nombre del rol'
          }
        }
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Indica si la operación fue exitosa'
          },
          data: {
            description: 'Datos de respuesta'
          },
          message: {
            type: 'string',
            description: 'Mensaje descriptivo de la operación'
          }
        }
      },
      Error: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: false
          },
          message: {
            type: 'string',
            description: 'Mensaje de error'
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: {
                  type: 'string',
                  description: 'Campo que causó el error'
                },
                message: {
                  type: 'string',
                  description: 'Descripción del error'
                }
              }
            }
          }
        }
      }
    },
    responses: {
      NotFound: {
        description: 'Recurso no encontrado',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              message: 'Recurso no encontrado'
            }
          }
        }
      },
      ValidationError: {
        description: 'Error de validación',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              message: 'Error de validación',
              errors: [
                {
                  field: 'correo',
                  message: 'Formato de correo inválido'
                }
              ]
            }
          }
        }
      },
      InternalServerError: {
        description: 'Error interno del servidor',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              success: false,
              message: 'Error interno del servidor'
            }
          }
        }
      }
    }
  }
};

export const swaggerOptions = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.ts'], // Rutas donde están las anotaciones
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
export default swaggerSpec;