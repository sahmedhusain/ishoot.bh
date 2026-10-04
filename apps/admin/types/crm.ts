/** Which follow-up actions the signed-in user may start from a CRM dossier. Computed on the server. */
export interface DossierActions {
  createQuotation: boolean;
  createInvoice: boolean;
  recordPayment: boolean;
  createDeal: boolean;
  editRecord: boolean;
}
