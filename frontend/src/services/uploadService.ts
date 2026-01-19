/**
 * Upload Service - API calls for file upload management
 */
import apiClient from "./api";
import { ApiResponse } from "../types";

export interface FileUrls {
  id_card_front_url: string | null;
  id_card_back_url: string | null;
  bank_card_url: string | null;
  diploma_url: string | null;
}

export interface UploadResult {
  fileType: string;
  url: string | null;
}

export type FileType = "id_card_front" | "id_card_back" | "bank_card" | "diploma";

export const uploadService = {
  /**
   * Upload employee file (authenticated)
   */
  async uploadEmployeeFile(
    employeeId: string,
    file: File,
    fileType: FileType
  ): Promise<UploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", fileType);

    const response = await apiClient.post<ApiResponse<UploadResult>>(
      `/upload/employee/${employeeId}/file`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data.data!;
  },

  /**
   * Upload file during onboarding (token-based)
   */
  async uploadOnboardingFile(
    token: string,
    file: File,
    fileType: FileType
  ): Promise<UploadResult> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileType", fileType);

    const response = await apiClient.post<ApiResponse<UploadResult>>(
      `/upload/onboarding/${token}/file`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return response.data.data!;
  },

  /**
   * Get signed URLs for employee files
   */
  async getEmployeeFileUrls(employeeId: string): Promise<FileUrls> {
    const response = await apiClient.get<ApiResponse<FileUrls>>(
      `/upload/employee/${employeeId}/signed-urls`
    );
    return response.data.data!;
  },

  /**
   * Delete employee file
   */
  async deleteEmployeeFile(
    employeeId: string,
    fileType: FileType
  ): Promise<void> {
    await apiClient.delete(`/upload/employee/${employeeId}/file/${fileType}`);
  },
};
