// tests/roles.test.mjs
// Roles: el dueño (CLIENT_OWNER) sigue aislado como un usuario de portal y solo puede escuchar
// llamadas de su propia empresa. Lógica pura, sin servidor ni base.
// Uso: node --test tests/roles.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ROLES,
  canMonitorCall,
  isBunkerRole,
  isClientOwnerRole,
  isClientRole,
  isRoleAllowedForUser,
  normalizeRole,
  toStoredRole,
} from "../src/lib/roles.ts";

const ORG = "org-1";
const CLIENT_A = "client-a";
const CLIENT_B = "client-b";
const callOf = (clientId, organizationId = ORG) => ({ organizationId, clientId });
const supervisor = (role, clientId, overrides = {}) => ({ role, clientId, isActive: true, organizationIds: [ORG], ...overrides });

test("an owner is resolved as a CLIENT so every existing tenant filter applies to them", () => {
  assert.equal(normalizeRole("CLIENT_OWNER"), ROLES.CLIENT);
  assert.equal(normalizeRole("client_owner"), ROLES.CLIENT);
  assert.equal(isClientRole("CLIENT_OWNER"), true);
  assert.equal(isBunkerRole("CLIENT_OWNER"), false);
});

test("legacy portal role names keep mapping to CLIENT and are never promoted to owner", () => {
  for (const legacy of ["CLIENT", "client_user", "CLIENT_ADMIN"]) {
    assert.equal(normalizeRole(legacy), ROLES.CLIENT);
    assert.equal(isClientOwnerRole(legacy), false);
  }
});

test("Bunker staff roles and an empty role stay ADMIN, as before", () => {
  for (const role of ["ADMIN", "admin", "sales_rep", "marketing_specialist", null, undefined, ""]) {
    assert.equal(normalizeRole(role), ROLES.ADMIN);
  }
});

test("the stored role preserves the owner and canonicalizes everything else", () => {
  assert.equal(toStoredRole("client_owner"), ROLES.CLIENT_OWNER);
  assert.equal(toStoredRole("client_user"), ROLES.CLIENT);
  assert.equal(toStoredRole("sales_rep"), ROLES.ADMIN);
});

test("only company users can be owners, and company users can never be ADMIN", () => {
  assert.equal(isRoleAllowedForUser(ROLES.CLIENT_OWNER, CLIENT_A), true);
  assert.equal(isRoleAllowedForUser(ROLES.CLIENT, CLIENT_A), true);
  assert.equal(isRoleAllowedForUser(ROLES.ADMIN, CLIENT_A), false);
  assert.equal(isRoleAllowedForUser(ROLES.CLIENT_OWNER, null), false);
  assert.equal(isRoleAllowedForUser(ROLES.ADMIN, null), true);
});

test("a Bunker admin of the organization can monitor any client's call", () => {
  assert.equal(canMonitorCall(supervisor(ROLES.ADMIN, null), callOf(CLIENT_A)), true);
  assert.equal(canMonitorCall(supervisor(ROLES.ADMIN, null), callOf(null)), true);
});

test("an owner can monitor calls of their own company only", () => {
  assert.equal(canMonitorCall(supervisor(ROLES.CLIENT_OWNER, CLIENT_A), callOf(CLIENT_A)), true);
  assert.equal(canMonitorCall(supervisor(ROLES.CLIENT_OWNER, CLIENT_A), callOf(CLIENT_B)), false);
  // Una llamada sin cliente (línea de Bunker) no es de su empresa.
  assert.equal(canMonitorCall(supervisor(ROLES.CLIENT_OWNER, CLIENT_A), callOf(null)), false);
});

test("an advisor can never monitor, not even a call of their own company", () => {
  assert.equal(canMonitorCall(supervisor(ROLES.CLIENT, CLIENT_A), callOf(CLIENT_A)), false);
});

test("an owner without a company, an inactive supervisor or another organization's call are rejected", () => {
  assert.equal(canMonitorCall(supervisor(ROLES.CLIENT_OWNER, null), callOf(null)), false);
  assert.equal(canMonitorCall(supervisor(ROLES.ADMIN, null, { isActive: false }), callOf(CLIENT_A)), false);
  assert.equal(canMonitorCall(supervisor(ROLES.ADMIN, null), callOf(CLIENT_A, "org-2")), false);
  assert.equal(canMonitorCall(supervisor(ROLES.CLIENT_OWNER, CLIENT_A), callOf(CLIENT_A, "org-2")), false);
});

test("an ADMIN-labelled user that belongs to a company is treated as a client, not as Bunker", () => {
  assert.equal(canMonitorCall(supervisor(ROLES.ADMIN, CLIENT_A), callOf(CLIENT_B)), false);
});
