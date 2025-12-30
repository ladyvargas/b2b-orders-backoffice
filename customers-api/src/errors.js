class HttpError extends Error {
  constructor(status, codigo, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }
}

function badRequest(codigo, mensaje, detalles) {
  return new HttpError(
    400,
    codigo || "BAD_REQUEST",
    mensaje || "La petición es inválida",
    detalles
  );
}

function unauthorized() {
  return new HttpError(
    401,
    "UNAUTHORIZED",
    "No autorizado"
  );
}

function forbidden(codigo, mensaje) {
  return new HttpError(
    403,
    codigo || "FORBIDDEN",
    mensaje || "La operación no está permitida"
  );
}

function notFound(codigo, mensaje) {
  return new HttpError(
    404,
    codigo || "NOT_FOUND",
    mensaje || "El recurso no existe"
  );
}

function conflict(codigo, mensaje) {
  return new HttpError(
    409,
    codigo || "CONFLICT",
    mensaje || "Existe un conflicto con el estado actual"
  );
}

module.exports = {
  HttpError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict
};
