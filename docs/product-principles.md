# FulfillOS product principles

This document defines the product and architecture criteria that every FulfillOS module must follow. Features are not complete merely because data can be created and displayed; they must support an understandable operational workflow and contribute to traceability, revenue capture, and exception management.

## Product direction

FulfillOS is an operations platform for prep centers and small 3PL companies. The delivery order for the core product is:

1. Dashboard and workspace setup guidance.
2. Customers.
3. Products and SKUs owned by customers.
4. Inbound shipments and receiving.
5. Inventory by customer, product, warehouse, and location.
6. Prep and work orders.
7. Outbound shipments.
8. Billing, customer portal, notifications, reporting, and mobile/scanner workflows.

The core commercial flow takes priority over prematurely modeling every possible warehouse rack or bin configuration.

## Operational UX

Users must not need to understand database identifiers or table structure. Relationships must be presented using recognizable names and context. For example, a location selector should display a path such as:

`Atlanta Warehouse -> Main Storage -> Rack A -> Shelf 2`

On desktop, authenticated modules share consistent lateral navigation. On smaller screens, navigation becomes compact without removing access to core operations.

## Product differentiators

### Proof of Work

Every material operational action should be able to record:

- who performed it;
- what happened and when;
- the customer, shipment, SKU, units, warehouse, and location involved;
- supporting scans, timestamps, checklists, notes, or photos when appropriate.

An operation is not fully complete if its evidence and audit trail cannot be reconstructed.

### Revenue Protection

Every potentially billable action must create or be traceable to an operational event. This includes receiving, labels, polybags, bundles, inspections, storage, removals, returns, and extra handling. Work performed must not disappear before billing.

Billing rules may be added later, but the source operational events must be captured from the start with enough context to calculate charges reliably.

### AI Exception Manager

FulfillOS should identify, prioritize, and explain exceptions instead of only presenting records. Initial exception candidates include:

- received quantity differs from expected quantity;
- an unexpected SKU is received;
- a shipment remains open longer than its expected workflow allows;
- inventory would become negative;
- prep work conflicts with product requirements;
- operational work has no corresponding billable event;
- evidence required by an operation is missing.

Exceptions need a lifecycle: detected, acknowledged, assigned, resolved, or dismissed, with an audit trail.

## Architectural consequences

Inbound and future operational modules should produce durable records for four connected concerns:

1. Inventory movements: changes in physical quantity and location.
2. Operational events: the immutable history of work performed.
3. Evidence: scans, photos, notes, timestamps, and checklists linked to events.
4. Billable events: revenue-relevant facts produced by completed work.

Exception detection consumes these records and creates actionable exceptions without rewriting operational history.

## Definition of done for a module

A core module is complete when it includes:

- authenticated and organization-scoped access;
- role-based authorization for mutations;
- clear empty, loading, error, and success states;
- create, read, update, and appropriate deactivate/cancel operations;
- human-readable relationship selectors;
- responsive navigation and forms;
- validation on both client and server boundaries;
- audit events for material mutations;
- operational evidence hooks where relevant;
- billable-event hooks where relevant;
- exception rules for detectable failure conditions;
- versioned database migrations and RLS policies;
- automated tests for critical business rules.

