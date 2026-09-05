'use client';

import type { InvoiceItem, PaymentHistoryItem } from '@/lib/api';

const INVOICE_STATUS: Record<string, string> = {
  paid: 'Payée',
  sent: 'Envoyée',
  draft: 'Brouillon',
  void: 'Annulée',
  uncollectible: 'Impayée',
};

const PAYMENT_STATUS: Record<string, string> = {
  pending: 'En attente',
  completed: 'Payé',
  failed: 'Échoué',
  refunded: 'Remboursé',
};

function formatMoney(amount: string | number, currency: string) {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  const code = (currency || 'USD').toUpperCase();
  if (Number.isNaN(n)) return `— ${code}`;
  if (code === 'XOF' || code === 'XAF') {
    return `${Math.round(n).toLocaleString('fr-FR')} ${code}`;
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
  }).format(n);
}

export function InvoiceHistory({
  invoices,
  payments,
  invoicesLoading,
}: {
  invoices: InvoiceItem[];
  payments: PaymentHistoryItem[];
  invoicesLoading: boolean;
}) {
  if (invoicesLoading) {
    return (
      <section className="rounded-lg border border-border bg-surface-card p-6">
        <h2 className="text-xl font-semibold">Historique de facturation</h2>
        <div className="mt-4 space-y-3 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 w-2/3 rounded bg-surface-app" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-surface-card p-6">
      <h2 className="text-xl font-semibold">Historique de facturation</h2>

      {invoices.length > 0 ? (
        <div className="mt-4 overflow-x-auto" data-testid="invoice-history">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-content-secondary">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">N°</th>
                <th className="py-2 pr-3 font-medium">Montant</th>
                <th className="py-2 pr-3 font-medium">Statut</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border">
                  <td className="py-2 pr-3">
                    {new Date(invoice.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-2 pr-3">{invoice.invoiceNumber}</td>
                  <td className="py-2 pr-3 font-medium">
                    {formatMoney(invoice.amount, invoice.currency)}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={
                        invoice.status === 'paid' ? 'font-medium text-success' : 'text-warning'
                      }
                    >
                      {INVOICE_STATUS[invoice.status] ?? invoice.status}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {invoice.pdfUrl ? (
                      <a
                        href={invoice.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-testid="invoice-pdf-download"
                        className="text-sm text-primary underline"
                      >
                        Télécharger le PDF
                      </a>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : payments.length > 0 ? (
        <div className="mt-4 overflow-x-auto" data-testid="payment-history">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-content-secondary">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Montant</th>
                <th className="py-2 pr-3 font-medium">Méthode</th>
                <th className="py-2 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-b border-border">
                  <td className="py-2 pr-3">
                    {new Date(payment.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="py-2 pr-3">{formatMoney(payment.amount, payment.currency)}</td>
                  <td className="py-2 pr-3 capitalize">{payment.paymentMethod}</td>
                  <td className="py-2">{PAYMENT_STATUS[payment.status] ?? payment.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="mt-4 rounded-lg border border-primary bg-primary-subtle p-4"
          data-testid="invoice-empty"
        >
          <p className="text-sm font-medium text-primary">Aucune facture pour le moment</p>
          <p className="mt-2 text-sm text-content-secondary">
            Après votre premier paiement, vos factures et reçus apparaîtront ici. Vous pourrez les
            télécharger en PDF.
          </p>
        </div>
      )}
    </section>
  );
}
