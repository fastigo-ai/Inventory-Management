"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getPurchaseOrderById } from '@/features/purchases/api/purchases.api';
import { NewPurchaseOrderForm } from '@/features/purchases/components/NewPurchaseOrderForm';

export default function EditPurchaseOrderPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchOrderDetails();
    }
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setIsLoading(true);
      const orderData = await getPurchaseOrderById(id);
      if (orderData) {
        setOrder(orderData);
      } else {
        router.push('/purchases/orders');
      }
    } catch (err) {
      console.error('Failed to fetch PO:', err);
      router.push('/purchases/orders');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50 h-full p-6 animate-pulse space-y-6">
        <div className="w-48 h-8 bg-slate-200 rounded"></div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="w-1/4 h-4 bg-slate-200 rounded"></div>
              <div className="w-full h-10 bg-slate-200 rounded"></div>
            </div>
            <div className="space-y-4">
              <div className="w-1/4 h-4 bg-slate-200 rounded"></div>
              <div className="w-full h-10 bg-slate-200 rounded"></div>
            </div>
          </div>
          <div className="w-full h-40 bg-slate-200 rounded mt-4"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return null;
  }

  return (
    <div className="h-full bg-slate-50/50">
      <NewPurchaseOrderForm initialData={order} orderId={id} />
    </div>
  );
}
