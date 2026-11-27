const ref = (name) => ({ $ref: `#/components/schemas/${name}` });

function response(description, bodySchema, example) {
  return {
    description,
    content: {
      "application/json": {
        schema: {
          type: "object",
          required: ["body", "message", "status"],
          properties: {
            body: bodySchema,
            message: { type: "string" },
            status: { type: "integer" },
          },
        },
        ...(example ? { example } : {}),
      },
    },
  };
}

function jsonRequest(schemaName, example) {
  return {
    required: true,
    content: {
      "application/json": {
        schema: ref(schemaName),
        example,
      },
    },
  };
}

const emptyBody = { type: "object", additionalProperties: false };
const errorExample = (status, message) => ({
  body: {},
  message,
  status,
});
const badRequest = response(
  "Solicitud inválida.",
  emptyBody,
  errorExample(400, "Los datos de la solicitud no son válidos."),
);
const requestTooLarge = response(
  "El cuerpo JSON supera el límite de 1 MB.",
  emptyBody,
  errorExample(413, "La solicitud es demasiado grande."),
);
const unauthorized = response(
  "Token Bearer faltante o inválido.",
  emptyBody,
  errorExample(401, "Se requiere un token Bearer."),
);
const forbidden = response(
  "El usuario no tiene permisos de administrador.",
  emptyBody,
  errorExample(403, "No tienes permiso de administrador para realizar esta acción."),
);
const notFound = response(
  "No se encontró el recurso.",
  emptyBody,
  errorExample(404, "No se encontró el recurso."),
);
const serverError = response(
  "Error interno del servidor.",
  emptyBody,
  errorExample(500, "Error interno del servidor."),
);

const userExample = {
  id: "12",
  nombreCompleto: "Ana Pérez",
  direccion: "Calle 123",
  telefono: "+1 213-373-4253",
  whatsapp: "+44 20 8366 1177",
  correoElectronico: "ana@example.com",
  urlDocumentoIdentidad: "https://example.com/identidad.pdf",
  urlReciboServicio: "https://example.com/recibo.pdf",
  urlContratoDisclaimer: "https://example.com/contrato.pdf",
  urlComprobanteAceptacion: "https://example.com/aceptacion.pdf",
  fechaCreacion: "2026-11-18T20:00:00.000Z",
  fechaActualizacion: "2026-11-18T20:00:00.000Z",
  estado: "activo",
};

const userBody = {
  type: "object",
  required: ["user"],
  properties: { user: ref("User") },
};

const postBody = {
  type: "object",
  required: ["post"],
  properties: { post: ref("Post") },
};

const botBody = {
  type: "object",
  required: ["bot"],
  properties: { bot: ref("Bot") },
};

const imageBody = {
  type: "object",
  required: ["id", "name"],
  properties: {
    id: { type: "string", pattern: "^[a-f0-9]{64}$" },
    name: { type: "string", example: `${"a".repeat(64)}.png` },
  },
};

const idParameter = {
  name: "id",
  in: "path",
  required: true,
  description: "ID decimal de la base de datos.",
  schema: { type: "string", pattern: "^[1-9][0-9]{0,18}$" },
};

const imageIdParameter = {
  name: "id",
  in: "path",
  required: true,
  description: "Hash SHA-256 en minúsculas de la imagen.",
  schema: { type: "string", pattern: "^[a-f0-9]{64}$" },
};

const imageUploadRequest = {
  required: true,
  content: {
    "multipart/form-data": {
      schema: {
        type: "object",
        required: ["image"],
        properties: {
          image: {
            type: "string",
            format: "binary",
            description: "Imagen PNG, JPEG, GIF o WEBP (máximo 5 MB).",
          },
        },
      },
    },
  },
};

const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Trading Life Academy API",
    version: "1.0.0",
    description:
      "Documentación de la API REST del backend. Las respuestas usan el formato `{ body, message, status }`. Los endpoints protegidos requieren un JWT en la cabecera Authorization.",
  },
  servers: [{ url: "/api/v1", description: "API local" }],
  tags: [
    { name: "Estado", description: "Estado y bienvenida de la API." },
    { name: "Usuarios", description: "Registro, autenticación y administración de usuarios." },
    { name: "Publicaciones", description: "Publicaciones de la red social." },
    { name: "Bots", description: "Catálogo y administración de bots." },
    { name: "Imágenes", description: "Carga, reemplazo y eliminación de imágenes." },
  ],
  paths: {
    "/": {
      get: {
        tags: ["Estado"],
        summary: "Bienvenida",
        operationId: "getApiRoot",
        responses: {
          "200": response(
            "API disponible.",
            emptyBody,
            { body: {}, message: "Welcome to the API!", status: 200 },
          ),
          "500": serverError,
        },
      },
    },
    "/users": {
      get: {
        tags: ["Usuarios"],
        summary: "Listar usuarios",
        description:
          "Requiere un token válido y que el ID del usuario esté en `ADMINS`.",
        operationId: "listUsers",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": response(
            "Usuarios listados.",
            { type: "object", required: ["users"], properties: { users: { type: "array", items: ref("User") } } },
            { body: { users: [userExample] }, message: "Usuarios listados correctamente.", status: 200 },
          ),
          "401": unauthorized,
          "403": forbidden,
          "500": serverError,
        },
      },
    },
    "/users/register": {
      post: {
        tags: ["Usuarios"],
        summary: "Registrar usuario",
        operationId: "registerUser",
        requestBody: jsonRequest("RegistrationRequest", {
          nombreCompleto: "Ana Pérez",
          correoElectronico: "ana@example.com",
          password: "mi-clave-segura",
        }),
        responses: {
          "201": response(
            "Usuario registrado.",
            userBody,
            { body: { user: userExample }, message: "Usuario registrado correctamente.", status: 201 },
          ),
          "400": badRequest,
          "409": response("El correo ya está registrado.", emptyBody, errorExample(409, "Este correo electrónico ya está registrado.")),
          "413": requestTooLarge,
          "500": serverError,
        },
      },
    },
    "/users/login": {
      post: {
        tags: ["Usuarios"],
        summary: "Iniciar sesión",
        operationId: "loginUser",
        requestBody: jsonRequest("LoginRequest", {
          correoElectronico: "ana@example.com",
          password: "mi-clave-segura",
        }),
        responses: {
          "200": response(
            "Sesión iniciada.",
            {
              type: "object",
              required: ["token", "user"],
              properties: {
                token: { type: "string", description: "JWT con vigencia de 10 días." },
                user: {
                  allOf: [
                    ref("User"),
                    {
                      type: "object",
                      required: ["role"],
                      properties: { role: { type: "string", enum: ["admin", "client"] } },
                    },
                  ],
                },
              },
            },
            {
              body: {
                token: "<jwt>",
                user: { ...userExample, role: "client" },
              },
              message: "Inicio de sesión exitoso.",
              status: 200,
            },
          ),
          "400": badRequest,
          "401": response("Credenciales incorrectas.", emptyBody, errorExample(401, "Correo o contraseña incorrectos.")),
          "413": requestTooLarge,
          "500": serverError,
        },
      },
    },
    "/users/me": {
      get: {
        tags: ["Usuarios"],
        summary: "Consultar usuario autenticado",
        operationId: "getCurrentUser",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": response(
            "Usuario autenticado.",
            userBody,
            { body: { user: userExample }, message: "Usuario encontrado.", status: 200 },
          ),
          "401": unauthorized,
          "404": notFound,
          "500": serverError,
        },
      },
    },
    "/users/{id}/follow": {
      parameters: [idParameter],
      put: {
        tags: ["Usuarios"],
        summary: "Seguir usuario",
        description:
          "Requiere Bearer. Operación idempotente; actualiza ambos contadores en una transacción y no permite auto-seguimiento.",
        operationId: "followUser",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": response(
            "Usuario seguido.",
            { type: "object", properties: { follow: { type: "object" } } },
            { body: { follow: { isFollowing: true, targetFollowersCount: 1, currentUserFollowingCount: 1 } }, message: "Usuario seguido correctamente.", status: 200 },
          ),
          "400": badRequest,
          "401": unauthorized,
          "404": notFound,
          "500": serverError,
        },
      },
      delete: {
        tags: ["Usuarios"],
        summary: "Dejar de seguir usuario",
        operationId: "unfollowUser",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": response(
            "Seguimiento eliminado.",
            { type: "object", properties: { follow: { type: "object" } } },
            { body: { follow: { isFollowing: false, targetFollowersCount: 0, currentUserFollowingCount: 0 } }, message: "Dejaste de seguir al usuario.", status: 200 },
          ),
          "400": badRequest,
          "401": unauthorized,
          "404": notFound,
          "500": serverError,
        },
      },
    },
    "/users/recover-password": {
      post: {
        tags: ["Usuarios"],
        summary: "Solicitar recuperación de contraseña",
        description:
          "La respuesta es genérica tanto si la cuenta existe como si no. El token de recuperación vence en una hora.",
        operationId: "recoverPassword",
        requestBody: jsonRequest("EmailRequest", { correoElectronico: "ana@example.com" }),
        responses: {
          "202": response(
            "Solicitud aceptada.",
            emptyBody,
            {
              body: {},
              message: "Si el correo está registrado, recibirás instrucciones para recuperar la cuenta.",
              status: 202,
            },
          ),
          "400": badRequest,
          "413": requestTooLarge,
          "500": serverError,
        },
      },
    },
    "/users/reset-password": {
      post: {
        tags: ["Usuarios"],
        summary: "Restablecer contraseña",
        operationId: "resetPassword",
        requestBody: jsonRequest("ResetPasswordRequest", {
          token: "<token-de-recuperacion>",
          password: "nueva-clave-segura",
        }),
        responses: {
          "200": response(
            "Contraseña actualizada.",
            emptyBody,
            { body: {}, message: "La contraseña se actualizó correctamente.", status: 200 },
          ),
          "400": response("Token inválido o datos incorrectos.", emptyBody, errorExample(400, "El token no es válido o ha expirado.")),
          "413": requestTooLarge,
          "500": serverError,
        },
      },
    },
    "/posts": {
      get: {
        tags: ["Publicaciones"],
        summary: "Listar publicaciones",
        operationId: "listPosts",
        security: [{ bearerAuth: [] }, {}],
        parameters: [
          {
            name: "status",
            in: "query",
            required: false,
            description: "Filtra por estado de publicación.",
            schema: { type: "string", enum: ["true", "false"] },
          },
        ],
        responses: {
          "200": response(
            "Publicaciones listadas.",
            { type: "object", required: ["posts"], properties: { posts: { type: "array", items: ref("Post") } } },
            { body: { posts: [] }, message: "Publicaciones listadas correctamente.", status: 200 },
          ),
          "400": badRequest,
          "500": serverError,
        },
      },
      post: {
        tags: ["Publicaciones"],
        summary: "Crear publicación",
        description:
          "Requiere autenticación. El usuario autor se obtiene del JWT. Se requiere texto o una URL de imagen.",
        operationId: "createPost",
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequest("CreatePostRequest", {
          text: "Descripción de la publicación",
          image: "https://example.com/imagen.jpg",
        }),
        responses: {
          "201": response(
            "Publicación creada.",
            postBody,
            {
              body: {
                post: {
                  id: "1",
                  user_id: "123",
                  title: "Mi primera publicación",
                  text: "Descripción de la publicación",
                  image: "https://example.com/imagen.jpg",
                  status: false,
                  created_at: "2026-11-18T20:00:00.000Z",
                  likes_count: 0,
                  author_name: "Ana Pérez",
                  followers_count: 0,
                  following_count: 0,
                  liked_by_me: false,
                  is_following: false,
                },
              },
              message: "Publicación creada correctamente.",
              status: 201,
            },
          ),
          "400": badRequest,
          "401": unauthorized,
          "413": requestTooLarge,
          "500": serverError,
        },
      },
    },
    "/posts/{id}/like": {
      parameters: [idParameter],
      post: {
        tags: ["Publicaciones"],
        summary: "Alternar me gusta",
        description:
          "Requiere Bearer. Inserta o elimina el like y ajusta likes_count en una transacción.",
        operationId: "togglePostLike",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": response(
            "Estado del like actualizado.",
            {
              type: "object",
              required: ["liked", "post"],
              properties: { liked: { type: "boolean" }, post: ref("Post") },
            },
            { body: { liked: true, post: { id: "1", user_id: "12", title: "Mi publicación", text: "Descripción", image: "", status: false, created_at: "2026-11-18T20:00:00.000Z", likes_count: 1, author_name: "Ana Pérez", followers_count: 0, following_count: 0, liked_by_me: true, is_following: false } }, message: "Me gusta agregado correctamente.", status: 200 },
          ),
          "400": badRequest,
          "401": unauthorized,
          "404": notFound,
          "500": serverError,
        },
      },
    },
    "/posts/{id}": {
      parameters: [idParameter],
      get: {
        tags: ["Publicaciones"],
        summary: "Consultar publicación",
        operationId: "getPost",
        security: [{ bearerAuth: [] }, {}],
        responses: {
          "200": response(
            "Publicación encontrada.",
            postBody,
            { body: { post: { id: "1", user_id: "12", title: "Mi primera publicación", text: "Descripción", image: "https://example.com/imagen.jpg", status: false, created_at: "2026-11-18T20:00:00.000Z", likes_count: 0, author_name: "Ana Pérez", followers_count: 0, following_count: 0, liked_by_me: false, is_following: false } }, message: "Publicación encontrada.", status: 200 },
          ),
          "400": badRequest,
          "404": notFound,
          "500": serverError,
        },
      },
      delete: {
        tags: ["Publicaciones"],
        summary: "Eliminar publicación propia",
        description: "Solo el usuario autor puede eliminar la publicación.",
        operationId: "deletePost",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": response(
            "Publicación eliminada.",
            postBody,
            { body: { post: { id: "1", user_id: "12", title: "Mi publicación", text: "Descripción", image: "https://example.com/imagen.jpg", status: false, created_at: "2026-11-18T20:00:00.000Z", likes_count: 0 } }, message: "Publicación eliminada correctamente.", status: 200 },
          ),
          "400": badRequest,
          "401": unauthorized,
          "404": notFound,
          "500": serverError,
        },
      },
    },
    "/bots": {
      get: {
        tags: ["Bots"],
        summary: "Listar bots",
        operationId: "listBots",
        responses: {
          "200": response(
            "Bots listados.",
            { type: "object", required: ["bots"], properties: { bots: { type: "array", items: ref("Bot") } } },
            { body: { bots: [] }, message: "Herramientas listadas correctamente.", status: 200 },
          ),
          "500": serverError,
        },
      },
      post: {
        tags: ["Bots"],
        summary: "Crear bot",
        description: "Requiere token Bearer y permisos de administrador (`ADMINS`).",
        operationId: "createBot",
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequest("BotRequest", {
          nombre: "Bot de ejemplo",
          profit_factor: 2.5,
          win_rate: 72.5,
          profit_1_year: 4200,
          drawdown: 800,
          imagen: "https://example.com/bot.jpg",
          descripcion: "Descripción del bot.",
        }),
        responses: {
          "201": response(
            "Bot creado.",
            botBody,
            { body: { bot: { id: "1", nombre: "Bot de ejemplo", profit_factor: 2.5, win_rate: 72.5, profit_1_year: 4200, drawdown: 800, imagen: "https://example.com/bot.jpg", descripcion: "Descripción del bot.", created_at: "2026-11-18T20:00:00.000Z", updated_at: "2026-11-18T20:00:00.000Z" } }, message: "Herramienta creada correctamente.", status: 201 },
          ),
          "400": badRequest,
          "401": unauthorized,
          "403": forbidden,
          "413": requestTooLarge,
          "500": serverError,
        },
      },
    },
    "/bots/{id}": {
      parameters: [idParameter],
      get: {
        tags: ["Bots"],
        summary: "Consultar bot",
        operationId: "getBot",
        responses: {
          "200": response(
            "Bot encontrado.",
            botBody,
            { body: { bot: { id: "1", nombre: "Bot de ejemplo", profit_factor: 2.5, win_rate: 72.5, profit_1_year: 4200, drawdown: 800, imagen: "https://example.com/bot.jpg", descripcion: "Descripción del bot.", created_at: "2026-11-18T20:00:00.000Z", updated_at: "2026-11-18T20:00:00.000Z" } }, message: "Herramienta encontrada.", status: 200 },
          ),
          "400": badRequest,
          "404": notFound,
          "500": serverError,
        },
      },
      put: {
        tags: ["Bots"],
        summary: "Reemplazar datos de un bot",
        description: "Reemplaza todos sus campos. Requiere Bearer y permisos de administrador.",
        operationId: "replaceBot",
        security: [{ bearerAuth: [] }],
        requestBody: jsonRequest("BotRequest", {
          nombre: "Bot de ejemplo",
          profit_factor: 2.5,
          win_rate: 72.5,
          profit_1_year: 4200,
          drawdown: 800,
          imagen: "https://example.com/bot.jpg",
          descripcion: "Descripción del bot.",
        }),
        responses: {
          "200": response(
            "Bot actualizado.",
            botBody,
            { body: { bot: { id: "1", nombre: "Bot de ejemplo", profit_factor: 2.5, win_rate: 72.5, profit_1_year: 4200, drawdown: 800, imagen: "https://example.com/bot.jpg", descripcion: "Descripción del bot.", created_at: "2026-11-18T20:00:00.000Z", updated_at: "2026-11-18T20:00:00.000Z" } }, message: "Herramienta actualizada correctamente.", status: 200 },
          ),
          "400": badRequest,
          "401": unauthorized,
          "403": forbidden,
          "404": notFound,
          "413": requestTooLarge,
          "500": serverError,
        },
      },
      delete: {
        tags: ["Bots"],
        summary: "Eliminar bot",
        description: "Requiere Bearer y permisos de administrador.",
        operationId: "deleteBot",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": response(
            "Bot eliminado.",
            botBody,
            { body: { bot: { id: "1", nombre: "Bot de ejemplo", profit_factor: 2.5, win_rate: 72.5, profit_1_year: 4200, drawdown: 800, imagen: "https://example.com/bot.jpg", descripcion: "Descripción del bot.", created_at: "2026-11-18T20:00:00.000Z", updated_at: "2026-11-18T20:00:00.000Z" } }, message: "Herramienta eliminada correctamente.", status: 200 },
          ),
          "400": badRequest,
          "401": unauthorized,
          "403": forbidden,
          "404": notFound,
          "500": serverError,
        },
      },
    },
    "/images": {
      post: {
        tags: ["Imágenes"],
        summary: "Subir imagen",
        description:
          "Guarda la imagen en el servidor. El ID es el hash SHA-256 de su contenido y el nombre del archivo incluye ese hash.",
        operationId: "uploadImage",
        requestBody: imageUploadRequest,
        responses: {
          "201": response(
            "Imagen guardada.",
            imageBody,
            { body: { id: "a".repeat(64), name: `${"a".repeat(64)}.png` }, message: "Imagen guardada correctamente.", status: 201 },
          ),
          "400": badRequest,
          "413": response("La imagen supera el tamaño permitido.", emptyBody, errorExample(413, "La solicitud es demasiado grande.")),
          "500": serverError,
        },
      },
    },
    "/images/{id}": {
      parameters: [imageIdParameter],
      put: {
        tags: ["Imágenes"],
        summary: "Reemplazar imagen",
        description:
          "Carga una imagen nueva, guarda su archivo con su nuevo hash y elimina el archivo anterior asociado al ID de la ruta.",
        operationId: "replaceImage",
        requestBody: imageUploadRequest,
        responses: {
          "200": response(
            "Imagen reemplazada.",
            imageBody,
            { body: { id: "b".repeat(64), name: `${"b".repeat(64)}.png` }, message: "Imagen reemplazada correctamente.", status: 200 },
          ),
          "400": badRequest,
          "404": notFound,
          "413": response("La imagen supera el tamaño permitido.", emptyBody, errorExample(413, "La solicitud es demasiado grande.")),
          "500": serverError,
        },
      },
      delete: {
        tags: ["Imágenes"],
        summary: "Eliminar imagen",
        operationId: "deleteImage",
        responses: {
          "200": response(
            "Imagen eliminada.",
            imageBody,
            { body: { id: "a".repeat(64), name: `${"a".repeat(64)}.png` }, message: "Imagen eliminada correctamente.", status: 200 },
          ),
          "400": badRequest,
          "404": notFound,
          "500": serverError,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      User: {
        type: "object",
        required: [
          "id",
          "nombreCompleto",
          "direccion",
          "telefono",
          "whatsapp",
          "correoElectronico",
          "urlDocumentoIdentidad",
          "urlReciboServicio",
          "urlContratoDisclaimer",
          "urlComprobanteAceptacion",
          "fechaCreacion",
          "fechaActualizacion",
          "estado",
        ],
        properties: {
          id: { type: "string", example: "12" },
          nombreCompleto: { type: "string", maxLength: 120 },
          direccion: { type: "string" },
          telefono: { type: "string", maxLength: 40 },
          whatsapp: { type: "string", maxLength: 40 },
          correoElectronico: { type: "string", format: "email", maxLength: 320 },
          urlDocumentoIdentidad: { type: "string" },
          urlReciboServicio: { type: "string" },
          urlContratoDisclaimer: { type: "string" },
          urlComprobanteAceptacion: { type: "string" },
          fechaCreacion: { type: "string", format: "date-time" },
          fechaActualizacion: { type: "string", format: "date-time" },
          estado: { type: "string" },
        },
      },
      RegistrationRequest: {
        type: "object",
        required: ["password"],
        allOf: [
          {
            anyOf: [
              { required: ["nombreCompleto"] },
              { required: ["name"] },
              { required: ["full_name"] },
            ],
          },
          {
            anyOf: [
              { required: ["correoElectronico"] },
              { required: ["email"] },
            ],
          },
        ],
        properties: {
          nombreCompleto: { type: "string", maxLength: 120 },
          name: { type: "string", maxLength: 120, description: "Alias aceptado para nombreCompleto." },
          full_name: { type: "string", maxLength: 120, description: "Alias aceptado para nombreCompleto." },
          correoElectronico: { type: "string", format: "email", maxLength: 320 },
          email: { type: "string", format: "email", maxLength: 320, description: "Alias aceptado para correoElectronico." },
          password: { type: "string", minLength: 8, maxLength: 72, description: "Entre 8 y 72 bytes UTF-8." },
          direccion: { type: "string" },
          telefono: { type: "string", maxLength: 40, description: "Número internacional con código de país." },
          whatsapp: { type: "string", maxLength: 40, description: "Número internacional con código de país." },
          urlDocumentoIdentidad: { type: "string" },
          urlReciboServicio: { type: "string" },
          urlContratoDisclaimer: { type: "string" },
          urlComprobanteAceptacion: { type: "string" },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["password"],
        anyOf: [
          { required: ["correoElectronico"] },
          { required: ["email"] },
        ],
        properties: {
          correoElectronico: { type: "string", format: "email" },
          email: { type: "string", format: "email", description: "Alias aceptado para correoElectronico." },
          password: { type: "string", maxLength: 72 },
        },
      },
      EmailRequest: {
        type: "object",
        anyOf: [
          { required: ["correoElectronico"] },
          { required: ["email"] },
        ],
        properties: {
          correoElectronico: { type: "string", format: "email" },
          email: { type: "string", format: "email", description: "Alias aceptado para correoElectronico." },
        },
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["token", "password"],
        properties: {
          token: { type: "string" },
          password: { type: "string", minLength: 8, maxLength: 72, description: "Entre 8 y 72 bytes UTF-8." },
        },
      },
      Post: {
        type: "object",
        required: ["id", "user_id", "title", "text", "image", "status", "created_at", "likes_count"],
        properties: {
          id: { type: "string" },
          user_id: { type: "string" },
          title: { type: "string", maxLength: 200 },
          text: { type: "string" },
          image: { type: "string", description: "URL HTTP(S) o cadena vacía." },
          status: { type: "boolean" },
          created_at: { type: "string", format: "date-time" },
          likes_count: { type: "integer", minimum: 0 },
          author_name: { type: "string" },
          followers_count: { type: "integer", minimum: 0 },
          following_count: { type: "integer", minimum: 0 },
          liked_by_me: { type: "boolean" },
          is_following: { type: "boolean" },
        },
      },
      CreatePostRequest: {
        type: "object",
        anyOf: [{ required: ["text"] }, { required: ["image"] }],
        properties: {
          title: { type: "string", maxLength: 200 },
          text: { type: "string", maxLength: 5000 },
          image: { type: "string", format: "uri", description: "URL HTTP o HTTPS." },
        },
      },
      Bot: {
        type: "object",
        required: [
          "id",
          "nombre",
          "profit_factor",
          "win_rate",
          "profit_1_year",
          "drawdown",
          "imagen",
          "descripcion",
          "created_at",
          "updated_at",
        ],
        properties: {
          id: { type: "string" },
          nombre: { type: "string", maxLength: 200 },
          profit_factor: { type: "number", minimum: 0 },
          win_rate: { type: "number", minimum: 0, maximum: 100 },
          profit_1_year: { type: "number" },
          drawdown: { type: "number", minimum: 0 },
          imagen: { type: "string", maxLength: 2048 },
          descripcion: { type: "string" },
          created_at: { type: "string", format: "date-time" },
          updated_at: { type: "string", format: "date-time" },
        },
      },
      BotRequest: {
        type: "object",
        required: [
          "nombre",
          "profit_factor",
          "win_rate",
          "profit_1_year",
          "drawdown",
          "imagen",
          "descripcion",
        ],
        properties: {
          nombre: { type: "string", minLength: 1, maxLength: 200 },
          profit_factor: { type: "number", minimum: 0 },
          win_rate: { type: "number", minimum: 0, maximum: 100 },
          profit_1_year: { type: "number" },
          drawdown: { type: "number", minimum: 0 },
          imagen: { type: "string", minLength: 1, maxLength: 2048 },
          descripcion: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

export default openApiDocument;
