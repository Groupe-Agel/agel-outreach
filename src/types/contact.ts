export type Contact = {
  email: string;
  [key: string]: unknown;
};

export type ParseResult = {
  rows: Contact[];
  columns: string[];
  errors: Array<{ row: number; message: string }>;
};
