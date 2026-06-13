import chalk from 'chalk';
import ora from 'ora';

export const logger = {
  info: (msg: string) => console.log(chalk.blue('ℹ'), msg),
  success: (msg: string) => console.log(chalk.green('✓'), msg),
  warn: (msg: string) => console.log(chalk.yellow('⚠'), msg),
  error: (msg: string) => console.log(chalk.red('✗'), msg),
  raw: (msg: string) => console.log(msg),
  heading: (msg: string) => console.log(chalk.bold.cyan(`\n${msg}`)),
};

export function createSpinner(text: string) {
  const spinner = ora({ text, color: 'cyan' });
  return {
    start: () => { spinner.start(); return spinner; },
    succeed: (msg?: string) => { spinner.succeed(msg || text); },
    fail: (msg?: string) => { spinner.fail(msg || text); },
    update: (text: string) => { spinner.text = text; },
  };
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function resolvePort(cliPort?: number, configPort?: number, defaultPort: number = 3456): number {
  return cliPort ?? configPort ?? defaultPort;
}
