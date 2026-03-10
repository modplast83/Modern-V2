import { relations } from "drizzle-orm/relations";
import { users, rawMaterialVouchersIn, roles, adminDecisions, aiAgentKnowledge, aiAgentSettings, attendance, machines, mixingBatches, productionOrders, batchIngredients, items, consumableParts, consumablePartsTransactions, customers, customerProducts, cuts, rolls, erpConfigurations, erpEntityMappings, erpFieldMappings, erpSyncLogs, erpSyncSchedules, inventoryCounts, inventoryCountItems, inventory, locations, inventoryMovements, leaveBalances, leaveTypes, leaveRequests, machineQueues, conversations, messages, quickNotes, noteAttachments, notificationEventSettings, notificationTemplates, notificationEventLogs, notifications, orders, performanceCriteria, performanceRatings, performanceReviews, qualityChecks, quotes, quoteItems, quoteTemplates, systemSettings, trainingCertificates, trainingEnrollments, trainingPrograms, trainingEvaluations, trainingMaterials, trainingRecords, userRequests, userSettings, userViolations, violations, warehouseReceipts, warehouseTransactions, waste } from "./schema";

export const rawMaterialVouchersInRelations = relations(rawMaterialVouchersIn, ({one}) => ({
	user: one(users, {
		fields: [rawMaterialVouchersIn.receivedBy],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	rawMaterialVouchersIns: many(rawMaterialVouchersIn),
	role: one(roles, {
		fields: [users.roleId],
		references: [roles.id]
	}),
	adminDecisions: many(adminDecisions),
	aiAgentKnowledges: many(aiAgentKnowledge),
	aiAgentSettings: many(aiAgentSettings),
	attendances_createdBy: many(attendance, {
		relationName: "attendance_createdBy_users_id"
	}),
	attendances_updatedBy: many(attendance, {
		relationName: "attendance_updatedBy_users_id"
	}),
	attendances_userId: many(attendance, {
		relationName: "attendance_userId_users_id"
	}),
	mixingBatches: many(mixingBatches),
	consumablePartsTransactions: many(consumablePartsTransactions),
	customers: many(customers),
	cuts: many(cuts),
	rolls_createdBy: many(rolls, {
		relationName: "rolls_createdBy_users_id"
	}),
	rolls_cutBy: many(rolls, {
		relationName: "rolls_cutBy_users_id"
	}),
	rolls_employeeId: many(rolls, {
		relationName: "rolls_employeeId_users_id"
	}),
	rolls_printedBy: many(rolls, {
		relationName: "rolls_printedBy_users_id"
	}),
	inventoryMovements: many(inventoryMovements),
	leaveBalances: many(leaveBalances),
	leaveRequests_directManagerId: many(leaveRequests, {
		relationName: "leaveRequests_directManagerId_users_id"
	}),
	leaveRequests_employeeId: many(leaveRequests, {
		relationName: "leaveRequests_employeeId_users_id"
	}),
	leaveRequests_hrReviewedBy: many(leaveRequests, {
		relationName: "leaveRequests_hrReviewedBy_users_id"
	}),
	leaveRequests_replacementEmployeeId: many(leaveRequests, {
		relationName: "leaveRequests_replacementEmployeeId_users_id"
	}),
	machineQueues: many(machineQueues),
	quickNotes_assignedTo: many(quickNotes, {
		relationName: "quickNotes_assignedTo_users_id"
	}),
	quickNotes_createdBy: many(quickNotes, {
		relationName: "quickNotes_createdBy_users_id"
	}),
	notificationEventSettings_createdBy: many(notificationEventSettings, {
		relationName: "notificationEventSettings_createdBy_users_id"
	}),
	notificationEventSettings_updatedBy: many(notificationEventSettings, {
		relationName: "notificationEventSettings_updatedBy_users_id"
	}),
	notificationEventLogs: many(notificationEventLogs),
	notifications: many(notifications),
	orders: many(orders),
	performanceReviews_employeeId: many(performanceReviews, {
		relationName: "performanceReviews_employeeId_users_id"
	}),
	performanceReviews_reviewerId: many(performanceReviews, {
		relationName: "performanceReviews_reviewerId_users_id"
	}),
	qualityChecks: many(qualityChecks),
	quoteTemplates: many(quoteTemplates),
	systemSettings: many(systemSettings),
	trainingCertificates_employeeId: many(trainingCertificates, {
		relationName: "trainingCertificates_employeeId_users_id"
	}),
	trainingCertificates_issuedBy: many(trainingCertificates, {
		relationName: "trainingCertificates_issuedBy_users_id"
	}),
	trainingEnrollments: many(trainingEnrollments),
	trainingPrograms: many(trainingPrograms),
	trainingEvaluations_employeeId: many(trainingEvaluations, {
		relationName: "trainingEvaluations_employeeId_users_id"
	}),
	trainingEvaluations_evaluatorId: many(trainingEvaluations, {
		relationName: "trainingEvaluations_evaluatorId_users_id"
	}),
	trainingRecords: many(trainingRecords),
	userRequests_reviewedBy: many(userRequests, {
		relationName: "userRequests_reviewedBy_users_id"
	}),
	userRequests_userId: many(userRequests, {
		relationName: "userRequests_userId_users_id"
	}),
	userSettings: many(userSettings),
	userViolations_createdBy: many(userViolations, {
		relationName: "userViolations_createdBy_users_id"
	}),
	userViolations_reviewedBy: many(userViolations, {
		relationName: "userViolations_reviewedBy_users_id"
	}),
	userViolations_userId: many(userViolations, {
		relationName: "userViolations_userId_users_id"
	}),
	violations_employeeId: many(violations, {
		relationName: "violations_employeeId_users_id"
	}),
	violations_reportedBy: many(violations, {
		relationName: "violations_reportedBy_users_id"
	}),
	warehouseReceipts: many(warehouseReceipts),
	productionOrders: many(productionOrders),
}));

export const rolesRelations = relations(roles, ({many}) => ({
	users: many(users),
}));

export const adminDecisionsRelations = relations(adminDecisions, ({one}) => ({
	user: one(users, {
		fields: [adminDecisions.issuedBy],
		references: [users.id]
	}),
}));

export const aiAgentKnowledgeRelations = relations(aiAgentKnowledge, ({one}) => ({
	user: one(users, {
		fields: [aiAgentKnowledge.createdBy],
		references: [users.id]
	}),
}));

export const aiAgentSettingsRelations = relations(aiAgentSettings, ({one}) => ({
	user: one(users, {
		fields: [aiAgentSettings.updatedBy],
		references: [users.id]
	}),
}));

export const attendanceRelations = relations(attendance, ({one}) => ({
	user_createdBy: one(users, {
		fields: [attendance.createdBy],
		references: [users.id],
		relationName: "attendance_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [attendance.updatedBy],
		references: [users.id],
		relationName: "attendance_updatedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [attendance.userId],
		references: [users.id],
		relationName: "attendance_userId_users_id"
	}),
}));

export const mixingBatchesRelations = relations(mixingBatches, ({one, many}) => ({
	machine: one(machines, {
		fields: [mixingBatches.machineId],
		references: [machines.id]
	}),
	user: one(users, {
		fields: [mixingBatches.operatorId],
		references: [users.id]
	}),
	productionOrder: one(productionOrders, {
		fields: [mixingBatches.productionOrderId],
		references: [productionOrders.id]
	}),
	batchIngredients: many(batchIngredients),
}));

export const machinesRelations = relations(machines, ({many}) => ({
	mixingBatches: many(mixingBatches),
	rolls_cuttingMachineId: many(rolls, {
		relationName: "rolls_cuttingMachineId_machines_id"
	}),
	rolls_filmMachineId: many(rolls, {
		relationName: "rolls_filmMachineId_machines_id"
	}),
	rolls_machineId: many(rolls, {
		relationName: "rolls_machineId_machines_id"
	}),
	rolls_printingMachineId: many(rolls, {
		relationName: "rolls_printingMachineId_machines_id"
	}),
	machineQueues: many(machineQueues),
	productionOrders: many(productionOrders),
}));

export const productionOrdersRelations = relations(productionOrders, ({one, many}) => ({
	mixingBatches: many(mixingBatches),
	rolls: many(rolls),
	machineQueues: many(machineQueues),
	warehouseReceipts: many(warehouseReceipts),
	machine: one(machines, {
		fields: [productionOrders.assignedMachineId],
		references: [machines.id]
	}),
	user: one(users, {
		fields: [productionOrders.assignedOperatorId],
		references: [users.id]
	}),
	customerProduct: one(customerProducts, {
		fields: [productionOrders.customerProductId],
		references: [customerProducts.id]
	}),
	order: one(orders, {
		fields: [productionOrders.orderId],
		references: [orders.id]
	}),
}));

export const batchIngredientsRelations = relations(batchIngredients, ({one}) => ({
	mixingBatch: one(mixingBatches, {
		fields: [batchIngredients.batchId],
		references: [mixingBatches.id]
	}),
	item: one(items, {
		fields: [batchIngredients.itemId],
		references: [items.id]
	}),
}));

export const itemsRelations = relations(items, ({many}) => ({
	batchIngredients: many(batchIngredients),
	customerProducts: many(customerProducts),
	inventories: many(inventory),
	warehouseTransactions: many(warehouseTransactions),
}));

export const consumablePartsTransactionsRelations = relations(consumablePartsTransactions, ({one}) => ({
	consumablePart: one(consumableParts, {
		fields: [consumablePartsTransactions.consumablePartId],
		references: [consumableParts.id]
	}),
	user: one(users, {
		fields: [consumablePartsTransactions.performedBy],
		references: [users.id]
	}),
}));

export const consumablePartsRelations = relations(consumableParts, ({many}) => ({
	consumablePartsTransactions: many(consumablePartsTransactions),
}));

export const customersRelations = relations(customers, ({one, many}) => ({
	user: one(users, {
		fields: [customers.salesRepId],
		references: [users.id]
	}),
	customerProducts: many(customerProducts),
	orders: many(orders),
}));

export const customerProductsRelations = relations(customerProducts, ({one, many}) => ({
	customer: one(customers, {
		fields: [customerProducts.customerId],
		references: [customers.id]
	}),
	item: one(items, {
		fields: [customerProducts.itemId],
		references: [items.id]
	}),
	productionOrders: many(productionOrders),
}));

export const cutsRelations = relations(cuts, ({one, many}) => ({
	user: one(users, {
		fields: [cuts.performedBy],
		references: [users.id]
	}),
	roll: one(rolls, {
		fields: [cuts.rollId],
		references: [rolls.id]
	}),
	warehouseReceipts: many(warehouseReceipts),
}));

export const rollsRelations = relations(rolls, ({one, many}) => ({
	cuts: many(cuts),
	user_createdBy: one(users, {
		fields: [rolls.createdBy],
		references: [users.id],
		relationName: "rolls_createdBy_users_id"
	}),
	user_cutBy: one(users, {
		fields: [rolls.cutBy],
		references: [users.id],
		relationName: "rolls_cutBy_users_id"
	}),
	machine_cuttingMachineId: one(machines, {
		fields: [rolls.cuttingMachineId],
		references: [machines.id],
		relationName: "rolls_cuttingMachineId_machines_id"
	}),
	user_employeeId: one(users, {
		fields: [rolls.employeeId],
		references: [users.id],
		relationName: "rolls_employeeId_users_id"
	}),
	machine_filmMachineId: one(machines, {
		fields: [rolls.filmMachineId],
		references: [machines.id],
		relationName: "rolls_filmMachineId_machines_id"
	}),
	machine_machineId: one(machines, {
		fields: [rolls.machineId],
		references: [machines.id],
		relationName: "rolls_machineId_machines_id"
	}),
	user_printedBy: one(users, {
		fields: [rolls.printedBy],
		references: [users.id],
		relationName: "rolls_printedBy_users_id"
	}),
	machine_printingMachineId: one(machines, {
		fields: [rolls.printingMachineId],
		references: [machines.id],
		relationName: "rolls_printingMachineId_machines_id"
	}),
	productionOrder: one(productionOrders, {
		fields: [rolls.productionOrderId],
		references: [productionOrders.id]
	}),
	wastes: many(waste),
}));

export const erpEntityMappingsRelations = relations(erpEntityMappings, ({one}) => ({
	erpConfiguration: one(erpConfigurations, {
		fields: [erpEntityMappings.erpConfigId],
		references: [erpConfigurations.id]
	}),
}));

export const erpConfigurationsRelations = relations(erpConfigurations, ({many}) => ({
	erpEntityMappings: many(erpEntityMappings),
	erpFieldMappings: many(erpFieldMappings),
	erpSyncLogs: many(erpSyncLogs),
	erpSyncSchedules: many(erpSyncSchedules),
}));

export const erpFieldMappingsRelations = relations(erpFieldMappings, ({one}) => ({
	erpConfiguration: one(erpConfigurations, {
		fields: [erpFieldMappings.erpConfigId],
		references: [erpConfigurations.id]
	}),
}));

export const erpSyncLogsRelations = relations(erpSyncLogs, ({one}) => ({
	erpConfiguration: one(erpConfigurations, {
		fields: [erpSyncLogs.erpConfigId],
		references: [erpConfigurations.id]
	}),
}));

export const erpSyncSchedulesRelations = relations(erpSyncSchedules, ({one}) => ({
	erpConfiguration: one(erpConfigurations, {
		fields: [erpSyncSchedules.erpConfigId],
		references: [erpConfigurations.id]
	}),
}));

export const inventoryCountItemsRelations = relations(inventoryCountItems, ({one}) => ({
	inventoryCount: one(inventoryCounts, {
		fields: [inventoryCountItems.countId],
		references: [inventoryCounts.id]
	}),
}));

export const inventoryCountsRelations = relations(inventoryCounts, ({many}) => ({
	inventoryCountItems: many(inventoryCountItems),
}));

export const inventoryRelations = relations(inventory, ({one, many}) => ({
	item: one(items, {
		fields: [inventory.itemId],
		references: [items.id]
	}),
	location: one(locations, {
		fields: [inventory.locationId],
		references: [locations.id]
	}),
	inventoryMovements: many(inventoryMovements),
}));

export const locationsRelations = relations(locations, ({many}) => ({
	inventories: many(inventory),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({one}) => ({
	user: one(users, {
		fields: [inventoryMovements.createdBy],
		references: [users.id]
	}),
	inventory: one(inventory, {
		fields: [inventoryMovements.inventoryId],
		references: [inventory.id]
	}),
}));

export const leaveBalancesRelations = relations(leaveBalances, ({one}) => ({
	user: one(users, {
		fields: [leaveBalances.employeeId],
		references: [users.id]
	}),
	leaveType: one(leaveTypes, {
		fields: [leaveBalances.leaveTypeId],
		references: [leaveTypes.id]
	}),
}));

export const leaveTypesRelations = relations(leaveTypes, ({many}) => ({
	leaveBalances: many(leaveBalances),
	leaveRequests: many(leaveRequests),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({one}) => ({
	user_directManagerId: one(users, {
		fields: [leaveRequests.directManagerId],
		references: [users.id],
		relationName: "leaveRequests_directManagerId_users_id"
	}),
	user_employeeId: one(users, {
		fields: [leaveRequests.employeeId],
		references: [users.id],
		relationName: "leaveRequests_employeeId_users_id"
	}),
	user_hrReviewedBy: one(users, {
		fields: [leaveRequests.hrReviewedBy],
		references: [users.id],
		relationName: "leaveRequests_hrReviewedBy_users_id"
	}),
	leaveType: one(leaveTypes, {
		fields: [leaveRequests.leaveTypeId],
		references: [leaveTypes.id]
	}),
	user_replacementEmployeeId: one(users, {
		fields: [leaveRequests.replacementEmployeeId],
		references: [users.id],
		relationName: "leaveRequests_replacementEmployeeId_users_id"
	}),
}));

export const machineQueuesRelations = relations(machineQueues, ({one}) => ({
	user: one(users, {
		fields: [machineQueues.assignedBy],
		references: [users.id]
	}),
	machine: one(machines, {
		fields: [machineQueues.machineId],
		references: [machines.id]
	}),
	productionOrder: one(productionOrders, {
		fields: [machineQueues.productionOrderId],
		references: [productionOrders.id]
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
}));

export const conversationsRelations = relations(conversations, ({many}) => ({
	messages: many(messages),
}));

export const quickNotesRelations = relations(quickNotes, ({one, many}) => ({
	user_assignedTo: one(users, {
		fields: [quickNotes.assignedTo],
		references: [users.id],
		relationName: "quickNotes_assignedTo_users_id"
	}),
	user_createdBy: one(users, {
		fields: [quickNotes.createdBy],
		references: [users.id],
		relationName: "quickNotes_createdBy_users_id"
	}),
	noteAttachments: many(noteAttachments),
}));

export const noteAttachmentsRelations = relations(noteAttachments, ({one}) => ({
	quickNote: one(quickNotes, {
		fields: [noteAttachments.noteId],
		references: [quickNotes.id]
	}),
}));

export const notificationEventSettingsRelations = relations(notificationEventSettings, ({one, many}) => ({
	user_createdBy: one(users, {
		fields: [notificationEventSettings.createdBy],
		references: [users.id],
		relationName: "notificationEventSettings_createdBy_users_id"
	}),
	user_updatedBy: one(users, {
		fields: [notificationEventSettings.updatedBy],
		references: [users.id],
		relationName: "notificationEventSettings_updatedBy_users_id"
	}),
	notificationTemplate: one(notificationTemplates, {
		fields: [notificationEventSettings.whatsappTemplateId],
		references: [notificationTemplates.id]
	}),
	notificationEventLogs: many(notificationEventLogs),
}));

export const notificationTemplatesRelations = relations(notificationTemplates, ({many}) => ({
	notificationEventSettings: many(notificationEventSettings),
}));

export const notificationEventLogsRelations = relations(notificationEventLogs, ({one}) => ({
	notificationEventSetting: one(notificationEventSettings, {
		fields: [notificationEventLogs.eventSettingId],
		references: [notificationEventSettings.id]
	}),
	user: one(users, {
		fields: [notificationEventLogs.recipientUserId],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.createdBy],
		references: [users.id]
	}),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	user: one(users, {
		fields: [orders.createdBy],
		references: [users.id]
	}),
	customer: one(customers, {
		fields: [orders.customerId],
		references: [customers.id]
	}),
	productionOrders: many(productionOrders),
}));

export const performanceRatingsRelations = relations(performanceRatings, ({one}) => ({
	performanceCriterion: one(performanceCriteria, {
		fields: [performanceRatings.criteriaId],
		references: [performanceCriteria.id]
	}),
	performanceReview: one(performanceReviews, {
		fields: [performanceRatings.reviewId],
		references: [performanceReviews.id]
	}),
}));

export const performanceCriteriaRelations = relations(performanceCriteria, ({many}) => ({
	performanceRatings: many(performanceRatings),
}));

export const performanceReviewsRelations = relations(performanceReviews, ({one, many}) => ({
	performanceRatings: many(performanceRatings),
	user_employeeId: one(users, {
		fields: [performanceReviews.employeeId],
		references: [users.id],
		relationName: "performanceReviews_employeeId_users_id"
	}),
	user_reviewerId: one(users, {
		fields: [performanceReviews.reviewerId],
		references: [users.id],
		relationName: "performanceReviews_reviewerId_users_id"
	}),
}));

export const qualityChecksRelations = relations(qualityChecks, ({one}) => ({
	user: one(users, {
		fields: [qualityChecks.checkedBy],
		references: [users.id]
	}),
}));

export const quoteItemsRelations = relations(quoteItems, ({one}) => ({
	quote: one(quotes, {
		fields: [quoteItems.quoteId],
		references: [quotes.id]
	}),
}));

export const quotesRelations = relations(quotes, ({many}) => ({
	quoteItems: many(quoteItems),
}));

export const quoteTemplatesRelations = relations(quoteTemplates, ({one}) => ({
	user: one(users, {
		fields: [quoteTemplates.createdBy],
		references: [users.id]
	}),
}));

export const systemSettingsRelations = relations(systemSettings, ({one}) => ({
	user: one(users, {
		fields: [systemSettings.updatedBy],
		references: [users.id]
	}),
}));

export const trainingCertificatesRelations = relations(trainingCertificates, ({one}) => ({
	user_employeeId: one(users, {
		fields: [trainingCertificates.employeeId],
		references: [users.id],
		relationName: "trainingCertificates_employeeId_users_id"
	}),
	trainingEnrollment: one(trainingEnrollments, {
		fields: [trainingCertificates.enrollmentId],
		references: [trainingEnrollments.id]
	}),
	user_issuedBy: one(users, {
		fields: [trainingCertificates.issuedBy],
		references: [users.id],
		relationName: "trainingCertificates_issuedBy_users_id"
	}),
	trainingProgram: one(trainingPrograms, {
		fields: [trainingCertificates.programId],
		references: [trainingPrograms.id]
	}),
}));

export const trainingEnrollmentsRelations = relations(trainingEnrollments, ({one, many}) => ({
	trainingCertificates: many(trainingCertificates),
	user: one(users, {
		fields: [trainingEnrollments.employeeId],
		references: [users.id]
	}),
	trainingProgram: one(trainingPrograms, {
		fields: [trainingEnrollments.programId],
		references: [trainingPrograms.id]
	}),
	trainingEvaluations: many(trainingEvaluations),
}));

export const trainingProgramsRelations = relations(trainingPrograms, ({one, many}) => ({
	trainingCertificates: many(trainingCertificates),
	trainingEnrollments: many(trainingEnrollments),
	user: one(users, {
		fields: [trainingPrograms.instructorId],
		references: [users.id]
	}),
	trainingEvaluations: many(trainingEvaluations),
	trainingMaterials: many(trainingMaterials),
}));

export const trainingEvaluationsRelations = relations(trainingEvaluations, ({one}) => ({
	user_employeeId: one(users, {
		fields: [trainingEvaluations.employeeId],
		references: [users.id],
		relationName: "trainingEvaluations_employeeId_users_id"
	}),
	trainingEnrollment: one(trainingEnrollments, {
		fields: [trainingEvaluations.enrollmentId],
		references: [trainingEnrollments.id]
	}),
	user_evaluatorId: one(users, {
		fields: [trainingEvaluations.evaluatorId],
		references: [users.id],
		relationName: "trainingEvaluations_evaluatorId_users_id"
	}),
	trainingProgram: one(trainingPrograms, {
		fields: [trainingEvaluations.programId],
		references: [trainingPrograms.id]
	}),
}));

export const trainingMaterialsRelations = relations(trainingMaterials, ({one}) => ({
	trainingProgram: one(trainingPrograms, {
		fields: [trainingMaterials.programId],
		references: [trainingPrograms.id]
	}),
}));

export const trainingRecordsRelations = relations(trainingRecords, ({one}) => ({
	user: one(users, {
		fields: [trainingRecords.employeeId],
		references: [users.id]
	}),
}));

export const userRequestsRelations = relations(userRequests, ({one}) => ({
	user_reviewedBy: one(users, {
		fields: [userRequests.reviewedBy],
		references: [users.id],
		relationName: "userRequests_reviewedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [userRequests.userId],
		references: [users.id],
		relationName: "userRequests_userId_users_id"
	}),
}));

export const userSettingsRelations = relations(userSettings, ({one}) => ({
	user: one(users, {
		fields: [userSettings.userId],
		references: [users.id]
	}),
}));

export const userViolationsRelations = relations(userViolations, ({one}) => ({
	user_createdBy: one(users, {
		fields: [userViolations.createdBy],
		references: [users.id],
		relationName: "userViolations_createdBy_users_id"
	}),
	user_reviewedBy: one(users, {
		fields: [userViolations.reviewedBy],
		references: [users.id],
		relationName: "userViolations_reviewedBy_users_id"
	}),
	user_userId: one(users, {
		fields: [userViolations.userId],
		references: [users.id],
		relationName: "userViolations_userId_users_id"
	}),
}));

export const violationsRelations = relations(violations, ({one}) => ({
	user_employeeId: one(users, {
		fields: [violations.employeeId],
		references: [users.id],
		relationName: "violations_employeeId_users_id"
	}),
	user_reportedBy: one(users, {
		fields: [violations.reportedBy],
		references: [users.id],
		relationName: "violations_reportedBy_users_id"
	}),
}));

export const warehouseReceiptsRelations = relations(warehouseReceipts, ({one}) => ({
	cut: one(cuts, {
		fields: [warehouseReceipts.cutId],
		references: [cuts.id]
	}),
	productionOrder: one(productionOrders, {
		fields: [warehouseReceipts.productionOrderId],
		references: [productionOrders.id]
	}),
	user: one(users, {
		fields: [warehouseReceipts.receivedBy],
		references: [users.id]
	}),
}));

export const warehouseTransactionsRelations = relations(warehouseTransactions, ({one}) => ({
	item: one(items, {
		fields: [warehouseTransactions.itemId],
		references: [items.id]
	}),
}));

export const wasteRelations = relations(waste, ({one}) => ({
	roll: one(rolls, {
		fields: [waste.rollId],
		references: [rolls.id]
	}),
}));