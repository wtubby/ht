/**
 * @name umi 的路由配置
 * @description 只支持 path,component,routes,redirect,wrappers,name,icon 的配置
 * @param path  path 只支持两种占位符配置，第一种是动态参数 :id 的形式，第二种是 * 通配符，通配符只能出现路由字符串的最后。
 * @param component 配置 location 和 path 匹配后用于渲染的 React 组件路径。可以是绝对路径，也可以是相对路径，如果是相对路径，会从 src/pages 开始找起。
 * @param routes 配置子路由，通常在需要为多个路径增加 layout 组件时使用。
 * @param redirect 配置路由跳转
 * @param wrappers 配置路由组件的包装组件，通过包装组件可以为当前的路由组件组合进更多的功能。 比如，可以用于路由级别的权限校验
 * @param name 配置路由的标题，默认读取国际化文件 menu.ts 中 menu.xxxx 的值，如配置 name 为 login，则读取 menu.ts 中 menu.login 的取值作为标题
 * @param icon 配置路由的图标，取值参考 https://ant.design/components/icon-cn， 注意去除风格后缀和大小写，如想要配置图标为 <StepBackwardOutlined /> 则取值应为 stepBackward 或 StepBackward，如想要配置图标为 <UserOutlined /> 则取值应为 user 或者 User
 * @doc https://umijs.org/docs/guides/routes
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        path: '/user/login',
        layout: false,
        name: 'login',
        component: './user/login',
      },
      {
        path: '/user',
        redirect: '/user/login',
      },
      {
        component: '404',
        path: '*',
      },
    ],
  },
  {
    path: '/dashboard',
    name: '数据分析',
    icon: 'dashboard',
    component: './dashboard/analysis',
  },
  {
    path: '/main-contracts',
    name: '总包合同',
    icon: 'project',
    component: './MainContract',
  },
  {
    path: '/sub-contracts',
    name: '分包合同',
    icon: 'apartment',
    component: './SubContract',
  },
  {
    path: '/receive',
    name: '收款管理',
    icon: 'transaction',
    component: './Receive',
  },
  {
    path: '/payments',
    name: '付款管理',
    icon: 'accountBook',
    component: './Payment',
  },
  {
    path: '/bonds',
    name: '担保管理',
    icon: 'safety',
    component: './Bond',
  },

  {
    path: '/invoice-in',
    name: '进项发票',
    icon: 'fileText',
    component: './InvoiceIn',
  },
  {
    path: '/invoice-out',
    name: '销项发票',
    icon: 'fileText',
    component: './InvoiceOut',
  },
  {
    path: '/company',
    name: '单位管理',
    icon: 'bank',
    component: './Company',
  },
  {
    path: '/files',
    name: '文件管理',
    icon: 'folder',
    component: './File',
  },
  {
    path: '/system-settings',
    name: '系统设置',
    icon: 'setting',
    component: './SystemSettings',
  },
  {
    name: '个人页',
    icon: 'user',
    path: '/account',
    hideInMenu: true,
    routes: [
      {
        path: '/account',
        redirect: '/account/settings',
      },
      {
        name: '账户安全',
        icon: 'lock',
        path: '/account/settings',
        component: './account/settings',
      },
    ],
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    component: './404',
  },
];
