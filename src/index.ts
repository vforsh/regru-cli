import { buildProgram } from "./cli/program.ts";
import { CliError } from "./lib/errors.ts";
import { detectJsonMode } from "./lib/options.ts";
import { writeJson } from "./lib/output.ts";

export async function main(argv: string[]): Promise<void> {
  const jsonMode = detectJsonMode(argv);

  try {
    const program = buildProgram();
    await program.parseAsync(argv);
  } catch (error) {
    if (error instanceof CliError) {
      if (jsonMode) {
        writeJson({
          error: {
            message: error.message,
            exitCode: error.exitCode,
            details: error.details ?? null
          }
        });
      } else {
        process.stderr.write(`${error.message}\n`);
      }
      process.exit(error.exitCode);
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    if (jsonMode) {
      writeJson({
        error: {
          message,
          exitCode: 1
        }
      });
    } else {
      process.stderr.write(`${message}\n`);
    }
    process.exit(1);
  }
}
