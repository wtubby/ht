import { useSearchParams } from '@umijs/max';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { BondCreatePreset, BondType } from './bond.shared';
import BondDetail from './BondDetail';
import BondForm from './BondForm';
import BondList, { BondListRef } from './BondList';
import { pickSearchParams } from '@/utils/listSearchParams';

const BondsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentRecord, setCurrentRecord] = useState<API.Bond | undefined>(undefined);
  const [formVisible, setFormVisible] = useState<boolean>(false);
  const [detailVisible, setDetailVisible] = useState<boolean>(false);
  const [createPreset, setCreatePreset] = useState<BondCreatePreset | undefined>(undefined);
  const bondListRef = useRef<BondListRef>(null);
  const registeredBondIdRef = useRef<number | null>(null);

  const initialFilters = useMemo(() => {
    const filters = pickSearchParams(searchParams, ['status']);
    if (!searchParams.get('sub_contract_id')) {
      Object.assign(filters, pickSearchParams(searchParams, ['bond_type']));
    }
    return filters;
  }, [searchParams]);

  useEffect(() => {
    const bondId = searchParams.get('bond_id');
    if (bondId) {
      setCurrentRecord({ id: Number(bondId) } as API.Bond);
      setDetailVisible(true);

      const next = new URLSearchParams(searchParams);
      next.delete('bond_id');
      setSearchParams(next, { replace: true });
      return;
    }

    const subContractId = searchParams.get('sub_contract_id');
    if (!subContractId) return;

    const bondType = searchParams.get('bond_type') as BondType | null;
    setCreatePreset({
      sub_contract_id: Number(subContractId),
      bond_type: bondType === '民工保证金' ? '民工保证金' : '履约保证金',
    });
    setCurrentRecord(undefined);
    setFormVisible(true);

    const next = new URLSearchParams(searchParams);
    next.delete('sub_contract_id');
    next.delete('bond_type');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleViewDetail = (record: API.Bond) => {
    setFormVisible(false);
    setCreatePreset(undefined);
    setCurrentRecord(record);
    setDetailVisible(true);
  };

  const handleEdit = (record: API.Bond) => {
    setDetailVisible(false);
    setCreatePreset(undefined);
    setCurrentRecord(record);
    setFormVisible(true);
  };

  const handleCreate = (preset?: BondCreatePreset) => {
    setCreatePreset(preset);
    setCurrentRecord(undefined);
    setFormVisible(true);
  };

  const handleDataRefresh = () => {
    bondListRef.current?.reload();
  };

  const handleFormCancel = () => {
    setFormVisible(false);
    setCreatePreset(undefined);
    setCurrentRecord(undefined);
  };

  const handleBondRegistered = (bondId: number) => {
    registeredBondIdRef.current = bondId;
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    setCreatePreset(undefined);
    setCurrentRecord(undefined);

    const focusId = registeredBondIdRef.current;
    registeredBondIdRef.current = null;
    if (focusId) {
      bondListRef.current?.focusCreatedBond(focusId);
      return;
    }

    handleDataRefresh();
  };

  const handleDetailCancel = () => {
    setDetailVisible(false);
    setCurrentRecord(undefined);
  };

  return (
    <>
      <BondList
        ref={bondListRef}
        onViewDetail={handleViewDetail}
        onEdit={handleEdit}
        onCreate={handleCreate}
        initialFilters={initialFilters}
      />
      <BondForm
        visible={formVisible}
        currentRecord={currentRecord}
        createPreset={createPreset}
        onCancel={handleFormCancel}
        onSuccess={handleFormSuccess}
        onRegistered={handleBondRegistered}
      />
      <BondDetail
        visible={detailVisible}
        currentRecord={currentRecord}
        onCancel={handleDetailCancel}
        onRefund={handleDataRefresh}
      />
    </>
  );
};

export default BondsPage;
