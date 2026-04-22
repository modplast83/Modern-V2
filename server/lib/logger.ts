type LogLevel = "debug" | "info" | "warn" | "error";

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  redactSensitiveData: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig;

  constructor() {
    const isProduction = process.env.NODE_ENV === "production";

    this.config = {
      level: isProduction ? "warn" : "debug",
      enableConsole: true,
      redactSensitiveData: isProduction,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.level];
  }

  private redact(data: any): any {
    if (!this.config.redactSensitiveData) {
      return data;
    }

    if (typeof data === "string") {
      return data
        .replace(/user[_\s]?id[:\s=]+\d+/gi, "user_id=[REDACTED]")
        .replace(/session[_\s]?id[:\s=]+[\w-]+/gi, "session_id=[REDACTED]")
        .replace(/password[:\s=]+.+/gi, "password=[REDACTED]")
        .replace(/token[:\s=]+[\w.-]+/gi, "token=[REDACTED]")
        .replace(/api[_\s]?key[:\s=]+[\w-]+/gi, "api_key=[REDACTED]")
        .replace(
          /authorization:\s*bearer\s+[\w.-]+/gi,
          "authorization: Bearer [REDACTED]",
        );
    }

    if (typeof data === "object" && data !== null) {
      const redacted = { ...data };
      const sensitiveKeys = [
        "password",
        "token",
        "apiKey",
        "api_key",
        "accessToken",
        "access_token",
        "refreshToken",
        "refresh_token",
        "secret",
        "authorization",
        "sessionId",
        "session_id",
      ];

      for (const key of Object.keys(redacted)) {
        if (
          sensitiveKeys.some((sk) =>
            key.toLowerCase().includes(sk.toLowerCase()),
          )
        ) {
          redacted[key] = "[REDACTED]";
        } else if (typeof redacted[key] === "object") {
          redacted[key] = this.redact(redacted[key]);
        }
      }

      return redacted;
    }

    return data;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    ...args: any[]
  ): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.map((arg) => {
      // Handle Error objects specially to preserve stack traces
      if (arg instanceof Error) {
        const errorObj = {
          name: arg.name,
          message: this.config.redactSensitiveData
            ? this.redact(arg.message)
            : arg.message,
          stack: this.config.redactSensitiveData
            ? this.redact(arg.stack || "")
            : arg.stack,
        };
        return errorObj;
      }
      return this.redact(arg);
    });

    const argsString =
      formattedArgs.length > 0
        ? " " +
          formattedArgs
            .map((arg) => {
              if (typeof arg === "object" && arg !== null) {
                // For error objects and other objects, use JSON.stringify
                return JSON.stringify(arg, null, 2);
              }
              return String(arg);
            })
            .join(" ")
        : "";

    return `[${timestamp}] [${level.toUpperCase()}] ${message}${argsString}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog("debug") && this.config.enableConsole) {
      console.log(this.formatMessage("debug", message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog("info") && this.config.enableConsole) {
      console.log(this.formatMessage("info", message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog("warn") && this.config.enableConsole) {
      console.warn(this.formatMessage("warn", message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog("error") && this.config.enableConsole) {
      console.error(this.formatMessage("error", message, ...args));
    }
  }

  session(action: string, userId?: number): void {
    if (process.env.NODE_ENV === "production") {
      this.info(`Session ${action}`, userId ? { userId: "[REDACTED]" } : {});
    } else {
      this.debug(`Session ${action}`, userId ? { userId } : {});
    }
  }
}

export const logger = new Logger();
export default logger;
