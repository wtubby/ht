declare namespace API {
  type CurrentUser = {
    name?: string;
    avatar?: string;
    userid?: string;
    email?: string;
    signature?: string;
    title?: string;
    group?: string;
    tags?: { key?: string; label?: string }[];
    notifyCount?: number;
    unreadCount?: number;
    country?: string;
    access?: string;
    geographic?: {
      province?: { label?: string; key?: string };
      city?: { label?: string; key?: string };
    };
    address?: string;
    phone?: string;
    id?: number;
    username?: string;
    role?: string;
    full_name?: string;
  };

  type LoginResult = {
    status?: string;
    type?: string;
    currentAuthority?: string;
    id?: number;
    username?: string;
    email?: string;
    role?: string;
    accessToken?: string;
    refreshToken?: string;
  };

  type LoginParams = {
    username?: string;
    password?: string;
    autoLogin?: boolean;
    type?: string;
  };

  export type PageParams = {
    current?: number;
    pageSize?: number;
  };

  // 公司类型定义
  export type Company = {
    id: number;
    company_type: string;
    company_name: string;
    credit_code?: string;
    legal_person?: string;
    reg_capital?: number;
    establish_date?: string;
    address?: string;
    remarks?: string;
    company_status: string;
    /** 关联合同份数（总包 + 分包，列表/详情接口返回） */
    contract_count?: number;
    created_by: number;
    created_at: string;
    updated_by?: number;
    updated_at: string;
  };

  // 总包合同类型定义
  export type MainContract = {
    id?: number;
    contract_status?: '未签约' | '执行中' | '已完工' | '已完结';
    contract_name: string;
    party_a_id: number;
    party_b_id: number;
    amount_contract: number;
    amount_settlement?: number;
    date_signed?: string;
    warranty_years?: number;
    date_warranty?: string;
    date_start?: string;
    date_end?: string;
    remarks?: string;
    created_by?: number;
    updated_by?: number;
    created_at?: string;
    updated_at?: string;
    // 关联数据
    partyA?: Company;
    partyB?: Company;
    creator?: {
      id: number;
      username: string;
      full_name: string;
    };
    // 统计数据（实时计算）
    total_received?: number; // 总收款金额
    total_invoiced?: number; // 总开票金额
    has_files?: boolean; // 是否包含附件文件
  };

  export type MainContractList = {
    data: MainContract[];
    total: number;
    success: boolean;
  };

  // 分包合同类型定义
  export type SubContract = {
    id?: number;
    main_contract_id: number;
    contract_status?: '未签约' | '执行中' | '已完工' | '已完结';
    contract_type: '专业分包' | '劳务分包' | '其他服务' | '材料采购';
    party_b_id: number;
    party_c_id: number;
    contract_name: string;
    amount_contract: number;
    amount_settlement?: number;
    date_signed?: string;
    remarks?: string;
    bond_perf_req?: boolean;
    bond_labor_req?: boolean;
    bond_perf_amt?: number;
    bond_labor_amt?: number;
    bond_perf_form?: '现金' | '保函' | '不限';
    bond_labor_form?: '现金' | '保函' | '不限';
    created_by?: number;
    updated_by?: number;
    created_at?: string;
    updated_at?: string;
    // 关联数据
    mainContract?: {
      id: number;
      contract_name: string;
      contract_status?: string;
      amount_contract?: number;
      partyA?: Company;
      partyB?: Company;
    };
    partyB?: Company;
    partyC?: Company;
    creator?: {
      id: number;
      username: string;
      full_name: string;
    };
    // 统计数据
    total_paid?: number; // 总付款金额(由后端 findAll 实时聚合)
    total_invoiced?: number; // 总进项发票金额(由后端 findAll 实时聚合)
    has_files?: boolean; // 是否包含附件文件
    bonds?: Array<{
      id: number;
      bond_type: '履约保证金' | '民工保证金';
      bond_form?: '现金' | '保函';
      status: '担保中' | '已退还' | '已过期';
      display_status?: '担保中' | '已退还' | '已过期';
      amount?: number;
      date_start?: string;
      date_end?: string;
      organization?: string;
    }>;
    bond_registry?: Record<
      '履约保证金' | '民工保证金',
      {
        bond_id: number | null;
        required: boolean;
        planned_amount: number | null;
        planned_form: '现金' | '保函' | '不限' | null;
      }
    >;
    pending_bond_types?: Array<'履约保证金' | '民工保证金'>;
  };

  export type SubContractList = {
    data: SubContract[];
    total: number;
    success: boolean;
  };

  // 付款管理类型定义
  export type Payment = {
    id?: number;
    payment_date: string;
    payment_amount: number;
    sub_contract_id: number;
    main_contract_id?: number;
    payer_name: string;
    payee_name: string;
    account_name: string;
    bank_name: string;
    account_number: string;
    remarks?: string;
    created_by?: number;
    updated_by?: number;
    created_at?: string;
    updated_at?: string;
    // 关联数据
    subContract?: SubContract;
    creator?: {
      id: number;
      full_name: string;
    };
    has_files?: boolean; // 是否包含附件文件
    // 统计数据
    total_paid?: number; // 该分包合同的总付款金额（所有付款记录的总和）
  };

  export type PaymentList = {
    data: Payment[];
    total: number;
    success: boolean;
  };

  // 收款管理类型定义
  export type Receive = {
    id?: number;
    receive_amount: number;
    main_contract_id: number;
    payer_name: string;
    payee_name: string;
    account_name?: string;
    bank_name?: string;
    account_number?: string;
    receive_date: string;
    receive_status: '待确认' | '已确认';
    remarks?: string;
    created_by?: number;
    updated_by?: number;
    created_at?: string;
    updated_at?: string;
    // 关联数据
    mainContract?: {
      id: number;
      contract_name: string;
      amount_contract?: number;
      contract_status?: string;
      partyA?: Company;
      partyB?: Company;
    };
    creator?: {
      id: number;
      full_name: string;
    };
    has_files?: boolean;
    // 统计数据
    total_received?: number; // 该总包合同的总收款金额（所有收款记录的总和）
  };

  export type ReceiveList = {
    data: Receive[];
    total: number;
    success: boolean;
  };

  // 公司列表类型定义
  export type CompanyList = {
    data: Company[];
    total: number;
    success: boolean;
  };

  // 公司银行账户类型定义
  export type CompanyBankAccount = {
    id?: number;
    company_id?: number;
    account_name: string;
    account_number: string;
    bank_name: string;
    is_default?: boolean | 0 | 1;
    account_status?: '正常' | '冻结' | '销户';
    remarks?: string;
    created_by?: number;
    updated_by?: number;
    created_at?: string;
    updated_at?: string;
    /** EditableProTable 新建行时的临时行键 */
    key?: string;
  };

  export type CompanyBankAccountList = {
    data: CompanyBankAccount[];
    total: number;
    success: boolean;
  };

  // 项目收款进度类型定义
  export type ProjectReceiveProgress = {
    id: number;
    projectName: string;
    totalAmount: number;
    receivedAmount: number;
    receiveRate: number;
  };

  // 工程款支付申请表数据类型定义
  export type PaymentApplicationData = {
    // 付款记录信息
    payment: Payment;
    // 主合同信息
    mainContract: {
      id: number;
      contract_name: string;
      amount_contract: number;
      total_received: number;
      total_invoiced: number; // 主合同总开票金额
      receives: Array<{
        // 主合同收款记录
        id: number;
        receive_amount: number;
        receive_date: string;
      }>;
      receivesByOrder: number[]; // 按时间排序的收款金额数组 [0]第一次, [1]第二次, [2]第三次, [3]第四次（最多4条）
      invoices: Array<{
        // 主合同销项发票记录
        id: number;
        invoice_amount: number;
        invoice_date: string;
      }>;
      partyA?: Company;
      partyB?: Company;
    };
    // 所有分包合同列表(不再按类型分组)
    allSubContracts: Array<{
      id: number;
      contract_name: string;
      contract_type: string;
      amount_contract: number;
      total_paid: number;
      total_invoiced: number;
      partyB?: Company;
      partyC?: Company;
    }>;
    // 当前分包合同汇总（合同金额 / 累计已付）
    summary: {
      total_contract_amount: number;
      total_paid_amount: number;
    };
    // 当前付款的分包合同信息
    currentSubContract: {
      id: number;
      contract_name: string;
      contract_type: string;
      amount_contract: number;
      paymentsByOrder: number[]; // 按时间排序的付款金额数组 [0]第一次, [1]第二次, [2]第三次, [3]第四次（最多4条）
    };
  };

  // 进项发票类型定义
  export type InvoiceIn = {
    id?: number;
    invoice_no: string;
    invoice_amount: number;
    sub_contract_id: number;
    buyer: string;
    seller: string;
    invoice_date: string;
    tax_rate?: number;
    remarks?: string;
    created_by?: number;
    updated_by?: number;
    created_at?: string;
    updated_at?: string;
    // 关联数据
    subContract?: {
      id: number;
      contract_name: string;
      main_contract_id?: number;
    };
    creator?: {
      id: number;
      full_name: string;
    };
    has_files?: boolean; // 是否包含附件文件
  };

  export type InvoiceInList = {
    data: InvoiceIn[];
    total: number;
    success: boolean;
  };

  // 销项发票类型定义
  export type InvoiceOut = {
    id?: number;
    invoice_no: string;
    invoice_amount: number;
    main_contract_id: number;
    buyer: string;
    seller: string;
    invoice_date: string;
    tax_rate?: number;
    remarks?: string;
    created_by?: number;
    updated_by?: number;
    created_at?: string;
    updated_at?: string;
    // 关联数据
    mainContract?: {
      id: number;
      contract_name: string;
      contract_status?: string;
      amount_contract?: number;
      total_invoiced?: number; // 总开票金额(实时计算)
    };
    creator?: {
      id: number;
      full_name: string;
    };
    has_files?: boolean; // 是否包含附件文件
  };

  export type InvoiceOutList = {
    data: InvoiceOut[];
    total: number;
    success: boolean;
  };

  // 保证金类型定义
  export type Bond = {
    id?: number;
    sub_contract_id: number;
    bond_type: '履约保证金' | '民工保证金';
    bond_form: '现金' | '保函';
    amount?: number;
    status: '担保中' | '已退还' | '已过期';
    display_status?: '担保中' | '已退还' | '已过期';
    bond_ratio?: number;
    planned_amount?: number | null;
    planned_form?: '现金' | '保函' | '不限' | null;
    account_name?: string;
    account_number?: string;
    bank_name?: string;
    organization?: string;
    date_start?: string;
    date_end?: string;
    remarks?: string;
    created_by?: string;
    created_at?: string;
    updated_by?: string;
    updated_at?: string;
    // 关联数据
    subContract?: {
      id: number;
      contract_name: string;
      amount_contract?: number;
      amount_settlement?: number;
      partyC?: Pick<Company, 'id' | 'company_name'>;
      mainContract?: {
        id: number;
        contract_name: string;
      };
    };
    creator?: {
      id: number;
      username: string;
      full_name: string;
    };
  };

  export type BondList = {
    data: Bond[];
    total: number;
    success: boolean;
  };

  export type BondWarning = {
    code: string;
    message: string;
    planned_amount?: number;
    actual_amount?: number;
    planned_form?: string;
    actual_form?: string;
  };

  export type BondResponse = {
    success: boolean;
    data: Bond;
    warnings?: BondWarning[];
    message?: string;
  };

  export type BondListResponse = {
    success: boolean;
    data: Bond[];
  };

  // 文件管理类型定义
  export type File = {
    id?: number;
    file_module: string;
    record_id?: number;
    main_contract_id?: number;
    sub_contract_id?: number;
    original_filename: string;
    file_size: number;
    file_type: string;
    file_path: string;
    uploaded_at: string;
    uploaded_by: number;
    created_by: number;
    created_at: string;
    updated_by?: number;
    updated_at?: string;
    // 关联数据
    mainContract?: {
      id: number;
      contract_name: string;
    };
    subContract?: {
      id: number;
      contract_name: string;
    };
    uploader?: {
      id: number;
      username: string;
      full_name?: string;
    };
  };

  export type FileList = {
    data: File[];
    total: number;
    success: boolean;
  };

  export type FileResponse = {
    success: boolean;
    data: File;
    message?: string;
  };

  export type FileCommitResponse = {
    success: boolean;
    data: Array<{
      id: number;
      status: string;
      file_path?: string;
    }>;
    message?: string;
  };

  export type FileModuleConfig = {
    file_module: string;
    entity_type: 'MAIN' | 'SUB';
    dir_suffix: string;
    description?: string;
  };

  export type FileModuleConfigList = {
    success: boolean;
    data: FileModuleConfig[];
  };

  // OCR识别结果类型定义
  export type OcrResult = {
    invoice_no?: string;
    invoice_date?: string;
    buyer?: string;
    seller?: string;
    invoice_amount?: number;
    tax_rate?: number;
    remarks?: string;
  };

  // 仪表盘统计数据类型定义
  export type DashboardStatistics = {
    overview: {
      mainContract: {
        count: number;
        totalAmount: number;
        settlementAmount: number;
      };
      subContract: {
        count: number;
        totalAmount: number;
        settlementAmount: number;
      };
      receive: {
        count: number;
        totalAmount: number;
        receiveRate: number;
      };
      invoiceOut: {
        count: number;
        totalAmount: number;
      };
      invoiceIn: {
        count: number;
        totalAmount: number;
      };
      file: {
        count: number;
        totalSize: number;
      };
      profit: {
        amount: number;
        rate: number;
      };
    };
    distribution: {
      mainContractStatus: Array<{
        contract_status: string;
        count: number;
      }>;
      subContractType: Array<{
        contract_type: string;
        count: number;
      }>;
      bondStatus: Array<{
        bond_status: string;
        count: number;
        total_amount: number;
      }>;
      fileModule: Array<{
        file_module: string;
        count: number;
      }>;
    };
    timeRange: string;
  };

  // 仪表盘趋势数据类型定义
  export type DashboardTrend = {
    contractTrend: Array<{
      date: string;
      count: number;
      amount: number;
    }>;
    receiveTrend: Array<{
      date: string;
      count: number;
      amount: number;
    }>;
    invoiceOutTrend: Array<{
      date: string;
      count: number;
      amount: number;
    }>;
    invoiceInTrend: Array<{
      date: string;
      count: number;
      amount: number;
    }>;
    type: string;
  };

  export type DashboardExpirationItem = {
    type: 'bond' | 'warranty';
    id: number;
    title: string;
    relatedName: string | null;
    dateEnd: string;
    daysLeft: number;
  };

  export type DashboardUpcomingExpirations = {
    days: number;
    items: DashboardExpirationItem[];
    overdueItems: DashboardExpirationItem[];
    overdueCount: number;
  };
}
