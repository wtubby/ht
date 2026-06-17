import { TestBrowser } from '@@/testBrowser';
import { render } from '@testing-library/react';

describe('Login Page', () => {
  it('should show login form', async () => {
    const rootContainer = render(
      <TestBrowser
        location={{
          pathname: '/user/login',
        }}
      />,
    );

    expect(await rootContainer.findByText('项目管理系统')).toBeInTheDocument();
    expect(await rootContainer.findByPlaceholderText('用户名')).toBeInTheDocument();
    expect(await rootContainer.findByPlaceholderText('密码')).toBeInTheDocument();

    rootContainer.unmount();
  });
});
