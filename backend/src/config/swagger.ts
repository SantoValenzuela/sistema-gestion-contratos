import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc, { Options } from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API - Sistema de Gestión de Contratos Inteligentes',
    version: '1.0.0',
    description:
      'Documentación de la API para el sistema de gestión de contratos con integración blockchain.'
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor local de desarrollo'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [
    {
      bearerAuth: []
    }
  ]
};

const options: Options = {
  swaggerDefinition,
  // Archivos donde leerá las anotaciones (comentarios JSDoc)
  apis: ['./src/modules/**/*.routes.ts']
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerUi, swaggerSpec };
