import { pgTable, unique, serial, varchar, text, jsonb, integer, timestamp, boolean, numeric, index, date, foreignKey, json, doublePrecision, check } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const factorySnapshots = pgTable("factory_snapshots", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 200 }).notNull(),
	comment: text(),
	layoutData: jsonb("layout_data").notNull(),
	shareToken: varchar("share_token", { length: 64 }),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("factory_snapshots_share_token_key").on(table.shareToken),
]);

export const categories = pgTable("categories", {
	id: varchar({ length: 20 }).primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameAr: varchar("name_ar", { length: 100 }),
	parentId: varchar("parent_id", { length: 20 }),
	code: varchar({ length: 20 }),
});

export const companyProfile = pgTable("company_profile", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameAr: varchar("name_ar", { length: 100 }),
	address: text(),
	taxNumber: varchar("tax_number", { length: 20 }),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 100 }),
	logoUrl: varchar("logo_url", { length: 255 }),
	workingHoursPerDay: integer("working_hours_per_day").default(8),
	defaultLanguage: varchar("default_language", { length: 10 }).default('ar'),
});

export const displaySlides = pgTable("display_slides", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 200 }).notNull(),
	slideType: varchar("slide_type", { length: 50 }).notNull(),
	content: jsonb(),
	durationSeconds: integer("duration_seconds").default(10),
	sortOrder: integer("sort_order").default(0),
	isActive: boolean("is_active").default(true),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const databaseConfigurations = pgTable("database_configurations", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar("name_ar", { length: 255 }),
	type: varchar({ length: 50 }).notNull(),
	host: varchar({ length: 255 }).notNull(),
	port: integer().default(5432).notNull(),
	database: varchar({ length: 255 }).notNull(),
	username: varchar({ length: 255 }).notNull(),
	password: varchar({ length: 255 }).notNull(),
	sslEnabled: boolean("ssl_enabled").default(false),
	isActive: boolean("is_active").default(true),
	syncFrequency: integer("sync_frequency").default(60),
	lastSync: timestamp("last_sync", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const erpIntegrationSettings = pgTable("erp_integration_settings", {
	id: serial().primaryKey().notNull(),
	settingKey: varchar("setting_key", { length: 100 }).notNull(),
	settingValue: text("setting_value").notNull(),
	settingType: varchar("setting_type", { length: 20 }).default('string'),
	description: text(),
	descriptionAr: text("description_ar"),
	category: varchar({ length: 50 }).default('general'),
	isSystem: boolean("is_system").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("erp_integration_settings_setting_key_unique").on(table.settingKey),
]);

export const factoryLayouts = pgTable("factory_layouts", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).default('default'),
	layoutData: jsonb("layout_data").notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	updatedBy: integer("updated_by"),
});

export const factoryLocations = pgTable("factory_locations", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar("name_ar", { length: 255 }).notNull(),
	latitude: text().notNull(),
	longitude: text().notNull(),
	allowedRadius: integer("allowed_radius").default(500).notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const finishedGoodsVouchersIn = pgTable("finished_goods_vouchers_in", {
	id: serial().primaryKey().notNull(),
	voucherNumber: varchar("voucher_number", { length: 50 }).notNull(),
	voucherDate: timestamp("voucher_date", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	voucherType: varchar("voucher_type", { length: 50 }).default('production_receipt'),
	itemId: varchar("item_id", { length: 100 }),
	quantity: numeric({ precision: 15, scale:  3 }).default('0'),
	unit: varchar({ length: 50 }).default('كيلو'),
	barcode: varchar({ length: 100 }),
	batchNumber: varchar("batch_number", { length: 100 }),
	customerId: varchar("customer_id", { length: 100 }),
	productionOrderId: integer("production_order_id"),
	weightKg: numeric("weight_kg", { precision: 15, scale:  3 }),
	piecesCount: integer("pieces_count"),
	fromProductionLine: varchar("from_production_line", { length: 100 }),
	deliveredBy: varchar("delivered_by", { length: 255 }),
	locationId: integer("location_id"),
	notes: text(),
	status: varchar({ length: 50 }).default('completed'),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("finished_goods_vouchers_in_voucher_number_key").on(table.voucherNumber),
]);

export const finishedGoodsVouchersOut = pgTable("finished_goods_vouchers_out", {
	id: serial().primaryKey().notNull(),
	voucherNumber: varchar("voucher_number", { length: 50 }).notNull(),
	voucherDate: timestamp("voucher_date", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	voucherType: varchar("voucher_type", { length: 50 }).default('customer_delivery'),
	itemId: varchar("item_id", { length: 100 }),
	quantity: numeric({ precision: 15, scale:  3 }).default('0'),
	unit: varchar({ length: 50 }).default('كيلو'),
	barcode: varchar({ length: 100 }),
	batchNumber: varchar("batch_number", { length: 100 }),
	customerId: varchar("customer_id", { length: 100 }).notNull(),
	driverName: varchar("driver_name", { length: 255 }),
	driverPhone: varchar("driver_phone", { length: 50 }),
	vehicleNumber: varchar("vehicle_number", { length: 100 }),
	deliveryAddress: text("delivery_address"),
	weightKg: numeric("weight_kg", { precision: 15, scale:  3 }),
	piecesCount: integer("pieces_count"),
	locationId: integer("location_id"),
	notes: text(),
	status: varchar({ length: 50 }).default('completed'),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("finished_goods_vouchers_out_voucher_number_key").on(table.voucherNumber),
]);

export const maintenanceActions = pgTable("maintenance_actions", {
	id: serial().primaryKey().notNull(),
	actionNumber: varchar("action_number", { length: 50 }).notNull(),
	maintenanceRequestId: integer("maintenance_request_id").notNull(),
	actionType: varchar("action_type", { length: 100 }).notNull(),
	actionDate: timestamp("action_date", { mode: 'string' }).defaultNow(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	textReport: text("text_report"),
	sparePartsRequest: text("spare_parts_request"),
	machiningRequest: text("machining_request"),
	operatorNegligenceReport: text("operator_negligence_report"),
	performedBy: varchar("performed_by", { length: 20 }),
	requestCreatedBy: varchar("request_created_by", { length: 20 }),
	requiresManagementAction: boolean("requires_management_action").default(false),
	managementNotified: boolean("management_notified").default(false),
}, (table) => [
	unique("maintenance_actions_action_number_key").on(table.actionNumber),
]);

export const maintenanceReports = pgTable("maintenance_reports", {
	id: serial().primaryKey().notNull(),
	reportNumber: varchar("report_number", { length: 50 }).notNull(),
	reportType: varchar("report_type", { length: 100 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text().notNull(),
	reportedByUserId: integer("reported_by_user_id").notNull(),
	machineId: varchar("machine_id", { length: 50 }),
	severity: varchar({ length: 50 }).default('medium'),
	status: varchar({ length: 50 }).default('open'),
	priority: varchar({ length: 50 }).default('medium'),
	attachments: text().array(),
	assignedToUserId: integer("assigned_to_user_id"),
	resolutionNotes: text("resolution_notes"),
	estimatedRepairTime: numeric("estimated_repair_time", { precision: 5, scale:  2 }),
	actualRepairTime: numeric("actual_repair_time", { precision: 5, scale:  2 }),
	sparePartsNeeded: text("spare_parts_needed").array(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	maintenanceActionId: integer("maintenance_action_id"),
	reviewedBy: varchar("reviewed_by", { length: 20 }),
	reviewNotes: text("review_notes"),
	reviewDate: timestamp("review_date", { mode: 'string' }),
	createdBy: varchar("created_by", { length: 20 }),
}, (table) => [
	unique("maintenance_reports_report_number_key").on(table.reportNumber),
]);

export const maintenanceRequests = pgTable("maintenance_requests", {
	id: serial().primaryKey().notNull(),
	machineId: varchar("machine_id", { length: 20 }),
	reportedBy: varchar("reported_by", { length: 20 }),
	issueType: varchar("issue_type", { length: 50 }),
	description: text(),
	urgencyLevel: varchar("urgency_level", { length: 20 }).default('normal'),
	status: varchar({ length: 20 }).default('open'),
	assignedTo: varchar("assigned_to", { length: 20 }),
	actionTaken: text("action_taken"),
	dateReported: timestamp("date_reported", { mode: 'string' }).defaultNow(),
	dateResolved: timestamp("date_resolved", { mode: 'string' }),
	requestNumber: varchar("request_number", { length: 50 }),
}, (table) => [
	index("idx_maintenance_requests_date_reported").using("btree", table.dateReported.desc().nullsFirst().op("timestamp_ops")),
	index("idx_maintenance_requests_machine_id").using("btree", table.machineId.asc().nullsLast().op("text_ops")),
	index("idx_maintenance_requests_reported_by").using("btree", table.reportedBy.asc().nullsLast().op("text_ops")),
	index("idx_maintenance_requests_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	unique("maintenance_requests_request_number_key").on(table.requestNumber),
]);

export const masterBatchColors = pgTable("master_batch_colors", {
	id: varchar({ length: 20 }).primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameAr: varchar("name_ar", { length: 100 }).notNull(),
	colorHex: varchar("color_hex", { length: 20 }).default('#FFFFFF').notNull(),
	textColor: varchar("text_color", { length: 20 }).default('#000000').notNull(),
	brand: varchar({ length: 100 }),
	aliases: text(),
	isActive: boolean("is_active").default(true).notNull(),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const operatorNegligenceReports = pgTable("operator_negligence_reports", {
	id: serial().primaryKey().notNull(),
	reportNumber: varchar("report_number", { length: 50 }).notNull(),
	operatorId: varchar("operator_id", { length: 50 }).notNull(),
	operatorName: varchar("operator_name", { length: 255 }).notNull(),
	incidentDate: date("incident_date").notNull(),
	reportDate: date("report_date").default(sql`CURRENT_DATE`),
	incidentType: varchar("incident_type", { length: 100 }).notNull(),
	description: text().notNull(),
	severity: varchar({ length: 50 }).default('medium'),
	witnesses: text().array(),
	evidencePhotos: text("evidence_photos").array(),
	immediateActionsTaken: text("immediate_actions_taken"),
	reportedByUserId: integer("reported_by_user_id").notNull(),
	reviewedByUserId: integer("reviewed_by_user_id"),
	managementDecision: text("management_decision"),
	disciplinaryAction: text("disciplinary_action"),
	status: varchar({ length: 50 }).default('pending'),
	followUpRequired: boolean("follow_up_required").default(false),
	followUpNotes: text("follow_up_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	maintenanceActionId: integer("maintenance_action_id"),
	negligenceType: varchar("negligence_type", { length: 50 }),
	evidence: text(),
	damageCost: numeric("damage_cost", { precision: 10, scale:  2 }),
	downtimeHours: integer("downtime_hours"),
	actionTaken: text("action_taken"),
	reportedBy: varchar("reported_by", { length: 20 }),
	investigatedBy: varchar("investigated_by", { length: 20 }),
	investigationDate: timestamp("investigation_date", { mode: 'string' }),
	machineId: varchar("machine_id", { length: 20 }),
}, (table) => [
	unique("operator_negligence_reports_report_number_key").on(table.reportNumber),
]);

export const productionSettings = pgTable("production_settings", {
	id: serial().primaryKey().notNull(),
	overrunTolerancePercent: numeric("overrun_tolerance_percent", { precision: 5, scale:  2 }).default('3').notNull(),
	allowLastRollOverrun: boolean("allow_last_roll_overrun").default(true).notNull(),
	qrPrefix: varchar("qr_prefix", { length: 32 }).default('ROLL').notNull(),
});

export const rawMaterialVouchersIn = pgTable("raw_material_vouchers_in", {
	id: serial().primaryKey().notNull(),
	voucherNumber: varchar("voucher_number", { length: 50 }).notNull(),
	voucherDate: timestamp("voucher_date", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	voucherType: varchar("voucher_type", { length: 50 }).default('purchase'),
	itemId: varchar("item_id", { length: 100 }),
	quantity: numeric({ precision: 15, scale:  3 }).default('0'),
	unit: varchar({ length: 50 }).default('كيلو'),
	barcode: varchar({ length: 100 }),
	batchNumber: varchar("batch_number", { length: 100 }),
	supplierId: integer("supplier_id"),
	unitPrice: numeric("unit_price", { precision: 15, scale:  3 }),
	expiryDate: date("expiry_date"),
	locationId: integer("location_id"),
	notes: text(),
	status: varchar({ length: 50 }).default('completed'),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	totalPrice: numeric("total_price", { precision: 12, scale:  4 }),
	receivedBy: integer("received_by"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.receivedBy],
			foreignColumns: [users.id],
			name: "raw_material_vouchers_in_received_by_fkey"
		}),
	unique("raw_material_vouchers_in_voucher_number_key").on(table.voucherNumber),
]);

export const rawMaterialVouchersOut = pgTable("raw_material_vouchers_out", {
	id: serial().primaryKey().notNull(),
	voucherNumber: varchar("voucher_number", { length: 50 }).notNull(),
	voucherDate: timestamp("voucher_date", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	voucherType: varchar("voucher_type", { length: 50 }).default('production_transfer'),
	itemId: varchar("item_id", { length: 100 }),
	quantity: numeric({ precision: 15, scale:  3 }).default('0'),
	unit: varchar({ length: 50 }).default('كيلو'),
	barcode: varchar({ length: 100 }),
	batchNumber: varchar("batch_number", { length: 100 }),
	toDestination: varchar("to_destination", { length: 255 }),
	issuedTo: varchar("issued_to", { length: 255 }),
	productionOrderId: integer("production_order_id"),
	locationId: integer("location_id"),
	notes: text(),
	status: varchar({ length: 50 }).default('completed'),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("raw_material_vouchers_out_voucher_number_key").on(table.voucherNumber),
]);

export const sections = pgTable("sections", {
	id: varchar({ length: 20 }).primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameAr: varchar("name_ar", { length: 100 }),
	description: text(),
});

export const sessions = pgTable("sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: jsonb().notNull(),
	expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
	index("idx_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const spareParts = pgTable("spare_parts", {
	id: serial().primaryKey().notNull(),
	partId: varchar("part_id", { length: 50 }).notNull(),
	machineName: varchar("machine_name", { length: 100 }).notNull(),
	partName: varchar("part_name", { length: 100 }).notNull(),
	code: varchar({ length: 50 }).notNull(),
	serialNumber: varchar("serial_number", { length: 100 }).notNull(),
	specifications: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("spare_parts_part_id_key").on(table.partId),
]);

export const suppliers = pgTable("suppliers", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameAr: varchar("name_ar", { length: 100 }),
	contact: varchar({ length: 100 }),
	phone: varchar({ length: 20 }),
	address: text(),
	materialsSupplied: json("materials_supplied"),
	contactPerson: varchar("contact_person", { length: 100 }),
	email: varchar({ length: 100 }),
	isActive: boolean("is_active").default(true),
});

export const systemPerformanceMetrics = pgTable("system_performance_metrics", {
	id: serial().primaryKey().notNull(),
	metricName: varchar("metric_name", { length: 255 }).notNull(),
	metricCategory: varchar("metric_category", { length: 30 }).notNull(),
	value: numeric({ precision: 15, scale:  4 }).notNull(),
	unit: varchar({ length: 20 }),
	timestamp: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	source: varchar({ length: 50 }),
	tags: json(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const tempJobOrders = pgTable("temp_job_orders", {
	id: integer(),
	jobNumber: varchar("job_number", { length: 50 }),
	orderId: integer("order_id"),
	quantityRequired: numeric("quantity_required", { precision: 10, scale:  2 }),
	quantityProduced: numeric("quantity_produced", { precision: 10, scale:  2 }),
	status: varchar({ length: 30 }),
	createdAt: timestamp("created_at", { mode: 'string' }),
	customerProductId: integer("customer_product_id"),
	requiresPrinting: boolean("requires_printing"),
	inProductionAt: timestamp("in_production_at", { mode: 'string' }),
});

export const units = pgTable("units", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameAr: varchar("name_ar", { length: 100 }),
	symbol: varchar({ length: 20 }),
	conversionFactor: numeric("conversion_factor", { precision: 15, scale:  6 }).default('1'),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const userSessions = pgTable("user_sessions", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: varchar({ length: 50 }),
	password: varchar({ length: 100 }),
	displayName: varchar("display_name", { length: 100 }),
	displayNameAr: varchar("display_name_ar", { length: 100 }),
	roleId: integer("role_id"),
	sectionId: varchar("section_id", { length: 20 }),
	status: varchar({ length: 20 }).default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	fullName: varchar("full_name", { length: 200 }),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 100 }),
	replitUserId: varchar("replit_user_id", { length: 255 }),
	firstName: varchar("first_name", { length: 100 }),
	lastName: varchar("last_name", { length: 100 }),
	profileImageUrl: varchar("profile_image_url", { length: 500 }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_users_role_id").using("btree", table.roleId.asc().nullsLast().op("int4_ops")),
	index("idx_users_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_users_username").using("btree", table.username.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "users_role_id_roles_id_fk"
		}),
	unique("users_username_unique").on(table.username),
	unique("users_replit_user_id_key").on(table.replitUserId),
]);

export const adminDecisions = pgTable("admin_decisions", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 100 }).notNull(),
	titleAr: varchar("title_ar", { length: 100 }),
	description: text(),
	targetType: varchar("target_type", { length: 20 }),
	targetId: integer("target_id"),
	date: date().notNull(),
	issuedBy: integer("issued_by"),
}, (table) => [
	foreignKey({
			columns: [table.issuedBy],
			foreignColumns: [users.id],
			name: "admin_decisions_issued_by_users_id_fk"
		}),
]);

export const aiAgentKnowledge = pgTable("ai_agent_knowledge", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	content: text().notNull(),
	category: varchar({ length: 50 }).default('general').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdBy: integer("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "ai_agent_knowledge_created_by_fkey"
		}),
]);

export const aiAgentSettings = pgTable("ai_agent_settings", {
	id: serial().primaryKey().notNull(),
	key: varchar({ length: 100 }).notNull(),
	value: text().notNull(),
	description: text(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedBy: integer("updated_by"),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "ai_agent_settings_updated_by_fkey"
		}),
	unique("ai_agent_settings_key_key").on(table.key),
]);

export const attendance = pgTable("attendance", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	status: varchar({ length: 20 }).default('غائب').notNull(),
	checkInTime: timestamp("check_in_time", { mode: 'string' }),
	checkOutTime: timestamp("check_out_time", { mode: 'string' }),
	lunchStartTime: timestamp("lunch_start_time", { mode: 'string' }),
	lunchEndTime: timestamp("lunch_end_time", { mode: 'string' }),
	notes: text(),
	createdBy: integer("created_by"),
	updatedBy: integer("updated_by"),
	date: date().default(sql`CURRENT_DATE`).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	breakStartTime: timestamp("break_start_time", { mode: 'string' }),
	breakEndTime: timestamp("break_end_time", { mode: 'string' }),
	workHours: doublePrecision("work_hours"),
	overtimeHours: doublePrecision("overtime_hours"),
	shiftType: varchar("shift_type", { length: 20 }).default('صباحي'),
	lateMinutes: integer("late_minutes").default(0),
	earlyLeaveMinutes: integer("early_leave_minutes").default(0),
	locationAccuracy: doublePrecision("location_accuracy"),
	distanceFromFactory: doublePrecision("distance_from_factory"),
	deviceInfo: text("device_info"),
}, (table) => [
	index("idx_attendance_date").using("btree", table.date.asc().nullsLast().op("date_ops")),
	index("idx_attendance_user_date").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.date.asc().nullsLast().op("int4_ops")),
	index("idx_attendance_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "attendance_new_created_by_fkey"
		}),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "attendance_new_updated_by_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "attendance_new_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const mixingBatches = pgTable("mixing_batches", {
	id: serial().primaryKey().notNull(),
	batchNumber: varchar("batch_number", { length: 50 }).notNull(),
	productionOrderId: integer("production_order_id").notNull(),
	machineId: varchar("machine_id", { length: 20 }).notNull(),
	operatorId: integer("operator_id").notNull(),
	totalWeightKg: numeric("total_weight_kg", { precision: 10, scale:  2 }).notNull(),
	status: varchar({ length: 30 }).default('pending').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	screwAssignment: varchar("screw_assignment", { length: 10 }).default('A').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.machineId],
			foreignColumns: [machines.id],
			name: "mixing_batches_machine_id_fkey"
		}),
	foreignKey({
			columns: [table.operatorId],
			foreignColumns: [users.id],
			name: "mixing_batches_operator_id_fkey"
		}),
	foreignKey({
			columns: [table.productionOrderId],
			foreignColumns: [productionOrders.id],
			name: "mixing_batches_production_order_id_fkey"
		}),
	unique("mixing_batches_batch_number_key").on(table.batchNumber),
	check("screw_assignment_valid", sql`(screw_assignment)::text = ANY (ARRAY[('A'::character varying)::text, ('B'::character varying)::text])`),
	check("total_weight_positive", sql`total_weight_kg > (0)::numeric`),
]);

export const batchIngredients = pgTable("batch_ingredients", {
	id: serial().primaryKey().notNull(),
	batchId: integer("batch_id").notNull(),
	actualWeightKg: numeric("actual_weight_kg", { precision: 10, scale:  2 }).notNull(),
	notes: text(),
	itemId: varchar("item_id", { length: 20 }).notNull(),
	percentage: numeric({ precision: 5, scale:  2 }),
}, (table) => [
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [mixingBatches.id],
			name: "batch_ingredients_batch_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "batch_ingredients_item_id_fkey"
		}),
	check("actual_weight_positive", sql`(actual_weight_kg IS NULL) OR (actual_weight_kg > (0)::numeric)`),
	check("percentage_valid", sql`(percentage IS NULL) OR ((percentage > (0)::numeric) AND (percentage <= (100)::numeric))`),
]);

export const items = pgTable("items", {
	id: varchar({ length: 20 }).primaryKey().notNull(),
	name: varchar({ length: 100 }),
	nameAr: varchar("name_ar", { length: 100 }),
	categoryId: varchar("category_id", { length: 20 }),
	status: varchar({ length: 20 }).default('active'),
	code: varchar({ length: 50 }),
}, (table) => [
	index("idx_items_category_id").using("btree", table.categoryId.asc().nullsLast().op("text_ops")),
	index("idx_items_name_gin").using("gin", sql`(((name)::text || ' '::text) || (COALESCE(name_ar`),
	index("idx_items_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const consumableParts = pgTable("consumable_parts", {
	id: serial().primaryKey().notNull(),
	partId: varchar("part_id", { length: 50 }).notNull(),
	type: varchar({ length: 100 }).notNull(),
	code: varchar({ length: 50 }).notNull(),
	currentQuantity: integer("current_quantity").default(0).notNull(),
	minQuantity: integer("min_quantity").default(0),
	maxQuantity: integer("max_quantity").default(0),
	unit: varchar({ length: 20 }).default('قطعة'),
	barcode: varchar({ length: 100 }),
	location: varchar({ length: 100 }),
	notes: text(),
	status: varchar({ length: 20 }).default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("consumable_parts_part_id_key").on(table.partId),
	check("consumable_status_valid", sql`(status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])`),
	check("current_quantity_non_negative", sql`current_quantity >= 0`),
	check("max_quantity_non_negative", sql`max_quantity >= 0`),
	check("min_quantity_non_negative", sql`min_quantity >= 0`),
]);

export const consumablePartsTransactions = pgTable("consumable_parts_transactions", {
	id: serial().primaryKey().notNull(),
	transactionId: varchar("transaction_id", { length: 50 }).notNull(),
	consumablePartId: integer("consumable_part_id").notNull(),
	transactionType: varchar("transaction_type", { length: 10 }).notNull(),
	quantity: integer().notNull(),
	barcodeScanned: varchar("barcode_scanned", { length: 100 }),
	manualEntry: boolean("manual_entry").default(false),
	transactionReason: varchar("transaction_reason", { length: 100 }),
	notes: text(),
	performedBy: integer("performed_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.consumablePartId],
			foreignColumns: [consumableParts.id],
			name: "consumable_parts_transactions_consumable_part_id_fkey"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.performedBy],
			foreignColumns: [users.id],
			name: "consumable_parts_transactions_performed_by_fkey"
		}).onDelete("restrict"),
	unique("consumable_parts_transactions_transaction_id_key").on(table.transactionId),
	check("quantity_positive", sql`quantity > 0`),
	check("transaction_type_valid", sql`(transaction_type)::text = ANY (ARRAY[('in'::character varying)::text, ('out'::character varying)::text])`),
]);

export const customers = pgTable("customers", {
	id: varchar({ length: 20 }).primaryKey().notNull(),
	name: varchar({ length: 200 }).notNull(),
	nameAr: varchar("name_ar", { length: 200 }),
	city: varchar({ length: 50 }),
	address: text(),
	taxNumber: varchar("tax_number", { length: 14 }),
	phone: varchar({ length: 20 }),
	salesRepId: integer("sales_rep_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	code: varchar({ length: 20 }),
	userId: varchar("user_id", { length: 10 }),
	plateDrawerCode: varchar("plate_drawer_code", { length: 20 }),
	commercialName: varchar("commercial_name", { length: 200 }),
	unifiedNumber: varchar("unified_number", { length: 10 }),
	uniqueCustomerNumber: varchar("unique_customer_number", { length: 20 }),
	isActive: boolean("is_active").default(true),
}, (table) => [
	index("idx_customers_code").using("btree", table.code.asc().nullsLast().op("text_ops")),
	index("idx_customers_id").using("btree", table.id.asc().nullsLast().op("text_ops")),
	index("idx_customers_name_ar_text").using("gin", table.nameAr.asc().nullsLast().op("gin_trgm_ops")),
	index("idx_customers_name_gin").using("gin", sql`(((name)::text || ' '::text) || (COALESCE(name_ar`),
	index("idx_customers_name_name_ar").using("btree", table.name.asc().nullsLast().op("text_ops"), table.nameAr.asc().nullsLast().op("text_ops")),
	index("idx_customers_name_text").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
	foreignKey({
			columns: [table.salesRepId],
			foreignColumns: [users.id],
			name: "customers_sales_rep_id_users_id_fk"
		}).onUpdate("cascade"),
	check("tax_number_length", sql`(tax_number IS NULL) OR (length((tax_number)::text) = 14)`),
	check("unified_number_format", sql`(unified_number IS NULL) OR ((unified_number)::text ~ '^7[0-9]{9}$'::text)`),
]);

export const customerProducts = pgTable("customer_products", {
	id: serial().primaryKey().notNull(),
	customerId: varchar("customer_id", { length: 20 }),
	itemId: varchar("item_id", { length: 20 }),
	sizeCaption: varchar("size_caption", { length: 50 }),
	width: numeric({ precision: 8, scale:  2 }),
	leftFacing: numeric("left_facing", { precision: 8, scale:  2 }),
	rightFacing: numeric("right_facing", { precision: 8, scale:  2 }),
	thickness: integer(),
	printingCylinder: varchar("printing_cylinder", { length: 10 }),
	cuttingLengthCm: integer("cutting_length_cm"),
	rawMaterial: varchar("raw_material", { length: 20 }),
	masterBatchId: varchar("master_batch_id", { length: 20 }),
	isPrinted: boolean("is_printed").default(false),
	cuttingUnit: varchar("cutting_unit", { length: 20 }),
	punching: varchar({ length: 20 }),
	unitWeightKg: numeric("unit_weight_kg", { precision: 8, scale:  3 }),
	unitQuantity: integer("unit_quantity"),
	packageWeightKg: numeric("package_weight_kg", { precision: 8, scale:  2 }),
	clicheFrontDesign: text("cliche_front_design"),
	clicheBackDesign: text("cliche_back_design"),
	notes: text(),
	status: varchar({ length: 20 }).default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	categoryId: varchar("category_id", { length: 20 }),
}, (table) => [
	index("idx_customer_products_category_id").using("btree", table.categoryId.asc().nullsLast().op("text_ops")),
	index("idx_customer_products_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_customer_products_customer_id").using("btree", table.customerId.asc().nullsLast().op("text_ops")),
	index("idx_customer_products_customer_status").using("btree", table.customerId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("idx_customer_products_id").using("btree", table.id.asc().nullsLast().op("int4_ops")),
	index("idx_customer_products_item_id").using("btree", table.itemId.asc().nullsLast().op("text_ops")),
	index("idx_customer_products_size_caption").using("gin", table.sizeCaption.asc().nullsLast().op("gin_trgm_ops")),
	index("idx_customer_products_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "customer_products_customer_id_customers_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "customer_products_item_id_items_id_fk"
		}),
]);

export const cuts = pgTable("cuts", {
	id: serial().primaryKey().notNull(),
	rollId: integer("roll_id").notNull(),
	cutWeightKg: numeric("cut_weight_kg", { precision: 12, scale:  3 }).notNull(),
	piecesCount: integer("pieces_count"),
	performedBy: integer("performed_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("cuts_roll_created_idx").using("btree", table.rollId.asc().nullsLast().op("int4_ops"), table.createdAt.desc().nullsFirst().op("int4_ops")),
	index("idx_cuts_performed_by").using("btree", table.performedBy.asc().nullsLast().op("int4_ops")),
	index("idx_cuts_roll_id").using("btree", table.rollId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.performedBy],
			foreignColumns: [users.id],
			name: "cuts_performed_by_fkey"
		}),
	foreignKey({
			columns: [table.rollId],
			foreignColumns: [rolls.id],
			name: "cuts_roll_id_fkey"
		}).onDelete("cascade"),
]);

export const rolls = pgTable("rolls", {
	id: serial().primaryKey().notNull(),
	rollNumber: varchar("roll_number", { length: 50 }).notNull(),
	weight: numeric({ precision: 8, scale:  2 }),
	status: varchar({ length: 30 }).default('for_printing'),
	currentStage: varchar("current_stage", { length: 30 }).default('film'),
	machineId: varchar("machine_id", { length: 20 }),
	employeeId: integer("employee_id"),
	qrCode: varchar("qr_code", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	rollSeq: integer("roll_seq"),
	qrCodeText: text("qr_code_text"),
	qrPngBase64: text("qr_png_base64"),
	weightKg: numeric("weight_kg", { precision: 12, scale:  3 }),
	cutWeightTotalKg: numeric("cut_weight_total_kg", { precision: 12, scale:  3 }).default('0'),
	wasteKg: numeric("waste_kg", { precision: 12, scale:  3 }).default('0'),
	printedAt: timestamp("printed_at", { mode: 'string' }),
	cutCompletedAt: timestamp("cut_completed_at", { mode: 'string' }),
	performedBy: integer("performed_by"),
	stage: varchar({ length: 20 }),
	productionOrderId: integer("production_order_id"),
	createdBy: integer("created_by"),
	printedBy: integer("printed_by"),
	cutBy: integer("cut_by"),
	filmMachineId: varchar("film_machine_id", { length: 20 }),
	printingMachineId: varchar("printing_machine_id", { length: 20 }),
	cuttingMachineId: varchar("cutting_machine_id", { length: 20 }),
	isLastRoll: boolean("is_last_roll").default(false),
	productionTimeMinutes: integer("production_time_minutes"),
	rollCreatedAt: timestamp("roll_created_at", { mode: 'string' }).defaultNow(),
	rollDimensions: varchar("roll_dimensions", { length: 100 }),
	sideGussets: numeric("side_gussets", { precision: 8, scale:  2 }),
}, (table) => [
	index("idx_rolls_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_rolls_created_by").using("btree", table.createdBy.asc().nullsLast().op("int4_ops")),
	index("idx_rolls_cutting_machine_id").using("btree", table.cuttingMachineId.asc().nullsLast().op("text_ops")),
	index("idx_rolls_film_machine_id").using("btree", table.filmMachineId.asc().nullsLast().op("text_ops")),
	index("idx_rolls_printing_machine_id").using("btree", table.printingMachineId.asc().nullsLast().op("text_ops")),
	index("idx_rolls_production_order_id").using("btree", table.productionOrderId.asc().nullsLast().op("int4_ops")),
	index("idx_rolls_stage").using("btree", table.stage.asc().nullsLast().op("text_ops")),
	index("idx_rolls_stage_created_at").using("btree", table.stage.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("idx_rolls_stage_status").using("btree", table.stage.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "rolls_created_by_fkey"
		}),
	foreignKey({
			columns: [table.cutBy],
			foreignColumns: [users.id],
			name: "rolls_cut_by_fkey"
		}),
	foreignKey({
			columns: [table.cuttingMachineId],
			foreignColumns: [machines.id],
			name: "rolls_cutting_machine_id_machines_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [users.id],
			name: "rolls_employee_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.filmMachineId],
			foreignColumns: [machines.id],
			name: "rolls_film_machine_id_machines_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.machineId],
			foreignColumns: [machines.id],
			name: "rolls_machine_id_machines_id_fk"
		}),
	foreignKey({
			columns: [table.printedBy],
			foreignColumns: [users.id],
			name: "rolls_printed_by_fkey"
		}),
	foreignKey({
			columns: [table.printingMachineId],
			foreignColumns: [machines.id],
			name: "rolls_printing_machine_id_machines_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.productionOrderId],
			foreignColumns: [productionOrders.id],
			name: "rolls_production_order_id_production_orders_id_fk"
		}),
	unique("rolls_roll_number_unique").on(table.rollNumber),
]);

export const erpConfigurations = pgTable("erp_configurations", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameAr: varchar("name_ar", { length: 100 }),
	type: varchar({ length: 50 }).notNull(),
	endpoint: varchar({ length: 500 }).notNull(),
	apiKey: varchar("api_key", { length: 500 }),
	username: varchar({ length: 100 }),
	password: varchar({ length: 500 }),
	settings: json(),
	isActive: boolean("is_active").default(true),
	lastSync: timestamp("last_sync", { mode: 'string' }),
	syncFrequency: integer("sync_frequency").default(60),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const erpEntityMappings = pgTable("erp_entity_mappings", {
	id: serial().primaryKey().notNull(),
	erpConfigId: integer("erp_config_id"),
	localEntityType: varchar("local_entity_type", { length: 50 }).notNull(),
	localEntityId: integer("local_entity_id").notNull(),
	externalEntityId: varchar("external_entity_id", { length: 100 }).notNull(),
	externalEntityData: json("external_entity_data"),
	syncStatus: varchar("sync_status", { length: 20 }).default('synced'),
	lastSynced: timestamp("last_synced", { mode: 'string' }).defaultNow(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.erpConfigId],
			foreignColumns: [erpConfigurations.id],
			name: "erp_entity_mappings_erp_config_id_erp_configurations_id_fk"
		}),
]);

export const erpFieldMappings = pgTable("erp_field_mappings", {
	id: serial().primaryKey().notNull(),
	erpConfigId: integer("erp_config_id"),
	entityType: varchar("entity_type", { length: 50 }).notNull(),
	localField: varchar("local_field", { length: 100 }).notNull(),
	externalField: varchar("external_field", { length: 100 }).notNull(),
	transformationRule: text("transformation_rule"),
	isRequired: boolean("is_required").default(false),
	defaultValue: varchar("default_value", { length: 500 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.erpConfigId],
			foreignColumns: [erpConfigurations.id],
			name: "erp_field_mappings_erp_config_id_erp_configurations_id_fk"
		}),
]);

export const erpSyncLogs = pgTable("erp_sync_logs", {
	id: serial().primaryKey().notNull(),
	erpConfigId: integer("erp_config_id"),
	entityType: varchar("entity_type", { length: 50 }).notNull(),
	entityId: integer("entity_id"),
	operation: varchar({ length: 50 }).notNull(),
	status: varchar({ length: 20 }).notNull(),
	recordsProcessed: integer("records_processed").default(0),
	recordsSuccess: integer("records_success").default(0),
	recordsFailed: integer("records_failed").default(0),
	errorMessage: text("error_message"),
	syncDuration: integer("sync_duration"),
	dataPayload: json("data_payload"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.erpConfigId],
			foreignColumns: [erpConfigurations.id],
			name: "erp_sync_logs_erp_config_id_erp_configurations_id_fk"
		}),
]);

export const erpSyncSchedules = pgTable("erp_sync_schedules", {
	id: serial().primaryKey().notNull(),
	erpConfigId: integer("erp_config_id"),
	entityType: varchar("entity_type", { length: 50 }).notNull(),
	syncDirection: varchar("sync_direction", { length: 20 }).notNull(),
	scheduleType: varchar("schedule_type", { length: 20 }).notNull(),
	scheduleTime: varchar("schedule_time", { length: 10 }),
	lastRun: timestamp("last_run", { mode: 'string' }),
	nextRun: timestamp("next_run", { mode: 'string' }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.erpConfigId],
			foreignColumns: [erpConfigurations.id],
			name: "erp_sync_schedules_erp_config_id_erp_configurations_id_fk"
		}),
]);

export const inventoryCounts = pgTable("inventory_counts", {
	id: serial().primaryKey().notNull(),
	countNumber: varchar("count_number", { length: 50 }).notNull(),
	countDate: timestamp("count_date", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	countType: varchar("count_type", { length: 50 }).default('periodic'),
	locationId: integer("location_id"),
	status: varchar({ length: 50 }).default('in_progress'),
	notes: text(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("inventory_counts_count_number_key").on(table.countNumber),
]);

export const inventoryCountItems = pgTable("inventory_count_items", {
	id: serial().primaryKey().notNull(),
	countId: integer("count_id"),
	itemId: varchar("item_id", { length: 100 }),
	barcode: varchar({ length: 100 }),
	systemQuantity: numeric("system_quantity", { precision: 15, scale:  3 }).default('0'),
	countedQuantity: numeric("counted_quantity", { precision: 15, scale:  3 }).default('0'),
	difference: numeric({ precision: 15, scale:  3 }).default('0'),
	unit: varchar({ length: 50 }).default('كيلو'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.countId],
			foreignColumns: [inventoryCounts.id],
			name: "inventory_count_items_count_id_fkey"
		}),
]);

export const inventory = pgTable("inventory", {
	id: serial().primaryKey().notNull(),
	itemId: varchar("item_id", { length: 20 }).notNull(),
	locationId: integer("location_id"),
	currentStock: numeric("current_stock", { precision: 10, scale:  2 }).default('0'),
	minStock: numeric("min_stock", { precision: 10, scale:  2 }).default('0'),
	maxStock: numeric("max_stock", { precision: 10, scale:  2 }).default('0'),
	unit: varchar({ length: 20 }).default('كيلو'),
	costPerUnit: numeric("cost_per_unit", { precision: 10, scale:  4 }),
	lastUpdated: timestamp("last_updated", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_inventory_item_id").using("btree", table.itemId.asc().nullsLast().op("text_ops")),
	index("idx_inventory_location_id").using("btree", table.locationId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "inventory_item_id_items_id_fk"
		}),
	foreignKey({
			columns: [table.locationId],
			foreignColumns: [locations.id],
			name: "inventory_location_id_locations_id_fk"
		}),
]);

export const locations = pgTable("locations", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameAr: varchar("name_ar", { length: 100 }),
	coordinates: varchar({ length: 100 }),
	toleranceRange: integer("tolerance_range"),
});

export const inventoryMovements = pgTable("inventory_movements", {
	id: serial().primaryKey().notNull(),
	inventoryId: integer("inventory_id"),
	movementType: varchar("movement_type", { length: 20 }).notNull(),
	quantity: numeric({ precision: 10, scale:  2 }).notNull(),
	unitCost: numeric("unit_cost", { precision: 10, scale:  4 }),
	totalCost: numeric("total_cost", { precision: 10, scale:  4 }),
	referenceNumber: varchar("reference_number", { length: 50 }),
	referenceType: varchar("reference_type", { length: 20 }),
	notes: text(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_inventory_movements_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_inventory_movements_inventory_id").using("btree", table.inventoryId.asc().nullsLast().op("int4_ops")),
	index("idx_inventory_movements_movement_type").using("btree", table.movementType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "inventory_movements_created_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.inventoryId],
			foreignColumns: [inventory.id],
			name: "inventory_movements_inventory_id_inventory_id_fk"
		}),
]);

export const leaveBalances = pgTable("leave_balances", {
	id: serial().primaryKey().notNull(),
	employeeId: integer("employee_id").notNull(),
	leaveTypeId: integer("leave_type_id").notNull(),
	year: integer().notNull(),
	allocatedDays: integer("allocated_days").notNull(),
	usedDays: integer("used_days").default(0),
	pendingDays: integer("pending_days").default(0),
	remainingDays: integer("remaining_days").notNull(),
	carriedForward: integer("carried_forward").default(0),
	expiresAt: date("expires_at"),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [users.id],
			name: "leave_balances_employee_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.leaveTypeId],
			foreignColumns: [leaveTypes.id],
			name: "leave_balances_leave_type_id_leave_types_id_fk"
		}),
]);

export const leaveTypes = pgTable("leave_types", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameAr: varchar("name_ar", { length: 100 }),
	description: text(),
	descriptionAr: text("description_ar"),
	daysPerYear: integer("days_per_year"),
	isPaid: boolean("is_paid").default(true),
	requiresMedicalCertificate: boolean("requires_medical_certificate").default(false),
	minNoticeDays: integer("min_notice_days").default(1),
	maxConsecutiveDays: integer("max_consecutive_days"),
	applicableAfterMonths: integer("applicable_after_months").default(0),
	color: varchar({ length: 20 }).default('#3b82f6'),
	isActive: boolean("is_active").default(true),
});

export const leaveRequests = pgTable("leave_requests", {
	id: serial().primaryKey().notNull(),
	employeeId: integer("employee_id").notNull(),
	leaveTypeId: integer("leave_type_id").notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	daysCount: integer("days_count").notNull(),
	reason: text(),
	medicalCertificateUrl: varchar("medical_certificate_url", { length: 500 }),
	emergencyContact: varchar("emergency_contact", { length: 100 }),
	workHandover: text("work_handover"),
	replacementEmployeeId: integer("replacement_employee_id"),
	directManagerId: integer("direct_manager_id"),
	directManagerStatus: varchar("direct_manager_status", { length: 20 }).default('pending'),
	directManagerComments: text("direct_manager_comments"),
	directManagerActionDate: timestamp("direct_manager_action_date", { mode: 'string' }),
	hrStatus: varchar("hr_status", { length: 20 }).default('pending'),
	hrComments: text("hr_comments"),
	hrActionDate: timestamp("hr_action_date", { mode: 'string' }),
	hrReviewedBy: integer("hr_reviewed_by"),
	finalStatus: varchar("final_status", { length: 20 }).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.directManagerId],
			foreignColumns: [users.id],
			name: "leave_requests_direct_manager_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [users.id],
			name: "leave_requests_employee_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.hrReviewedBy],
			foreignColumns: [users.id],
			name: "leave_requests_hr_reviewed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.leaveTypeId],
			foreignColumns: [leaveTypes.id],
			name: "leave_requests_leave_type_id_leave_types_id_fk"
		}),
	foreignKey({
			columns: [table.replacementEmployeeId],
			foreignColumns: [users.id],
			name: "leave_requests_replacement_employee_id_users_id_fk"
		}),
]);

export const machineQueues = pgTable("machine_queues", {
	id: serial().primaryKey().notNull(),
	machineId: varchar("machine_id", { length: 20 }).notNull(),
	productionOrderId: integer("production_order_id").notNull(),
	queuePosition: integer("queue_position").notNull(),
	estimatedStartTime: timestamp("estimated_start_time", { mode: 'string' }),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
	assignedBy: integer("assigned_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_machine_queues_machine_id").using("btree", table.machineId.asc().nullsLast().op("text_ops")),
	index("idx_machine_queues_production_order_id").using("btree", table.productionOrderId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [users.id],
			name: "machine_queues_assigned_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.machineId],
			foreignColumns: [machines.id],
			name: "machine_queues_machine_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.productionOrderId],
			foreignColumns: [productionOrders.id],
			name: "machine_queues_production_order_id_fkey"
		}).onDelete("cascade"),
]);

export const machines = pgTable("machines", {
	id: varchar({ length: 20 }).primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameAr: varchar("name_ar", { length: 100 }),
	type: varchar({ length: 50 }),
	sectionId: varchar("section_id", { length: 20 }),
	status: varchar({ length: 20 }).default('active'),
	capacitySmallKgPerHour: numeric("capacity_small_kg_per_hour", { precision: 8, scale:  2 }),
	capacityMediumKgPerHour: numeric("capacity_medium_kg_per_hour", { precision: 8, scale:  2 }),
	capacityLargeKgPerHour: numeric("capacity_large_kg_per_hour", { precision: 8, scale:  2 }),
	screwType: varchar("screw_type", { length: 10 }).default('A'),
}, (table) => [
	index("idx_machines_section_id").using("btree", table.sectionId.asc().nullsLast().op("text_ops")),
	index("idx_machines_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_machines_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
	check("screw_type_valid", sql`(screw_type IS NULL) OR ((screw_type)::text = ANY (ARRAY[('A'::character varying)::text, ('ABA'::character varying)::text]))`),
]);

export const conversations = pgTable("conversations", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
	id: serial().primaryKey().notNull(),
	conversationId: integer("conversation_id").notNull(),
	role: text().notNull(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.conversationId],
			foreignColumns: [conversations.id],
			name: "messages_conversation_id_fkey"
		}).onDelete("cascade"),
]);

export const quickNotes = pgTable("quick_notes", {
	id: serial().primaryKey().notNull(),
	content: text().notNull(),
	noteType: varchar("note_type", { length: 50 }).notNull(),
	priority: varchar({ length: 20 }).default('normal'),
	createdBy: integer("created_by").notNull(),
	assignedTo: integer("assigned_to").notNull(),
	isRead: boolean("is_read").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_quick_notes_assigned_to").using("btree", table.assignedTo.asc().nullsLast().op("int4_ops")),
	index("idx_quick_notes_created_by").using("btree", table.createdBy.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "quick_notes_assigned_to_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "quick_notes_created_by_fkey"
		}),
]);

export const noteAttachments = pgTable("note_attachments", {
	id: serial().primaryKey().notNull(),
	noteId: integer("note_id").notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileType: varchar("file_type", { length: 100 }).notNull(),
	fileSize: integer("file_size").notNull(),
	fileUrl: text("file_url").notNull(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_note_attachments_note_id").using("btree", table.noteId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.noteId],
			foreignColumns: [quickNotes.id],
			name: "note_attachments_note_id_fkey"
		}).onDelete("cascade"),
]);

export const notificationEventSettings = pgTable("notification_event_settings", {
	id: serial().primaryKey().notNull(),
	eventKey: varchar("event_key", { length: 100 }).notNull(),
	eventName: varchar("event_name", { length: 200 }).notNull(),
	eventNameAr: varchar("event_name_ar", { length: 200 }).notNull(),
	eventDescription: text("event_description"),
	eventDescriptionAr: text("event_description_ar"),
	eventCategory: varchar("event_category", { length: 50 }).notNull(),
	isEnabled: boolean("is_enabled").default(true),
	whatsappEnabled: boolean("whatsapp_enabled").default(false),
	whatsappTemplateId: integer("whatsapp_template_id"),
	messageTemplate: text("message_template"),
	messageTemplateAr: text("message_template_ar"),
	recipientType: varchar("recipient_type", { length: 30 }).default('specific_users'),
	recipientUserIds: json("recipient_user_ids"),
	recipientRoleIds: json("recipient_role_ids"),
	notifyCustomer: boolean("notify_customer").default(false),
	conditionEnabled: boolean("condition_enabled").default(false),
	conditionField: varchar("condition_field", { length: 100 }),
	conditionOperator: varchar("condition_operator", { length: 20 }),
	conditionValue: varchar("condition_value", { length: 100 }),
	priority: varchar({ length: 20 }).default('normal'),
	delayMinutes: integer("delay_minutes").default(0),
	createdBy: integer("created_by"),
	updatedBy: integer("updated_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	recipientPhoneNumbers: json("recipient_phone_numbers"),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "notification_event_settings_created_by_fkey"
		}),
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "notification_event_settings_updated_by_fkey"
		}),
	foreignKey({
			columns: [table.whatsappTemplateId],
			foreignColumns: [notificationTemplates.id],
			name: "notification_event_settings_whatsapp_template_id_fkey"
		}),
	unique("notification_event_settings_event_key_key").on(table.eventKey),
]);

export const notificationEventLogs = pgTable("notification_event_logs", {
	id: serial().primaryKey().notNull(),
	eventSettingId: integer("event_setting_id"),
	eventKey: varchar("event_key", { length: 100 }).notNull(),
	triggerContextType: varchar("trigger_context_type", { length: 50 }),
	triggerContextId: varchar("trigger_context_id", { length: 50 }),
	triggerData: json("trigger_data"),
	messageSent: text("message_sent"),
	messageSentAr: text("message_sent_ar"),
	recipientPhone: varchar("recipient_phone", { length: 30 }),
	recipientUserId: integer("recipient_user_id"),
	recipientName: varchar("recipient_name", { length: 200 }),
	status: varchar({ length: 30 }).default('pending'),
	errorMessage: text("error_message"),
	externalMessageId: varchar("external_message_id", { length: 100 }),
	triggeredAt: timestamp("triggered_at", { mode: 'string' }).defaultNow(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.eventSettingId],
			foreignColumns: [notificationEventSettings.id],
			name: "notification_event_logs_event_setting_id_fkey"
		}),
	foreignKey({
			columns: [table.recipientUserId],
			foreignColumns: [users.id],
			name: "notification_event_logs_recipient_user_id_fkey"
		}),
]);

export const notificationTemplates = pgTable("notification_templates", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	nameAr: varchar("name_ar", { length: 255 }),
	description: text(),
	descriptionAr: text("description_ar"),
	subject: varchar({ length: 255 }),
	subjectAr: varchar("subject_ar", { length: 255 }),
	body: text().notNull(),
	bodyAr: text("body_ar"),
	type: varchar({ length: 50 }).default('info'),
	variables: jsonb(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 255 }),
	titleAr: varchar("title_ar", { length: 255 }),
	message: text().notNull(),
	messageAr: text("message_ar"),
	type: varchar({ length: 50 }).default('info'),
	priority: varchar({ length: 20 }).default('normal'),
	status: varchar({ length: 20 }).default('pending'),
	recipientId: varchar("recipient_id", { length: 50 }),
	phoneNumber: varchar("phone_number", { length: 20 }),
	twilioSid: varchar("twilio_sid", { length: 100 }),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { mode: 'string' }),
	errorMessage: text("error_message"),
	contextType: varchar("context_type", { length: 50 }),
	contextId: varchar("context_id", { length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	recipientType: varchar("recipient_type", { length: 20 }).default('user').notNull(),
	readAt: timestamp("read_at", { mode: 'string' }),
	externalStatus: varchar("external_status", { length: 30 }),
	scheduledFor: timestamp("scheduled_for", { mode: 'string' }),
	createdBy: integer("created_by"),
}, (table) => [
	index("idx_notifications_recipient_created").using("btree", table.recipientId.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("idx_notifications_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "notifications_created_by_fkey"
		}).onUpdate("cascade"),
]);

export const orders = pgTable("orders", {
	id: serial().primaryKey().notNull(),
	orderNumber: varchar("order_number", { length: 50 }).notNull(),
	customerId: varchar("customer_id", { length: 20 }).notNull(),
	status: varchar({ length: 30 }).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	deliveryDate: date("delivery_date"),
	notes: text(),
	deliveryDays: integer("delivery_days"),
	createdBy: integer("created_by"),
}, (table) => [
	index("idx_orders_customer_status_date").using("btree", table.customerId.asc().nullsLast().op("timestamp_ops"), table.status.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("idx_orders_order_number_gin").using("gin", table.orderNumber.asc().nullsLast().op("gin_trgm_ops")),
	index("idx_orders_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "orders_created_by_users_id_fk"
		}).onUpdate("cascade"),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "orders_customer_id_customers_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	unique("orders_order_number_unique").on(table.orderNumber),
]);

export const performanceCriteria = pgTable("performance_criteria", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	nameAr: varchar("name_ar", { length: 100 }),
	description: text(),
	descriptionAr: text("description_ar"),
	category: varchar({ length: 50 }),
	weightPercentage: integer("weight_percentage").default(20),
	applicableRoles: json("applicable_roles"),
	isActive: boolean("is_active").default(true),
});

export const performanceRatings = pgTable("performance_ratings", {
	id: serial().primaryKey().notNull(),
	reviewId: integer("review_id").notNull(),
	criteriaId: integer("criteria_id").notNull(),
	rating: integer().notNull(),
	comments: text(),
}, (table) => [
	foreignKey({
			columns: [table.criteriaId],
			foreignColumns: [performanceCriteria.id],
			name: "performance_ratings_criteria_id_performance_criteria_id_fk"
		}),
	foreignKey({
			columns: [table.reviewId],
			foreignColumns: [performanceReviews.id],
			name: "performance_ratings_review_id_performance_reviews_id_fk"
		}),
]);

export const performanceReviews = pgTable("performance_reviews", {
	id: serial().primaryKey().notNull(),
	employeeId: integer("employee_id").notNull(),
	reviewerId: integer("reviewer_id").notNull(),
	reviewPeriodStart: date("review_period_start").notNull(),
	reviewPeriodEnd: date("review_period_end").notNull(),
	reviewType: varchar("review_type", { length: 20 }),
	overallRating: integer("overall_rating"),
	goalsAchievement: integer("goals_achievement"),
	skillsRating: integer("skills_rating"),
	behaviorRating: integer("behavior_rating"),
	strengths: text(),
	areasForImprovement: text("areas_for_improvement"),
	developmentPlan: text("development_plan"),
	goalsForNextPeriod: text("goals_for_next_period"),
	employeeComments: text("employee_comments"),
	reviewerComments: text("reviewer_comments"),
	hrComments: text("hr_comments"),
	status: varchar({ length: 20 }).default('draft'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [users.id],
			name: "performance_reviews_employee_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.reviewerId],
			foreignColumns: [users.id],
			name: "performance_reviews_reviewer_id_users_id_fk"
		}),
]);

export const qualityChecks = pgTable("quality_checks", {
	id: serial().primaryKey().notNull(),
	targetType: varchar("target_type", { length: 20 }),
	targetId: integer("target_id"),
	result: varchar({ length: 10 }),
	score: integer(),
	notes: text(),
	checkedBy: integer("checked_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_quality_checks_checked_by").using("btree", table.checkedBy.asc().nullsLast().op("int4_ops")),
	index("idx_quality_checks_result").using("btree", table.result.asc().nullsLast().op("text_ops")),
	index("idx_quality_checks_target_id").using("btree", table.targetId.asc().nullsLast().op("int4_ops")),
	index("idx_quality_checks_target_type").using("btree", table.targetType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.checkedBy],
			foreignColumns: [users.id],
			name: "quality_checks_checked_by_users_id_fk"
		}),
]);

export const quotes = pgTable("quotes", {
	id: serial().primaryKey().notNull(),
	documentNumber: varchar("document_number", { length: 50 }).notNull(),
	customerName: varchar("customer_name", { length: 255 }).notNull(),
	taxNumber: varchar("tax_number", { length: 14 }).notNull(),
	quoteDate: date("quote_date").default(sql`CURRENT_DATE`).notNull(),
	totalBeforeTax: numeric("total_before_tax", { precision: 12, scale:  2 }).default('0').notNull(),
	taxAmount: numeric("tax_amount", { precision: 12, scale:  2 }).default('0').notNull(),
	totalWithTax: numeric("total_with_tax", { precision: 12, scale:  2 }).default('0').notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	createdByName: varchar("created_by_name", { length: 255 }),
	createdByPhone: varchar("created_by_phone", { length: 20 }),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	unique("quotes_document_number_key").on(table.documentNumber),
]);

export const quoteItems = pgTable("quote_items", {
	id: serial().primaryKey().notNull(),
	quoteId: integer("quote_id").notNull(),
	lineNumber: integer("line_number").notNull(),
	itemName: varchar("item_name", { length: 255 }).notNull(),
	unit: varchar({ length: 20 }).notNull(),
	unitPrice: numeric("unit_price", { precision: 12, scale:  2 }).notNull(),
	quantity: numeric({ precision: 12, scale:  2 }).notNull(),
	lineTotal: numeric("line_total", { precision: 12, scale:  2 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.quoteId],
			foreignColumns: [quotes.id],
			name: "quote_items_quote_id_fkey"
		}).onDelete("cascade"),
]);

export const quoteTemplates = pgTable("quote_templates", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	productName: varchar("product_name", { length: 255 }).notNull(),
	productDescription: text("product_description"),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }).notNull(),
	unit: varchar({ length: 50 }).default('كجم').notNull(),
	minQuantity: numeric("min_quantity", { precision: 10, scale:  2 }),
	specifications: jsonb(),
	isActive: boolean("is_active").default(true).notNull(),
	category: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdBy: integer("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "quote_templates_created_by_fkey"
		}),
]);

export const systemSettings = pgTable("system_settings", {
	id: serial().primaryKey().notNull(),
	settingKey: varchar("setting_key", { length: 100 }).notNull(),
	settingValue: text("setting_value"),
	settingType: varchar("setting_type", { length: 20 }).default('string'),
	description: text(),
	isEditable: boolean("is_editable").default(true),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	updatedBy: integer("updated_by"),
}, (table) => [
	foreignKey({
			columns: [table.updatedBy],
			foreignColumns: [users.id],
			name: "system_settings_updated_by_users_id_fk"
		}),
	unique("system_settings_setting_key_unique").on(table.settingKey),
]);

export const trainingCertificates = pgTable("training_certificates", {
	id: serial().primaryKey().notNull(),
	enrollmentId: integer("enrollment_id"),
	employeeId: integer("employee_id"),
	programId: integer("program_id"),
	certificateNumber: varchar("certificate_number", { length: 50 }).notNull(),
	issueDate: date("issue_date").notNull(),
	expiryDate: date("expiry_date"),
	finalScore: integer("final_score"),
	certificateStatus: varchar("certificate_status", { length: 20 }).default('active'),
	issuedBy: integer("issued_by"),
	certificateFileUrl: varchar("certificate_file_url", { length: 500 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [users.id],
			name: "training_certificates_employee_id_fkey"
		}),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [trainingEnrollments.id],
			name: "training_certificates_enrollment_id_fkey"
		}),
	foreignKey({
			columns: [table.issuedBy],
			foreignColumns: [users.id],
			name: "training_certificates_issued_by_fkey"
		}),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [trainingPrograms.id],
			name: "training_certificates_program_id_fkey"
		}),
	unique("training_certificates_enrollment_id_key").on(table.enrollmentId),
	unique("training_certificates_certificate_number_key").on(table.certificateNumber),
]);

export const trainingEnrollments = pgTable("training_enrollments", {
	id: serial().primaryKey().notNull(),
	programId: integer("program_id"),
	employeeId: integer("employee_id"),
	enrolledDate: timestamp("enrolled_date", { mode: 'string' }).defaultNow(),
	startDate: date("start_date"),
	completionDate: date("completion_date"),
	status: varchar({ length: 20 }).default('enrolled'),
	progressPercentage: integer("progress_percentage").default(0),
	finalScore: integer("final_score"),
	certificateIssued: boolean("certificate_issued").default(false),
	trainingDate: date("training_date"),
	attendanceStatus: varchar("attendance_status", { length: 20 }).default('enrolled'),
	completionStatus: varchar("completion_status", { length: 20 }).default('not_started'),
	attendanceNotes: text("attendance_notes"),
	practicalPerformance: varchar("practical_performance", { length: 20 }),
	certificateNumber: varchar("certificate_number", { length: 50 }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [users.id],
			name: "training_enrollments_employee_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [trainingPrograms.id],
			name: "training_enrollments_program_id_training_programs_id_fk"
		}),
]);

export const trainingPrograms = pgTable("training_programs", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 200 }).notNull(),
	titleAr: varchar("title_ar", { length: 200 }),
	description: text(),
	descriptionAr: text("description_ar"),
	category: varchar({ length: 50 }),
	durationHours: integer("duration_hours"),
	maxParticipants: integer("max_participants"),
	prerequisites: text(),
	learningObjectives: json("learning_objectives"),
	materials: json(),
	instructorId: integer("instructor_id"),
	status: varchar({ length: 20 }).default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	type: varchar({ length: 20 }).default('field'),
	trainingScope: varchar("training_scope", { length: 50 }),
	location: varchar({ length: 200 }),
	practicalRequirements: text("practical_requirements"),
	departmentId: varchar("department_id", { length: 20 }),
}, (table) => [
	foreignKey({
			columns: [table.instructorId],
			foreignColumns: [users.id],
			name: "training_programs_instructor_id_users_id_fk"
		}),
]);

export const trainingEvaluations = pgTable("training_evaluations", {
	id: serial().primaryKey().notNull(),
	enrollmentId: integer("enrollment_id"),
	programId: integer("program_id"),
	employeeId: integer("employee_id"),
	evaluatorId: integer("evaluator_id"),
	evaluationDate: date("evaluation_date").notNull(),
	theoreticalUnderstanding: integer("theoretical_understanding"),
	practicalSkills: integer("practical_skills"),
	safetyCompliance: integer("safety_compliance"),
	teamwork: integer(),
	communication: integer(),
	overallRating: integer("overall_rating"),
	strengths: text(),
	areasForImprovement: text("areas_for_improvement"),
	additionalNotes: text("additional_notes"),
	recommendation: varchar({ length: 20 }),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [users.id],
			name: "training_evaluations_employee_id_fkey"
		}),
	foreignKey({
			columns: [table.enrollmentId],
			foreignColumns: [trainingEnrollments.id],
			name: "training_evaluations_enrollment_id_fkey"
		}),
	foreignKey({
			columns: [table.evaluatorId],
			foreignColumns: [users.id],
			name: "training_evaluations_evaluator_id_fkey"
		}),
	foreignKey({
			columns: [table.programId],
			foreignColumns: [trainingPrograms.id],
			name: "training_evaluations_program_id_fkey"
		}),
]);

export const trainingMaterials = pgTable("training_materials", {
	id: serial().primaryKey().notNull(),
	programId: integer("program_id"),
	title: varchar({ length: 200 }).notNull(),
	titleAr: varchar("title_ar", { length: 200 }),
	type: varchar({ length: 20 }),
	content: text(),
	fileUrl: varchar("file_url", { length: 500 }),
	orderIndex: integer("order_index").default(0),
	durationMinutes: integer("duration_minutes"),
	isMandatory: boolean("is_mandatory").default(true),
}, (table) => [
	foreignKey({
			columns: [table.programId],
			foreignColumns: [trainingPrograms.id],
			name: "training_materials_program_id_training_programs_id_fk"
		}),
]);

export const trainingRecords = pgTable("training_records", {
	id: serial().primaryKey().notNull(),
	employeeId: integer("employee_id"),
	trainingType: varchar("training_type", { length: 100 }),
	trainingName: varchar("training_name", { length: 200 }),
	date: date().notNull(),
	status: varchar({ length: 20 }).default('completed'),
	instructor: varchar({ length: 100 }),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [users.id],
			name: "training_records_employee_id_users_id_fk"
		}),
]);

export const userRequests = pgTable("user_requests", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: varchar({ length: 50 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text().notNull(),
	status: varchar({ length: 20 }).default('معلق').notNull(),
	priority: varchar({ length: 20 }).default('عادي'),
	response: text(),
	reviewedBy: integer("reviewed_by"),
	date: timestamp({ mode: 'string' }).defaultNow().notNull(),
	reviewedDate: timestamp("reviewed_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_user_requests_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_user_requests_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_user_requests_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
	index("idx_user_requests_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "user_requests_reviewed_by_fkey"
		}).onUpdate("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_requests_user_id_fkey"
		}).onUpdate("cascade"),
]);

export const userSettings = pgTable("user_settings", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	settingKey: varchar("setting_key", { length: 100 }).notNull(),
	settingValue: text("setting_value"),
	settingType: varchar("setting_type", { length: 20 }).default('string'),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_settings_user_id_users_id_fk"
		}),
]);

export const userViolations = pgTable("user_violations", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: varchar({ length: 100 }).notNull(),
	description: text().notNull(),
	penalty: text().notNull(),
	status: varchar({ length: 20 }).default('معلق').notNull(),
	severity: varchar({ length: 20 }).default('متوسط'),
	createdBy: integer("created_by").notNull(),
	reviewedBy: integer("reviewed_by"),
	date: date().default(sql`CURRENT_DATE`).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "user_violations_created_by_fkey"
		}).onUpdate("cascade"),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "user_violations_reviewed_by_fkey"
		}).onUpdate("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_violations_user_id_fkey"
		}).onUpdate("cascade"),
]);

export const roles = pgTable("roles", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 50 }).notNull(),
	nameAr: varchar("name_ar", { length: 100 }),
	permissions: json(),
});

export const violations = pgTable("violations", {
	id: serial().primaryKey().notNull(),
	employeeId: integer("employee_id"),
	violationType: varchar("violation_type", { length: 50 }),
	description: text(),
	date: date().notNull(),
	actionTaken: text("action_taken"),
	reportedBy: integer("reported_by"),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [users.id],
			name: "violations_employee_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.reportedBy],
			foreignColumns: [users.id],
			name: "violations_reported_by_users_id_fk"
		}),
]);

export const warehouseReceipts = pgTable("warehouse_receipts", {
	id: serial().primaryKey().notNull(),
	cutId: integer("cut_id"),
	receivedWeightKg: numeric("received_weight_kg", { precision: 12, scale:  3 }).notNull(),
	receivedBy: integer("received_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	productionOrderId: integer("production_order_id"),
}, (table) => [
	index("idx_warehouse_receipts_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_warehouse_receipts_cut_id").using("btree", table.cutId.asc().nullsLast().op("int4_ops")),
	index("idx_warehouse_receipts_production_order_id").using("btree", table.productionOrderId.asc().nullsLast().op("int4_ops")),
	index("idx_warehouse_receipts_received_by").using("btree", table.receivedBy.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.cutId],
			foreignColumns: [cuts.id],
			name: "warehouse_receipts_cut_id_fkey"
		}),
	foreignKey({
			columns: [table.productionOrderId],
			foreignColumns: [productionOrders.id],
			name: "warehouse_receipts_production_order_id_fkey"
		}),
	foreignKey({
			columns: [table.receivedBy],
			foreignColumns: [users.id],
			name: "warehouse_receipts_received_by_fkey"
		}),
]);

export const warehouseTransactions = pgTable("warehouse_transactions", {
	id: serial().primaryKey().notNull(),
	type: varchar({ length: 30 }),
	itemId: varchar("item_id", { length: 20 }),
	quantity: numeric({ precision: 10, scale:  2 }).notNull(),
	fromLocation: varchar("from_location", { length: 100 }),
	toLocation: varchar("to_location", { length: 100 }),
	date: timestamp({ mode: 'string' }).defaultNow(),
	referenceId: integer("reference_id"),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "warehouse_transactions_item_id_items_id_fk"
		}),
]);

export const waste = pgTable("waste", {
	id: serial().primaryKey().notNull(),
	rollId: integer("roll_id"),
	jobOrderId: integer("job_order_id"),
	quantityWasted: numeric("quantity_wasted", { precision: 8, scale:  2 }).notNull(),
	reason: varchar({ length: 100 }),
	stage: varchar({ length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	productionOrderId: integer("production_order_id"),
}, (table) => [
	index("idx_waste_production_order_id").using("btree", table.productionOrderId.asc().nullsLast().op("int4_ops")),
	index("idx_waste_roll_id").using("btree", table.rollId.asc().nullsLast().op("int4_ops")),
	index("idx_waste_stage").using("btree", table.stage.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.rollId],
			foreignColumns: [rolls.id],
			name: "waste_roll_id_rolls_id_fk"
		}),
]);

export const productionOrders = pgTable("production_orders", {
	id: serial().primaryKey().notNull(),
	productionOrderNumber: varchar("production_order_number", { length: 50 }).notNull(),
	orderId: integer("order_id").notNull(),
	customerProductId: integer("customer_product_id"),
	quantityKg: numeric("quantity_kg", { precision: 10, scale:  2 }).notNull(),
	status: varchar({ length: 30 }).default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	overrunPercentage: numeric("overrun_percentage", { precision: 5, scale:  2 }).default('5.00').notNull(),
	finalQuantityKg: numeric("final_quantity_kg", { precision: 10, scale:  2 }).default('0').notNull(),
	producedQuantityKg: numeric("produced_quantity_kg", { precision: 10, scale:  2 }).default('0').notNull(),
	printedQuantityKg: numeric("printed_quantity_kg", { precision: 10, scale:  2 }).default('0').notNull(),
	netQuantityKg: numeric("net_quantity_kg", { precision: 10, scale:  2 }).default('0').notNull(),
	wasteQuantityKg: numeric("waste_quantity_kg", { precision: 10, scale:  2 }).default('0').notNull(),
	filmCompletionPercentage: numeric("film_completion_percentage", { precision: 5, scale:  2 }).default('0').notNull(),
	printingCompletionPercentage: numeric("printing_completion_percentage", { precision: 5, scale:  2 }).default('0').notNull(),
	cuttingCompletionPercentage: numeric("cutting_completion_percentage", { precision: 5, scale:  2 }).default('0').notNull(),
	assignedMachineId: varchar("assigned_machine_id", { length: 20 }),
	assignedOperatorId: integer("assigned_operator_id"),
	productionStartTime: timestamp("production_start_time", { mode: 'string' }),
	productionEndTime: timestamp("production_end_time", { mode: 'string' }),
	productionTimeMinutes: integer("production_time_minutes"),
	filmCompleted: boolean("film_completed").default(false),
	printingCompleted: boolean("printing_completed").default(false),
	isFinalRollCreated: boolean("is_final_roll_created").default(false),
	cuttingCompleted: boolean("cutting_completed").default(false),
}, (table) => [
	index("idx_production_orders_assigned_machine_id").using("btree", table.assignedMachineId.asc().nullsLast().op("text_ops")),
	index("idx_production_orders_assigned_operator_id").using("btree", table.assignedOperatorId.asc().nullsLast().op("int4_ops")),
	index("idx_production_orders_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("idx_production_orders_order_id").using("btree", table.orderId.asc().nullsLast().op("int4_ops")),
	index("idx_production_orders_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_production_orders_status_order_id").using("btree", table.status.asc().nullsLast().op("text_ops"), table.orderId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.assignedMachineId],
			foreignColumns: [machines.id],
			name: "production_orders_assigned_machine_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.assignedOperatorId],
			foreignColumns: [users.id],
			name: "production_orders_assigned_operator_id_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.customerProductId],
			foreignColumns: [customerProducts.id],
			name: "production_orders_customer_product_id_customer_products_id_fk"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "production_orders_order_id_orders_id_fk"
		}),
	unique("production_orders_production_order_number_unique").on(table.productionOrderNumber),
]);
