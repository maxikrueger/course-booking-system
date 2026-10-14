import { afterEach, describe, expect, it } from "vitest";

import { useBookingStore } from "../store";

afterEach(() => {
  useBookingStore.getState().reset();
  localStorage.clear();
});

describe("useBookingStore", () => {
  it("setSession speichert sessionId", () => {
    useBookingStore.getState().setSession(42);
    expect(useBookingStore.getState().sessionId).toBe(42);
  });

  it("updatePerson merget partiell", () => {
    useBookingStore.getState().updatePerson({ first_name: "Max" });
    useBookingStore.getState().updatePerson({ last_name: "Muster" });
    const p = useBookingStore.getState().person;
    expect(p.first_name).toBe("Max");
    expect(p.last_name).toBe("Muster");
  });

  it("reset löscht Session, Person und AGB", () => {
    useBookingStore.getState().setSession(1);
    useBookingStore.getState().updatePerson({ email: "x@y.de" });
    useBookingStore.getState().setTermsAccepted(true);
    useBookingStore.getState().reset();
    const s = useBookingStore.getState();
    expect(s.sessionId).toBeNull();
    expect(s.person.email).toBe("");
    expect(s.termsAccepted).toBe(false);
  });

  it("persistiert via localStorage unter dem erwarteten Key", () => {
    useBookingStore.getState().setSession(99);
    const raw = localStorage.getItem("booking-wizard-v1");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.state.sessionId).toBe(99);
  });
});
