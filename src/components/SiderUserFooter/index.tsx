import { logout } from '@/services/wtu/user.api';
import { clearAuthTokens } from '@/utils/auth';
import { LockOutlined, LogoutOutlined } from '@ant-design/icons';
import { history, useModel } from '@umijs/max';
import { Avatar, Dropdown, Spin, Tooltip } from 'antd';
import { createStyles } from 'antd-style';
import { stringify } from 'querystring';
import React, { useCallback } from 'react';
import { flushSync } from 'react-dom';

const DEFAULT_AVATAR =
  'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png';

const useStyles = createStyles(({ token }) => ({
  footer: {
    borderTop: `1px solid ${token.colorSplit}`,
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: token.colorBgTextHover,
    },
  },
  collapsed: {
    justifyContent: 'center',
    padding: '12px 8px',
  },
  info: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  name: {
    fontSize: 14,
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: token.colorText,
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    padding: '16px 0',
  },
}));

type SiderUserFooterProps = {
  collapsed?: boolean;
};

export const SiderUserFooter: React.FC<SiderUserFooterProps> = ({ collapsed }) => {
  const { styles } = useStyles();
  const { initialState, setInitialState } = useModel('@@initialState');

  const loginOut = async () => {
    try {
      await logout();
    } finally {
      clearAuthTokens();
    }
    const { search, pathname } = window.location;
    const urlParams = new URL(window.location.href).searchParams;
    const redirect = urlParams.get('redirect');
    if (window.location.pathname !== '/user/login' && !redirect) {
      history.replace({
        pathname: '/user/login',
        search: stringify({
          redirect: pathname + search,
        }),
      });
    }
  };

  const onMenuClick = useCallback(
    ({ key }: { key: string }) => {
      if (key === 'logout') {
        flushSync(() => {
          setInitialState((s) => ({ ...s, currentUser: undefined }));
        });
        loginOut();
        return;
      }
      history.push('/account/settings');
    },
    [setInitialState],
  );

  if (!initialState) {
    return (
      <div className={styles.loading}>
        <Spin size="small" />
      </div>
    );
  }

  const { currentUser } = initialState;
  if (!currentUser?.name) {
    return (
      <div className={styles.loading}>
        <Spin size="small" />
      </div>
    );
  }

  const menuItems = [
    {
      key: 'settings',
      icon: <LockOutlined />,
      label: '账户安全',
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
    },
  ];

  const avatar = (
    <Avatar size="small" src={currentUser.avatar || DEFAULT_AVATAR} alt={currentUser.name} />
  );

  const trigger = collapsed ? (
    <Tooltip title={currentUser.name} placement="right">
      <div className={`${styles.footer} ${styles.collapsed}`}>{avatar}</div>
    </Tooltip>
  ) : (
    <div className={styles.footer}>
      {avatar}
      <div className={styles.info}>
        <div className={styles.name}>{currentUser.name}</div>
      </div>
    </div>
  );

  return (
    <Dropdown
      menu={{ selectedKeys: [], onClick: onMenuClick, items: menuItems }}
      placement="topRight"
      trigger={['click']}
    >
      {trigger}
    </Dropdown>
  );
};
