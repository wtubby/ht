import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import React, { useCallback } from 'react';

interface ListToolbarProps {
  /** Input.Search 占位提示文字 */
  placeholder?: string;
  /** 新建按钮文字（前缀图标固定为 PlusOutlined） */
  createText?: string;
  /** 搜索回调（含清空触发），入参为搜索词 */
  onSearch: (value: string) => void;
  /** 新建按钮点击回调 */
  onCreate: () => void;
}

/**
 * 通用列表工具栏：搜索框 + 新建按钮
 *
 * 统一处理以下行为：
 * - Input.Search allowClear 清空时自动触发 onSearch('')
 * - 搜索宽度固定 300px
 * - 返回数组格式，适配 ProTable toolBarRender
 */
const ListToolbar: React.FC<ListToolbarProps> = ({
  placeholder = '搜索',
  createText = '新建',
  onSearch,
  onCreate,
}) => {
  // Input.Search 的 allowClear 点击清除按钮不会触发 onSearch，需要借助 onChange 检测空值
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.value) {
        onSearch('');
      }
    },
    [onSearch],
  );

  return (
    <>
      <Input.Search
        key="search"
        placeholder={placeholder}
        allowClear
        enterButton={<SearchOutlined />}
        onSearch={onSearch}
        onChange={handleChange}
        style={{ width: 300 }}
      />
      <Button type="primary" key="primary" onClick={onCreate}>
        <PlusOutlined /> {createText}
      </Button>
    </>
  );
};

export default ListToolbar;
