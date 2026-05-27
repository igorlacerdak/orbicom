declare module "xlsx" {
  export const utils: {
    book_new: () => unknown;
    aoa_to_sheet: (data: unknown[][]) => unknown;
    book_append_sheet: (workbook: unknown, sheet: unknown, name: string) => void;
    sheet_to_json: (sheet: unknown, options?: { defval?: unknown }) => Record<string, unknown>[];
  };
  export const read: (data: ArrayBuffer, options?: { type?: string }) => {
    SheetNames: string[];
    Sheets: Record<string, unknown>;
  };
  export const writeFile: (workbook: unknown, filename: string) => void;
}

declare module "resend" {
  export class Resend {
    constructor(apiKey: string);
    emails: {
      send(input: {
        from: string;
        to: string;
        subject: string;
        html: string;
        text: string;
      }): Promise<{ error?: { message?: string } | null }>;
    };
  }
}
