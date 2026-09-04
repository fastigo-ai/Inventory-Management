'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { getContractorInvoiceById } from '@/features/contractor-billing/api/contractor-billing.api';
import { getBillingCompanies } from '@/features/settings/api/billingCompanies.api';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Download, Edit } from 'lucide-react';
import { toast } from 'sonner';

export default function ContractorInvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const id = unwrappedParams.id;

  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [billingCompany, setBillingCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const [res, companyRes] = await Promise.all([
          getContractorInvoiceById(id),
          getBillingCompanies()
        ]);
        
        if (res.success) {
          setInvoice(res.data);
        } else {
          toast.error('Failed to load invoice details');
        }

        if (companyRes.success && companyRes.data?.length > 0) {
          setBillingCompany(companyRes.data[0]);
        }
      } catch (err) {
        console.error(err);
        toast.error('An error occurred while fetching the invoice');
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchInvoice();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Invoice not found.</p>
        <Button variant="link" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const contractorName = invoice.contractorId?.dynamicData?.displayName || invoice.contractorId?.dynamicData?.companyName || 'Unknown Contractor';
  
  const rawAddress = invoice.contractorId?.dynamicData?.contractorAddress || invoice.contractorId?.dynamicData?.registeredAddress;
  let contractorAddress = 'Address not provided';
  if (typeof rawAddress === 'string' && rawAddress.trim()) {
    contractorAddress = rawAddress;
  } else if (rawAddress?.billing) {
    const b = rawAddress.billing;
    contractorAddress = [b.street1, b.street2, b.city, b.state, b.zip, b.country].filter(Boolean).join(', ');
  } else if (typeof rawAddress === 'object' && rawAddress !== null) {
    contractorAddress = Object.values(rawAddress).filter(v => typeof v === 'string' && v.trim()).join(', ') || 'Address not provided';
  }

  const contractorContact = invoice.contractorId?.dynamicData?.emailAddress || invoice.contractorId?.dynamicData?.phone?.work || invoice.contractorId?.dynamicData?.contactPersons || 'Contact not provided';
  
  const issueDate = new Date(invoice.date);
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + 15); // Standard 15 day payment terms

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      {/* Action Bar */}
      <div className="w-full mx-auto mb-6 flex justify-between items-center print:hidden">
        <Button variant="ghost" onClick={() => router.back()} className="text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Billing
        </Button>
        <div className="flex gap-3">
          {['Draft', 'Pending PM Approval', 'Rejected'].includes(invoice.status) && (
            <Button variant="outline" onClick={() => router.push(`/site-portal/contractor-billing/${id}/edit`)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Bill
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="w-full mx-auto bg-white shadow-lg print:shadow-none print:w-full">
        <div className="p-10 md:p-14">
          
          {/* Header */}
          <div className="flex justify-between items-start mb-12">
            <div className="flex items-center gap-3">
              {billingCompany?.logoUrl ? (
                <img src={billingCompany.logoUrl} alt={billingCompany?.name || 'Company Logo'} className="h-12 w-auto object-contain" />
              ) : (
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-xl">{billingCompany?.name?.charAt(0) || 'F'}</span>
                </div>
              )}
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{billingCompany?.name || 'Fastigo'}</h1>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-wider mb-2">Contractor Bill</h2>
              <p className="text-sm text-slate-500 font-medium">Stage: {invoice.stage}</p>
            </div>
          </div>

          {/* Details Section */}
          <div className="grid grid-cols-2 gap-12 mb-12">
            {/* Left Col - Contract & Client */}
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-bold text-slate-800 bg-slate-100 p-2 mb-2">Contract Details</h3>
                <div className="grid grid-cols-[100px_1fr] gap-y-1 text-sm">
                  <div className="font-semibold text-slate-700">Contractor</div>
                  <div className="border border-slate-300 px-2 py-0.5">{contractorName}</div>
                  <div className="font-semibold text-slate-700">Address</div>
                  <div className="border border-slate-300 px-2 py-0.5">{contractorAddress}</div>
                  <div className="font-semibold text-slate-700">Phone/Email</div>
                  <div className="border border-slate-300 px-2 py-0.5">{contractorContact}</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 bg-slate-100 p-2 mb-2">Client Details</h3>
                <div className="grid grid-cols-[100px_1fr] gap-y-1 text-sm">
                  <div className="font-semibold text-slate-700">Client</div>
                  <div className="border border-slate-300 px-2 py-0.5">{billingCompany?.name || 'Fastigo Pvt Ltd'}</div>
                  <div className="font-semibold text-slate-700">Address</div>
                  <div className="border border-slate-300 px-2 py-0.5 whitespace-pre-wrap">{billingCompany?.address || '123 Tech Park, Phase 1, Bangalore'}</div>
                  <div className="font-semibold text-slate-700">Contact</div>
                  <div className="border border-slate-300 px-2 py-0.5">{billingCompany?.email || billingCompany?.phone || 'finance@fastigo.com'}</div>
                </div>
              </div>
            </div>

            {/* Right Col - Bill Info */}
            <div>
              <div className="mt-8">
                <div className="grid grid-cols-[100px_1fr] gap-y-1 text-sm justify-end ml-auto max-w-[250px]">
                  <div className="font-semibold text-slate-700">Bill No.</div>
                  <div className="border border-slate-300 px-2 py-0.5 bg-white text-right font-medium">{invoice.invoiceNumber}</div>
                  <div className="font-semibold text-slate-700">Issue Date</div>
                  <div className="border border-slate-300 px-2 py-0.5 bg-white text-right">{format(issueDate, 'yyyy-MM-dd')}</div>
                  <div className="font-semibold text-slate-700">Due Date</div>
                  <div className="border border-slate-300 px-2 py-0.5 bg-white text-right">{format(dueDate, 'yyyy-MM-dd')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Work Details</h3>
            <table className="w-full text-xs md:text-sm border-collapse border border-slate-400 print:text-[10px]">
              <thead>
                <tr className="bg-slate-200">
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-left font-bold text-slate-800">Activity</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-left font-bold text-slate-800">Description of Work</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-center font-bold text-slate-800">Temp Code</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-center font-bold text-slate-800">LOA Sl No</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-center font-bold text-slate-800">Category</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-bold text-slate-800">Qty</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-bold text-slate-800">Rate</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-bold text-slate-800">GST %</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-bold text-slate-800">Stage %</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-bold text-slate-800">Base Amt</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-bold text-slate-800">GST Amt</th>
                  <th className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-bold text-slate-800">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.map((item: any, idx: number) => {
                  const qty = item.billingCategory === 'JMC Done' ? item.jmcDoneQty : item.erectedQty;
                  const matchedWoItem = invoice.workOrderId?.items?.find((woItem: any) => 
                    (woItem.itemId?._id || woItem.itemId)?.toString() === (item.itemId?._id || item.itemId)?.toString()
                  );
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-slate-700">{item.activity}</td>
                      <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2">{item.description}</td>
                      <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-center text-slate-600 whitespace-nowrap">{matchedWoItem?.tempCode || '-'}</td>
                      <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-center text-slate-600 whitespace-nowrap">{matchedWoItem?.loaSrNo || '-'}</td>
                      <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-center text-slate-600 whitespace-nowrap">{item.billingCategory}</td>
                      <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-semibold">{qty}</td>
                      <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right">{item.rate?.toFixed(2)}</td>
                      <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right whitespace-nowrap">{item.gstRate}%</td>
                      <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right whitespace-nowrap">{item.percentageApplied}%</td>
                      <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right">{item.baseAmount?.toFixed(2)}</td>
                      <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right">{item.gstAmount?.toFixed(2)}</td>
                      <td className="border border-slate-400 px-1 py-1 md:px-3 md:py-2 text-right font-medium">{item.totalAmount?.toFixed(2)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-16">
            <div className="w-[300px]">
              <div className="grid grid-cols-[120px_1fr] gap-y-1 text-sm font-medium">
                <div className="text-slate-800">Subtotal</div>
                <div className="border border-slate-400 px-3 py-1 text-right">{invoice.totalBaseAmount?.toFixed(2)}</div>
                
                <div className="text-slate-800">Discount</div>
                <div className="border border-slate-400 px-3 py-1 text-right">0.00</div>
                
                <div className="text-slate-800">Tax Amount</div>
                <div className="border border-slate-400 px-3 py-1 text-right">{invoice.totalGstAmount?.toFixed(2)}</div>
                
                <div className="text-slate-900 font-bold mt-1">Total Due</div>
                <div className="border border-slate-400 px-3 py-1 text-right font-bold bg-slate-100 mt-1">
                  {invoice.grandTotal?.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-start pt-8 border-t border-slate-300">
            {/* Payment Terms */}
            <div className="w-1/2">
              <h4 className="text-sm font-bold text-slate-800 mb-2">Payment Terms</h4>
              <div className="text-xs text-slate-600 space-y-1">
                {invoice.contractorId?.dynamicData?.paymentTerms && Array.isArray(invoice.contractorId.dynamicData.paymentTerms) && invoice.contractorId.dynamicData.paymentTerms.some((pt: any) => pt.stage || pt.percentage || pt.remark) ? (
                  invoice.contractorId.dynamicData.paymentTerms.map((term: any, idx: number) => {
                    if (!term.stage && !term.percentage && !term.remark) return null;
                    return (
                      <p key={idx}>
                        {idx + 1}. {term.stage} {term.percentage ? `(${term.percentage}%)` : ''} {term.remark ? `- ${term.remark}` : ''}
                      </p>
                    );
                  })
                ) : (
                  <>
                    <p>1. Payment will be made within 15 days of invoice submission.</p>
                    <p>2. Applicable taxes will be deducted at source (TDS).</p>
                    <p>3. Subject to verification of work as per JMC/Erection records.</p>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-end mt-16 pt-8">
              <div>
                <div className="border-t border-slate-800 w-48 mb-2"></div>
                <p className="font-bold text-slate-800 text-sm">Prepared by</p>
              </div>
              <div>
                <div className="border-t border-slate-800 w-48 mb-2"></div>
                <p className="font-bold text-slate-800 text-sm">Approved by (Client)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
