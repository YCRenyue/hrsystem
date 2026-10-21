/**
 * Shared approval-role checks used by workflow pages.
 */

export type ApprovalStage = "department" | "hr";

export const canApproveStage = (
  role: string | undefined,
  stage: ApprovalStage | undefined,
): boolean => {
  if (role === "admin") return true;
  if (stage === "department") return role === "department_manager";
  return role === "hr_admin";
};

export const canReviewReimbursement = (role: string | undefined): boolean => (
  role === "admin" || role === "hr_admin"
);

export const canDisburseReimbursement = (role: string | undefined): boolean => (
  role === "admin" || role === "finance"
);
