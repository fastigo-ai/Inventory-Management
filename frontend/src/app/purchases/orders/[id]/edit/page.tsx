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
      <div className="flex-1 flex items-center justify-center bg-slate-50 h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Loading Purchase Order...</p>
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
