export class CliError extends Error {
  public readonly exitCode: number;
  public readonly details?: unknown;

  public constructor(message: string, exitCode = 1, details?: unknown) {
    super(message);
    this.name = "CliError";
    this.exitCode = exitCode;
    this.details = details;
  }
}
