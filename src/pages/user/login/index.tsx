import { Footer } from '@/components';
import { getPublicSystemSettings } from '@/services/wtu/systemSettings.api';
import { login } from '@/services/wtu/user.api';
import { setAuthTokens } from '@/utils/auth';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormCheckbox, ProFormText } from '@ant-design/pro-components';
import { Helmet, useModel } from '@umijs/max';
import { Alert, message } from 'antd';
import { createStyles } from 'antd-style';
import React, { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import Settings from '../../../../config/defaultSettings';

const useStyles = createStyles(() => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'auto',
    backgroundImage:
      "url('https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/V-_oS6r-i7wAAAAAAAAAAAAAFl94AQBr')",
    backgroundSize: '100% 100%',
  },
  loginWrapper: {
    '& .ant-pro-form-login-header': {
      marginBottom: 40,
      height: 44,
    },
    '& .ant-pro-form-login-logo': {
      marginBottom: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      '& img': {
        width: 44,
        height: 44,
        objectFit: 'contain',
        display: 'block',
      },
    },
    '& .ant-pro-form-login-title': {
      marginBlockEnd: 0,
      position: 'static',
      insetBlockStart: 'unset',
      lineHeight: '44px',
    },
    '& .ant-pro-form-login-main': {
      marginTop: 8,
    },
  },
}));

const LoginMessage: React.FC<{ content: string }> = ({ content }) => (
  <Alert style={{ marginBottom: 24 }} message={content} type="error" showIcon />
);

const Login: React.FC = () => {
  const [loginFailed, setLoginFailed] = useState(false);
  const [siteTitle, setSiteTitle] = useState<string>(String(Settings.title || '项目管理系统'));
  const [siteLogo, setSiteLogo] = useState<string>('/logo.png');
  const { initialState, setInitialState } = useModel('@@initialState');
  const { styles } = useStyles();

  useEffect(() => {
    const loadPublicSettings = async () => {
      try {
        const resp = await getPublicSystemSettings({ skipErrorHandler: true });
        if (resp?.data?.system_name) {
          setSiteTitle(resp.data.system_name);
        }
        if (resp?.data?.system_logo) {
          setSiteLogo(resp.data.system_logo);
        }
      } catch (error) {
        // ignore
      }
    };
    loadPublicSettings();
  }, []);

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      flushSync(() => {
        setInitialState((s) => ({
          ...s,
          currentUser: userInfo,
        }));
      });
    }
  };

  const handleSubmit = async (values: API.LoginParams) => {
    try {
      setLoginFailed(false);
      const { autoLogin, ...credentials } = values;
      const msg = await login({ ...credentials, type: 'account' }, { skipAuth: true });
      if (msg?.accessToken) {
        message.success('登录成功！');
        setAuthTokens({
          accessToken: msg.accessToken,
          refreshToken: msg.refreshToken,
          persistent: !!autoLogin,
        });
        await fetchUserInfo();
        const urlParams = new URL(window.location.href).searchParams;
        window.location.href = urlParams.get('redirect') || '/';
        return;
      }
      setLoginFailed(true);
    } catch {
      setLoginFailed(true);
      message.error('登录失败，请重试！');
    }
  };

  return (
    <div className={styles.container}>
      <Helmet>
        <title>登录页 - {siteTitle}</title>
      </Helmet>
      <div style={{ flex: 1, padding: '48px 0' }} className={styles.loginWrapper}>
        <LoginForm
          contentStyle={{ minWidth: 280, maxWidth: '75vw', paddingTop: 24 }}
          logo={
            <img
              alt="logo"
              src={siteLogo}
              style={{ width: 44, height: 44, objectFit: 'contain', display: 'block' }}
            />
          }
          title={siteTitle}
          subTitle=""
          initialValues={{ autoLogin: true }}
          onFinish={async (values) => {
            await handleSubmit(values as API.LoginParams);
          }}
        >
          {loginFailed && <LoginMessage content="用户名或密码错误" />}

          <ProFormText
            name="username"
            fieldProps={{ size: 'large', prefix: <UserOutlined /> }}
            placeholder="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          />
          <ProFormText.Password
            name="password"
            fieldProps={{ size: 'large', prefix: <LockOutlined /> }}
            placeholder="密码"
            rules={[{ required: true, message: '请输入密码' }]}
          />

          <div style={{ marginBottom: 24 }}>
            <ProFormCheckbox noStyle name="autoLogin">
              自动登录
            </ProFormCheckbox>
          </div>
        </LoginForm>
      </div>
      <Footer />
    </div>
  );
};

export default Login;
