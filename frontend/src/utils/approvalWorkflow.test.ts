import {
  canApproveStage,
  canDisburseReimbursement,
  canReviewReimbursement,
} from "./approvalWorkflow";

describe("approval workflow roles", () => {
  test("routes department and HR approvals to separate roles", () => {
    expect(canApproveStage("department_manager", "department")).toBe(true);
    expect(canApproveStage("department_manager", "hr")).toBe(false);
    expect(canApproveStage("hr_admin", "department")).toBe(false);
    expect(canApproveStage("hr_admin", "hr")).toBe(true);
    expect(canApproveStage("admin", "department")).toBe(true);
  });

  test("separates reimbursement review from payment", () => {
    expect(canReviewReimbursement("hr_admin")).toBe(true);
    expect(canDisburseReimbursement("hr_admin")).toBe(false);
    expect(canReviewReimbursement("finance")).toBe(false);
    expect(canDisburseReimbursement("finance")).toBe(true);
  });
});
