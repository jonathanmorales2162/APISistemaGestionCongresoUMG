import swaggerJSDoc from 'swagger-jsdoc';
import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';

// CORREGIDO: Configuración optimizada para Vercel serverless
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
      url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://congreso-umg-2025.vercel.app/',
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
      Asistencia: {
        type: 'object',
        properties: {
          id_asistencia: {
            type: 'integer',
            description: 'ID único de la asistencia'
          },
          id_usuario: {
            type: 'integer',
            description: 'ID del usuario'
          },
          id_tipo: {
            type: 'integer',
            description: 'Tipo de evento (1=Taller, 2=Competencia, 3=Foro)'
          },
          id_taller: {
            type: 'integer',
            nullable: true,
            description: 'ID del taller (si aplica)'
          },
          id_competencia: {
            type: 'integer',
            nullable: true,
            description: 'ID de la competencia (si aplica)'
          },
          id_foro: {
            type: 'integer',
            nullable: true,
            description: 'ID del foro (si aplica)'
          },
          fecha: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha y hora de registro de asistencia'
          },
          estado: {
            type: 'string',
            enum: ['P', 'A', 'D'],
            description: 'Estado de asistencia: P (Presente), A (Ausente), D (Desconocido)'
          }
        }
      },
      CrearAsistenciaRequest: {
        type: 'object',
        required: ['id_usuario'],
        properties: {
          id_usuario: {
            type: 'integer',
            description: 'ID del usuario'
          },
          id_taller: {
            type: 'integer',
            description: 'ID del taller (requerido si no se especifica id_competencia o id_foro)'
          },
          id_competencia: {
            type: 'integer',
            description: 'ID de la competencia (requerido si no se especifica id_taller o id_foro)'
          },
          id_foro: {
            type: 'integer',
            description: 'ID del foro (requerido si no se especifica id_taller o id_competencia)'
          },
          estado: {
            type: 'string',
            enum: ['P', 'A', 'D'],
            default: 'D',
            description: 'Estado de asistencia: P (Presente), A (Ausente), D (Desconocido)'
          }
        }
      },
      ActualizarAsistenciaRequest: {
        type: 'object',
        properties: {
          estado: {
            type: 'string',
            enum: ['P', 'A', 'D'],
            description: 'Estado de asistencia: P (Presente), A (Ausente), D (Desconocido)'
          },
          fecha: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha y hora de registro de asistencia'
          }
        }
      },
      Diploma: {
        type: 'object',
        properties: {
          id_diploma: {
            type: 'integer',
            description: 'ID único del diploma'
          },
          id_usuario: {
            type: 'integer',
            description: 'ID del usuario'
          },
          id_tipo: {
            type: 'integer',
            description: 'Tipo de evento (1=Taller, 2=Competencia)'
          },
          id_taller: {
            type: 'integer',
            nullable: true,
            description: 'ID del taller (si aplica)'
          },
          id_competencia: {
            type: 'integer',
            nullable: true,
            description: 'ID de la competencia (si aplica)'
          },
          fecha_generacion: {
            type: 'string',
            format: 'date-time',
            description: 'Fecha y hora de generación del diploma'
          },
          archivo_pdf: {
            type: 'string',
            nullable: true,
            description: 'URL del archivo PDF del diploma'
          },
          usuario_nombre: {
            type: 'string',
            description: 'Nombre del usuario'
          },
          usuario_apellido: {
            type: 'string',
            description: 'Apellido del usuario'
          },
          usuario_correo: {
            type: 'string',
            description: 'Correo del usuario'
          },
          taller_titulo: {
            type: 'string',
            nullable: true,
            description: 'Título del taller (si aplica)'
          },
          competencia_titulo: {
            type: 'string',
            nullable: true,
            description: 'Título de la competencia (si aplica)'
          },
          tipo_evento: {
            type: 'string',
            description: 'Nombre del tipo de evento'
          }
        }
      },
      CrearDiplomaRequest: {
        type: 'object',
        required: ['id_usuario'],
        properties: {
          id_usuario: {
            type: 'integer',
            description: 'ID del usuario'
          },
          id_taller: {
            type: 'integer',
            description: 'ID del taller (requerido si no se especifica id_competencia)'
          },
          id_competencia: {
            type: 'integer',
            description: 'ID de la competencia (requerido si no se especifica id_taller)'
          }
        }
      },
      RespuestaDiplomas: {
        type: 'object',
        properties: {
          diplomas: {
            type: 'array',
            items: {
              $ref: '#/components/schemas/Diploma'
            }
          },
          total: {
            type: 'integer',
            description: 'Total de diplomas'
          },
          pagina: {
            type: 'integer',
            description: 'Página actual'
          },
          limite: {
            type: 'integer',
            description: 'Límite de resultados por página'
          },
          total_paginas: {
            type: 'integer',
            description: 'Total de páginas'
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
  apis: [
    process.env.NODE_ENV === 'production' 
      ? './dist/src/routes/*.js'
      : './src/routes/*.ts'
  ],
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);

// CORREGIDO: Función optimizada para configurar Swagger en Vercel serverless
export const setupSwagger = (app: Express): void => {
  // Generar la especificación de Swagger
  const specs = swaggerJSDoc(swaggerOptions);
  
  // Ruta para servir la especificación JSON
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
  
  // Configuración optimizada para Vercel - sin dependencias externas
  const swaggerUiOptions = {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .scheme-container { margin: 20px 0; }
    `,
    customSiteTitle: 'API Sistema Gestión Congreso UMG',
    swaggerOptions: {
      url: '/api-docs.json', // Usar nuestra propia ruta JSON
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      deepLinking: true,
      layout: 'StandaloneLayout',
      tryItOutEnabled: true,
      supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
      docExpansion: 'list',
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1
    }
  };
  
  // Configurar Swagger UI sin archivos estáticos externos
  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(specs, swaggerUiOptions));
  
  // Ruta raíz - Redirección a Swagger
  app.get('/', (_req, res) => {
    res.redirect('/api-docs');
  });
};

export default swaggerSpec;