import { z } from "zod";

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Roh-Eingabe-Form: alle Felder als String, salutation darf leer sein.
 * Wird im Wizard-Store und in react-hook-form als defaultValue genutzt.
 */
export type PersonFormInput = {
  salutation: "" | "mr" | "mrs" | "div";
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  date_of_birth: string;
  license_date: string;
  voucher_code: string;
  notes: string;
};

export const personSchema = z.object({
  salutation: z
    .union([z.literal("mr"), z.literal("mrs"), z.literal("div"), z.literal("")])
    .refine((v): v is "mr" | "mrs" | "div" => v !== "", {
      message: "Bitte Anrede wählen",
    }),
  first_name: z.string().trim().min(1, "Vorname ist erforderlich").max(100),
  last_name: z.string().trim().min(1, "Nachname ist erforderlich").max(100),
  email: z.email("Ungültige E-Mail-Adresse").max(254),
  phone: z
    .string()
    .trim()
    .min(5, "Telefonnummer ist erforderlich")
    .max(30)
    .regex(/^[+0-9 /()-]+$/u, "Ungültige Telefonnummer"),
  street: z.string().trim().min(1, "Strasse ist erforderlich").max(200),
  postal_code: z.string().trim().min(2, "PLZ ist erforderlich").max(10),
  city: z.string().trim().min(1, "Ort ist erforderlich").max(100),
  country: z.string().min(2).max(2),
  date_of_birth: z
    .string()
    .refine(isValidIsoDate, "Ungültiges Datumsformat (YYYY-MM-DD)")
    .refine((d) => d < today(), "Geburtsdatum muss in der Vergangenheit liegen")
    .refine((d) => {
      const [y] = d.split("-").map(Number);
      const now = new Date().getUTCFullYear();
      return now - y >= 16 && now - y <= 100;
    }, "Alter muss zwischen 16 und 100 Jahren liegen"),
  license_date: z
    .string()
    .refine(
      (v) => v === "" || isValidIsoDate(v),
      "Ungültiges Datumsformat (YYYY-MM-DD)",
    )
    .refine(
      (v) => v === "" || v <= today(),
      "Datum darf nicht in der Zukunft liegen",
    ),
  voucher_code: z.string().trim().max(50),
  notes: z.string().max(2000),
});

export type PersonFormParsed = z.output<typeof personSchema>;
