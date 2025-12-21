import { useMutation } from "@tanstack/react-query";
import * as pdfApi from "../services/pdf-api";

/**
 * Hook for uploading PDF and generating mindmap
 */
export const useCreateFromPdf = () => {
  return useMutation({
    mutationFn: pdfApi.createFromPdf,
  });
};
