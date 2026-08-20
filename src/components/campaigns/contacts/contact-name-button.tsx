"use client";

import { useState } from "react";

import { ContactFichaDialog } from "@/components/campaigns/contacts/contact-ficha-dialog";

export function ContactNameButton({
  campaignId,
  contactId,
  name,
}: {
  campaignId: string;
  contactId: string;
  name: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="font-medium underline-offset-2 hover:underline"
        onClick={() => setOpen(true)}
      >
        {name}
      </button>
      <ContactFichaDialog
        campaignId={campaignId}
        contactId={contactId}
        contactName={name}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
