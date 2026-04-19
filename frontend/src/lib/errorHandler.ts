import { message } from "antd";
import { clearToken } from "./auth";
import type { ApiErr } from "./http";

// 错误类型定义
export type AppError = {
  code: string;
  message: string;
  details?: unknown;
};

// 错误处理函数
export function handleApiError(error: ApiErr | Error | unknown): void {
  let errorMessage = "操作失败，请重试";
  let errorCode = "UNKNOWN_ERROR";

  if (error && typeof error === "object") {
    if ("error" in error && typeof error.error === "object") {
      // API 错误
      const apiError = error as ApiErr;
      errorMessage = apiError.error.message || errorMessage;
      errorCode = apiError.error.code || errorCode;
    } else if ("message" in error) {
      // 普通错误对象
      errorMessage = (error as Error).message || errorMessage;
    }
  }

  // 处理特定错误
  switch (errorCode) {
    case "UNAUTHORIZED":
    case "HTTP_401":
      // 未授权，清除 token 并跳转到登录页
      clearToken();
      window.location.href = "/";
      break;
    case "NETWORK_ERROR":
      errorMessage = "网络异常，请检查网络连接";
      break;
    case "FORBIDDEN":
    case "HTTP_403":
      errorMessage = "权限不足，无法执行此操作";
      break;
    case "NOT_FOUND":
    case "HTTP_404":
      errorMessage = "请求的资源不存在";
      break;
    case "HTTP_500":
      errorMessage = "服务器内部错误，请稍后重试";
      break;
    default:
      // 其他错误
      break;
  }

  // 显示错误消息
  message.error(errorMessage);
  
  // 记录错误
  console.error("API Error:", errorCode, errorMessage, error);
}

// 异步操作错误处理包装器
export async function handleAsync<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    handleApiError(error);
    return null;
  }
}

// 表单错误处理
export function handleFormError(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return (error as Error).message;
  }
  return "表单验证失败";
}
