import React from 'react';
import { CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';

interface PaymentsSectionProps {
  isMobile?: boolean;
  paymentsLoading: boolean;
  payments: any[];
  setActiveReceipt: (p: any) => void;
  setReceiptModalOpen: (open: boolean) => void;
  setActiveInvoice: (p: any) => void;
  setInvoiceModalOpen: (open: boolean) => void;
}

export default function PaymentsSection({
  isMobile = false,
  paymentsLoading,
  payments,
  setActiveReceipt,
  setReceiptModalOpen,
  setActiveInvoice,
  setInvoiceModalOpen
}: PaymentsSectionProps) {

  if (isMobile) {
    return (
      <div className="p-4 border-t border-border/45 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
        {paymentsLoading ? (
          <p className="text-xs text-muted-foreground text-center">Loading transactions...</p>
        ) : payments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center">No payment records found.</p>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p._id} className="p-3 bg-muted/20 rounded-xl border border-border/20 space-y-3">
                <div className="flex justify-between items-start text-xs font-bold">
                  <div>
                    <span className="text-foreground block">{p.purchaseId?.courseId?.title || 'Program Access Access'}</span>
                    <span className="text-[9px] text-muted-foreground mt-0.5 block">{new Date(p.createdAt).toLocaleDateString('en-GB')}</span>
                  </div>
                  <span className="text-purple-650 font-black">${p.amount}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-[10px] font-bold rounded-lg touch-btn" 
                    onClick={() => { setActiveReceipt(p); setReceiptModalOpen(true); }}
                  >
                    Receipt
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-[10px] font-bold rounded-lg touch-btn" 
                    onClick={() => { setActiveInvoice(p); setInvoiceModalOpen(true); }}
                  >
                    Invoice
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Desktop view
  return (
    <div className="space-y-6">
      <Card className="border-border/40 shadow-sm rounded-[24px] bg-card overflow-hidden">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span>Your Payment History & Receipts</span>
          </CardTitle>
          <CardDescription>Review manual checkouts, online transactions, and download official invoices.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {paymentsLoading ? (
            <div className="text-center py-12 text-xs font-semibold text-muted-foreground">Loading payment logs...</div>
          ) : (
            <div className="border border-border/40 rounded-2xl overflow-hidden shadow-sm">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="font-bold py-2.5 px-4 text-foreground">Purchased Item</TableHead>
                    <TableHead className="font-bold py-2.5 px-4 text-foreground">Transaction ID</TableHead>
                    <TableHead className="font-bold py-2.5 px-4 text-foreground text-center">Status</TableHead>
                    <TableHead className="font-bold py-2.5 px-4 text-foreground text-right">Amount</TableHead>
                    <TableHead className="font-bold py-2.5 px-4 text-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs font-semibold">
                  {payments.map((pm) => (
                    <TableRow key={pm._id} className="hover:bg-muted/10 border-b border-border/40 last:border-b-0">
                      <TableCell className="py-3 px-4 font-bold text-foreground">
                        {pm.purchaseId?.courseId?.title || 'Program Access Enrollment'}
                        <div className="text-[9px] text-muted-foreground/80 font-medium mt-0.5">{new Date(pm.createdAt).toLocaleString()}</div>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-muted-foreground font-mono text-[10px]">{pm.transactionId}</TableCell>
                      <TableCell className="py-3 px-4 text-center">
                        <Badge 
                          className={`text-[9px] uppercase font-bold tracking-wide px-2 py-0.5 border ${
                            pm.status === 'success' 
                              ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25' 
                              : pm.status === 'pending'
                                ? 'bg-amber-500/10 text-amber-600 border-amber-500/25'
                                : 'bg-rose-500/10 text-rose-600 border-rose-500/25'
                          }`}
                          variant="outline"
                        >
                          {pm.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 px-4 text-right font-extrabold text-foreground">${pm.amount}</TableCell>
                      <TableCell className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button 
                            variant="ghost" 
                            className="h-8 text-[10px] text-purple-600 hover:text-purple-700 hover:bg-purple-500/10 font-bold px-2 rounded-lg"
                            onClick={() => {
                              setActiveReceipt(pm);
                              setReceiptModalOpen(true);
                            }}
                          >
                            Receipt
                          </Button>
                          <Button 
                            variant="ghost" 
                            className="h-8 text-[10px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-500/10 font-bold px-2 rounded-lg"
                            onClick={() => {
                              setActiveInvoice(pm);
                              setInvoiceModalOpen(true);
                            }}
                          >
                            Invoice
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                        No transactions registered to your account yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
