import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type {
  AssetCategoryRecord,
  AssetRecord,
  ProductCategoryRecord,
  ProductRecord,
  PurchaseOrderRecord,
  RouteSheetRecord,
  ShipmentRecord,
  SupplierRecord,
  WarehouseRecord,
} from "@platform/database";
import { AssetCategoriesView } from "../../components/assets/AssetCategoriesView";
import { AssetDetailView } from "../../components/assets/AssetDetailView";
import { AssetForm } from "../../components/assets/AssetForm";
import { ASSET_STATUS_STYLE, AssetsListView } from "../../components/assets/AssetsListView";
import { EmployeeAssetsCard } from "../../components/assets/EmployeeAssetsCard";
import { HandoverDetailView } from "../../components/assets/HandoverDetailView";
import { HandoverForm } from "../../components/assets/HandoverForm";
import { HandoverSigningLinkPanel } from "../../components/assets/HandoverSigningLinkPanel";
import { NewAssetView } from "../../components/assets/NewAssetView";
import { AgenciesView } from "../../components/delivery/AgenciesView";
import { CashSettlementView } from "../../components/delivery/CashSettlementView";
import { DeliverySettingsView } from "../../components/delivery/DeliverySettingsView";
import { DriverView } from "../../components/delivery/DriverView";
import { FleetView } from "../../components/delivery/FleetView";
import { RouteSheetView } from "../../components/delivery/RouteSheetView";
import { RouteSheetsView } from "../../components/delivery/RouteSheetsView";
import { LatePill, ShipmentStatusPill } from "../../components/delivery/ShipmentPills";
import { ShipmentView } from "../../components/delivery/ShipmentView";
import { ShipmentsListView } from "../../components/delivery/ShipmentsListView";
import { InventoryStockView } from "../../components/inventory/InventoryStockView";
import { ProductStockPanel } from "../../components/inventory/ProductStockPanel";
import { StockCountView } from "../../components/inventory/StockCountView";
import { StockCountsView } from "../../components/inventory/StockCountsView";
import { StockChangeModal, TransferModal, useLocationOptions } from "../../components/inventory/StockDialogs";
import { StockMovementsView } from "../../components/inventory/StockMovementsView";
import { StockTransfersView } from "../../components/inventory/StockTransfersView";
import { WarehousesView } from "../../components/inventory/WarehousesView";
import { LinesEditor, emptyLine, linesInput, linesSubtotal } from "../../components/procurement/LinesEditor";
import { PurchaseOrderView } from "../../components/procurement/PurchaseOrderView";
import { PurchaseOrdersListView } from "../../components/procurement/PurchaseOrdersListView";
import { PurchasePricesCard } from "../../components/procurement/PurchasePricesCard";
import { ReceiveGoodsPanel } from "../../components/procurement/ReceiveGoodsPanel";
import { RequisitionView } from "../../components/procurement/RequisitionView";
import { RequisitionsListView } from "../../components/procurement/RequisitionsListView";
import { RfqView } from "../../components/procurement/RfqView";
import { RfqsListView } from "../../components/procurement/RfqsListView";
import { StatusPill } from "../../components/procurement/StatusPill";
import { SupplierBillView } from "../../components/procurement/SupplierBillView";
import { SupplierBillsListView } from "../../components/procurement/SupplierBillsListView";
import { SuppliersView } from "../../components/procurement/SuppliersView";
import { ProductCategoriesView } from "../../components/products/ProductCategoriesView";
import { ProductEditorView } from "../../components/products/ProductEditorView";
import { ProductsListView } from "../../components/products/ProductsListView";
import { adminActionMocks } from "./setup";
import { AdminTestProviders } from "./fixtures";

describe("Admin Batch 5: Inventory, Products, Procurement, Delivery & Assets", () => {
  const warehouse: WarehouseRecord = {
    id: "wh-1",
    code: "MAIN",
    name_en: "Main Warehouse",
    name_ar: "المستودع الرئيسي",
    is_default: true,
    active: true,
    locations: [{ id: "loc-1", warehouse_id: "wh-1", code: "A1", name_en: "Shelf A1", name_ar: "رف A1", active: true }],
  } as unknown as WarehouseRecord;

  const productCategory: ProductCategoryRecord = {
    id: "pcat-1",
    name_en: "Cameras",
    name_ar: "كاميرات",
    slug: "cameras",
    active: true,
  } as unknown as ProductCategoryRecord;

  const product: ProductRecord = {
    id: "prd-1",
    sku: "CAM-001",
    name_en: "Cinema Camera",
    name_ar: "كاميرا سينمائية",
    slug: "cinema-camera",
    category_id: "pcat-1",
    price: 1500,
    cost: 1100,
    active: true,
    on_website: true,
    track_batches: false,
    serialized: false,
    options: [],
    variants: [],
    images: [],
  } as unknown as ProductRecord;

  const assetCategory: AssetCategoryRecord = {
    id: "acat-1",
    code: "CAM",
    name_en: "Cinema Gear",
    name_ar: "معدات تصوير",
    spec_fields: [],
    checklist: [{ labelEn: "Lens cap", labelAr: "غطاء", required: true }],
    assets: 1,
    is_active: true,
    checklist_items: ["Lens cap", "Battery"],
  } as unknown as AssetCategoryRecord;

  const asset: AssetRecord = {
    id: "ast-1",
    tag: "AST-001",
    asset_tag: "AST-001",
    name: "Sony FX6",
    serial_number: "SN-9001",
    category_id: "acat-1",
    category: { id: "acat-1", name_en: "Cinema Gear", name_ar: "معدات تصوير", spec_fields: [], checklist: [] },
    specs: {},
    category_name_en: "Cinema Gear",
    category_name_ar: "معدات تصوير",
    status: "available",
    condition: "good",
    purchase_cost: 2200,
    currency: "BHD",
    holder: null,
  } as unknown as AssetRecord;

  it("renders Inventory & Products components cleanly", () => {
    const locations = [{ id: "loc-1", label: "Main Warehouse / A1" }];
    function LocationProbe() {
      const opts = useLocationOptions([warehouse]);
      return <span>{opts.length}</span>;
    }

    render(
      <AdminTestProviders>
        <LocationProbe />
        <WarehousesView warehouses={[warehouse]} languages={["en", "ar"]} canEdit />
        <InventoryStockView
          rows={[]}
          total={0}
          page={1}
          pageSize={20}
          totalValue={0}
          filters={{ q: "", warehouseId: "", lowOnly: false, expiring: false } as unknown as Parameters<typeof InventoryStockView>[0]["filters"]}
          warehouses={[warehouse]}
          expiring={0}
          currency="BHD"
          canEdit
        />
        <ProductStockPanel
          productId="prd-1"
          name="Cinema Camera"
          sku="CAM-001"
          trackBatches={false}
          options={[]}
          variants={[]}
          stock={{ total: 5, rows: [] } as unknown as Parameters<typeof ProductStockPanel>[0]["stock"]}
          warehouses={[warehouse]}
          currency="BHD"
          canEdit
        />
        <StockCountsView counts={[]} warehouses={[warehouse]} categories={[productCategory]} canCreate />
        <StockCountView
          count={{
            id: "cnt-1",
            number: "SC-001",
            warehouse_en: "Main",
            warehouse_ar: "الرئيسي",
            scope: "all",
            status: "open",
            note: "",
            created_by: "Tariq",
            approved_by: null,
            lines: [],
          } as unknown as Parameters<typeof StockCountView>[0]["count"]}
          locations={locations}
          canEdit
          canApprove
        />
        <StockChangeModal
          target={{ productId: "prd-1", variantId: null, name: "Cinema Camera", sku: "CAM-001", trackBatches: false, locations: [] } as unknown as Parameters<typeof StockChangeModal>[0]["target"]}
          locations={locations}
          currency="BHD"
          onClose={vi.fn()}
          onDone={vi.fn()}
        />
        <TransferModal
          target={{ productId: "prd-1", variantId: null, name: "Cinema Camera", sku: "CAM-001", trackBatches: false, locations: [] } as unknown as Parameters<typeof TransferModal>[0]["target"]}
          locations={locations}
          onClose={vi.fn()}
          onDone={vi.fn()}
        />
        <StockMovementsView rows={[]} total={0} page={1} pageSize={20} filters={{ q: "", warehouseId: "", type: "" } as unknown as Parameters<typeof StockMovementsView>[0]["filters"]} warehouses={[warehouse]} currency="BHD" />
        <StockTransfersView
          data={{
            locations: [{ id: "loc-1", nameEn: "Main", nameAr: "الرئيسي" }],
            transitLocations: [],
            transfers: [],
            serials: [],
          } as unknown as Parameters<typeof StockTransfersView>[0]["data"]}
        />
        <ProductCategoriesView categories={[productCategory]} languages={["en", "ar"]} canEdit canDelete />
        <ProductsListView rows={[product as unknown as Parameters<typeof ProductsListView>[0]["rows"][number]]} total={1} page={1} pageSize={20} filters={{ q: "", categoryId: "", active: "" } as unknown as Parameters<typeof ProductsListView>[0]["filters"]} categories={[productCategory]} currency="BHD" canCreate canEdit />
        <ProductEditorView product={product} categories={[productCategory]} currency="BHD" languages={["en", "ar"]} canEdit canDelete canPublish />
      </AdminTestProviders>,
    );

    expect(adminActionMocks.saveWarehouseAction).toBeDefined();
    expect(adminActionMocks.saveLocationAction).toBeDefined();
    expect(adminActionMocks.saveReorderPointsAction).toBeDefined();
    expect(adminActionMocks.createStockCountAction).toBeDefined();
    expect(adminActionMocks.saveCountedAction).toBeDefined();
    expect(adminActionMocks.scanCountItemAction).toBeDefined();
    expect(adminActionMocks.setStockCountStatusAction).toBeDefined();
    expect(adminActionMocks.approveStockCountAction).toBeDefined();
    expect(adminActionMocks.changeStockAction).toBeDefined();
    expect(adminActionMocks.transferStockAction).toBeDefined();
    expect(adminActionMocks.requestSerialTransferAction).toBeDefined();
    expect(adminActionMocks.processSerialTransferAction).toBeDefined();
    expect(adminActionMocks.previewStockHandoverAction).toBeDefined();
    expect(adminActionMocks.acknowledgeStockHandoverAction).toBeDefined();
    expect(adminActionMocks.reportMissingTransferUnitsAction).toBeDefined();
    expect(adminActionMocks.saveProductCategoryAction).toBeDefined();
    expect(adminActionMocks.deleteProductCategoryAction).toBeDefined();
    expect(adminActionMocks.setProductsActiveAction).toBeDefined();
    expect(adminActionMocks.saveProductAction).toBeDefined();
    expect(adminActionMocks.deleteProductAction).toBeDefined();
    expect(adminActionMocks.setProductOnWebsiteAction).toBeDefined();
  });

  it("renders Procurement components cleanly", () => {
    const supplier: SupplierRecord = {
      id: "sup-1",
      name: "Bahrain Broadcast Supply",
      email: "sales@bbs.test",
      phone: "+97317009999",
      active: true,
    } as unknown as SupplierRecord;

    const po: PurchaseOrderRecord = {
      id: "po-1",
      number: "PO-2026-001",
      status: "draft",
      supplier_id: "sup-1",
      supplier_name: "Bahrain Broadcast Supply",
      supplier: { id: "sup-1", name: "Bahrain Broadcast Supply" },
      warehouse_id: "wh-1",
      warehouse: { id: "wh-1", name_en: "Main Warehouse", name_ar: "المستودع الرئيسي" },
      vat_enabled: true,
      order_date: "2026-05-01",
      expected_date: "2026-05-15",
      currency: "BHD",
      subtotal: 1000,
      vat_rate: 10,
      vat_amount: 100,
      total: 1100,
      notes: "",
      receipts: [],
      bills: [],
      lines: [{ id: "pol-1", description: "Tripod", quantity: 2, ordered_qty: 2, received_qty: 0, remaining_qty: 2, unit_price: 500 }],
    } as unknown as PurchaseOrderRecord;

    const line = emptyLine();
    expect(linesSubtotal([line])).toBe(0);
    expect(linesInput([line])).toBeDefined();

    render(
      <AdminTestProviders>
        <StatusPill status="draft" />
        <LinesEditor lines={[line]} onChange={vi.fn()} products={[]} priceLabel="Price" />
        <SuppliersView suppliers={[supplier]} performance={{} as unknown as Parameters<typeof SuppliersView>[0]["performance"]} currency="BHD" search="" canEdit />
        <RequisitionsListView rows={[]} currency="BHD" />
        <RequisitionView
          requisition={{ id: "req-1", number: "PR-001", status: "draft", requested_by: "Tariq", needed_by: null, note: "", decision_note: "", estimated_total: 100, lines: [], rfqs: [], orders: [] }}
          products={[]}
          currency="BHD"
          canEdit
          canProcure
        />
        <RfqsListView rows={[]} products={[]} canEdit />
        <RfqView
          rfq={{ id: "rfq-1", number: "RFQ-001", title: "Camera Gear", status: "open", requisition: null, lines: [{ id: "rl-1", description: "Tripod", quantity: 1 }], suppliers: [{ id: "sup-1", name: "BBS" }], quotes: [], orders: [], note: "" } as unknown as Parameters<typeof RfqView>[0]["rfq"]}
          suppliers={[{ id: "sup-1", name: "BBS" }]}
          currency="BHD"
          canEdit
          canOrder
        />
        <PurchaseOrdersListView rows={[]} total={0} page={1} pageSize={20} filters={{ q: "", status: "" }} currency="BHD" canCreate />
        <PurchaseOrderView
          order={po}
          fromRequisition={null}
          suppliers={[supplier]}
          warehouses={[warehouse]}
          products={[]}
          company={{ currency: "BHD", vatEnabled: true, vatPercentage: 10, name: "Zayed Group" }}
          rights={{ edit: true, export: true, cancel: true, receive: true, bill: true }}
        />
        <ReceiveGoodsPanel order={po} locations={[{ id: "loc-1", label: "Main / A1" }]} batchProducts={[]} />
        <PurchasePricesCard rows={[]} currency="BHD" />
        <SupplierBillsListView rows={[]} status="" currency="BHD" canCreate />
        <SupplierBillView
          bill={null}
          fromOrder={null}
          suppliers={[supplier]}
          currency="BHD"
          rights={{ edit: true, approve: true, pay: true, cancel: true }}
        />
      </AdminTestProviders>,
    );

    expect(adminActionMocks.saveSupplierAction).toBeDefined();
    expect(adminActionMocks.saveRequisitionAction).toBeDefined();
    expect(adminActionMocks.submitRequisitionAction).toBeDefined();
    expect(adminActionMocks.createRfqAction).toBeDefined();
    expect(adminActionMocks.cancelRequisitionAction).toBeDefined();
    expect(adminActionMocks.saveRfqQuotesAction).toBeDefined();
    expect(adminActionMocks.awardRfqAction).toBeDefined();
    expect(adminActionMocks.cancelRfqAction).toBeDefined();
    expect(adminActionMocks.savePurchaseOrderAction).toBeDefined();
    expect(adminActionMocks.submitPurchaseOrderAction).toBeDefined();
    expect(adminActionMocks.emailPurchaseOrderAction).toBeDefined();
    expect(adminActionMocks.markPurchaseOrderSentAction).toBeDefined();
    expect(adminActionMocks.cancelPurchaseOrderAction).toBeDefined();
    expect(adminActionMocks.receiveGoodsAction).toBeDefined();
    expect(adminActionMocks.saveSupplierBillAction).toBeDefined();
    expect(adminActionMocks.attachSupplierBillFileAction).toBeDefined();
    expect(adminActionMocks.approveSupplierBillAction).toBeDefined();
    expect(adminActionMocks.cancelSupplierBillAction).toBeDefined();
    expect(adminActionMocks.recordSupplierPaymentAction).toBeDefined();
  });

  it("renders Delivery & Assets components cleanly", () => {
    const shipment: ShipmentRecord = {
      id: "shp-1",
      number: "SHP-001",
      status: "pending",
      recipient_name: "Ali Hassan",
      recipient_phone: "+97339000001",
      address_line1: "Road 10",
      city: "Manama",
      currency: "BHD",
      cod_amount: 0,
      collected_amount: 0,
      agency: null,
      events: [],
      lines: [],
      created_at: "2026-05-01T00:00:00Z",
    } as unknown as ShipmentRecord;

    const sheet: RouteSheetRecord = {
      id: "rs-1",
      number: "RS-001",
      status: "draft",
      date: "2026-05-01",
      driver: { id: "drv-1", name_en: "Sami", name_ar: "سامي" },
      vehicle: "Van 1",
      note: "",
      stops: [],
    } as unknown as RouteSheetRecord;

    render(
      <AdminTestProviders>
        <ShipmentStatusPill status="pending" />
        <LatePill />
        <DeliverySettingsView
          settings={{ enabled: true, default_fee: 2, free_over: 50, cash_on_delivery: true, working_days: [0, 1, 2, 3, 4], lead_hours: 4 } as unknown as Parameters<typeof DeliverySettingsView>[0]["settings"]}
          zones={[]}
          sharedSlots={[]}
          currency="BHD"
          languages={["en", "ar"]}
          canEdit
        />
        <ShipmentsListView rows={[]} total={0} page={1} pageSize={20} counts={{ pending: 0, assigned: 0, out: 0, delivered: 0, failed: 0, late: 0 } as unknown as Parameters<typeof ShipmentsListView>[0]["counts"]} zones={[]} filters={{ q: "", status: "", date: "", zone: "", late: false }} currency="BHD" />
        <ShipmentView shipment={shipment} trackingLink="https://example.test/track/1" canEdit canAssign drivers={[]} vehicles={[]} agencies={[]} currency="BHD" />
        <FleetView vehicles={[]} drivers={[]} />
        <DriverView stops={[]} linked />
        <RouteSheetsView sheets={[]} shipments={[]} drivers={[]} vehicles={[]} />
        <RouteSheetView sheet={sheet} />
        <CashSettlementView pending={[]} history={[]} currency="BHD" canSettle />
        <AgenciesView agencies={[]} unbilled={{}} invoices={[]} currency="BHD" canInvoice />
        <AssetCategoriesView categories={[assetCategory]} />
        <AssetsListView items={[asset]} counts={{ available: 1 }} totalValue={2200} filters={{ q: "", status: "", category: "", holder: "" } as unknown as Parameters<typeof AssetsListView>[0]["filters"]} categories={[assetCategory]} employees={[]} canCreate canEdit />
        <NewAssetView categories={[assetCategory]} />
        <AssetForm categories={[assetCategory]} asset={asset} employees={[]} onDone={vi.fn()} />
        <AssetDetailView asset={asset} handovers={[]} categories={[assetCategory]} employees={[]} canEdit />
        <EmployeeAssetsCard held={[asset]} pending={[]} value={2200} own canOpenAssets />
        <HandoverForm asset={asset} kind="issue" employees={[{ id: "emp-1", name_en: "Bader", name_ar: "بدر" }]} onCancel={vi.fn()} />
        <HandoverDetailView
          handover={{
            id: "ho-1",
            reference: "HO-001",
            kind: "issue",
            status: "awaiting_employee",
            date: "2026-05-01",
            condition: "good",
            checklist: [],
            accessories: "",
            damage: "",
            employee: { id: "emp-1", name_en: "Bader", name_ar: "بدر" },
            asset: { id: "ast-1", tag: "AST-001", asset_tag: "AST-001", name: "Sony FX6", category: { id: "acat-1", name_en: "Camera", name_ar: "كاميرا" }, category_en: "Camera", category_ar: "كاميرا", serial: "SN-9001", serial_number: "SN-9001" },
            issued_by: { name_en: "Tariq", name_ar: "طارق" },
            employee_signed_at: null,
            manager_signed_at: null,
          } as unknown as Parameters<typeof HandoverDetailView>[0]["handover"]}
          isEmployee
          canEdit
          approvalId={null}
        />
        <HandoverSigningLinkPanel handoverId="ho-1" links={[]} reference="HO-001" />
      </AdminTestProviders>,
    );

    expect(ASSET_STATUS_STYLE.available).toBeTruthy();
    expect(screen.getAllByText(/AST-001/).length).toBeGreaterThanOrEqual(1);
    expect(adminActionMocks.saveDeliverySettingsAction).toBeDefined();
    expect(adminActionMocks.saveDeliveryZoneAction).toBeDefined();
    expect(adminActionMocks.saveDeliverySlotAction).toBeDefined();
    expect(adminActionMocks.deleteDeliverySlotAction).toBeDefined();
    expect(adminActionMocks.assignShipmentAction).toBeDefined();
    expect(adminActionMocks.handToAgencyAction).toBeDefined();
    expect(adminActionMocks.moveShipmentAction).toBeDefined();
    expect(adminActionMocks.saveVehicleAction).toBeDefined();
    expect(adminActionMocks.completeDeliveryAction).toBeDefined();
    expect(adminActionMocks.createRouteSheetAction).toBeDefined();
    expect(adminActionMocks.startRouteSheetAction).toBeDefined();
    expect(adminActionMocks.closeRouteSheetAction).toBeDefined();
    expect(adminActionMocks.settleCashAction).toBeDefined();
    expect(adminActionMocks.saveCourierAgencyAction).toBeDefined();
    expect(adminActionMocks.recordAgencyInvoiceAction).toBeDefined();
    expect(adminActionMocks.saveAssetCategoryAction).toBeDefined();
    expect(adminActionMocks.saveAssetAction).toBeDefined();
    expect(adminActionMocks.getSignatureModeAction).toBeDefined();
    expect(adminActionMocks.startAssetHandoverAction).toBeDefined();
    expect(adminActionMocks.openMyHandoverSigningPageAction).toBeDefined();
    expect(adminActionMocks.signAssetHandoverInPersonAction).toBeDefined();
    expect(adminActionMocks.cancelAssetHandoverAction).toBeDefined();
    expect(adminActionMocks.createHandoverSigningLinkAction).toBeDefined();
    expect(adminActionMocks.revokeHandoverSigningLinkAction).toBeDefined();
  });
});
