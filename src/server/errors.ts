export class UnauthorizedError extends Error {
  constructor() {
    super("Nao autenticado.");
    this.name = "UnauthorizedError";
  }
}
