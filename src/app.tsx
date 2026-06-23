import { SiderUserFooter } from '@/components';
import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { RequestConfig, RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import defaultSettings from '../config/defaultSettings';
import { bindSetInitialState, errorConfig } from './requestErrorConfig';
import { getPublicSystemSettings } from './services/wtu/systemSettings.api';
import { getCurrentUser } from './services/wtu/user.api';
import { hasAccessToken, LOGIN_PATH } from './utils/auth';

// 创建 QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5分钟内数据视为新鲜
      retry: 1, // 失败重试1次
      refetchOnWindowFocus: false, // 窗口聚焦时不自动刷新
    },
  },
});
const isDev = process.env.NODE_ENV === 'development';
const loginPath = LOGIN_PATH;
type RuntimeSettings = Partial<LayoutSettings> & { logo?: string; title?: string | false };

/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */
export async function getInitialState(): Promise<{
  settings?: RuntimeSettings;
  currentUser?: API.CurrentUser;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  let settings: RuntimeSettings = defaultSettings as RuntimeSettings;
  try {
    const settingsResp = await getPublicSystemSettings({ skipErrorHandler: true });
    if (settingsResp?.success && settingsResp.data) {
      settings = {
        ...settings,
        title: settingsResp.data.system_name,
        ...(settingsResp.data.system_logo ? { logo: settingsResp.data.system_logo } : {}),
      };
    }
  } catch (error) {
    // ignore
  }

  const fetchUserInfo = async () => {
    try {
      const msg = await getCurrentUser({
        skipErrorHandler: true,
      });
      // Data mapping: backend fields -> frontend fields
      if (msg.data) {
        const userData = msg.data as API.CurrentUser & { user_role?: string };
        const currentUser: API.CurrentUser = {
          ...userData,
          name: userData.username,
          userid: userData.id?.toString(),
          access: userData.user_role ?? userData.role,
        };
        return currentUser;
      }
      return undefined;
    } catch {
      // 会话失效由响应拦截器统一 forceLogout
    }
    return undefined;
  };
  // 如果不是登录页面，执行
  const { location } = history;
  if (![loginPath].includes(location.pathname)) {
    if (hasAccessToken()) {
      const currentUser = await fetchUserInfo();
      return {
        fetchUserInfo,
        currentUser,
        settings,
      };
    } else {
      history.push(loginPath);
      return {
        fetchUserInfo,
        settings,
      };
    }
  }
  return {
    fetchUserInfo,
    settings,
  };
}

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {
  bindSetInitialState(setInitialState);

  return {
    rightContentRender: false,
    menuFooterRender: (props) => <SiderUserFooter collapsed={props?.collapsed} />,
    footerRender: false,
    onPageChange: () => {
      const { location } = history;
      // 无用户且无 token 时跳转登录；有 token 时由 forceLogout 或 fetchUserInfo 处理
      if (
        !initialState?.currentUser &&
        !hasAccessToken() &&
        location.pathname !== loginPath
      ) {
        history.push(loginPath);
      }
    },
    menuHeaderRender: undefined,
    childrenRender: (children) => {
      return (
        <ConfigProvider locale={zhCN}>
          <App>
            <QueryClientProvider client={queryClient}>
              {children}
              {isDev && (
                <SettingDrawer
                  disableUrlParams
                  enableDarkTheme
                  settings={initialState?.settings}
                  onSettingChange={(settings) => {
                    setInitialState((preInitialState) => ({
                      ...preInitialState,
                      settings,
                    }));
                  }}
                />
              )}
            </QueryClientProvider>
          </App>
        </ConfigProvider>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request: RequestConfig = {
  ...errorConfig,
};
