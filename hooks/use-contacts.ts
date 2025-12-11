"use client";

import { useState, useCallback } from "react";

export interface Contact {
    name: string[];
    email?: string[];
    tel?: string[];
    address?: ContactAddress[];
    icon?: Blob[];
}

interface ContactAddress {
    addressLine?: string[];
    city?: string;
    country?: string;
    dependentLocality?: string;
    organization?: string;
    phone?: string;
    postalCode?: string;
    recipient?: string;
    region?: string;
    sortingCode?: string;
}

interface ContactsManager {
    select: (
        properties: ContactProperty[],
        options?: ContactSelectOptions
    ) => Promise<Contact[]>;
    getProperties: () => Promise<ContactProperty[]>;
}

type ContactProperty = "name" | "email" | "tel" | "address" | "icon";

interface ContactSelectOptions {
    multiple?: boolean;
}

declare global {
    interface Navigator {
        contacts?: ContactsManager;
    }
}

interface UseContactsReturn {
    contacts: Contact[];
    isSupported: boolean;
    isLoading: boolean;
    error: string | null;
    selectContacts: (options?: SelectContactsOptions) => Promise<Contact[]>;
    selectSingleContact: () => Promise<Contact | null>;
    clearContacts: () => void;
    getAvailableProperties: () => Promise<ContactProperty[]>;
}

interface SelectContactsOptions {
    multiple?: boolean;
    properties?: ContactProperty[];
}

export function useContacts(): UseContactsReturn {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isSupported =
        typeof window !== "undefined" &&
        "contacts" in navigator &&
        "ContactsManager" in window;

    const getAvailableProperties = useCallback(async (): Promise<
        ContactProperty[]
    > => {
        if (!isSupported || !navigator.contacts) {
            return [];
        }
        try {
            return await navigator.contacts.getProperties();
        } catch (err) {
            console.error("Failed to get contact properties:", err);
            return ["name", "tel", "email"];
        }
    }, [isSupported]);

    const selectContacts = useCallback(
        async (options?: SelectContactsOptions): Promise<Contact[]> => {
            if (!isSupported || !navigator.contacts) {
                setError(
                    "Contact Picker API is not supported in this browser. Please use Chrome on Android or a supported browser."
                );
                return [];
            }

            setIsLoading(true);
            setError(null);

            try {
                const properties = options?.properties || ["name", "tel", "email"];
                const selectOptions: ContactSelectOptions = {
                    multiple: options?.multiple ?? true,
                };

                const selectedContacts = await navigator.contacts.select(
                    properties,
                    selectOptions
                );

                setContacts(selectedContacts);
                return selectedContacts;
            } catch (err) {
                if (err instanceof Error) {
                    if (err.name === "InvalidStateError") {
                        setError("Contact picker is already open");
                    } else if (err.name === "SecurityError") {
                        setError(
                            "Contact access denied. Please allow contact permissions."
                        );
                    } else if (err.name === "NotAllowedError") {
                        setError("User cancelled contact selection");
                    } else {
                        setError(err.message);
                    }
                } else {
                    setError("Failed to select contacts");
                }
                return [];
            } finally {
                setIsLoading(false);
            }
        },
        [isSupported]
    );

    const selectSingleContact = useCallback(async (): Promise<Contact | null> => {
        const selected = await selectContacts({
            multiple: false,
            properties: ["name", "tel", "email"],
        });
        return selected.length > 0 ? selected[0] : null;
    }, [selectContacts]);

    const clearContacts = useCallback(() => {
        setContacts([]);
        setError(null);
    }, []);

    return {
        contacts,
        isSupported,
        isLoading,
        error,
        selectContacts,
        selectSingleContact,
        clearContacts,
        getAvailableProperties,
    };
}

export function formatPhoneNumber(tel: string[] | undefined): string {
    if (!tel || tel.length === 0) return "";
    const phone = tel[0].replace(/\D/g, "");
    if (phone.startsWith("254")) {
        return "0" + phone.slice(3);
    }
    if (phone.startsWith("+254")) {
        return "0" + phone.slice(4);
    }
    return phone.startsWith("0") ? phone : "0" + phone;
}

export function getContactDisplayName(contact: Contact): string {
    if (contact.name && contact.name.length > 0) {
        return contact.name[0];
    }
    if (contact.tel && contact.tel.length > 0) {
        return formatPhoneNumber(contact.tel);
    }
    if (contact.email && contact.email.length > 0) {
        return contact.email[0];
    }
    return "Unknown Contact";
}
