"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    useContacts,
    formatPhoneNumber,
    getContactDisplayName,
    type Contact,
} from "@/hooks/use-contacts";
import {
    Users,
    Phone,
    Mail,
    Search,
    UserPlus,
    AlertCircle,
    Loader2,
    X,
    Check,
} from "lucide-react";

interface ContactPickerProps {
    onSelectContact?: (contact: Contact) => void;
    onSelectPhone?: (phone: string, name?: string) => void;
    buttonText?: string;
    showSelected?: boolean;
    multiple?: boolean;
}

export default function ContactPicker({
    onSelectContact,
    onSelectPhone,
    buttonText = "Select from Contacts",
    showSelected = true,
    multiple = false,
}: ContactPickerProps) {
    const {
        contacts,
        isSupported,
        isLoading,
        error,
        selectContacts,
        selectSingleContact,
        clearContacts,
    } = useContacts();

    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const handlePickContact = async () => {
        if (multiple) {
            await selectContacts({ multiple: true, properties: ["name", "tel", "email"] });
        } else {
            const contact = await selectSingleContact();
            if (contact) {
                setSelectedContact(contact);
                onSelectContact?.(contact);
                if (contact.tel && contact.tel.length > 0) {
                    onSelectPhone?.(formatPhoneNumber(contact.tel), contact.name?.[0]);
                }
            }
        }
    };

    const handleSelectFromList = (contact: Contact) => {
        setSelectedContact(contact);
        onSelectContact?.(contact);
        if (contact.tel && contact.tel.length > 0) {
            onSelectPhone?.(formatPhoneNumber(contact.tel), contact.name?.[0]);
        }
    };

    const filteredContacts = contacts.filter((contact) => {
        if (!searchQuery) return true;
        const name = getContactDisplayName(contact).toLowerCase();
        const phone = contact.tel?.join(" ").toLowerCase() || "";
        const email = contact.email?.join(" ").toLowerCase() || "";
        const query = searchQuery.toLowerCase();
        return name.includes(query) || phone.includes(query) || email.includes(query);
    });

    if (!isSupported) {
        return (
            <Card className="border-yellow-500/50 bg-yellow-500/10">
                <CardContent className="p-4">
                    <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-400">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <div className="text-sm">
                            <p className="font-medium">Contact Picker Not Available</p>
                            <p className="text-xs opacity-80">
                                This feature requires Chrome on Android or a supported browser. You can
                                manually enter phone numbers instead.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {/* Pick Contact Button */}
            <Button
                onClick={handlePickContact}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Opening Contacts...
                    </>
                ) : (
                    <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        {buttonText}
                    </>
                )}
            </Button>

            {/* Error Display */}
            {error && (
                <Card className="border-red-500/50 bg-red-500/10">
                    <CardContent className="p-3">
                        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Selected Contact Display */}
            {showSelected && selectedContact && (
                <Card className="border-green-500/50 bg-green-500/10">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold">
                                    {getContactDisplayName(selectedContact).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="font-medium text-sm">
                                        {getContactDisplayName(selectedContact)}
                                    </p>
                                    {selectedContact.tel && selectedContact.tel[0] && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            {formatPhoneNumber(selectedContact.tel)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-green-500" />
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedContact(null)}
                                    className="h-8 w-8 p-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Multiple Contacts List */}
            {multiple && contacts.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Selected Contacts ({contacts.length})
                            </CardTitle>
                            <Button variant="ghost" size="sm" onClick={clearContacts}>
                                Clear All
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search contacts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>

                        {/* Contact List */}
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {filteredContacts.map((contact, index) => (
                                <div
                                    key={index}
                                    onClick={() => handleSelectFromList(contact)}
                                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedContact === contact
                                            ? "bg-green-500/20 border border-green-500/50"
                                            : "hover:bg-muted/50"
                                        }`}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                                        {getContactDisplayName(contact).charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">
                                            {getContactDisplayName(contact)}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            {contact.tel && contact.tel[0] && (
                                                <span className="flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />
                                                    {formatPhoneNumber(contact.tel)}
                                                </span>
                                            )}
                                            {contact.email && contact.email[0] && (
                                                <span className="flex items-center gap-1 truncate">
                                                    <Mail className="h-3 w-3" />
                                                    {contact.email[0]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {selectedContact === contact && (
                                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
