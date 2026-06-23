import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import type { RequestOptions } from '@@/plugin-request/request';
import type { RequestConfig } from '@umijs/max';
import { isSessionAuthError } from '@/utils/apiError';
import { clearAuthTokens, getAccessToken, redirectToLogin } from '@/utils/auth';
import { Modal, message, notification } from 'antd';

// 错误处理方案： 错误类型
enum ErrorShowType {
  SILENT = 0,
  WARN_MESSAGE = 1,
  ERROR_MESSAGE = 2,
  NOTIFICATION = 3,
  REDIRECT = 9,
}

// 与后端约定的响应数据格式
interface ResponseStructure {
  success: boolean;
  data: any;
  errorCode?: number;
  errorMessage?: string;
  showType?: ErrorShowType;
}

type RuntimeSettings = Partial<LayoutSettings> & { logo?: string; title?: string | false };

type AppInitialState = {
  settings?: RuntimeSettings;
  currentUser?: API.CurrentUser;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
};

type InitialStateSetter = (
  updater:
    | AppInitialState
    | undefined
    | ((state: AppInitialState | undefined) => AppInitialState | undefined),
) => void | Promise<void>;

let setInitialStateRef: InitialStateSetter | null = null;
let isLoggingOut = false;

const LOGOUT_MESSAGE = '登录已失效，请重新登录';

/** 绑定 layout 中的 setInitialState，供登出/过期时清除 currentUser */
export function bindSetInitialState(fn: InitialStateSetter) {
  setInitialStateRef = fn;
}

/** 认证失败：弹窗提示并跳转登录（方案 A：会话失效类 401 走此出口） */
export function forceLogout(tip = LOGOUT_MESSAGE) {
  if (isLoggingOut) return;
  isLoggingOut = true;

  clearAuthTokens();
  setInitialStateRef?.((s) => ({ ...(s ?? {}), currentUser: undefined }));

  Modal.warning({
    title: '提示',
    content: tip,
    okText: '重新登录',
    centered: true,
    maskClosable: false,
    keyboard: false,
    closable: false,
    onOk: () => {
      redirectToLogin(true);
    },
    afterClose: () => {
      isLoggingOut = false;
    },
  });
}

function markAuthError(error: unknown) {
  if (error && typeof error === 'object') {
    (error as { isAuthError?: boolean }).isAuthError = true;
  }
  return error;
}

function handleUnauthorized(error: any) {
  if (!isSessionAuthError(error)) {
    return Promise.reject(error);
  }

  forceLogout(LOGOUT_MESSAGE);
  return Promise.reject(markAuthError(error));
}

/**
 * @name 错误处理
 * pro 自带的错误处理， 可以在这里做自己的改动
 * @doc https://umijs.org/docs/max/request#配置
 */
export const errorConfig: RequestConfig = {
  // 错误处理： umi@3 的错误处理方案。
  errorConfig: {
    // 错误抛出
    errorThrower: (res) => {
      const { success, data, errorCode, errorMessage, showType } =
        res as unknown as ResponseStructure;
      if (!success) {
        const error: any = new Error(errorMessage);
        error.name = 'BizError';
        error.info = { errorCode, errorMessage, showType, data };
        throw error; // 抛出自制的错误
      }
    },
    // 错误接收及处理
    errorHandler: async (error: any, opts: any) => {
      if (opts?.skipErrorHandler) throw error;
      if (error?.isAuthError) return;

      // 我们的 errorThrower 抛出的错误。
      if (error.name === 'BizError') {
        const errorInfo: ResponseStructure | undefined = error.info;
        if (errorInfo) {
          const { errorMessage, errorCode } = errorInfo;
          switch (errorInfo.showType) {
            case ErrorShowType.SILENT:
              // do nothing
              break;
            case ErrorShowType.WARN_MESSAGE:
              message.warning(errorMessage);
              break;
            case ErrorShowType.ERROR_MESSAGE:
              message.error(errorMessage);
              break;
            case ErrorShowType.NOTIFICATION:
              notification.open({
                description: errorMessage,
                message: errorCode,
              });
              break;
            case ErrorShowType.REDIRECT:
              forceLogout(LOGOUT_MESSAGE);
              break;
            default:
              message.error(errorMessage);
          }
        }
      } else if (error.response) {
        const { status } = error.response;

        if (status === 401) {
          // 已在响应拦截器中处理
          return;
        }
        message.error(`请求错误: ${status}`);
      } else if (error.request) {
        message.error('网络异常，请检查网络连接');
      } else {
        message.error('请求失败，请重试');
      }
    },
  },

  // 请求拦截器
  requestInterceptors: [
    (config: RequestOptions) => {
      const token = getAccessToken();
      if (token && !config.skipAuth) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
      return config;
    },
  ],

  // 响应拦截器：会话失效类 401 统一登出，不自动刷新 Token
  responseInterceptors: [
    [(response) => response, (error: any) => handleUnauthorized(error) as Promise<any>],
  ],
};
