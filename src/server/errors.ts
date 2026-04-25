export class UnauthorizedError extends Error {
  constructor() {
    super("Nao autenticado.");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Sem permissao para esta acao.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
