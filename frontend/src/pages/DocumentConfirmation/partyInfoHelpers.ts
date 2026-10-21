/**
 * Shared helpers for the party-info editable panel and template variable
 * building used by DocumentSigningPage. Extracted out so that page stays
 * focused on rendering/state and to keep it under the project's per-file
 * line-count guideline as more document types (training pledge, employment
 * contract) are added.
 */
import dayjs from "dayjs";
import { Employee } from "../../types";
import { numberToChinese } from "./documentTemplates";

export type DocumentType = "policy_ack" | "training_pledge" | "employment_contract";

/** Fields the employee may fill in / edit before signing, plus the
 * HR-configured party A display fields shown (read-only) alongside them. */
export interface PartyInfo {
  party_a_name: string;
  party_a_address: string;
  employee_name: string;
  employee_gender: string;
  employee_id_card: string;
  employee_household_address: string;
  employee_current_address: string;
  // training_pledge only: dates of the *separate*, already-signed labor
  // contract referenced by the training pledge text. Unused for
  // employment_contract, whose own term dates are HR-configured (see
  // ContractTerms below) rather than employee-editable.
  contract_sign_date: string;
  contract_start_date: string;
  contract_end_date: string;
}

/** HR-configured employment contract terms, read-only from the employee's
 * point of view. Sourced directly from emp.employmentContract. */
export interface ContractTerms {
  contract_type: string;
  position: string;
  work_location: string;
  contract_start_date: string;
  contract_end_date: string;
  monthly_salary: number;
}

export function genderToText(gender?: string): string {
  if (gender === "male") return "男";
  if (gender === "female") return "女";
  return gender || "";
}

export function buildDefaultPartyInfo(emp: Employee, docType: DocumentType): PartyInfo {
  const pledge = (emp as any).trainingPledge;
  const contract = (emp as any).employmentContract;
  const partyA = docType === "employment_contract" ? contract : pledge;

  return {
    party_a_name: partyA?.party_a_name || "",
    party_a_address: partyA?.party_a_address || "",
    employee_name: emp.name || "",
    employee_gender: genderToText(emp.gender as string | undefined),
    employee_id_card: emp.id_card || "",
    employee_household_address: "",
    employee_current_address: "",
    contract_sign_date: emp.entry_date
      ? dayjs(emp.entry_date).format("YYYY年MM月DD日")
      : "",
    contract_start_date: "",
    contract_end_date: "",
  };
}

/** Build the {variable} -> value map used to render a document template. */
export function buildVars(
  emp: Employee,
  docType: DocumentType,
  partyInfo?: PartyInfo
): Record<string, string> {
  const info = partyInfo ?? buildDefaultPartyInfo(emp, docType);

  const common: Record<string, string> = {
    party_a_name: info.party_a_name,
    party_a_address: info.party_a_address,
    employee_name: info.employee_name,
    employee_gender: info.employee_gender,
    employee_id_card: info.employee_id_card,
    employee_household_address: info.employee_household_address,
    employee_current_address: info.employee_current_address,
  };

  if (docType === "training_pledge") {
    const pledge = (emp as any).trainingPledge;
    const cost = pledge ? Number(pledge.training_cost) : 0;
    const years = pledge ? Number(pledge.service_years) : 0;
    const serviceStart = years > 0
      ? dayjs("2026-03-20").add(1, "day").format("YYYY年MM月DD日")
      : "[待填写]";
    const serviceEnd = years > 0
      ? dayjs("2026-03-20").add(1, "day").add(years, "year").format("YYYY年MM月DD日")
      : "[待填写]";

    return {
      ...common,
      contract_sign_date: info.contract_sign_date,
      contract_start_date: info.contract_start_date,
      contract_end_date: info.contract_end_date,
      training_cost: cost > 0 ? String(cost) : "[待填写]",
      training_cost_text: cost > 0 ? numberToChinese(cost) : "[待填写]",
      service_years: years > 0 ? String(years) : "[待填写]",
      service_start_date: serviceStart,
      service_end_date: serviceEnd,
    };
  }

  if (docType === "employment_contract") {
    const contract = (emp as any).employmentContract;
    const salary = contract ? Number(contract.monthly_salary) : 0;

    return {
      ...common,
      contract_type: contract?.contract_type || "[待填写]",
      position: contract?.position || "[待填写]",
      work_location: contract?.work_location || "[待填写]",
      contract_start_date: contract?.contract_start_date || "[待填写]",
      contract_end_date: contract?.contract_end_date || "[待填写]",
      monthly_salary: salary > 0 ? String(salary) : "[待填写]",
      monthly_salary_text: salary > 0 ? numberToChinese(salary) : "[待填写]",
    };
  }

  return common;
}

export function renderDisplayValue(value?: string) {
  return value?.trim() || "___________";
}

export const DOCUMENT_LABELS: Record<DocumentType, string> = {
  policy_ack: "公司制度阅读确认表",
  training_pledge: "培训服务承诺函",
  employment_contract: "劳动合同",
};

export function isDocumentSigned(emp: Employee, docType: DocumentType): boolean {
  if (docType === "policy_ack") return !!emp.policy_ack_status;
  if (docType === "training_pledge") return !!emp.training_pledge_status;
  return !!emp.employment_contract_status;
}

export function getDocumentSignedAt(emp: Employee, docType: DocumentType): string | undefined {
  if (docType === "policy_ack") return emp.policy_ack_signed_at;
  if (docType === "training_pledge") return emp.training_pledge_signed_at;
  return emp.employment_contract_signed_at;
}

/** The HR-configured sub-record backing training_pledge / employment_contract (untyped: fields differ per doc type). */
export function getHrRecord(emp: Employee, docType: DocumentType): any {
  if (docType === "training_pledge") return (emp as any).trainingPledge;
  if (docType === "employment_contract") return (emp as any).employmentContract;
  return undefined;
}
