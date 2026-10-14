"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { PersonFormInput } from "./schema";

export type WizardStep = "termin" | "daten" | "bestaetigung" | "erfolg";

export type PersonData = PersonFormInput;

const emptyPerson: PersonData = {
  salutation: "",
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  street: "",
  postal_code: "",
  city: "",
  country: "CH",
  date_of_birth: "",
  license_date: "",
  voucher_code: "",
  notes: "",
};

export type BookingState = {
  sessionId: number | null;
  person: PersonData;
  termsAccepted: boolean;
  setSession: (sessionId: number) => void;
  updatePerson: (patch: Partial<PersonData>) => void;
  setTermsAccepted: (accepted: boolean) => void;
  reset: () => void;
};

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      sessionId: null,
      person: emptyPerson,
      termsAccepted: false,
      setSession: (sessionId) => set({ sessionId }),
      updatePerson: (patch) =>
        set((state) => ({ person: { ...state.person, ...patch } })),
      setTermsAccepted: (accepted) => set({ termsAccepted: accepted }),
      reset: () =>
        set({ sessionId: null, person: emptyPerson, termsAccepted: false }),
    }),
    {
      name: "booking-wizard-v1",
      storage: createJSONStorage(() => localStorage),
      version: 1,
    },
  ),
);

export const emptyPersonData = emptyPerson;
