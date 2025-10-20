/**
 * Extracts a user-friendly error message from API errors
 */
export function extractErrorMessage(error: unknown): string {
  if (!error) {
    return "An unexpected error occurred";
  }

  // Handle error object
  if (typeof error === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const err = error as any;

    // Extract status code from various possible locations
    const status = err.status || err.response?.status || err.statusCode;

    // Handle specific status codes with detailed messages
    if (status === 409) {
      // Conflict - idempotency key error
      const message =
        err.message || err.response?.data?.message || err.data?.message;

      if (message && typeof message === "string") {
        return message;
      }
      return "Idempotency key already used with different request body";
    }

    if (status === 400) {
      // Bad Request - validation errors
      const message =
        err.message ||
        err.response?.data?.message ||
        err.data?.message ||
        err.body?.message;

      // Handle array of validation errors
      if (Array.isArray(message)) {
        return message.join("; ");
      }

      // Handle object of validation errors
      if (message && typeof message === "object") {
        const errors = Object.values(message as Record<string, string>);
        if (errors.length > 0) {
          return errors.join("; ");
        }
      }

      if (typeof message === "string") {
        return message;
      }

      return "Validation error. Please check your input.";
    }

    if (status === 401) {
      return "Unauthorized. Please log in again.";
    }

    if (status === 403) {
      return "You don't have permission to perform this action.";
    }

    if (status === 404) {
      return "Resource not found.";
    }

    if (status === 422) {
      // Unprocessable Entity
      const message =
        err.message || err.response?.data?.message || err.data?.message;

      // Handle array of validation errors
      if (Array.isArray(message)) {
        return message.join("; ");
      }

      // Handle object of validation errors
      if (message && typeof message === "object") {
        const errors = Object.values(message as Record<string, string>);
        if (errors.length > 0) {
          return errors.join("; ");
        }
      }

      if (typeof message === "string") {
        return message;
      }

      return "Unable to process request. Please check your input.";
    }

    if (status >= 500) {
      return "Server error. Please try again later.";
    }

    // Try to extract message from various locations
    const message =
      err.message ||
      err.response?.data?.message ||
      err.data?.message ||
      err.body?.message ||
      err.error?.message;

    if (typeof message === "string" && message) {
      return message;
    }

    // Handle network errors
    if (err.name === "TypeError" && err.message?.includes("fetch")) {
      return "Connection error. Please check your internet connection.";
    }

    if (err.code === "ERR_NETWORK" || err.message?.includes("Network")) {
      return "Connection error. Please check your internet connection.";
    }
  }

  // Handle string errors
  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred. Please try again.";
}
