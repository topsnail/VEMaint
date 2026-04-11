import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** 台账：车辆 / 工程机械 */
export const assets = sqliteTable(
  "assets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    /** 车辆 | 机械 */
    type: text("type").notNull(),
    /** 车牌 / 机号 */
    identifier: text("identifier").notNull(),
    purchaseDate: text("purchase_date"),
    insuranceExpiry: text("insurance_expiry"),
    inspectionExpiry: text("inspection_expiry"),
    operatingPermitExpiry: text("operating_permit_expiry"),
    lastMaintenanceDate: text("last_maintenance_date"),
    nextMaintenanceMileage: text("next_maintenance_mileage"),
    currentMileage: text("current_mileage"),
    currentHours: text("current_hours"),
    status: text("status").notNull().default("active"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    identifierIdx: index("assets_identifier_idx").on(t.identifier),
  })
);

/** 默认维保类型（可在 KV 中扩展/覆盖） */
export type MaintenanceKind =
  | "保险"
  | "年审"
  | "保养"
  | "维修"
  | "换件"
  | "检修";

export const maintenanceRecords = sqliteTable(
  "maintenance_records",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    /** 自由文本，与 KV 配置的自定义类型一致 */
    type: text("type").notNull(),
    date: text("date").notNull(),
    /** 里程或工作小时 */
    value: text("value"),
    /** 一级维保项目（来自 KV 配置，如 车辆/设备/检测仪器） */
    project: text("project"),
    /** 二级子类（来自 KV 配置，如 货车/发电机/DCP） */
    projectChild: text("project_child"),
    cost: text("cost"),
    operator: text("operator"),
    assignee: text("assignee"),
    vendor: text("vendor"),
    description: text("description"),
    nextPlanDate: text("next_plan_date"),
    nextPlanValue: text("next_plan_value"),
    // Keep as text and parse safely in loader to avoid runtime crash
    // when historical dirty rows contain non-JSON payloads.
    partsJson: text("parts_json").$type<string | null>(),
    r2Key: text("r2_key"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    assetDateIdx: index("maintenance_asset_date_idx").on(t.assetId, t.date),
  })
);

export const reminders = sqliteTable(
  "reminders",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    taskType: text("task_type").notNull(),
    dueDate: text("due_date").notNull(),
    /** 简单重复规则：none | yearly | monthly | quarterly | semiannual */
    repeatRule: text("repeat_rule").notNull().default("none"),
    severity: text("severity").notNull().default("normal"),
    isEscalated: integer("is_escalated", { mode: "boolean" }).notNull().default(false),
    isNotified: integer("is_notified", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    dueIdx: index("reminders_due_idx").on(t.dueDate),
  })
);

export const incidents = sqliteTable(
  "incidents",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // violation | accident
    eventDate: text("event_date").notNull(),
    location: text("location"),
    detail: text("detail"),
    penalty: text("penalty"),
    status: text("status"),
    claimAmount: text("claim_amount"),
    repairDetail: text("repair_detail"),
    r2Key: text("r2_key"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    assetDateIdx: index("incidents_asset_date_idx").on(t.assetId, t.eventDate),
  })
);

export const faultEvents = sqliteTable(
  "fault_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    faultCode: text("fault_code").notNull(),
    symptom: text("symptom"),
    eventDate: text("event_date").notNull(),
    resolvedDate: text("resolved_date"),
    isRework: integer("is_rework", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    assetDateIdx: index("fault_events_asset_date_idx").on(t.assetId, t.eventDate),
  })
);

export const assetStatusLogs = sqliteTable(
  "asset_status_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    assetId: text("asset_id")
      .notNull()
      .references(() => assets.id, { onDelete: "cascade" }),
    fromStatus: text("from_status").notNull(),
    toStatus: text("to_status").notNull(),
    note: text("note"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    assetCreatedIdx: index("asset_status_logs_asset_created_idx").on(t.assetId, t.createdAt),
  })
);

export const vehicleLedgers = sqliteTable(
  "vehicle_ledgers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    internalNo: text("internal_no").notNull(),
    plateNo: text("plate_no").notNull(),
    vehicleType: text("vehicle_type").notNull(),
    brandModel: text("brand_model").notNull(),
    vin: text("vin").notNull(),
    engineNo: text("engine_no").notNull(),
    registrationDate: text("registration_date"),
    ownerName: text("owner_name"),
    ownerAddress: text("owner_address"),
    usageNature: text("usage_nature"),
    certificateIssueDate: text("certificate_issue_date"),
    archiveNo: text("archive_no"),
    ratedPassengers: text("rated_passengers"),
    grossMass: text("gross_mass"),
    curbWeight: text("curb_weight"),
    overallDimensions: text("overall_dimensions"),
    fuelType: text("fuel_type").notNull(),
    ratedLoad: text("rated_load"),
    department: text("department"),
    defaultDriver: text("default_driver"),
    parkingLocation: text("parking_location"),
    insuranceCompany: text("insurance_company"),
    compulsoryInsuranceDue: text("compulsory_insurance_due"),
    commercialInsuranceDue: text("commercial_insurance_due"),
    insuranceRemark: text("insurance_remark"),
    annualInspectionDue: text("annual_inspection_due"),
    emissionTestDate: text("emission_test_date"),
    safetyPerformanceDate: text("safety_performance_date"),
    totalMileage: text("total_mileage"),
    lastServiceDate: text("last_service_date"),
    lastServiceMileage: text("last_service_mileage"),
    nextServiceDate: text("next_service_date"),
    nextServiceMileage: text("next_service_mileage"),
    tireChangedDate: text("tire_changed_date"),
    batteryChangedDate: text("battery_changed_date"),
    brakeChangedDate: text("brake_changed_date"),
    gearboxOilChangedDate: text("gearbox_oil_changed_date"),
    usageStatus: text("usage_status").notNull().default("正常使用"),
    commonFaults: text("common_faults"),
    remark: text("remark"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (t) => ({
    internalNoIdx: index("vehicle_ledgers_internal_no_idx").on(t.internalNo),
    plateNoIdx: index("vehicle_ledgers_plate_no_idx").on(t.plateNo),
  })
);

export const assetsRelations = relations(assets, ({ many }) => ({
  maintenanceRecords: many(maintenanceRecords),
  reminders: many(reminders),
  statusLogs: many(assetStatusLogs),
  incidents: many(incidents),
  faultEvents: many(faultEvents),
}));

export const maintenanceRecordsRelations = relations(maintenanceRecords, ({ one }) => ({
  asset: one(assets, {
    fields: [maintenanceRecords.assetId],
    references: [assets.id],
  }),
}));

export const remindersRelations = relations(reminders, ({ one }) => ({
  asset: one(assets, {
    fields: [reminders.assetId],
    references: [assets.id],
  }),
}));

export const incidentsRelations = relations(incidents, ({ one }) => ({
  asset: one(assets, {
    fields: [incidents.assetId],
    references: [assets.id],
  }),
}));

export const faultEventsRelations = relations(faultEvents, ({ one }) => ({
  asset: one(assets, {
    fields: [faultEvents.assetId],
    references: [assets.id],
  }),
}));

export const assetStatusLogsRelations = relations(assetStatusLogs, ({ one }) => ({
  asset: one(assets, {
    fields: [assetStatusLogs.assetId],
    references: [assets.id],
  }),
}));
